# NutriFlow AI — Future Backlog & Roadmap

This document serves as a repository for feature ideas, engineering refinements, and future expansion steps to take **NutriFlow** from an initial MVP (v1.0) into a production-grade wellness application.

---

## 🗺️ Feature Roadmap & Backlog

### Phase 1: Real-Time Persistent Sync & User Authentication (Crucial)
* **Persistent Database**: Transition from client-side state / standard `localStorage` to **Firebase Firestore** or **Cloud SQL (PostgreSQL)** to persist logs, meals, custom exercises, and history securely across sessions.
* **Authentication Flow**: Set up **Firebase Authentication** or **OAuth 2.0** (Google Sign-In, Apple Sign-In) to allow users to create personal profiles and secure their health data.
* **Multi-Device Syncing**: Ensure that items logged on the mobile simulator or web view instantly synchronize in real-time across all browser windows.

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

---

## 📈 Engineering Backlog & Tech Debt

- [ ] **State Management**: Migrate existing Prop-drilling state inside `App.tsx` into a lightweight global store (e.g., Zustand or React Context API).
- [ ] **Unit & Integration Tests**: Set up a test runner (Vitest or Jest) with MSW (Mock Service Worker) to test backend API endpoints (`/api/coach-analysis`, `/api/generate-recipes`).
- [ ] **True Barcode Lookup**: Replace the simulated mockup database in `Scanner.tsx` with a live REST API request to an open food database (e.g., Open Food Facts).
