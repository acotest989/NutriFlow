import express, { type Request, type Response } from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z, type ZodType } from "zod";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Security headers. CSP is disabled for now because the SPA (Vite dev + bundled
// assets) needs a tailored policy; tightening it is a Tier 3 follow-up.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));

// Lightweight health check for load balancers / uptime monitors.
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
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

// Detect transient upstream errors (overload / rate limit) that are worth retrying.
function isTransient(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err);
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("overloaded") ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED")
  );
}

// Call Gemini and parse its JSON response, retrying transient failures with backoff.
async function generateJSON(params: Parameters<GoogleGenAI["models"]["generateContent"]>[0], retries = 2): Promise<any> {
  const ai = getGeminiClient();
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent(params);
      const text = response.text;
      if (!text) throw new Error("No response text received from Gemini.");
      return JSON.parse(text.trim());
    } catch (err) {
      lastErr = err;
      if (attempt < retries && isTransient(err)) {
        // 500ms, then 1500ms
        await new Promise((r) => setTimeout(r, 500 * Math.pow(3, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
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
const estimateSchema = z.object({
  description: z.string().min(1, "Food description is required.").max(500),
});
const barcodeSchema = z.object({
  barcode: z.string().min(1, "Barcode is required.").max(64),
});
const searchSchema = z.object({
  query: z.string().min(1, "Search query is required.").max(200),
});
const recipesSchema = z.object({
  ingredients: z.string().min(1, "Ingredients are required.").max(500),
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
});

// 1. API Route: Estimate food nutrition from a custom text description
app.post("/api/estimate", async (req, res) => {
  const body = parseBody(estimateSchema, req, res);
  if (!body) return;

  const prompt = `Estimate the nutritional facts (calories, protein, carbs, fat, typical serving size, and serving unit) for the following food item or meal description: "${body.description}". Provide the most realistic and accurate nutritional values possible.`;

  try {
    const result = await generateJSON({
      model: "gemini-3.5-flash",
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
app.post("/api/barcode", async (req, res) => {
  const body = parseBody(barcodeSchema, req, res);
  if (!body) return;
  const { barcode } = body;

  // Handled pre-defined list for immediate and robust offline simulation in app,
  // otherwise use AI to guess or simulate product details.
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
  const prompt = `Identify or realistically estimate the grocery item and nutritional facts for barcode/UPC/EAN numbers: "${barcode}". If the barcode is real, identify it. If unknown, generate a highly realistic, typical grocery item (like protein bars, chips, soups, or snacks) and provide exact nutrients.`;

  try {
    const result = await generateJSON({
      model: "gemini-3.5-flash",
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

// 3. API Route: AI-powered food search/suggestions
app.post("/api/search-ai", async (req, res) => {
  const body = parseBody(searchSchema, req, res);
  if (!body) return;

  const prompt = `Provide a list of 4 to 6 food items that match or are highly relevant to the search query: "${body.query}". For each food item, provide its typical serving size, serving unit, and exact nutritional content (calories, protein, carbs, fat).`;

  try {
    const result = await generateJSON({
      model: "gemini-3.5-flash",
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

  const prompt = `Based on these ingredients available: "${body.ingredients}", generate 3 distinct, delicious, healthy recipe recommendations. Calculate exact nutritional values (calories, protein, carbs, fat) and specify instructions, preparation time (mins), and difficulty.`;

  try {
    const result = await generateJSON({
      model: "gemini-3.5-flash",
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
  const { entries, goal, date } = body;

  const prompt = `Analyze the logged diet and exercise entries for date "${date || 'Today'}".
Current Daily Goals: ${JSON.stringify(goal)}.
Daily Logs: ${JSON.stringify(entries)}.

Evaluate their calorie balance (consumed vs. burned), macronutrient balance (protein, carbs, fat target vs actual), and physical activity. Give a constructive analysis.`;

  try {
    const result = await generateJSON({
      model: "gemini-3.5-flash",
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
