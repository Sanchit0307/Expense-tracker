# Expense Tracker ---- Your personal Budget Tracker

A full-stack expense and budget tracker with AI-powered spending analysis,
built for students and early-career professionals managing money in INR.

## Stack
- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Frontend:** Plain HTML/CSS/JS, Chart.js
- **AI:** NVIDIA API (free tier) for the monthly analysis feature

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in:
   - `MONGODB_URI` — a local MongoDB instance or a MongoDB Atlas connection string
   - `NVIDIA_API_KEY` — get a free key at https://build.nvidia.com (optional —
     the app works without it, it just skips the AI advice)

3. Run it:
   ```
   npm start
   ```
   Or for auto-restart during development:
   ```
   npm run dev
   ```

4. Open http://localhost:3000

## How the AI analysis works

The `/api/analyze` route doesn't hand raw expense data to the AI. It first
computes totals, category breakdowns, and over-budget categories in plain
JavaScript, then sends that structured summary to the model with a specific
prompt asking for concrete advice. This keeps the output consistent and cheap
to run repeatedly, and it means you can explain the pipeline (compute → summarize → generate)
clearly in an interview instead of "I just prompted an AI with the data."

## Not included yet (roadmap)
- Authentication (currently single-user, all data is shared/global)
- Day/year views (currently month-only filtering)
- PWA manifest for installable mobile app
- CSV export

## Deployment
- Frontend + backend: deploy together on Render (Express serves the `public/` folder)
- Database: MongoDB Atlas free tier
