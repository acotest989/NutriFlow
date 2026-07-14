import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

// Runs before the ./server import below (vi.hoisted is lifted above imports).
// A single-entry model chain keeps the transient-error retry test fast, and a
// present GEMINI_API_KEY lets the (mocked) Gemini client initialize.
vi.hoisted(() => {
  process.env.GEMINI_MODELS = "gemini-test";
  process.env.GEMINI_API_KEY = "test-gemini-key";
});

// Controllable stand-in for the Gemini client. `next` is what the next
// generateContent call returns (an object with `text`) or throws (an Error);
// `calls` records the params so tests can assert the prompt/lang that was sent.
const gemini = vi.hoisted(() => ({
  next: null as { text?: string } | Error | null,
  calls: [] as unknown[],
}));

vi.mock("@google/genai", () => {
  class GoogleGenAI {
    models = {
      generateContent: async (params: unknown) => {
        gemini.calls.push(params);
        if (gemini.next instanceof Error) throw gemini.next;
        return gemini.next ?? { text: "{}" };
      },
    };
    constructor(_opts: unknown) {
      void _opts;
    }
  }
  // The route configs reference Type.OBJECT/STRING/... at import time; a stub
  // with those keys is enough since the mocked client ignores the schema.
  const Type = { OBJECT: "OBJECT", STRING: "STRING", INTEGER: "INTEGER", NUMBER: "NUMBER", ARRAY: "ARRAY", BOOLEAN: "BOOLEAN" };
  return { GoogleGenAI, Type };
});

// Controllable service-role Supabase admin client (used only by DELETE /api/account).
const admin = vi.hoisted(() => {
  const getUser = vi.fn();
  const deleteUser = vi.fn();
  return { getUser, deleteUser, client: { auth: { getUser, admin: { deleteUser } } } };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => admin.client),
}));

import { app } from "./server";

const aiText = (obj: unknown) => ({ text: JSON.stringify(obj) });

