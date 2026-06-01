/**
 * generate-icons.ts
 *
 * Generates PWA icons and favicon from the source SVG at icons/icon.svg.
 *
 * Run with:
 *   npm run icons
 *
 * Produces:
 *   icons/icon-192.png             — Android home screen icon
 *   icons/icon-512.png             — Splash screen / high-res icon
 *   icons/apple-touch-icon.png     — iOS home screen icon (180×180)
 *   favicon.ico                    — Browser tab icon (32×32 embedded PNG)
 *
 * All sizes are referenced in vite.config.ts and index.html.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const dirName = dirname(fileURLToPath(import.meta.url));
const root = resolve(dirName, "..");

const svgPath = resolve(root, "icons/icon.svg");
const svgBuffer = readFileSync(svgPath);

mkdirSync(resolve(root, "icons"), { recursive: true });

// ── PNG icons ─────────────────────────────────────────────────────────────────
const pngSizes: Array<{ name: string; size: number }> = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of pngSizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(resolve(root, "icons", name));
  console.log(`✓ icons/${name}`);
}

// ── favicon.ico ───────────────────────────────────────────────────────────────
const faviconPng = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
const icoBuffer = await pngToIco([faviconPng]);
writeFileSync(resolve(root, "favicon.ico"), icoBuffer);
console.log("✓ favicon.ico");

console.log("\nAll icons generated successfully.");
