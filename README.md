# NutriFlow AI

**NutriFlow** is an elegant, high-performance personal diet, hydration, and exercise tracker. It features a unique cross-platform presentation layout, pairing a focused, tabbed desktop workspace with an immersive, interactive mobile smartphone simulator on smaller screens — both driven by the same section tabs (Dashboard, Meals, Active, AI Coach, Trends, Scan).

It is a full multi-user cloud application: a **Node.js Express backend** (a secured Gemini AI proxy) and a **Vite + React 19** frontend, with **Supabase** providing authentication and per-user data storage, and the **Google Gemini AI SDK** powering intelligent features like pantry-based recipe generation and diet-coaching feedback.

It ships on the **web** (Google Cloud Run) and on **Android via the Google Play Store**, packaged as a **Trusted Web Activity (TWA)** that wraps the live site.

---

## 🌟 Key Features

### 1. 🔐 Accounts & Cloud Sync
* **Email/password + Google sign-in** via Supabase — each user has a private account ("Continue with Google" OAuth on web and in the Android TWA).
* **Password reset**: forgot-password email link + in-app update-password flow.
* **In-app account deletion**: a "Delete account" action permanently removes the user and all their data (server-verified, service-role; rows cascade-delete).
* **Reset logged data**: a "Reset Data" action clears all logged meals/exercises/hydration while keeping the account, profile, and goal.
* **Cloud persistence**: meals, exercises, goals, and hydration are stored per-user in Supabase and sync across devices.
* **Row-Level Security**: every row is gated so users can only ever read/write their own data.

### 2. 🎯 Personalized Onboarding & Goals
* **First-run quiz**: a multi-step quiz (goal, body stats with metric/imperial toggle, activity, diet, restrictions, workout prefs) computes a personalized calorie + macro goal via **Mifflin–St Jeor** (`src/lib/goal.ts`) instead of a generic default.
* **Profile-aware AI**: the coach and recipe generator respect the user's goal, dietary preference, allergies/restrictions, and preferred workouts.
* **Editable & shareable**: re-take or edit anytime from the footer; the quiz has its own `/quiz` route that doubles as a public "build your free plan" promo for logged-out visitors (answers carry through sign-up).

### 3. 📊 Interactive Dashboard & Analytics
* **Macro Calorie Budgeting**: Track consumed calories against an adjustable daily allowance with live percentage gauges.
* **Macronutrient Breakdown**: Visual progress rings mapping Protein, Carbs, and Fats so users can stay inside their target zone.
* **Time-Series Trends**: Embedded charts plotting historic intake and expenditure over the last 7 days.

### 4. ⚡ AI Daily Coach Review
* **Instant Evaluation**: Analyzes daily logged food items, exercises, and target goals at the click of a button.
* **Intelligent Feedback**: Returns an overall daily "grade" (e.g., A, B+, C), a highly motivating summary, and three actionable athletic suggestions.

### 5. 🍳 Pantry Recipe Generator (AI Chef)
* **Custom Meal Crafting**: Input any combination of ingredients sitting in your fridge or pantry.
* **Detailed Formulations**: Gemini instantly formulates three high-macro healthy recipes complete with calories, precise protein/carb/fat content, and prep times.
* **One-Click Logging**: Directly log any generated recipe into your daily meals without manual data entry.

### 6. 💧 Dynamic Hydration Tracker
* **Visual Cup Indicator**: Interactive liquid visual container with smooth spring height physics based on water logged.
* **Preset Additions**: Fast increment buttons (`+250ml`, `+500ml`) and a reduction button to manage baseline daily hydration.

### 7. 🔍 Smart Logging: Search, Barcode & Photo
* **Natural Language Queries**: Search for common meals, raw ingredients, or complex items to get accurate nutritional estimates.
* **Real Barcode Scanning**: Point the device camera at a product barcode — it's read on-device via the native `BarcodeDetector` API (Chrome/Android, including the TWA), then looked up against **Open Food Facts** (falling back to a demo list, then an AI estimate). Manual code entry works everywhere as a fallback. Scanning and lookup live in a single unified card.
* **📸 Snap a Meal (AI photo analysis)**: Take or upload a photo of your plate — **Gemini vision** estimates the foods and total calories/macros, which you review, adjust, and log (`POST /api/analyze-photo`).
* **Quick-pick catalog**: a curated starter list of common foods and workouts (`src/data.ts`) for one-tap logging.

### 8. 🔥 Streaks & Achievements
* **Daily streak**: kept alive by logging *any* meal, exercise, or water each day; the Trends tab shows the current streak (with an alive-from-yesterday grace) and the longest run.
* **Achievement badges**: 7 unlockable badges (first log, 3/7/14/30-day streaks, hydration, 100 logs) shown earned vs locked, each with a clear "how to earn" description.
* Computed **entirely client-side** from existing logged data (`src/lib/streaks.ts`) — no schema change — and timezone-safe via the local-date helpers.

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
   * `supabase/migrations/0003_profiles.sql` (onboarding profiles)
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

