#!/usr/bin/env node
// Renames the extension from "VimKeys" to "myway".
// - Touches ONLY display strings, build artifact names, and the upgrade-notification id.
// - Leaves internal identifiers intact (storage keys, CSS classes like vimiumHintMarker,
//   isVimiumHelpDialogPage global) so the engine and any existing user settings keep working.
//
// Run: node build_scripts/rebrand_myway.js
import { readFileSync, writeFileSync } from "node:fs";

// Source + store-doc files to scrub. Order in `replacements` matters: longest/most-specific first.
const targets = [
  "background_scripts/all_commands.js",
  "background_scripts/commands.js",
  "background_scripts/main.js",
  "content_scripts/hud.js",
  "lib/settings.js",
  "pages/action.html",
  "pages/action.js",
  "pages/command_listing.html",
  "pages/doc_search_completion.html",
  "pages/help_dialog_page.html",
  "pages/help_dialog_page.js",
  "pages/keybindings.html",
  "pages/keybindings.js",
  "pages/options.html",
  "pages/options.js",
  "pages/reload.html",
  "manifest.json",
  "manifest.firefox.json",
  "package.json",
  "README.md",
  "build_scripts/build.js",
  "build_scripts/build_store_assets.js",
  "build_scripts/capture_screenshots.js",
  "build_scripts/check.js",
  "build_scripts/finalize.js",
  "build_scripts/smoke.js",
  "store/PERMISSIONS.md",
  "store/PRIVACY.md",
  "store/PUBLISHING.md",
  "store/SCREENSHOTS.md",
  "store/UPLOAD_CHECKLIST.md",
  "store/listing.md",
];

// Whole-word style replacements. We replace the brand tokens; internal `vimium*` identifiers are
// untouched because they never appear as "VimKeys"/"vimkeys".
const replacements = [
  // Notification id (display-adjacent; safe to change pre-launch).
  ["VimKeysUpgradeNotification", "mywayUpgradeNotification"],
  // Display brand in various inflections.
  ["VimKeys's", "myway's"],
  ["VimKeys", "myway"],
  // Lowercase: build artifact names (zip filenames), package name, URLs in docs.
  // NOTE: keep this list tight to avoid clobbering unrelated substrings.
  ["vimkeys-chrome-", "myway-chrome-"],
  ["vimkeys-edge-", "myway-edge-"],
  ["vimkeys-firefox-", "myway-firefox-"],
  ["vimkeys-options.json", "myway-options.json"],
  ['"name": "vimkeys"', '"name": "myway"'],
  ["https://your-site.example/vimkeys", "https://your-site.example/myway"],
  ["github.com/anthropics/vimkeys", "github.com/anthropics/myway"],
];

let touched = 0;
let totalSubs = 0;
for (const rel of targets) {
  let src;
  try {
    src = readFileSync(rel, "utf8");
  } catch {
    console.warn(`skip (missing): ${rel}`);
    continue;
  }
  let out = src;
  let changed = false;
  for (const [from, to] of replacements) {
    if (out.includes(from)) {
      const before = out;
      out = out.split(from).join(to);
      if (out !== before) {
        changed = true;
        totalSubs++;
      }
    }
  }
  if (changed) {
    writeFileSync(rel, out);
    touched++;
    console.log(`rebranded: ${rel}`);
  }
}
console.log(`done. ${touched} file(s) changed, ${totalSubs} substitution group(s) applied.`);

// Final guard: scan the same target set for any leftover brand tokens.
const leftovers = [];
for (const rel of targets) {
  let src;
  try { src = readFileSync(rel, "utf8"); } catch { continue; }
  if (/VimKeys|vimkeys/.test(src)) leftovers.push(rel);
}
if (leftovers.length) {
  console.error("\n✗ leftover brand tokens in: " + leftovers.join(", "));
  process.exit(1);
}
console.log("✓ no VimKeys/vimkeys tokens remain in target files.");
