import express, { type Request, type Response } from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z, type ZodType } from "zod";

// Load environment variables
dotenv.config();

const app = express();
// Hosts (Render, Railway, Cloud Run, etc.) inject the port to listen on.
const PORT = Number(process.env.PORT) || 3000;

// Security headers. CSP is disabled for now because the SPA (Vite dev + bundled
// assets) needs a tailored policy; tightening it is a Tier 3 follow-up.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));

// Lightweight health check for load balancers / uptime monitors.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Digital Asset Links — required for the Android TWA to verify domain ownership
// and run without a browser address bar. Served from a committed file (copied
// into the container via `COPY . .`). Explicit route so it works regardless of
// how static assets are bundled.
app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "assetlinks.json"), (err) => {
    if (err) res.status(404).json({ error: "assetlinks not configured" });
  });
});

// Privacy policy — required by the Google Play Data Safety section.
app.get("/privacy", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "privacy.html"), (err) => {
    if (err) res.status(404).send("Privacy policy not found.");
  });
});

// Account/data deletion instructions — required by Google Play (Data Safety
// "Delete account URL"). Steps to request deletion + what is removed/retained.
app.get("/delete-account", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "delete-account.html"), (err) => {
    if (err) res.status(404).send("Page not found.");
  });
});

// Throttle the (paid) AI endpoints to limit abuse and runaway Gemini spend.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // 30 requests / minute / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down and try again shortly." },
});
app.use("/api/", aiLimiter);

// Lazy-initialized Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Model fallback chain. If the primary model is overloaded, we fall through to
// the next one instead of hammering the same overloaded model. Configurable via
// the GEMINI_MODELS env var (comma-separated) so it can be tuned without a code
// change. The first entry is the primary; the rest are fallbacks in order.
const MODELS = (process.env.GEMINI_MODELS || "gemini-3.5-flash,gemini-2.5-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const RETRIES_PER_MODEL = 2; // attempts per model = RETRIES_PER_MODEL + 1

// Detect transient upstream errors (overload / rate limit) that are worth retrying.
function isTransient(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err);
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("overloaded") ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("500") ||
    msg.includes("INTERNAL") ||
    msg.includes("DEADLINE")
  );
}

// A truncated/empty/garbled response is often transient too — worth one more shot.
function isRetryable(err: unknown): boolean {
  if (isTransient(err)) return true;
  const msg = String((err as any)?.message ?? err);
  return err instanceof SyntaxError || msg.includes("No response text");
}

// A model that doesn't exist / isn't enabled for this key. Lets us safely skip a
// bad fallback entry without failing the whole request.
function isModelUnavailable(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err);
  return msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("not found") || msg.includes("not supported");
}

type GenParams = Parameters<GoogleGenAI["models"]["generateContent"]>[0];

// Call Gemini and parse its JSON response. Retries transient failures with
// exponential backoff + jitter, then falls back to the next model in the chain.
async function generateJSON(params: Omit<GenParams, "model">, retries = RETRIES_PER_MODEL): Promise<any> {
  const ai = getGeminiClient();
  let lastErr: unknown;
  let transientErr: unknown; // remembered so the friendly "AI is busy" 503 wins over a misconfigured-fallback 404

  for (let m = 0; m < MODELS.length; m++) {
    const model = MODELS[m];
    const isLastModel = m === MODELS.length - 1;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({ ...params, model } as GenParams);
        const text = response.text;
        if (!text) throw new Error("No response text received from Gemini.");
        return JSON.parse(text.trim());
      } catch (err) {
        lastErr = err;
        if (isTransient(err)) transientErr = err;
        const retryable = isRetryable(err);

        // Same model, more attempts left, and the error looks transient → back off and retry.
        if (attempt < retries && retryable) {
          const backoff = 400 * Math.pow(3, attempt) + Math.floor(Math.random() * 250);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        // Out of attempts for this model (or a bad model name). Try the next
        // model in the chain when the failure is transient or the model is
        // unavailable; otherwise the input is bad and switching won't help.
        if (!isLastModel && (retryable || isModelUnavailable(err))) {
          break; // exit the attempt loop → next model
        }
        throw transientErr ?? err;
      }
    }
  }
  // Prefer surfacing a transient/overload error so the user sees the friendly
  // "AI is busy, try again" message rather than a misconfigured-fallback error.
  throw transientErr ?? lastErr;
}

