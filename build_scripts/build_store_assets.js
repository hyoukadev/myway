#!/usr/bin/env node
// Generates placeholder store promo tiles using the myway brand palette.
// These are fallbacks; replace with real screenshots before submitting (see SCREENSHOTS.md).
import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("store/assets", { recursive: true });

const bg = (w, h) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5b8def"/>
      <stop offset="1" stop-color="#3b5bdb"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <g fill="#ffffff" font-family="Segoe UI, Helvetica, Arial, sans-serif">
    <text x="${w / 2}" y="${h / 2 - 6}" font-size="${Math.round(h * 0.16)}" font-weight="700"
      text-anchor="middle">myway</text>
    <text x="${w / 2}" y="${h / 2 + Math.round(h * 0.10)}" font-size="${Math.round(h * 0.06)}"
      opacity="0.9" text-anchor="middle">Keyboard navigation for the web</text>
  </g>
</svg>`);

async function make(w, h, name) {
  await sharp(await bg(w, h)).png().toFile(`store/assets/${name}`);
  console.log("wrote store/assets/" + name);
}

await make(440, 280, "promo-440x280.png");
await make(1400, 560, "promo-1400x560.png");
await make(1280, 800, "hero-1280x800.png");
console.log("store assets done.");
