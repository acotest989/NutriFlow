# NutriFlow AI — Future Backlog & Roadmap

This document tracks what shipped in v1 and what remains to take **NutriFlow** further into a production-grade wellness application.

---

## ✅ Shipped in v1

NutriFlow is a deployed, multi-user cloud application (Google Cloud Run + Supabase). The following are done:

* **Global state** — app state centralized in a Zustand store (replaced prop-drilling).
* **Persistent database & cloud sync** — meals, exercises, goals, and hydration persist per-user in **Supabase (PostgreSQL)** and sync across devices.
* **Authentication** — Supabase email/password auth with email confirmation; the app is gated behind sign-in.
* **Row-Level Security** — every table has RLS so users access only their own rows.
* **Hardened backend** — `helmet` security headers, `express-rate-limit` on the AI routes, `zod` request validation, a `/health` endpoint, and graceful retry/handling of transient Gemini errors.
* **Resilient UX** — global error boundary, user-facing error toasts, and data-loading indicators.
* **Production deployment** — containerized (`Dockerfile`) and deployed to Cloud Run with auto-deploy on push to `main`.
* **Android app on Google Play** — packaged as a **Trusted Web Activity (TWA)** wrapping the live site (`app.nutriflow.twa`), domain-verified via Digital Asset Links, installed and confirmed running full-screen (no address bar). Store listing, Data Safety, content rating, and privacy/data-deletion pages complete. See [play-store packaging notes].

---

## 🔄 Update model (TWA)

Because the Android app is a thin TWA over the live web app, **content/feature/UI/back-end changes deploy via `git push` to `main` → Cloud Run, and appear in the installed app instantly — no new Play Store build or review.** A new `.aab` is only needed for native-wrapper changes: launcher icon, splash, app name, package id, target SDK, permissions, or the Play `versionName`/`versionCode`.

---

## 🎯 Near-term (next up)

Prioritized post-launch work:

_All near-term personalization items shipped. Next ideas live in the backlog below (e.g. tighter keto macro split, Apple/Health sync, barcode lookup)._

✅ **Done:**
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
* **Gemini Photo Plate Analysis**: Leverage Gemini's vision capability to analyze raw food photos (uploaded via webcam or mobile camera) to automatically estimate meal portion sizes, ingredients, and total macronutrients.
* **Personalized AI Meal Prep Calendar**: A weekly calendar scheduler that formulates custom grocery lists and dietary schedules based on user allergies, favorite recipes, and macro goals.
* **Voice-Logged Meals**: Use speech-to-text allowing users to log meals naturally: *"I had a double-shot latte and two scrambled eggs for breakfast."*

### Phase 4: Gamification & Accountability
* **Streak Badges**: Interactive milestone indicators for continuous water intake, workout consistency, and staying within budget.
* **Coach Voice Over (TTS)**: Convert the daily AI coach review text into realistic voice notes using a text-to-speech engine to simulate a real personal trainer.
* **Community Challenges**: Optional shared lobbies where users can join team hydration or steps challenges.

### Social / Account
* ✅ **OAuth sign-in** — Google shipped (`signInWithOAuth`); Apple still optional/future.
* ✅ **Password reset** — shipped (forgot-password email + in-app update flow).
* **Account management** — change email. (✅ in-app account deletion shipped.)

---

## 📈 Engineering Backlog & Tech Debt

- [x] **State Management** — migrated `App.tsx` prop-drilling into a Zustand store.
- [x] **Cloud persistence & auth** — Supabase with RLS.
- [x] **API hardening** — validation, rate limiting, security headers, health check.
- [ ] **Unit & Integration Tests**: Set up a test runner (Vitest) with a request layer (supertest/MSW) to cover the backend API routes and store actions.
- [ ] **True Barcode Lookup**: Replace the simulated mock database in `Scanner.tsx` with a live request to an open food database (e.g., Open Food Facts).
- [ ] **Bundle size**: Code-split the client (the JS bundle is ~1 MB) to improve first-load performance.
- [x] **AI reliability**: retry transient Gemini errors with exponential backoff + jitter and fall back through a configurable model chain (`GEMINI_MODELS`) when the primary is overloaded.
- [ ] **Tighten CSP**: `helmet`'s Content-Security-Policy is currently disabled; define a tailored policy for the SPA.
- [ ] **Secrets management**: Move `GEMINI_API_KEY` from a plain Cloud Run env var into Secret Manager.
- [ ] **Offline support**: Re-introduce an offline cache layer (the PWA service worker + cached data) now that data is cloud-backed.
- [x] **In-app account deletion**: "Delete account" button → `DELETE /api/account` (verifies the caller's token, deletes via Supabase service-role; rows cascade). The static `/delete-account` page remains as the documented request path for the Play Data Safety form.