// Map an error to a clean, user-facing API response with the right status code.
function sendAiError(res: Response, error: unknown, fallback: string): void {
  console.error(fallback, error);
  if (isTransient(error)) {
    res.status(503).json({ error: "The AI service is busy right now. Please try again in a moment." });
  } else if (String((error as any)?.message ?? "").includes("GEMINI_API_KEY")) {
    res.status(500).json({ error: "AI is not configured on the server." });
  } else {
    res.status(500).json({ error: fallback });
  }
}

// Lazy-initialized Supabase admin client (service-role). Used only for
// privileged server-side operations like account deletion. The service-role key
// bypasses Row-Level Security, so it must NEVER be exposed to the client — it
// lives only in a runtime env var (like GEMINI_API_KEY).
let supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }
    supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseAdmin;
}

// Validate req.body against a zod schema; on failure send 400 and return null.
function parseBody<T>(schema: ZodType<T>, req: Request, res: Response): T | null {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0]?.message ?? "Invalid request body." });
    return null;
  }
  return result.data;
}

// ----- Request body schemas -----
// Active UI language (BCP-ish code from the client). Optional — absent means
// English. Used to make the model reply in the user's language.
const langField = z.string().max(8).optional();

const estimateSchema = z.object({
  description: z.string().min(1, "Food description is required.").max(500),
  lang: langField,
});
const barcodeSchema = z.object({
  barcode: z.string().min(1, "Barcode is required.").max(64),
  lang: langField,
});
const searchSchema = z.object({
  query: z.string().min(1, "Search query is required.").max(200),
  lang: langField,
});
const photoSchema = z.object({
  // Base64 JPEG (no data: prefix needed — we strip it if present). The global
  // 1 MB JSON body limit is the real guard; the client compresses before upload.
  image: z.string().min(1, "Image data is required.").max(9_000_000),
  mimeType: z.string().max(40).optional(),
  lang: langField,
});
// Optional personalization sent by the client (built from the user's profile).
const prefsSchema = z
  .object({
    goalType: z.string().max(40).optional(),
    diet: z.string().max(40).optional(),
    restrictions: z.array(z.string().max(60)).max(30).optional(),
    workouts: z.array(z.string().max(60)).max(30).optional(),
    activity: z.string().max(40).optional(),
  })
  .optional();
const recipesSchema = z.object({
  ingredients: z.string().min(1, "Ingredients are required.").max(500),
  prefs: prefsSchema,
  lang: langField,
});
const coachSchema = z.object({
  entries: z.array(z.any()).max(500),
  goal: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
  date: z.string().max(40).optional(),
  prefs: prefsSchema,
  lang: langField,
});

// Format the prefs payload into a prompt snippet the model can act on.
type Prefs = z.infer<typeof prefsSchema>;
function prefsText(p: Prefs): string {
  if (!p) return "";
  const goalMap: Record<string, string> = {
    lose: "lose weight",
    maintain: "maintain weight",
    gain: "gain weight",
    build_muscle: "build muscle",
  };
  const parts: string[] = [];
  if (p.goalType) parts.push(`their primary goal is to ${goalMap[p.goalType] ?? p.goalType}`);
  if (p.diet) parts.push(`they follow a ${p.diet.replace(/_/g, " ")} diet`);
  if (p.restrictions?.length) parts.push(`they must avoid (allergies/restrictions): ${p.restrictions.join(", ")}`);
  if (p.workouts?.length) parts.push(`they prefer these workouts: ${p.workouts.join(", ")}`);
  if (p.activity) parts.push(`activity level: ${p.activity}`);
  return parts.length ? ` User profile — ${parts.join("; ")}.` : "";
}

