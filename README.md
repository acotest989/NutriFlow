# NutriFlow AI

**NutriFlow** is an elegant, high-performance personal diet, hydration, and exercise tracker. It features a unique cross-platform presentation layout, pairing a responsive modern web dashboard on desktop with an immersive, interactive mobile smartphone simulator on smaller screens.

It is a full multi-user cloud application: a **Node.js Express backend** (a secured Gemini AI proxy) and a **Vite + React 19** frontend, with **Supabase** providing authentication and per-user data storage, and the **Google Gemini AI SDK** powering intelligent features like pantry-based recipe generation and diet-coaching feedback.

It ships on the **web** (Google Cloud Run) and on **Android via the Google Play Store**, packaged as a **Trusted Web Activity (TWA)** that wraps the live site.

---

## 🌟 Key Features

### 1. 🔐 Accounts & Cloud Sync
* **Email/password authentication** via Supabase — each user has a private account.
* **Password reset**: forgot-password email link + in-app update-password flow.
* **In-app account deletion**: a "Delete account" action permanently removes the user and all their data (server-verified, service-role; rows cascade-delete).
* **Cloud persistence**: meals, exercises, goals, and hydration are stored per-user in Supabase and sync across devices.
* **Row-Level Security**: every row is gated so users can only ever read/write their own data.

### 2. 📊 Interactive Dashboard & Analytics
* **Macro Calorie Budgeting**: Track consumed calories against an adjustable daily allowance with live percentage gauges.
* **Macronutrient Breakdown**: Visual progress rings mapping Protein, Carbs, and Fats so users can stay inside their target zone.
* **Time-Series Trends**: Embedded charts plotting historic intake and expenditure over the last 7 days.

### 3. ⚡ AI Daily Coach Review
* **Instant Evaluation**: Analyzes daily logged food items, exercises, and target goals at the click of a button.
* **Intelligent Feedback**: Returns an overall daily "grade" (e.g., A, B+, C), a highly motivating summary, and three actionable athletic suggestions.

### 4. 🍳 Pantry Recipe Generator (AI Chef)
* **Custom Meal Crafting**: Input any combination of ingredients sitting in your fridge or pantry.
* **Detailed Formulations**: Gemini instantly formulates three high-macro healthy recipes complete with calories, precise protein/carb/fat content, and prep times.
* **One-Click Logging**: Directly log any generated recipe into your daily meals without manual data entry.

### 5. 💧 Dynamic Hydration Tracker
* **Visual Cup Indicator**: Interactive liquid visual container with smooth spring height physics based on water logged.
* **Preset Additions**: Fast increment buttons (`+250ml`, `+500ml`) and a reduction button to manage baseline daily hydration.

### 6. 🔍 Smart Nutrition Search & Barcode Simulator
* **Natural Language Queries**: Search for common meals, raw ingredients, or complex items to get accurate nutritional estimates.
* **UPC Barcode Scanner**: Simulates camera scanner interactions with realistic viewport crosshairs and preset product scans to easily test barcode lookups.

---

## 🛠️ Technology Stack

