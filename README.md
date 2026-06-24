# Civic Watch Hub

> A gamified, community-powered platform for reporting, verifying, and resolving physical civic issues using AI.

## The Problem
Citizens encounter hundreds of broken streetlights, dangerous potholes, and illegal dumping sites every day, but reporting them is tedious. Even when reported, municipalities lack the bandwidth to physically verify every claim, leading to a backlog of unverified issues and public frustration.

## The Solution
**Civic Watch Hub** crowdsources civic maintenance through gamification and AI. 

We allow users to instantly report issues with a photo. The platform uses **Google Gemini AI** to automatically categorize the issue, assess its severity, and write a detailed description. We then leverage the community to verify the issue and eventually reach a consensus when the issue is resolved, creating a self-sustaining, high-trust ecosystem without manual moderation.

## Key Features

- **AI-Powered Analysis:** Upload a photo and Gemini 2.5 Flash automatically extracts the category, severity, and description.
- **EXIF Geotagging Integrity:** The platform extracts hidden GPS metadata from uploaded photos to strongly deter users from faking the location of an issue.
- **Community Consensus Resolution:** Issues aren't resolved by a single person. It requires 3 unique verifications from citizens to officially close an issue, driven by secure atomic database functions.
- **Gamified Leaderboards:** Users earn "Impact Points" for reporting and verifying issues, turning civic duty into a competitive game.
- **Audit Timelines & Subscriptions:** Track the complete history of an issue (from "Reported" to "Verified" to "Resolved") and subscribe to get updates.
- **Social "Rally" Cards:** One-click generation of beautifully formatted issue cards to share on Twitter/WhatsApp and rally neighbors.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Brutalist UI with Vanilla CSS
- **Database & Auth:** Supabase (PostgreSQL)
- **AI / Vision:** Google Gemini 2.5 Flash (via `@google/generative-ai`)
- **Mapping:** React-Leaflet & OpenStreetMap
- **Utilities:** `exifr` (Metadata extraction), `html2canvas` (Social sharing)

## Documentation

For a deep dive into how this platform is built, see our documentation suite:

* [System Design & Data Flow](docs/SYSTEM_DESIGN.md)
* [Database Schema](docs/DATABASE_SCHEMA.md)
* [Architectural Decision Records (ADR)](docs/ARCHITECTURE.md)

## Running Locally

1. Clone the repository.
2. Set up your Supabase project:
   - Create a new project on [Supabase](https://supabase.com).
   - Go to the SQL Editor and paste the contents of `database.sql` to generate the tables, RLS policies, and Storage buckets.
3. Install dependencies: `npm install`
4. Setup `.env.local` with your Supabase and Gemini keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```
5. Run the development server: `npm run dev`
