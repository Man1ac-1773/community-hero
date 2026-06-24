# CIVIC WATCH 🏙️

An open-source, AI-powered platform for community issue tracking. Built for the **Vibe2Ship Hackathon** under the "Community Hero" track.

## Overview
Civic Watch empowers citizens to report urban issues (potholes, broken streetlights, illegal dumping) in real-time. Simply snap a photo, and the integrated **Google Gemini AI** automatically categorizes the issue, generates a description, and assesses its severity. 

A brutalist, real-time City Dashboard plots all reported hazards on a live interactive map, allowing citizens to "verify" issues to crowdsource urgency and impact.

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React
- **Maps:** Leaflet, React-Leaflet
- **AI Core:** Google Gemini 1.5 Flash (Vision API)
- **Database & Auth:** Supabase (Postgres, Storage, OAuth)
- **Styling:** Custom Neo-Brutalism (Vanilla CSS, 4-color palette)

## Key Features

### 📸 AI Issue Triage
- Users upload a photo of a civic issue.
- **Google Gemini** vision models analyze the image to automatically extract the Category (e.g., Pothole, Graffiti), Severity (Critical, High, Medium, Low), and a detailed technical description of the problem.
- Automatic geolocating tags the issue precisely where it was reported.

### 🗺️ Live City Map
- A central map plots all Open and Resolved issues across the city.
- Filters allow sorting by severity or status.
- Clicking "View on Map" from anywhere directly pans and opens the specific issue's popup on the map.

### 💬 Civic Discussion & Verification
- Dedicated pages for every issue feature a real-time discussion board where citizens can add context.
- Citizens can **Verify** an issue if they witness it in person, automatically boosting its urgency and crowdsourcing prioritization.

### 🛡️ AI Resolution Validation
- When authorities or citizens fix an issue, they click "Mark as Resolved".
- They are required to upload a *proof photo* of the fix.
- **Gemini AI** analyzes the proof photo against the original description to verify if the issue was actually resolved. If rejected, the ticket stays open.

### 🏆 Gamified Leaderboard
- Citizens earn **Impact Points**: 10 points for reporting an issue, 2 points for verifying an existing issue.
- The **City Leaderboard** tracks the most impactful heroes in the community.
- User Profiles showcase their Hero Level, total points, active submissions, and tracked issues.

## 🤖 Google AI Studio Integration
As per the **Community Hero** problem statement requirements, **Google AI Studio** serves as the core tool for developing our generative AI features. 
- **Prompt Development:** All system instructions for categorizing civic issues and verifying resolutions were developed, grounded, and tuned inside Google AI Studio.
- **Get Code:** The optimized API configurations and prompt structures were exported using AI Studio's "Get Code" feature and integrated directly into our Next.js API routes (`/api/analyze-image` and `/api/verify-resolution`).
- **Deployment:** The live application interfaces directly with the `generativelanguage.googleapis.com` endpoint using the API keys generated from our Google AI Studio project.

## 🚀 Quick Setup Guide

### 1. Environment Variables
Clone the repository and create a `.env.local` file in the root directory with the following keys:
```env
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Backend Setup
You don't need to manually configure tables, storage buckets, or RLS policies. We've provided a single SQL script that builds the entire backend for you.
1. Go to your Supabase project's **SQL Editor**.
2. Open `docs/supabase_setup.sql` from this repository.
3. Copy the contents, paste it into the Supabase SQL Editor, and click **Run**.

*This script instantly creates the `reports` table, `comments` table, configures the storage bucket, and disables RLS for easy hackathon MVP testing.*

### 3. Run Locally
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` to start reporting issues!
