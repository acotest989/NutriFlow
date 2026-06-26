// Generates real Play Store phone screenshots from the running NutriFlow app.
// 1) Seeds sample data into the test account (via supabase-js) so screens look populated.
// 2) Logs in through the UI and captures the mobile screens at 9:16 (1236x2196, >=1080).
//
// Usage:
//   TEST_EMAIL=... TEST_PASSWORD=... node scripts/gen-screenshots.mjs
// Optional: BASE_URL (default http://localhost:3000)

import { chromium, devices } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

// Public client config (same values baked into the app)
const SUPABASE_URL = "https://xwblliudqnzhzmulyuyk.supabase.co";
const SUPABASE_ANON = "sb_publishable_ReASdH2ojGBhH8mjOCoO1A_OpEKixnV";

if (!EMAIL || !PASSWORD) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD env vars.");
  process.exit(1);
}

const pastDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
};
const today = pastDate(0);

// ---------- 1) Seed sample data ----------
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (authErr || !auth.user) {
  console.error("Supabase sign-in failed:", authErr?.message);
  process.exit(1);
}
const uid = auth.user.id;

const mk = (daysAgo, type, name, calories, protein, carbs, fat, quantity) => ({
  user_id: uid,
  date: pastDate(daysAgo),
  type,
  name,
  calories,
  protein,
  carbs,
  fat,
  quantity,
});

const seed = [
  mk(6, "meal", "Oatmeal with Blueberries", 340, 12, 54, 5, 150),
  mk(6, "meal", "Baked Chicken with Rice", 520, 42, 62, 8, 300),
  mk(6, "exercise", "Brisk Walking (30 mins)", 135, 0, 0, 0, 30),
  mk(5, "meal", "Greek Yogurt & Banana", 250, 18, 32, 2, 200),
  mk(5, "meal", "Lean Beef Sirloin & Potatoes", 580, 45, 48, 14, 350),
  mk(5, "exercise", "Cycling Workout (45 mins)", 340, 0, 0, 0, 45),
  mk(4, "meal", "Whey Protein Shake", 120, 24, 3, 1.5, 32),
  mk(4, "meal", "Pasta Bolognese", 650, 28, 85, 16, 400),
  mk(4, "exercise", "HIIT Session (20 mins)", 270, 0, 0, 0, 20),
  mk(3, "meal", "Eggs & Whole Wheat Toast", 290, 16, 25, 12, 150),
  mk(3, "meal", "Grilled Salmon Bowl", 480, 34, 42, 16, 280),
  mk(3, "exercise", "Weight Lifting (60 mins)", 360, 0, 0, 0, 60),
  mk(2, "meal", "Protein Oatmeal Bowl", 380, 26, 48, 6, 180),
  mk(2, "meal", "Chicken Avocado Wrap", 490, 36, 32, 18, 220),
  mk(2, "exercise", "Swimming (30 mins)", 294, 0, 0, 0, 30),
  mk(1, "meal", "Scrambled Eggs & Avocado", 310, 14, 6, 22, 180),
  mk(1, "meal", "Chicken Rice & Sweet Potato", 550, 46, 60, 6, 320),
  mk(1, "exercise", "Running (30 mins)", 342, 0, 0, 0, 30),
  mk(0, "meal", "Greek Yogurt & Honey", 220, 16, 28, 4, 200),
  mk(0, "meal", "Grilled Chicken Salad", 420, 38, 18, 16, 300),
  mk(0, "exercise", "Morning Run (25 mins)", 285, 0, 0, 0, 25),
];

// Insert sample data (non-destructive: existing entries are kept)
const { error: insErr } = await supabase.from("entries").insert(seed);
if (insErr) console.error("Seed entries error:", insErr.message);
await supabase.from("goals").upsert({ user_id: uid, calories: 2100, protein: 150, carbs: 220, fat: 70, updated_at: new Date().toISOString() });
await supabase.from("hydration").upsert({ user_id: uid, date: today, consumed_ml: 1750, updated_at: new Date().toISOString() });
console.log("Seeded sample data for", EMAIL);

// ---------- 2) Capture screenshots ----------
mkdirSync("store-assets/screenshots", { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 412, height: 732 }, // 9:16
  deviceScaleFactor: 3, // -> 1236 x 2196 output (>=1080, promotion eligible)
  isMobile: true,
  hasTouch: true,
  userAgent: devices["Pixel 7"].userAgent,
});
const page = await context.newPage();

await page.goto(BASE_URL, { waitUntil: "networkidle" });

// Sign in via the UI
await page.fill("#auth_email", EMAIL);
await page.fill("#auth_password", PASSWORD);
await page.click("#auth_submit");
await page.waitForSelector("#mobile_nav_dashboard", { timeout: 30000 });
await page.waitForTimeout(2500); // let data load + animations settle

const shots = [
  { nav: "#mobile_nav_dashboard", file: "01-dashboard.png" },
  { nav: "#mobile_nav_analytics", file: "02-trends.png" },
  { nav: "#mobile_nav_coach", file: "03-ai-coach.png" },
  { nav: "#mobile_nav_meals", file: "04-meals.png" },
  { nav: "#mobile_nav_scanner", file: "05-scanner.png" },
];

for (const { nav, file } of shots) {
  await page.click(nav);
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `store-assets/screenshots/${file}` });
  console.log("captured", file);
}

await browser.close();
console.log("Done. Screenshots in store-assets/screenshots/");
