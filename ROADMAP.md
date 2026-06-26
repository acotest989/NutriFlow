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

1. **Google sign-in (OAuth)** — one-tap Google login to avoid the clunky email-confirmation flow on mobile and improve onboarding/conversion.
2. **In-app account deletion** — a "Delete account" button + server endpoint (Supabase service-role) that removes the user and all rows (currently request-by-email via `/delete-account`).

✅ **Done:**
* **Password reset** — forgot-password email + in-app update-password flow.
* **AI reliability** — the AI helper (`generateJSON` in `server.ts`) now retries transient Gemini errors (503/overloaded/429/500/timeout, plus empty/garbled responses) with exponential backoff + jitter, then **falls back to the next model in a chain** instead of hammering the overloaded one. The chain is env-configurable via `GEMINI_MODELS` (default `gemini-3.5-flash,gemini-2.5-flash`); an unavailable fallback model is skipped safely.

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
* **OAuth sign-in** (Google / Apple) in addition to email/password.
* ✅ **Password reset** — shipped (forgot-password email + in-app update flow).
* **Account management** — change email, in-app account deletion.

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
- [ ] **In-app account deletion**: Currently deletion is request-by-email via the `/delete-account` page. Add an in-app "Delete account" button backed by a server endpoint (Supabase service-role) that removes the user + all rows.
