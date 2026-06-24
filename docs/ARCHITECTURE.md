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
