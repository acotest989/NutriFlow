// One-off icon generator: rasterizes the brand SVGs into PNG app icons.
// Run with: node scripts/gen-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");

const anySvg = readFileSync(join(iconsDir, "icon.svg"));
const maskableSvg = readFileSync(join(iconsDir, "icon-maskable.svg"));

const jobs = [
  { svg: anySvg, size: 192, out: "icon-192.png" },
  { svg: anySvg, size: 512, out: "icon-512.png" },
  { svg: maskableSvg, size: 512, out: "icon-maskable-512.png" },
];

for (const { svg, size, out } of jobs) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, out));
  console.log(`wrote public/icons/${out} (${size}x${size})`);
}