NutriFlow is published on Google Play as a **Trusted Web Activity** — a thin Android wrapper (`app.nutriflow.twa`) around the live Cloud Run site.

* **Builds:** generated with **[Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)**. Config is version-controlled in `twa/twa-manifest.json` (the rest of the generated `twa/` Android project is gitignored). The original v1 was made with PWABuilder, which uses Bubblewrap under the hood, so they're compatible. Current: versionName 1.0.2 / versionCode 3.
  * Build flow: `cd twa` → `bubblewrap update` (bump `appVersionCode`) → `bubblewrap build` (prompts for keystore passwords) → upload `play-package/NutriFlow.aab`.
  * The native splash image is generated from the app icon (`public/icons/icon.svg`), which is a **rounded tile on a transparent background** so the splash shows a rounded icon, not a square. The full-bleed `icon-maskable.svg` drives the adaptive home-screen icon. Because Bubblewrap fetches icons from the live site, deploy icon changes to Cloud Run *before* rebuilding.
* **Domain verification:** `assetlinks.json` (served at `/.well-known/assetlinks.json` by `server.ts`) lists both the upload-key and Play App Signing SHA-256 fingerprints, so the app runs full-screen with no browser address bar.
* **Required pages:** `/privacy` and `/delete-account` (served from `privacy.html` / `delete-account.html`).
* **Store assets:** app icon, feature graphic, and phone/tablet screenshots live in `store-assets/`. Screenshots are generated from the real app via `scripts/gen-screenshots*.mjs` (Playwright).
* **Signing secrets** (`signing.keystore`, `signing-key-info.txt`) are gitignored and kept only locally — back them up; losing them blocks updates.

**Update model:** because the app is a TWA, design/feature/back-end changes go live in the installed app simply by pushing to `main` (Cloud Run redeploys) — **no new Play build or review**. A new `.aab` is only needed for native-wrapper changes (launcher icon, splash, app name, package id, target SDK, permissions, or the Play version).

---

## 📁 Project Structure

```text
├── server.ts                       # Express backend: Gemini proxy (retry + model fallback), validation,
│                                   #   rate-limit, barcode lookup (Open Food Facts), photo analysis
│                                   #   (Gemini vision), DELETE /api/account, /health,
│                                   #   /.well-known/assetlinks.json, /privacy, /delete-account
├── Dockerfile                      # Cloud Run container build
├── assetlinks.json                 # Digital Asset Links (TWA domain verification)
├── privacy.html / delete-account.html  # Play-required policy pages
├── supabase/migrations/            # SQL schema + RLS policies (run in Supabase SQL Editor)
├── store-assets/                   # Play listing assets: icon source, feature graphic, screenshots
├── twa/                            # Bubblewrap TWA project (twa-manifest.json tracked; rest gitignored)
├── play-package/                   # Built Android output (.aab/.apk; keystore gitignored)
├── scripts/                        # Icon + screenshot generators (sharp / playwright)
├── src/
│   ├── main.tsx                    # React entry (wrapped in ErrorBoundary)
│   ├── App.tsx                     # Layout shell, auth + onboarding gating, /quiz route
│   ├── store.ts                    # Zustand store: auth, profile/onboarding, cloud data, UI state
│   ├── types.ts                    # Global TypeScript interfaces
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── goal.ts                 # Mifflin–St Jeor goal/macro computation + unit conversions
│   │   ├── prefs.ts                # builds the AI personalization payload from the profile
│   │   ├── onboarding.ts           # stash/apply pending promo-quiz answers (localStorage)
│   │   ├── date.ts                 # local-timezone date helpers (avoids UTC day-shift bugs)
│   │   ├── image.ts                # client-side photo compression for meal-photo upload
│   │   └── streaks.ts              # logging-streak + achievement-badge computation
│   ├── index.css                   # Tailwind imports & theme declarations
│   └── components/
│       ├── Auth.tsx                # Sign-in / sign-up / forgot-password screen
│       ├── UpdatePassword.tsx      # Set-new-password screen (password-reset flow)
│       ├── Onboarding.tsx          # Personalization quiz (first-run / edit / public promo)
│       ├── DeleteAccountModal.tsx  # Confirm-and-delete-account modal
│       ├── ResetDataModal.tsx      # Confirm-and-reset-logged-data modal
│       ├── ErrorBoundary.tsx       # Graceful render-error fallback
│       ├── Dashboard.tsx           # Calorie progress, goal edits & summary
│       ├── FoodSearch.tsx          # Natural-language food lookup & additions
│       ├── ExerciseTracker.tsx     # Cardio/strength logger & burned stats
│       ├── Scanner.tsx             # Barcode scanner (live camera via BarcodeDetector + manual lookup)
│       ├── PhotoAnalyzer.tsx       # Snap-a-meal AI photo analysis (Gemini vision) → review → log
│       ├── ProgressCharts.tsx      # 7-day trend & macro distribution charts
│       ├── AiCoach.tsx             # AI Chef pantry recipes & coach review
│       └── WaterTracker.tsx        # Hydration water-glass visual
```
