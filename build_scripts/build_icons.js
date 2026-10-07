#!/usr/bin/env node
// Rasterizes icons/icon.svg into the PNG sizes required by the extension and the stores.
import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("icons/icon.svg");

// Brand icon PNGs referenced by manifest.json.
const brandSizes = [16, 48, 128];
// Toolbar action icons: enabled (color), disabled (greyed), partial (muted).
const actionSizes = [16, 32];

async function rasterize(size, file, { tint } = {}) {
  let img = sharp(svg, { density: 384 }).resize(size, size, { fit: "contain" });
  if (tint) {
    // Greyscale + slight opacity for the "disabled" toolbar state.
    img = img.ensureAlpha().flatten({ background: { r: 0, g: 0, b: 0, alpha: 0 } });
    img = sharp(await img.png().toBuffer())
      .resize(size, size, { fit: "contain" })
      .modulate({ saturation: 0, brightness: 0.65 });
  }
  await img.png().toFile(file);
  console.log("wrote", file);
}

for (const s of brandSizes) {
  await rasterize(s, `icons/icon${s}.png`);
}

// Action icons. We reuse the same glyph but produce three states.
for (const s of actionSizes) {
  await rasterize(s, `icons/action_enabled_${s}.png`);
  await rasterize(s, `icons/action_disabled_${s}.png`, { tint: true });
  await rasterize(s, `icons/action_partial_${s}.png`, { tint: true });
}

console.log("icons done.");
