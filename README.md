# NutriFlow AI

**NutriFlow** is an elegant, high-performance personal diet, hydration, and exercise tracker. It features a unique cross-platform presentation layout, pairing a responsive modern web dashboard on desktop with an immersive, interactive mobile smartphone simulator on smaller screens. 

The application is powered by a high-fidelity **Node.js Express backend** combined with **Vite & React 18+**, utilizing the robust **Google Gemini AI SDK** to power intelligent features like automated pantry-based recipe generation and diet-coaching feedback.

---

## 🌟 Key Features

### 1. 📊 Interactive Dashboard & Analytics
* **Macro Calorie Budgeting**: Track consumed calories against an adjustable daily allowance with live percentage gauges.
* **Macronutrient Breakdown**: Visual progress rings mapping Protein, Carbs, and Fats so users can stay inside their target zone.
* **Time-Series Trends**: Embedded charts plotting historic intake and expenditure over the last 7 days.

### 2. ⚡ AI Daily Coach Review
* **Instant Evaluation**: Analyzes daily logged food items, exercises, and target goals at the click of a button.
* **Intelligent Feedback**: Returns an overall daily "grade" (e.g., A, B+, C), a highly motivating summary, and three actionable athletic suggestions.

### 3. 🍳 Pantry Recipe Generator (AI Chef)
* **Custom Meal Crafting**: Input any combination of ingredients sitting in your fridge or pantry.
* **Detailed Formulations**: Gemini instantly formulates three high-macro healthy recipes complete with calories, precise protein/carb/fat content, and prep times.
* **One-Click Logging**: Directly log any generated recipe into your daily meals without manual data entry.

### 4. 💧 Dynamic Hydration Tracker
* **Visual Cup Indicator**: Interactive liquid visual container with smooth spring height physics based on water logged.
* **Preset Additions**: Fast increment buttons (`+250ml`, `+500ml`) and a reduction button to manage baseline daily hydration.

### 5. 🔍 Smart Nutrition Search & Barcode Simulator
* **Natural Language Queries**: Search for common meals, raw ingredients, or complex items to get accurate nutritional estimates.
* **UPC Barcode Scanner**: Simulates camera scanner interactions with realistic viewport crosshairs and preset product scans to easily test barcode lookups.

---

## 🛠️ Technology Stack

* **Frontend**: React 18 (TypeScript), Vite, Tailwind CSS, Recharts (for analytics), Framer Motion (for crisp physical animations).
* **Backend**: Node.js Express server with lazy-loaded `@google/genai` TypeScript SDK.
* **Persistence**: Dual-layer storage setup. Core entries are cached in reactive client-side states, while daily hydration logs persist automatically inside the client's `localStorage` for offline survivability.

---

## 🚀 Getting Started & Local Development

### Prerequisites
* **Node.js** (v18 or higher is recommended)
* A **Google Gemini API Key** (Set this as an environment variable)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment variables template and configure your secrets:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Gemini secret key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Launch the local development server:
   ```bash
   npm run dev
   ```
   Open your browser to the local address outputted in the terminal (by default `http://localhost:3000`).

### Production Build

To compile and optimize both the client assets and the Node server for production, run:
   ```bash
   npm run build
   ```
   This generates static files in `dist/` and compiles the Express backend into `dist/server.cjs`. 

To boot the production server:
   ```bash
   npm run start
   ```

---

## 📁 Project Structure

```text
├── server.ts               # Express Backend server & Gemini API Router
├── src/
│   ├── App.tsx             # App Entry & Cross-platform layout shell
│   ├── types.ts            # Global TypeScript interface definitions
│   ├── index.css           # Tailwind custom imports and root theme declarations
│   ├── components/
│   │   ├── Dashboard.tsx       # Calories progress bar, goal edits & summary
│   │   ├── FoodSearch.tsx      # Natural language food lookup & additions
│   │   ├── ExerciseTracker.tsx # Cardio/Strength logger & burned stats
│   │   ├── Scanner.tsx         # Simulated barcode camera viewfinder
│   │   ├── AiCoach.tsx         # AI Chef Pantry Recipes & Coach Review
│   │   └── WaterTracker.tsx    # Hydro water glass visual simulator
```
