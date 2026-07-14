# NutriFlow AI — Future Backlog & Roadmap

This document tracks what shipped in v1 and what remains to take **NutriFlow** further into a production-grade wellness application.

---

## ✅ Shipped in v1

NutriFlow is a deployed, multi-user cloud application (Google Cloud Run + Supabase). The following are done:

* **Global state** — app state centralized in a Zustand store (replaced prop-drilling).
* **Persistent database & cloud sync** — meals, exercises, goals, and hydration persist per-user in **Supabase (PostgreSQL)** and sync across devices.
* **Authentication** — Supabase email/password auth with email confirmation; the app is gated behind sign-in.
* **Row-Level Security** — every table has RLS so users access only their own rows.
* **Hardened backend** — `helmet` security headers with a tailored production **Content-Security-Policy** (`script-src 'self'`, no inline/eval), `express-rate-limit` on the AI routes, `zod` request validation, a `/health` endpoint, and graceful retry/handling of transient Gemini errors.
* **Resilient UX** — global error boundary, user-facing error toasts, and data-loading indicators.
* **Production deployment** — containerized (`Dockerfile`) and deployed to Cloud Run with auto-deploy on push to `main`.
* **Android app on Google Play** — packaged as a **Trusted Web Activity (TWA)** wrapping the live site (`app.nutriflow.twa`), domain-verified via Digital Asset Links, installed and confirmed running full-screen (no address bar). Store listing, Data Safety, content rating, and privacy/data-deletion pages complete. See [play-store packaging notes].

---

## 🔄 Update model (TWA)

Because the Android app is a thin TWA over the live web app, **content/feature/UI/back-end changes deploy via `git push` to `main` → Cloud Run, and appear in the installed app instantly — no new Play Store build or review.** A new `.aab` is only needed for native-wrapper changes: launcher icon, splash, app name, package id, target SDK, permissions, or the Play `versionName`/`versionCode`.

---

## 🎯 Near-term (next up)

Prioritized post-launch work:

_All near-term personalization items shipped. Next ideas live in the backlog below (e.g. tighter keto macro split, Apple/Health sync, a real food-database API, gamification/streaks)._