// Ask the model to write its human-readable output in the user's language.
// English is the default (no instruction needed). Serbian uses Latin script.
const LANG_NAMES: Record<string, string> = {
  sr: "Serbian (ekavian dialect, Latin script — no Cyrillic)",
  hr: "Croatian",
  bs: "Bosnian",
};
function langText(lang?: string): string {
  const name = lang ? LANG_NAMES[lang] : undefined;
  if (!name) return "";
  return ` IMPORTANT: Write every human-readable text field (names, summaries, notes, suggestions, instructions, messages) in ${name}, using natural native phrasing. Keep numbers and measurement units (g, kcal, ml) unchanged.`;
}

// 1. API Route: Estimate food nutrition from a custom text description
app.post("/api/estimate", async (req, res) => {
  const body = parseBody(estimateSchema, req, res);
  if (!body) return;

  const prompt = `Estimate the nutritional facts (calories, protein, carbs, fat, typical serving size, and serving unit) for the following food item or meal description: "${body.description}". Provide the most realistic and accurate nutritional values possible.${langText(body.lang)}`;

  try {
    const result = await generateJSON({
      contents: prompt,
      config: {
        systemInstruction: "You are a professional nutrition expert and dietitian. Analyze food and meal descriptions to provide accurate estimations for calories (kcal) and macronutrients in grams. Return values as a structured JSON object.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Clean, standardized title of the food or meal.",
            },
            calories: {
              type: Type.INTEGER,
              description: "Estimated energy content in kcal.",
            },
            protein: {
              type: Type.NUMBER,
              description: "Estimated protein in grams.",
            },
            carbs: {
              type: Type.NUMBER,
              description: "Estimated total carbohydrates in grams.",
            },
            fat: {
              type: Type.NUMBER,
              description: "Estimated total fat in grams.",
            },
            servingSize: {
              type: Type.INTEGER,
              description: "Estimated typical serving size number (e.g. 1, 100, 200).",
            },
            servingUnit: {
              type: Type.STRING,
              description: "The serving unit (e.g., 'g', 'slice', 'cup', 'oz', 'bowl').",
            },
          },
          required: ["name", "calories", "protein", "carbs", "fat", "servingSize", "servingUnit"],
        },
      },
    });
    res.json(result);
  } catch (error) {
    sendAiError(res, error, "Failed to estimate food nutrition.");
  }
});