* **Frontend**: React 19 (TypeScript), Vite 6, Tailwind CSS 4, [Zustand](https://github.com/pmndrs/zustand) (global state), Recharts (analytics), Framer Motion (animations), lucide-react (icons).
* **Backend**: Node.js Express server with a lazy-loaded `@google/genai` SDK, hardened with `helmet` (security headers), `express-rate-limit`, and `zod` request validation. AI calls retry transient Gemini errors with exponential backoff + jitter and **fall back across a model chain** (`GEMINI_MODELS`) when a model is overloaded. A privileged `@supabase/supabase-js` admin client (service-role) backs account deletion only.
* **Auth & Data**: [Supabase](https://supabase.com) — authentication, PostgreSQL, and Row-Level Security. The browser talks to Supabase directly; the Express server is used only to proxy Gemini (keeping the API key server-side).
* **Persistence**: User data (entries, goals, hydration) lives in Supabase per-user. Only UI preferences (theme) are kept in `localStorage`.

---

## 🚀 Getting Started & Local Development

### Prerequisites
* **Node.js** (v20+ recommended)
* A **Google Gemini API Key**
* A **Supabase project** (free tier is fine)

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase **SQL Editor**, run the migrations in order:
   * `supabase/migrations/0001_init.sql` (entries + goals)
   * `supabase/migrations/0002_hydration.sql` (hydration)
3. From **Project Settings → API**, copy your **Project URL** and **anon / publishable key**.

### 3. Configure environment variables
```bash
cp .env.example .env
```
Edit `.env`:
```env
# Server secrets (never exposed to the browser)
GEMINI_API_KEY=your_gemini_api_key_here
# Optional: override the Gemini model fallback chain (primary first, comma-separated)
# GEMINI_MODELS=gemini-3.5-flash,gemini-2.5-flash

# Server-side Supabase admin (for in-app account deletion only — service-role key bypasses RLS, keep secret)
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_or_secret_key

# Public client config (safe to expose — protected by RLS)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```
> `.env.production` holds the **public** Supabase values used for production builds/containers. Never put server secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) there.

### 4. Run it
```bash
npm run dev
```
Open `http://localhost:3000`, sign up, and start logging.

Other scripts:
```bash
npm run build   # build client (dist/) + server bundle (dist/server.cjs)
npm run start   # run the production server
npm run lint    # type-check (tsc --noEmit, strict mode)
```

---

## ☁️ Deployment (Google Cloud Run)

The app ships as a single container (see `Dockerfile`) that serves both the API and the built SPA.

* Deploy via the Cloud Run console's **"Connect repository"** (Cloud Build + GitHub), or `gcloud run deploy --source .`.
* Set these as **runtime** environment variables on the service (they are *not* baked into the image):
  * `GEMINI_API_KEY` — Gemini proxy.
  * `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` — required for in-app account deletion (without them `DELETE /api/account` returns "not configured"). The service-role/secret key bypasses RLS — keep it secret.
  * `GEMINI_MODELS` *(optional)* — override the model fallback chain without a code change.
* The public `VITE_SUPABASE_*` values are baked at build time from `.env.production`.
* After deploy, set the Cloud Run URL as the **Site URL** and add it to **Redirect URLs** in Supabase → **Authentication → URL Configuration** (so email confirmation works in production).

---

## 🤖 Android / Google Play (TWA)

NutriFlow is published on Google Play as a **Trusted Web Activity** — a thin Android wrapper (`app.nutriflow.twa`) around the live Cloud Run site, generated with [PWABuilder](https://www.pwabuilder.com).

* **Domain verification:** `assetlinks.json` (served at `/.well-known/assetlinks.json` by `server.ts`) lists both the upload-key and Play App Signing SHA-256 fingerprints, so the app runs full-screen with no browser address bar.
* **Required pages:** `/privacy` and `/delete-account` (served from `privacy.html` / `delete-account.html`).
* **Store assets:** app icon, feature graphic, and phone/tablet screenshots live in `store-assets/`. Screenshots are generated from the real app via `scripts/gen-screenshots*.mjs` (Playwright).
* **Signing secrets** (`signing.keystore`, `signing-key-info.txt`) are gitignored and kept only locally — back them up; losing them blocks updates.

**Update model:** because the app is a TWA, design/feature/back-end changes go live in the installed app simply by pushing to `main` (Cloud Run redeploys) — **no new Play build or review**. A new `.aab` is only needed for native-wrapper changes (launcher icon, splash, app name, package id, target SDK, permissions, or the Play version).

---

## 📁 Project Structure

```text
├── server.ts                       # Express backend: Gemini proxy (retry + model fallback), validation,
│                                   #   rate-limit, DELETE /api/account, /health,
│                                   #   /.well-known/assetlinks.json, /privacy, /delete-account
├── Dockerfile                      # Cloud Run container build
├── assetlinks.json                 # Digital Asset Links (TWA domain verification)
├── privacy.html / delete-account.html  # Play-required policy pages
├── supabase/migrations/            # SQL schema + RLS policies (run in Supabase SQL Editor)
├── store-assets/                   # Play listing assets: icon source, feature graphic, screenshots
├── play-package/                   # PWABuilder Android output (.aab/.apk; keystore gitignored)
├── scripts/                        # Icon + screenshot generators (sharp / playwright)
├── src/
│   ├── main.tsx                    # React entry (wrapped in ErrorBoundary)
│   ├── App.tsx                     # Cross-platform layout shell + auth gating
│   ├── store.ts                    # Zustand store: auth + cloud data + UI state
│   ├── types.ts                    # Global TypeScript interfaces
│   ├── lib/supabase.ts             # Supabase client
│   ├── index.css                   # Tailwind imports & theme declarations
│   └── components/
│       ├── Auth.tsx                # Sign-in / sign-up / forgot-password screen
│       ├── UpdatePassword.tsx      # Set-new-password screen (password-reset flow)
│       ├── DeleteAccountModal.tsx  # Confirm-and-delete-account modal
│       ├── ErrorBoundary.tsx       # Graceful render-error fallback
│       ├── Dashboard.tsx           # Calorie progress, goal edits & summary
│       ├── FoodSearch.tsx          # Natural-language food lookup & additions
│       ├── ExerciseTracker.tsx     # Cardio/strength logger & burned stats
│       ├── Scanner.tsx             # Simulated barcode camera viewfinder
│       ├── ProgressCharts.tsx      # 7-day trend & macro distribution charts
│       ├── AiCoach.tsx             # AI Chef pantry recipes & coach review
│       └── WaterTracker.tsx        # Hydration water-glass visual
```