✅ **Done:**
* **Streaks & badges (gamification)** — a daily **logging streak** (kept alive by any meal/exercise/water; alive-from-yesterday grace; timezone-safe) and **7 achievement badges** (`src/lib/streaks.ts`), computed entirely from existing `entries` + `hydration` (no schema change). Shown on the Trends tab as a compact gradient **streak hero** + a legible **Achievements card** (earned/locked, each with how-to-earn text). Streak logic unit-tested (14/14).
* **Focused desktop tabs + UI polish** — the desktop view now mirrors the mobile bottom nav with a **top tab bar** (one section at a time, shared `activeMobileTab` state) instead of the all-at-once bento grid. This batch also: **live in-page camera capture** for Snap-a-Meal (`getUserMedia`, works on desktop + Android/TWA, replacing the unreliable file-input `capture`); the **barcode scanner + lookup merged** into one card with the demo presets removed; manual food entry now saves the **serving size + unit** (baked into the entry name); **flattened the AI Coach card nesting** to match the other tabs; aligned the Sync-On indicator; and a project-wide **unused-import cleanup** (the `--noUnusedLocals` scan is clean).
* **AI meal-photo analysis ("Snap a Meal")** — take or upload a plate photo → `POST /api/analyze-photo` runs **Gemini vision** → estimates the foods + total calories/macros → editable review card → log to the diary (`src/components/PhotoAnalyzer.tsx`). The client compresses the image first (`src/lib/image.ts`) to stay under the body limit; the endpoint reuses the same retry + model-fallback chain as the other AI routes. Fulfils the "Gemini Photo Plate Analysis" backlog item.
* **Real barcode camera scanning** — the scanner now reads barcodes live from the camera via the native `BarcodeDetector` API (Chrome/Android, incl. the TWA), feeding the existing Open Food Facts → demo → AI lookup. Previously the camera was a decorative viewfinder; manual entry / preset chips remain as the cross-browser fallback.
* **Expanded quick-pick catalog** — the `src/data.ts` starter lists grew to **58 foods + 21 workouts**: international staples **plus Balkan/local dishes** (ćevapi, burek, sarma, ajvar, baklava, etc.), with realistic macros and MET-based burn rates. The file is formatted one entry per line and grouped by section (proteins, grains, fruits, veg, local, …) for fast scanning. (Still a static in-bundle catalog; see the food-database-API backlog item for the dynamic version.)
* **Timezone date fix** — all calendar-date math (day stepper, Today/Yesterday labels, 7-day chart buckets) now uses a shared **local-date** helper (`src/lib/date.ts`) instead of `toISOString()`, which shifted the day for non-UTC users. Symptom fixed: a meal logged for a past day now lines up with the correct chart bar (previously it could land on the wrong bar or skip a day).
* **Reset logged data** — footer "Reset Data" → confirmation modal → `resetData` deletes all the user's meals/exercises/hydration (keeps account, profile, and goal); optimistic with rollback.
* **Edit profile / re-take quiz** — the `Onboarding` component doubles as an edit screen (pre-filled, "Save changes", recomputes the goal); opened from the footer "Edit Profile" link.
* **Profile-aware AI** — the client sends a compact prefs payload (goal, diet, restrictions, workouts, activity) from the user's profile to the coach + recipe endpoints (`aiPrefs` in `src/lib/prefs.ts`); the server weaves it into the prompts (`prefsText` in `server.ts`). Recipes must comply with the diet and exclude restricted/allergen ingredients; coach advice aligns with the goal/diet/preferred workouts.
* **Onboarding quiz (personalization)** — first-run multi-step quiz (`src/components/Onboarding.tsx`): goal, sex/age, body (metric/imperial toggle), activity, diet, restrictions + workout prefs. Computes a personalized calorie + macro goal via Mifflin–St Jeor (`src/lib/goal.ts`) and seeds the user's `goals` row. Answers persist in the Supabase `profiles` table (migration `0003_profiles.sql`, RLS own-row, cascade); a `has_onboarded` flag gates it in `App.tsx`. Shown once after sign-in (also catches existing users with no profile).
* **Google sign-in (OAuth)** — "Continue with Google" on the auth screen via `supabase.auth.signInWithOAuth`; redirects back to the app origin and resumes the session via `detectSessionInUrl`. Google Cloud OAuth client + Supabase Google provider configured. Works on web and in the Android TWA (Chrome Custom Tab).
* **Password reset** — forgot-password email + in-app update-password flow.
* **AI reliability** — the AI helper (`generateJSON` in `server.ts`) now retries transient Gemini errors (503/overloaded/429/500/timeout, plus empty/garbled responses) with exponential backoff + jitter, then **falls back to the next model in a chain** instead of hammering the overloaded one. The chain is env-configurable via `GEMINI_MODELS` (default `gemini-3.5-flash,gemini-2.5-flash`); an unavailable fallback model is skipped safely.
* **In-app account deletion** — a "Delete account" button (footer → confirmation modal, type `DELETE`) calls `DELETE /api/account`, which verifies the caller's token and uses the Supabase **service-role** key to delete the user; all rows cascade-delete via the FKs. Requires server env vars `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
* **Branded startup splash** — instant pre-React boot splash in `index.html` (gradient flame mark + wordmark + animated bar, auto-replaced on mount) and a matching `authReady` loader in `App.tsx`; body background set to kill the white flash.
* **Native Android splash (rounded)** — the TWA splash now renders a rounded icon tile instead of a hard square (icon source is a rounded transparent-corner tile). Shipped as versionCode 3 / 1.0.2 via Bubblewrap.

### ⏳ Pending manual steps (no code)
* **Publish the Google OAuth consent screen** (Google Auth Platform → Audience → Publish app) so *any* user can sign in with Google — in Testing mode only added test users can. Non-sensitive scopes ⇒ no verification needed, no "unverified" warning.
* **Promote the app to Production** in Play Console when ready (currently Internal testing).

### 🌐 Needs a custom domain (deferred)
NutriFlow currently runs on the default Cloud Run URL (`…run.app`) — not a domain we own. Buying a real domain (~$10/yr) and mapping it to Cloud Run would unlock:
* **Verified OAuth logo** — Google only shows the consent-screen logo after *brand verification*, which requires a domain you can verify in Search Console. (`run.app`/`supabase.co` can't be verified, so the flame logo won't show publicly until then; the app name still shows.)
* **Branded auth redirect URL** — the `…supabase.co` URL during Google sign-in can only be rebranded via Supabase's **Custom Domain** add-on (paid), which also needs an owned domain.

