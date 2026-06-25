# Civic Watch Hub: Architectural Decision Records (ADR)

This document outlines the key architectural decisions and trade-offs considered during the development of Civic Watch Hub. Documenting these choices ensures future maintainers understand the rationale behind the platform's core mechanics.

---

## ADR 001: Issue Resolution Mechanism

**Status:** Accepted  
**Date:** June 2026  

### Context
Originally, the platform utilized an AI-based image verification system (Google Gemini) to confirm when an issue had been physically fixed. A user would upload a photo of the repaired location, and the AI would verify the fix against the original report. 

However, this approach presented significant flaws:
1. **False Positives/Negatives:** AI image verification is notoriously finicky for physical-world state changes. It can be gamed with a generic photo of a filled pothole, or falsely reject a legitimate fix if the lighting or angle differs from the original report.
2. **Cost & Latency:** Running an LLM vision analysis on every resolution request introduces latency and API costs.

We needed a robust, socially-driven mechanism to prevent false resolutions while keeping the platform accessible and reliable.

### Evaluated Options & Trade-offs

#### Option A: Community Consensus (Voting) - [SELECTED]
* **Concept:** Resolving becomes a decentralized team effort. It requires a set threshold of unique users (e.g., 3 votes) to verify a fix before the issue is officially closed.
* **Selection Reason:** While it may take slightly longer for issues to officially close in low-traffic neighborhoods, it is by far the most resilient to spam, requires no extra image storage, and fully leverages our gamified community architecture. 

#### Option B: The "Dispute" Window
* **Concept:** Trust by default, but allow community oversight via a "Dispute Fix" button. If an issue is falsely resolved, another user can dispute it and penalize the bad actor.
* **Rejection Reason:** For a dispute system to be trustworthy and not abused, we would need to verify that the problem still exists. This translates to requiring users to upload *new* photos for every dispute. Storing multiple high-res images per issue across thousands of disputes poses a significant storage scaling risk that we cannot afford for a hackathon MVP.

#### Option C: Geofenced Resolving
* **Concept:** Hardware-enforced honesty by requiring the user's GPS to be within 50m of the issue when marking it as resolved.
* **Rejection Reason:** This creates severe UX friction. Real-world users often take a photo of an issue while commuting, but wait until they are home or on a laptop (on Wi-Fi) to actually submit the report or resolution. Geofencing would block these legitimate, delayed submissions.

#### Option D: Reputation-Gated Access
* **Concept:** Only high-level users (e.g., Level 3) can mark issues as resolved.
* **Rejection Reason:** Susceptible to "grinding." A malicious actor could easily upload fake generic photos of potholes to quickly farm the 10 points per submission. Once they hit the threshold, they gain moderation access and can wreak havoc on the platform.

### Implementation Notes for Option A
- The AI `ResolveModal` and `api/verify-resolution` endpoints were completely removed.
- A `resolvedBy` TEXT array was added to the Supabase `reports` schema.
- The UI now features a Brutalist "RESOLUTION CONSENSUS" progress bar.
- Once an issue's `resolvedBy` array reaches a length of 3, the status automatically flips to `RESOLVED` and the milestone is appended to the issue's Audit Timeline JSON array.

---

## ADR 002: EXIF Location Integrity

**Status:** Accepted  
**Date:** June 2026  

### Context
Crowdsourced mapping platforms are highly susceptible to location spoofing. A malicious user could download a photo of a pothole from the internet and pin it to a random location in the city, creating false data and wasting municipal resources.

### Decision
We implemented a client-side EXIF metadata extraction pipeline using `exifr`. Before an image is uploaded, the client attempts to extract the embedded GPS coordinates. 
If EXIF coordinates are found, the system calculates the Haversine distance between the photo's true origin and the user's manually dropped pin on the map. If the user drags the pin more than 100 meters away from the photo's EXIF location, a prominent UI warning is triggered, forcing them to acknowledge the discrepancy or revert the pin.

### Trade-offs
* **Pros:** Drastically reduces "couch-reporting" (users submitting fake issues from home).
* **Cons:** Images forwarded via WhatsApp or downloaded from social media are often stripped of EXIF data for privacy. The system gracefully degrades to manual pinning if no EXIF data is found, prioritizing accessibility over strict enforcement.

---

## ADR 003: Strict AI Schema Enforcement

**Status:** Accepted  
**Date:** June 2026  

### Context
To maintain a clean database for map filtering and heatmaps, issues must be strictly categorized (e.g., "Pothole", "Vandalism"). Originally, the prompt asked the AI nicely to pick a category, but it was prone to hallucinating new categories (e.g., "Road Defect").

### Decision
We migrated the Google Gemini 2.5 Flash implementation to use its native `responseSchema` configuration with strict `enum` types. By passing `responseMimeType: "application/json"` and a highly restrictive schema, the AI is physically prevented at the generation layer from outputting anything other than our predefined list of 15 categories.

### Trade-offs
* **Pros:** 100% database cleanliness. No need for complex regex or fallback string matching on the server.
* **Cons:** If an edge-case issue occurs that truly doesn't fit the 15 categories, the AI is forced to awkwardly bin it into the generic "Other" category.

---

## ADR 004: Smart Incident Triage & Soft Deduplication

**Status:** Accepted  
**Date:** June 2026  

### Context
Civic reporting platforms quickly become polluted with duplicate reports (e.g., three people reporting the same pothole on their commute). This fragments community verifications and clutters the map. We needed a triage system to detect duplicates, but without frustrating users who genuinely believe their report is unique or adding overly aggressive automated deletion.

### Decision
We built a "Smart Incident Triage" pipeline that combines a deterministic spatial heuristic (fetching nearby open reports within 50m) with an LLM (Gemini 2.5 Flash) to classify new reports as `NEW_INCIDENT`, `LIKELY_DUPLICATE`, or `RELATED_CLUSTER`. 

Crucially, we chose **soft deduplication** over hard merging:
1. When a duplicate is detected, the user is warned and encouraged to verify the primary issue instead.
2. However, the user is allowed to **override** the AI's classification and submit the report anyway. If they do, the report is still saved, but marked with a `userOverride` flag and linked to the primary report via the `duplicateOf` column.

### Trade-offs
* **Pros:** Prevents data loss and respects the user's ground-truth knowledge over the AI's inference. Visual map clutter is still reduced because the UI can conditionally de-emphasize duplicate pins.
* **Cons:** Requires more complex frontend states and backend schema to track `duplicateOf` relationships and `userOverride` flags, rather than simply discarding the duplicate report.
