# CIVIC WATCH 🏙️

An open-source, AI-powered platform for community issue tracking. Built for the **Vibe2Ship Hackathon**.

## Overview
Civic Watch empowers citizens to report urban issues (potholes, broken streetlights, illegal dumping) in real-time. Simply snap a photo, and the integrated **Google Gemini AI** automatically categorizes the issue and assesses its severity. 

A brutalist, real-time City Dashboard plots all reported hazards on a live interactive map, allowing citizens to "verify" issues to crowdsource urgency and impact.

## Tech Stack
- **Frontend:** Next.js (App Router), React, Leaflet Maps
- **AI Core:** Google Gemini 3.5 Flash (Vision API)
- **Database & Auth:** Supabase (Postgres, Storage, OAuth)
- **Styling:** Custom Neo-Brutalism (Vanilla CSS)

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

*This script instantly creates the `reports` table, configures the storage bucket, and disables RLS for easy hackathon MVP testing.*

### 3. Run Locally
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` to start reporting issues!

## Hackathon Features
- **AI Triage:** Instant severity assessment using Gemini Vision.
- **Geolocation:** Automatic map routing using the browser's `navigator.geolocation` API.
- **Gamification & Impact:** Real-time dashboards calculating community verified issues and critical hazards.