---

## 🗺️ Feature Roadmap & Backlog

### Phase 2: Core Wearable & API Integrations
* **Google Fit & Apple Health**: Integrate direct health SDK synchronization to read active steps, continuous heart rate, and sleep metrics automatically.
* **Third-Party Integrations**:
  * **Fitbit API**: Sync sleep cycles and active workout sessions.
  * **MyFitnessPal Export**: Allow users to export historical meal lists.
* **Smart Hydration Bluetooth Cups**: Read actual physical ounces consumed from supported IoT water bottles.

### Phase 3: Advanced AI Capabilities
* ✅ **Gemini Photo Plate Analysis** — *shipped* (see "Snap a Meal" in the near-term Done list): analyzes a meal photo to estimate the foods + total calories/macros for review and logging. Possible follow-ups: per-item macro breakdown, portion-size refinement, and profile-aware notes (e.g. flag allergens).
* **Personalized AI Meal Prep Calendar**: A weekly calendar scheduler that formulates custom grocery lists and dietary schedules based on user allergies, favorite recipes, and macro goals.
* **Voice-Logged Meals**: Use speech-to-text allowing users to log meals naturally: *"I had a double-shot latte and two scrambled eggs for breakfast."*

### Phase 4: Gamification & Accountability
* ✅ **Streak Badges** — *shipped*: a daily logging **streak** (any meal/exercise/water keeps it alive) + **7 achievement badges**, computed client-side from existing data (no schema), shown on the Trends tab. Follow-ups: goal/within-budget streaks, push reminders to protect a streak.
* **Coach Voice Over (TTS)**: Convert the daily AI coach review text into realistic voice notes using a text-to-speech engine to simulate a real personal trainer.
* **Community Challenges**: Optional shared lobbies where users can join team hydration or steps challenges.

### Localization / i18n (Balkan languages first)
Localize the app for **Bosnian, Croatian, and Serbian** (English stays the default). Key insight: these three are mutually intelligible (~90–95 % identical UI text), so it's **one base translation + small per-variant overrides** (ijekavian vs ekavian, a few lexical swaps), *not* three from scratch. **Decision: Serbian in Latin script only** for v1 to simplify (skip Cyrillic; can add later). Estimated ~3–5 focused days (UI-only MVP ~2); native-speaker review keeps translation quality/cost low.

Phased plan — **all shipped** (English default; Serbian Latin, Croatian, Bosnian):
1. ✅ **Framework + switcher** — `react-i18next` wired in `src/i18n/`, a header **language switcher** (`src/components/LanguageSwitcher.tsx`). English is the bundled fallback; **sr/hr/bs locale bundles lazy-load via dynamic `import()`** (own chunk each, no main-bundle growth). The choice persists to `localStorage` **and to the Supabase profile row** (`profiles.language`, migration `0004`) so it **syncs across devices** — applied on sign-in via `loadData`; all language writes are best-effort so a not-yet-migrated column never blocks onboarding.
2. ✅ **String extraction** — every user-facing string across the app (App shell, Dashboard, WaterTracker, FoodSearch, ExerciseTracker, AiCoach, PhotoAnalyzer, Scanner, ProgressCharts + streak badges, Onboarding, Auth, UpdatePassword, and the modals) uses translation keys in `src/i18n/locales/{en,sr,hr,bs}.json`. Stored data (profile enums, restriction/workout names, meal-name provenance tags) stays canonical English by design.
3. ✅ **Localize AI responses** — the active language is sent with each AI request; the server appends a language instruction so Gemini replies (names, summaries, notes, suggestions, recipes) in the user's language.
4. ✅ **Locale formatting** — date labels (dashboard, 7-day trend) format via the active locale (`localeTag()`); day counts use proper Slavic plural forms (one/few/other).
* Optional later: translate the food/workout catalog names in `src/data.ts`; add Serbian Cyrillic; more languages; native-speaker QA pass.

### Social / Account
* ✅ **OAuth sign-in** — Google shipped (`signInWithOAuth`); Apple still optional/future.
* ✅ **Password reset** — shipped (forgot-password email + in-app update flow).
* **Account management** — change email. (✅ in-app account deletion shipped.)
* ✅ **Public promo quiz** — the quiz lives at its own `/quiz` route. **Logged-out** visitors can take it, see their computed plan, then "Create account to save"; answers are stashed in `localStorage` and auto-applied on first sign-in (`store.loadData`). Signed-in users use `/quiz` to edit/re-take. Possible follow-ups: a shareable result/landing variant, analytics on completion.