beforeEach(() => {
  gemini.next = null;
  gemini.calls.length = 0;
  admin.getUser.mockReset();
  admin.deleteUser.mockReset();
  // Default: Open Food Facts lookup misses, so /api/barcode falls through to the
  // demo list / AI unless a test overrides fetch.
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("health + security headers", () => {
  it("GET /health returns ok and helmet headers are active", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    // helmet is wired regardless of prod/dev (CSP-specific coverage is below).
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("POST /api/estimate", () => {
  it("returns the model's nutrition JSON for a valid description", async () => {
    gemini.next = aiText({ name: "Apple", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, servingSize: 1, servingUnit: "piece" });
    const res = await request(app).post("/api/estimate").send({ description: "apple" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Apple", calories: 95 });
    expect(gemini.calls).toHaveLength(1);
    expect(String((gemini.calls[0] as { contents?: unknown }).contents)).toContain("apple");
  });

  it("passes the language through to the prompt", async () => {
    gemini.next = aiText({ name: "Jabuka", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, servingSize: 1, servingUnit: "kom" });
    await request(app).post("/api/estimate").send({ description: "apple", lang: "sr" });
    expect(String((gemini.calls[0] as { contents?: unknown }).contents)).toContain("Serbian");
  });

  it("rejects an empty description with 400 and never calls the model", async () => {
    const res = await request(app).post("/api/estimate").send({ description: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
    expect(gemini.calls).toHaveLength(0);
  });

  it("maps a transient Gemini overload to a friendly 503", async () => {
    gemini.next = new Error("503 UNAVAILABLE: model is overloaded");
    const res = await request(app).post("/api/estimate").send({ description: "apple" });
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/busy/i);
  });
});

describe("POST /api/food-search (USDA FoodData Central)", () => {
  it("maps FDC results to the app's food shape when a key is configured", async () => {
    vi.stubEnv("FDC_API_KEY", "test-fdc-key");
    const fdc = {
      foods: [
        {
          fdcId: 123456,
          description: "HUMMUS", // ALL CAPS -> should be title-cased
          foodNutrients: [
            { nutrientId: 1008, value: 177 }, // energy kcal
            { nutrientId: 1003, value: 8 }, // protein
            { nutrientId: 1005, value: 20 }, // carbs
            { nutrientId: 1004, value: 9 }, // fat
          ],
        },
      ],
    };
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => fdc }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await request(app).post("/api/food-search").send({ query: "hummus" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: "usda-123456",
      name: "Hummus",
      calories: 177,
      protein: 8,
      carbs: 20,
      fat: 9,
      servingSize: 100,
      servingUnit: "g",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns [] without calling FDC when no key is configured", async () => {
    vi.stubEnv("FDC_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await request(app).post("/api/food-search").send({ query: "rice" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns [] when the FDC lookup fails", async () => {
    vi.stubEnv("FDC_API_KEY", "test-fdc-key");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })));
    const res = await request(app).post("/api/food-search").send({ query: "rice" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("rejects an empty query with 400", async () => {
    const res = await request(app).post("/api/food-search").send({ query: "" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/generate-recipes", () => {
  it("returns recipes and forwards profile prefs into the prompt", async () => {
    gemini.next = aiText([{ name: "Veggie Omelette", calories: 300, protein: 20, carbs: 5, fat: 22, prepTime: 10, difficulty: "Easy", summary: "Quick", instructions: "Whisk & cook." }]);
    const res = await request(app)
      .post("/api/generate-recipes")
      .send({ ingredients: "eggs, spinach", prefs: { diet: "vegetarian", restrictions: ["peanuts"] } });
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ name: "Veggie Omelette" });
    const prompt = String((gemini.calls[0] as { contents?: unknown }).contents);
    expect(prompt).toContain("vegetarian");
    expect(prompt).toContain("peanuts");
  });
});

describe("POST /api/coach-analysis", () => {
  it("returns a structured coaching analysis", async () => {
    gemini.next = aiText({ grade: "A", summary: "Great day.", suggestions: ["a", "b", "c"], streakMessage: "Keep it up!" });
    const res = await request(app)
      .post("/api/coach-analysis")
      .send({ entries: [], goal: { calories: 2000, protein: 150, carbs: 200, fat: 60 } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ grade: "A" });
    expect(res.body.suggestions).toHaveLength(3);
  });

  it("rejects a malformed goal with 400", async () => {
    const res = await request(app).post("/api/coach-analysis").send({ entries: [], goal: { calories: 2000 } });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/analyze-photo", () => {
  it("analyzes a base64 image and returns the meal breakdown", async () => {
    gemini.next = aiText({ name: "Salad bowl", items: ["lettuce", "tomato"], calories: 150, protein: 5, carbs: 10, fat: 8 });
    const res = await request(app).post("/api/analyze-photo").send({ image: "ZmFrZS1iYXNlNjQ=" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Salad bowl" });
    // The vision call sends a contents array (prompt text + inlineData image part).
    expect(Array.isArray((gemini.calls[0] as { contents?: unknown }).contents)).toBe(true);
  });

  it("rejects a missing image with 400", async () => {
    const res = await request(app).post("/api/analyze-photo").send({});
    expect(res.status).toBe(400);
    expect(gemini.calls).toHaveLength(0);
  });
});

describe("POST /api/barcode", () => {
  it("returns a real Open Food Facts product when found (no AI call)", async () => {
    const offProduct = {
      status: 1,
      product: { product_name: "Muesli", brands: "Brand", nutriments: { "energy-kcal_100g": 380, proteins_100g: 10, carbohydrates_100g: 60, fat_100g: 8 } },
    };
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => offProduct })));
    const res = await request(app).post("/api/barcode").send({ barcode: "3017620422003" });
    expect(res.status).toBe(200);
    expect(res.body.calories).toBe(380);
    expect(res.body.servingUnit).toBe("g");
    expect(res.body.name).toContain("Muesli");
    expect(gemini.calls).toHaveLength(0);
  });

  it("falls back to the demo list for a known mock barcode (no AI call)", async () => {
    const res = await request(app).post("/api/barcode").send({ barcode: "49000000443" });
    expect(res.status).toBe(200);
    expect(res.body.name).toContain("Coca-Cola");
    expect(res.body.calories).toBe(140);
    expect(gemini.calls).toHaveLength(0);
  });

  it("falls back to an AI estimate for an unknown barcode", async () => {
    gemini.next = aiText({ name: "Mystery Snack", calories: 200, protein: 5, carbs: 20, fat: 10, servingSize: 50, servingUnit: "g" });
    const res = await request(app).post("/api/barcode").send({ barcode: "99999999999" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Mystery Snack" });
    expect(gemini.calls).toHaveLength(1);
  });
});

// Ordering note: the "not configured" case must run before the configured ones,
// because getSupabaseAdmin() memoizes the client on first success.
describe("DELETE /api/account", () => {
  it("returns 401 without a bearer token (never touches the admin client)", async () => {
    const res = await request(app).delete("/api/account");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not authenticated/i);
  });

  it("returns 500 when the service-role env vars are absent", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const res = await request(app).delete("/api/account").set("Authorization", "Bearer tok");
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it("deletes the caller's own account for a valid token", async () => {
    vi.stubEnv("SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-secret");
    admin.getUser.mockResolvedValue({ data: { user: { id: "user-123" } }, error: null });
    admin.deleteUser.mockResolvedValue({ error: null });
    const res = await request(app).delete("/api/account").set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(admin.getUser).toHaveBeenCalledWith("valid-token");
    expect(admin.deleteUser).toHaveBeenCalledWith("user-123");
  });

  it("returns 401 when the token doesn't resolve to a user", async () => {
    vi.stubEnv("SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-secret");
    admin.getUser.mockResolvedValue({ data: { user: null }, error: { message: "bad token" } });
    const res = await request(app).delete("/api/account").set("Authorization", "Bearer stale-token");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
    expect(admin.deleteUser).not.toHaveBeenCalled();
  });
});

// Re-import the app with NODE_ENV=production to exercise the real CSP branch
// (independent of whether dist/ exists). Runs last so vi.resetModules() doesn't
// disturb the shared app used by the tests above.
describe("production CSP", () => {
  it("emits a strict Content-Security-Policy with Supabase allow-listed", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const { app: prodApp } = await import("./server");
    const res = await request(prodApp).get("/health");
    const csp = res.headers["content-security-policy"] ?? "";

    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src ")) ?? "";
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");

    const connectSrc = csp.split(";").find((d) => d.trim().startsWith("connect-src")) ?? "";
    expect(connectSrc).toContain("supabase.co");
  });
});