// 2. API Route: Scan and parse barcode
// Look up a real product by barcode from Open Food Facts (free, no API key).
// Returns our nutrition shape, or null if not found / no usable data so the
// caller can fall back to the demo list or an AI estimate.
async function lookupOpenFoodFacts(barcode: string): Promise<Record<string, unknown> | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode
  )}.json?fields=product_name,brands,nutriments,serving_quantity`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000); // don't let a slow lookup hang the request
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "NutriFlow/1.0 (chillibrimedia@gmail.com)" },
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data?.status !== 1 || !data.product) return null;

    const p = data.product;
    const n = p.nutriments ?? {};
    // Build a clean "Product · Brand" name. OFF's `brands` is a messy comma list,
    // so take the first brand and skip it if the product name already includes it.
    const productName = String(p.product_name ?? "").trim();
    const firstBrand = String(p.brands ?? "").split(",")[0].trim();
    const name =
      firstBrand && !productName.toLowerCase().includes(firstBrand.toLowerCase())
        ? `${productName} · ${firstBrand}`
        : productName;
    if (!name) return null;

    const toNum = (v: unknown) => (typeof v === "number" ? v : Number(v)) || 0;
    const round1 = (v: number) => Math.round(v * 10) / 10;
    const servingQ = toNum(p.serving_quantity);
    // Prefer per-serving values when a serving size is known; otherwise per 100 g.
    const perServing = n["energy-kcal_serving"] != null && servingQ > 0;
    const cal = perServing ? n["energy-kcal_serving"] : n["energy-kcal_100g"];
    if (cal == null) return null; // no usable energy value -> let the caller fall back

    return {
      name,
      calories: Math.round(toNum(cal)),
      protein: round1(toNum(perServing ? n["proteins_serving"] : n["proteins_100g"])),
      carbs: round1(toNum(perServing ? n["carbohydrates_serving"] : n["carbohydrates_100g"])),
      fat: round1(toNum(perServing ? n["fat_serving"] : n["fat_100g"])),
      servingSize: perServing ? Math.round(servingQ) : 100,
      servingUnit: "g",
    };
  } catch {
    return null; // network error / timeout / abort -> fall back
  } finally {
    clearTimeout(timer);
  }
}

app.post("/api/barcode", async (req, res) => {
  const body = parseBody(barcodeSchema, req, res);
  if (!body) return;
  const { barcode } = body;

  // 1) Real product database (Open Food Facts) — free, no key required.
  const offProduct = await lookupOpenFoodFacts(barcode);
  if (offProduct) {
    res.json(offProduct);
    return;
  }

  // 2) Known demo barcodes — instant, offline-friendly fallback.
  const mockBarcodes: Record<string, any> = {
    "49000000443": {
      name: "Coca-Cola Classic (12 oz)",
      calories: 140,
      protein: 0,
      carbs: 39,
      fat: 0,
      servingSize: 355,
      servingUnit: "ml",
    },
    "070569005077": {
      name: "Rolled Oats (1/2 cup)",
      calories: 150,
      protein: 5,
      carbs: 27,
      fat: 3,
      servingSize: 40,
      servingUnit: "g",
    },
    "011110038364": {
      name: "Greek Yogurt - Plain Non-Fat",
      calories: 80,
      protein: 15,
      carbs: 6,
      fat: 0,
      servingSize: 150,
      servingUnit: "g",
    },
    "021130070519": {
      name: "Whole Wheat Bread (1 Slice)",
      calories: 70,
      protein: 4,
      carbs: 12,
      fat: 1,
      servingSize: 28,
      servingUnit: "g",
    },
    "074570610053": {
      name: "Whey Protein Powder (1 Scoop)",
      calories: 120,
      protein: 24,
      carbs: 3,
      fat: 1.5,
      servingSize: 32,
      servingUnit: "g",
    }
  };

  if (mockBarcodes[barcode]) {
    res.json(mockBarcodes[barcode]);
    return;
  }

  // If it's a custom or unknown barcode, let's ask Gemini to intelligently guess/simulate a realistic grocery product
  // associated with the barcode numbers to make scanning other barcodes incredibly fun and engaging!
  const prompt = `Identify or realistically estimate the grocery item and nutritional facts for barcode/UPC/EAN numbers: "${barcode}". If the barcode is real, identify it. If unknown, generate a highly realistic, typical grocery item (like protein bars, chips, soups, or snacks) and provide exact nutrients.${langText(body.lang)}`;

  try {
    const result = await generateJSON({
      contents: prompt,
      config: {
        systemInstruction: "You are a barcode nutrition interpreter. Identify products by barcode or generate a highly realistic product nutrition profile if the barcode is custom. Return values as a structured JSON object.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Grocery product name and brand.",
            },
            calories: {
              type: Type.INTEGER,
              description: "Energy content in kcal.",
            },
            protein: {
              type: Type.NUMBER,
              description: "Protein in grams.",
            },
            carbs: {
              type: Type.NUMBER,
              description: "Total carbohydrates in grams.",
            },
            fat: {
              type: Type.NUMBER,
              description: "Total fat in grams.",
            },
            servingSize: {
              type: Type.INTEGER,
              description: "Standard serving size number.",
            },
            servingUnit: {
              type: Type.STRING,
              description: "Serving unit (e.g., 'g', 'oz', 'bottle', 'bar').",
            },
          },
          required: ["name", "calories", "protein", "carbs", "fat", "servingSize", "servingUnit"],
        },
      },
    });
    res.json(result);
  } catch (error) {
    sendAiError(res, error, "Failed to parse barcode.");
  }
});

// 2b. API Route: Analyze a meal photo with Gemini vision.
// Estimates the total calories + macros for everything on the plate so the user
// can review and log it. Reuses the same retry/fallback model chain as the other
// AI routes (gemini-3.5-flash supports image input).
app.post("/api/analyze-photo", async (req, res) => {
  const body = parseBody(photoSchema, req, res);
  if (!body) return;

  // Accept either a raw base64 string or a full data URL (strip the prefix).
  const base64 = body.image.includes(",") ? body.image.split(",")[1] : body.image;
  const mimeType = body.mimeType || "image/jpeg";

  const prompt =
    "Analyze this meal photo. Identify the distinct food and drink items visible, then estimate the TOTAL nutrition for everything shown as a single meal. Assume typical single-serving portions when the size is ambiguous, and give realistic values. If the photo contains no food, set name to 'No food detected', items to an empty array, and every number to 0." +
    langText(body.lang);

  try {
    const result = await generateJSON({
      contents: [
        { text: prompt },
        { inlineData: { mimeType, data: base64 } },
      ],
      config: {
        systemInstruction:
          "You are a nutrition vision expert. You estimate calories and macronutrients from meal photos. Be realistic and concise, and always return a single structured JSON object describing the whole plate.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "Short name for the whole meal, e.g. 'Grilled chicken with rice and salad'.",
            },
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "The distinct foods/drinks detected in the photo.",
            },
            calories: { type: Type.INTEGER, description: "Total energy for the plate in kcal." },
            protein: { type: Type.NUMBER, description: "Total protein in grams." },
            carbs: { type: Type.NUMBER, description: "Total carbohydrates in grams." },
            fat: { type: Type.NUMBER, description: "Total fat in grams." },
            note: {
              type: Type.STRING,
              description: "One short caveat about portion/assumptions, or '' if none.",
            },
          },
          required: ["name", "items", "calories", "protein", "carbs", "fat"],
        },
      },
    });
    res.json(result);
  } catch (error) {
    sendAiError(res, error, "Failed to analyze the meal photo.");
  }
});

// 3. API Route: AI-powered food search/suggestions
app.post("/api/search-ai", async (req, res) => {
  const body = parseBody(searchSchema, req, res);
  if (!body) return;

  const prompt = `Provide a list of 4 to 6 food items that match or are highly relevant to the search query: "${body.query}". For each food item, provide its typical serving size, serving unit, and exact nutritional content (calories, protein, carbs, fat).${langText(body.lang)}`;

  try {
    const result = await generateJSON({
      contents: prompt,
      config: {
        systemInstruction: "You are a professional nutrition catalog. For any food query, suggest 4 to 6 relevant food items with exact calories and macronutrients. Return the list as a structured JSON array.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "Name of the food item.",
              },
              calories: {
                type: Type.INTEGER,
                description: "Energy in kcal.",
              },
              protein: {
                type: Type.NUMBER,
                description: "Protein in grams.",
              },
              carbs: {
                type: Type.NUMBER,
                description: "Carbohydrates in grams.",
              },
              fat: {
                type: Type.NUMBER,
                description: "Fat in grams.",
              },
              servingSize: {
                type: Type.INTEGER,
                description: "Typical serving size number.",
              },
              servingUnit: {
                type: Type.STRING,
                description: "Serving unit (e.g. 'g', 'cup', 'oz', 'piece').",
              },
            },
            required: ["name", "calories", "protein", "carbs", "fat", "servingSize", "servingUnit"],
          },
        },
      },
    });
    res.json(result);
  } catch (error) {
    sendAiError(res, error, "Failed to search foods via AI.");
  }
});

// 4. API Route: AI Recipes Generator based on ingredients
app.post("/api/generate-recipes", async (req, res) => {
  const body = parseBody(recipesSchema, req, res);
  if (!body) return;

  const prompt = `Based on these ingredients available: "${body.ingredients}", generate 3 distinct, delicious, healthy recipe recommendations. Calculate exact nutritional values (calories, protein, carbs, fat) and specify instructions, preparation time (mins), and difficulty.${prefsText(body.prefs)} IMPORTANT: every recipe MUST comply with the user's dietary preference and MUST NOT contain any of their restricted/allergen ingredients; lean the recipes toward their goal.${langText(body.lang)}`;

  try {
    const result = await generateJSON({
      contents: prompt,
      config: {
        systemInstruction: "You are a professional chef and sports nutritionist. Create exactly 3 fitness-friendly recipes using provided ingredients. Return a structured JSON array.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the recipe" },
              calories: { type: Type.INTEGER, description: "Estimated kcal" },
              protein: { type: Type.NUMBER, description: "Protein in grams" },
              carbs: { type: Type.NUMBER, description: "Carbohydrates in grams" },
              fat: { type: Type.NUMBER, description: "Fat in grams" },
              prepTime: { type: Type.INTEGER, description: "Preparation & cooking time in minutes" },
              difficulty: { type: Type.STRING, description: "Easy, Medium, or Hard" },
              summary: { type: Type.STRING, description: "A brief appetizing sentence about the recipe." },
              instructions: { type: Type.STRING, description: "Concise step-by-step instructions (plain text or markdown)." },
            },
            required: ["name", "calories", "protein", "carbs", "fat", "prepTime", "difficulty", "summary", "instructions"],
          },
        },
      },
    });
    res.json(result);
  } catch (error) {
    sendAiError(res, error, "Failed to generate AI recipes.");
  }
});