---

## 📈 Engineering Backlog & Tech Debt

- [x] **State Management** — migrated `App.tsx` prop-drilling into a Zustand store.
- [x] **Cloud persistence & auth** — Supabase with RLS.
- [x] **API hardening** — validation, rate limiting, security headers, health check.
- [x] **Unit & Integration Tests**: **Vitest** (`npm test`, node env), **65 tests**. *Unit*: core math (Mifflin–St Jeor goal + unit conversions, streak/badge derivation, timezone-safe dates) and **store actions** (optimistic updates + rollback for addEntry/removeEntry/updateGoal/adjustWater/resetData/updateLanguage, against a mocked supabase). *Integration* (`server.test.ts`, **supertest**): every `/api` route with a mocked Gemini + service-role Supabase + `fetch` — success shapes, `zod` 400s, transient→503 mapping, the barcode Open-Food-Facts→demo→AI fallback chain, account-deletion auth paths, and the production CSP header. The Express `app` is exported (guarded by `process.env.VITEST` so importing it doesn't boot the server). *Not covered*: the rate limiter (config-only).
- [x] **True Barcode Lookup**: `/api/barcode` queries **Open Food Facts** (free, no key) first — per-serving values when available, else per 100 g, 4 s timeout — then falls back to the demo list, then an AI estimate.
- [~] **Searchable food-database API**: **food search is now backed by USDA FoodData Central** (`/api/food-search` → `lookupUsdaFoods`, gated on `FDC_API_KEY`; returns `[]` when unset so the client keeps its local catalog). The FoodSearch "Database" tab debounces a live lookup that augments the in-bundle `src/data.ts` staples with real generic-food data, complementing **Open Food Facts** (branded/barcode, `/api/barcode`) and the Gemini estimate (`/api/estimate`). *Remaining*: workouts still use the static `src/data.ts` catalog — back them with **wger** (free, open REST API) for a larger exercise list, keeping the MET-based `caloriesPerMinute` burn math. Optional freemium food sources if natural-language parsing is wanted later: **Nutritionix** / **Edamam**. Minor UX polish (deferred): when an FDC-keyed search returns zero matches the online section just hides — could show a subtle "No online matches" hint (only when a key is configured, so it never shows pre-key).
- [x] **Bundle size**: Heavy, non-initial tabs (FoodSearch, ExerciseTracker, AiCoach, ProgressCharts, PhotoAnalyzer, Scanner) are **lazy-loaded via `React.lazy` + Suspense**, so **recharts (~426 kB)** and the camera/AI code load only on demand. Initial JS chunk dropped from ~1,176 kB to **~699 kB**.
- [x] **AI reliability**: retry transient Gemini errors with exponential backoff + jitter and fall back through a configurable model chain (`GEMINI_MODELS`) when the primary is overloaded.
- [x] **Tighten CSP**: production requests now carry a tailored `helmet` Content-Security-Policy — `default-src 'self'`, `script-src 'self'` (no `unsafe-inline`/`unsafe-eval` — the one boot-time inline script was moved to `public/sw-cleanup.js`), `style-src 'unsafe-inline'` (React/Recharts inline styles), `img-src 'self' data: blob:` (camera/photo previews), and `connect-src` limited to `'self'` + the Supabase origin (auto-resolved from env or `.env.production`). CSP is production-only; dev keeps it off for Vite HMR.
- [~] **Secrets management**: no code change needed — the server already reads `GEMINI_API_KEY` (and `SUPABASE_SERVICE_ROLE_KEY`) from `process.env`, so moving them into **Google Secret Manager** is a Cloud Run config step. Runbook (exact `gcloud` commands) is in the README's Deployment section. *Pending*: run the one-time `--update-secrets` on the live service.
- [ ] **Offline support**: Re-introduce an offline cache layer (the PWA service worker + cached data) now that data is cloud-backed.
- [x] **In-app account deletion**: "Delete account" button → `DELETE /api/account` (verifies the caller's token, deletes via Supabase service-role; rows cascade). The static `/delete-account` page remains as the documented request path for the Play Data Safety form.
