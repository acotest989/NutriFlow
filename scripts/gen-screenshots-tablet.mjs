// Generates Play Store TABLET screenshots from the running NutriFlow app.
// Uses a wide viewport so the desktop/bento layout renders, and captures a few
// scroll positions in landscape (2560x1600, 16:10).
// Assumes the test account already has data (run gen-screenshots.mjs first).
//
// Usage: TEST_EMAIL=... TEST_PASSWORD=... node scripts/gen-screenshots-tablet.mjs

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD env vars.");
  process.exit(1);
}

mkdirSync("store-assets/screenshots-tablet", { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 }, // >1024 -> desktop bento layout
  deviceScaleFactor: 2, // -> 2560 x 1600 (16:10)
});
const page = await context.newPage();

await page.goto(BASE_URL, { waitUntil: "networkidle" });
await page.fill("#auth_email", EMAIL);
await page.fill("#auth_password", PASSWORD);
await page.click("#auth_submit");
await page.waitForSelector("#dashboard_panel", { timeout: 30000 });
await page.waitForTimeout(2500);

const positions = [
  { y: 0, file: "01-tablet-overview.png" },
  { y: 720, file: "02-tablet-coach.png" },
  { y: 1440, file: "03-tablet-tools.png" },
];

for (const { y, file } of positions) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `store-assets/screenshots-tablet/${file}` });
  console.log("captured", file);
}

await browser.close();
console.log("Done. Tablet screenshots in store-assets/screenshots-tablet/");