// 5. API Route: AI Coach Daily Nutrition & Workout Analysis
app.post("/api/coach-analysis", async (req, res) => {
  const body = parseBody(coachSchema, req, res);
  if (!body) return;
  const { entries, goal, date, prefs } = body;

  const prompt = `Analyze the logged diet and exercise entries for date "${date || 'Today'}".
Current Daily Goals: ${JSON.stringify(goal)}.
Daily Logs: ${JSON.stringify(entries)}.${prefsText(prefs)}

Evaluate their calorie balance (consumed vs. burned), macronutrient balance (protein, carbs, fat target vs actual), and physical activity. Give a constructive analysis. Tailor your summary and the 3 suggestions to the user's profile above — align advice with their goal, respect their dietary preference, never suggest foods that conflict with their restrictions/allergies, and prefer their favored workout types.${langText(body.lang)}`;

  try {
    const result = await generateJSON({
      contents: prompt,
      config: {
        systemInstruction: "You are a friendly, motivational, high-performance athletic diet coach. Evaluate user logs and give professional structured feedback including a letter grade (e.g. A, B+, C), a 2-3 sentence motivational summary, and 3 specific, actionable nutrition or workout suggestions.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grade: { type: Type.STRING, description: "Overall letter grade (e.g., A+, B-, C)" },
            summary: { type: Type.STRING, description: "A highly motivating, friendly summary analysis of the day's intake and workout." },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Three highly actionable suggestions (e.g., 'Hydrate more', 'Add 15g protein to breakfast', 'Increase rest between HIIT sets')."
            },
            streakMessage: { type: Type.STRING, description: "A fun booster message encouraging their progress." }
          },
          required: ["grade", "summary", "suggestions", "streakMessage"],
        },
      },
    });
    res.json(result);
  } catch (error) {
    sendAiError(res, error, "Failed to analyze diet & workouts.");
  }
});

