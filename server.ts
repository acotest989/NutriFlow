import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// 1. API Route: Estimate food nutrition from a custom text description
app.post("/api/estimate", async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || typeof description !== "string") {
      res.status(400).json({ error: "Food description is required." });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Estimate the nutritional facts (calories, protein, carbs, fat, typical serving size, and serving unit) for the following food item or meal description: "${description}". Provide the most realistic and accurate nutritional values possible.`;

    const response = await ai.models.generateContent({
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

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini.");
    }

    const result = JSON.parse(text.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/estimate:", error);
    res.status(500).json({ error: error.message || "Failed to estimate food nutrition." });
  }
});

// 2. API Route: Scan and parse barcode
app.post("/api/barcode", async (req, res) => {
  try {
    const { barcode } = req.body;
    if (!barcode || typeof barcode !== "string") {
      res.status(400).json({ error: "Barcode is required." });
      return;
    }

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
    const ai = getGeminiClient();
    const prompt = `Identify or realistically estimate the grocery item and nutritional facts for barcode/UPC/EAN numbers: "${barcode}". If the barcode is real, identify it. If unknown, generate a highly realistic, typical grocery item (like protein bars, chips, soups, or snacks) and provide exact nutrients.`;

    const response = await ai.models.generateContent({
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

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini.");
    }

    const result = JSON.parse(text.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/barcode:", error);
    res.status(500).json({ error: error.message || "Failed to parse barcode." });
  }
});

// 3. API Route: AI-powered food search/suggestions
app.post("/api/search-ai", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Search query is required." });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Provide a list of 4 to 6 food items that match or are highly relevant to the search query: "${query}". For each food item, provide its typical serving size, serving unit, and exact nutritional content (calories, protein, carbs, fat).`;

    const response = await ai.models.generateContent({
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

    const text = response.text;
    if (!text) {
      throw new Error("No response text received from Gemini.");
    }

    const result = JSON.parse(text.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/search-ai:", error);
    res.status(500).json({ error: error.message || "Failed to search foods via AI." });
  }
});

// 4. API Route: AI Recipes Generator based on ingredients
app.post("/api/generate-recipes", async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients || typeof ingredients !== "string") {
      res.status(400).json({ error: "Ingredients are required." });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Based on these ingredients available: "${ingredients}", generate 3 distinct, delicious, healthy recipe recommendations. Calculate exact nutritional values (calories, protein, carbs, fat) and specify instructions, preparation time (mins), and difficulty.`;

    const response = await ai.models.generateContent({
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

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/generate-recipes:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI recipes." });
  }
});

// 5. API Route: AI Coach Daily Nutrition & Workout Analysis
app.post("/api/coach-analysis", async (req, res) => {
  try {
    const { entries, goal, date } = req.body;
    if (!entries || !goal) {
      res.status(400).json({ error: "Logged entries and daily goals are required." });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Analyze the logged diet and exercise entries for date "${date || 'Today'}".
Current Daily Goals: ${JSON.stringify(goal)}.
Daily Logs: ${JSON.stringify(entries)}.

Evaluate their calorie balance (consumed vs. burned), macronutrient balance (protein, carbs, fat target vs actual), and physical activity. Give a constructive analysis.`;

    const response = await ai.models.generateContent({
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

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");
    res.json(JSON.parse(text.trim()));
  } catch (error: any) {
    console.error("Error in /api/coach-analysis:", error);
    res.status(500).json({ error: error.message || "Failed to analyze diet & workouts." });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Calorie & Macro Tracker server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
