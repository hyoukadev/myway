#!/usr/bin/env node
// Fills in your real contact/site/repo info before publishing, then runs check + build.
//
// Usage:
//   node build_scripts/finalize.js --email <email> --site <homepage-url> \
//     --privacy <privacy-url> --repo <repo-url>
// Or via env: VK_EMAIL, VK_SITE, VK_PRIVACY, VK_REPO
//
// What it substitutes:
//   - store/listing.md   : homepage, support email, privacy URL (EN + ZH)
//   - store/PRIVACY.md   : contact line
//   - background_scripts/main.js : CHANGELOG link in the upgrade notification
//
// After substituting it runs `npm run check` and `npm run build`. Leaves store/screenshots and
// dist intact.
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

function arg(name, env) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i >= 0 ? process.argv[i + 1] : process.env[env];
  if (!v) {
    console.error(`Missing --${name} (or ${env}). See header of this file.`);
    process.exit(2);
  }
  return v;
}

const email = arg("email", "VK_EMAIL");
const site = arg("site", "VK_SITE");
const privacy = arg("privacy", "VK_PRIVACY");
const repo = arg("repo", "VK_REPO");

// Derive a CHANGELOG URL from the repo (works for github). Override with --changelog if needed.
let changelog = `${repo.replace(/\/$/, "")}/blob/main/CHANGELOG.md`;
{
  const i = process.argv.indexOf("--changelog");
  if (i >= 0) changelog = process.argv[i + 1];
}

console.log("Filling in:");
console.log("  email    :", email);
console.log("  site     :", site);
console.log("  privacy  :", privacy);
console.log("  repo     :", repo);
console.log("  changelog:", changelog);

let missing = [];

function sub(file, replacements) {
  let src = readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of replacements) {
    if (src.includes(from)) {
      src = src.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(file, src);
    console.log("  updated:", file);
  } else {
    console.log("  (no change):", file);
  }
}

// store/listing.md — placeholders use your-site.example domain.
sub("store/listing.md", [
  ["https://your-site.example/myway/privacy", privacy],
  ["https://your-site.example/myway", site],
  ["support@your-site.example", email],
]);

// store/PRIVACY.md — contact line.
sub("store/PRIVACY.md", [
  ["**[your support email / URL here]**", `**${email}** (privacy) · ${site}`],
]);

// background_scripts/main.js — CHANGELOG link.
sub("background_scripts/main.js", [
  ['"https://github.com/anthropics/myway/blob/main/CHANGELOG.md"', JSON.stringify(changelog)],
]);

// Verify nothing obviously-placeholder remains in store-facing files.
const scan = (f) => readFileSync(f, "utf8");
const leaks = [];
for (const f of ["store/listing.md", "store/PRIVACY.md"]) {
  const s = scan(f);
  if (/your-site\.example|your support email|anthropics\/myway/.test(s)) leaks.push(f);
}
if (leaks.length) {
  console.error("\n✗ placeholders still present in: " + leaks.join(", "));
  process.exit(1);
}
console.log("\n✓ no placeholders remain in store/ docs.");

// Run check + build.
console.log("\n--- npm run check ---");
execSync("npm run check", { stdio: "inherit" });
console.log("\n--- npm run build ---");
execSync("npm run build", { stdio: "inherit" });
console.log("\n✓ Done. dist/chrome, dist/edge, dist/firefox are ready to upload.");