// 6. API Route: Permanently delete the signed-in user's account + all their data.
// Verifies the caller's access token, then deletes the auth user. Their rows in
// entries/goals/hydration cascade-delete via the on-delete-cascade FKs.
app.delete("/api/account", async (req, res) => {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  let admin: SupabaseClient;
  try {
    admin = getSupabaseAdmin();
  } catch {
    res.status(500).json({ error: "Account deletion is not configured on the server." });
    return;
  }

  try {
    // Resolve the token to a user — this both authenticates the caller and
    // guarantees they can only ever delete their own account.
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Your session is invalid. Please sign in again." });
      return;
    }

    const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
    if (delError) {
      console.error("Account deletion failed:", delError);
      res.status(500).json({ error: "Couldn't delete your account. Please try again." });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Couldn't delete your account. Please try again." });
  }
});

// Configure Vite or Static Asset Serving
async function startServer() {
  const hasDist = fs.existsSync(path.join(process.cwd(), "dist", "index.html"));
  const isRunningFromTS = process.argv[1] && process.argv[1].endsWith("server.ts");
  const isRunningFromBundle = process.argv[1] && (process.argv[1].endsWith(".cjs") || process.argv[1].includes("dist"));
  const isProd = !isRunningFromTS && (process.env.NODE_ENV === "production" || isRunningFromBundle || hasDist);

  if (!isProd) {
    console.log("Setting up Vite development middleware...");
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static assets in production mode...");
    // Robust path resolution checking multiple potential build layout locations
    let distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = __dirname;
    }
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = path.join(__dirname, "dist");
    }
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      distPath = process.cwd();
    }

    console.log(`Resolved production static assets path: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Calorie & Macro Tracker server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
