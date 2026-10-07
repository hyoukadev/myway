#!/usr/bin/env node
// Builds store-ready zip packages for Chrome, Edge, and Firefox.
// Output: dist/chrome/myway-chrome-<ver>.zip
//         dist/edge/myway-edge-<ver>.zip
//         dist/firefox/myway-firefox-<ver>.zip
// Edge and Chrome use the same MV3 service-worker manifest; Firefox uses manifest.firefox.json.
import AdmZip from "adm-zip";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");

// Files/dirs to exclude from every store package (dev-only).
const EXCLUDE = new Set([
  ".git", ".github", "node_modules", "dist", "tests", "test_harnesses",
  "build_scripts", "make.js", "deno.json", "deno.lock", "package.json",
  "package-lock.json", "manifest.firefox.json", // template, not shipped
  ".gitignore",
  "store", // publishing docs/assets — not part of the shipped extension
]);
// Markdown/docs are mostly dev-facing; keep only CREDITS, MIT-LICENSE.txt, README.md for attribution.
const EXCLUDE_MD = new Set(["CHANGELOG.md", "CONTRIBUTING.md"]);

function shouldExclude(relPath, name) {
  if (EXCLUDE.has(name)) return true;
  if (EXCLUDE_MD.has(name)) return true;
  if (relPath.startsWith("dist")) return true;
  if (relPath.startsWith("tests") || relPath.startsWith("test_harnesses")) return true;
  if (relPath.startsWith("build_scripts")) return true;
  if (relPath.startsWith("node_modules")) return true;
  return false;
}

// Recursively collect (relPath -> absPath) of files to ship.
function collectFiles() {
  const out = [];
  const walk = (absDir) => {
    for (const entry of readdirSync(absDir)) {
      const abs = join(absDir, entry);
      const rel = relative(ROOT, abs);
      if (shouldExclude(rel.replace(/\\/g, "/"), entry)) continue;
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs);
      else out.push([rel.replace(/\\/g, "/"), abs]);
    }
  };
  walk(ROOT);
  return out;
}

function buildZip(label, manifestObj, outName) {
  const files = collectFiles();
  const zip = new AdmZip();
  // Manifest first, with deterministic formatting.
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifestObj, null, 2) + "\n", "utf8"));
  for (const [rel, abs] of files.sort((a, b) => a[0].localeCompare(b[0]))) {
    if (rel === "manifest.json") continue; // already added
    zip.addLocalFile(abs, dirname(rel) || "");
  }
  const outDir = join(DIST, label);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, outName);
  zip.writeZip(outPath);
  console.log(`✓ ${label}: ${relative(ROOT, outPath)} (${files.length} files)`);
}

function main() {
  const chromeManifest = JSON.parse(readFileSync("manifest.json", "utf8"));
  const firefoxManifest = JSON.parse(readFileSync("manifest.firefox.json", "utf8"));
  const ver = chromeManifest.version;

  if (existsSync(DIST)) {
    // Clean previous dist subfolders but keep the tree.
    for (const d of ["chrome", "edge", "firefox"]) {
      const p = join(DIST, d);
      if (existsSync(p)) for (const f of readdirSync(p)) {
        // best-effort
      }
    }
  }

  // Chrome and Edge share the same Chromium MV3 build.
  buildZip("chrome", chromeManifest, `myway-chrome-${ver}.zip`);
  buildZip("edge", chromeManifest, `myway-edge-${ver}.zip`);
  buildZip("firefox", firefoxManifest, `myway-firefox-${ver}.zip`);

  // Also write an unpacked Chrome build for quick load-testing.
  const unpacked = join(DIST, "unpacked");
  mkdirSync(unpacked, { recursive: true });
  writeFileSync(join(unpacked, "manifest.json"), JSON.stringify(chromeManifest, null, 2) + "\n");
  for (const [rel, abs] of collectFiles()) {
    if (rel === "manifest.json") continue;
    const dest = join(unpacked, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(abs, dest);
  }
  console.log(`✓ unpacked (chrome): ${relative(ROOT, unpacked)}`);
  console.log("\nDone. Submit the zips in dist/ to the respective stores.");
}

main();
