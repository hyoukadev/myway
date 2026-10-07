#!/usr/bin/env node
// Rebrands user-facing strings from "Vimium" to "VimKeys".
// Only touches DISPLAY strings. Internal identifiers (storage keys, CSS classes,
// notification IDs, function names) are intentionally preserved to keep the engine intact.
//
// Run: node build_scripts/rebrand.js
import { readFileSync, writeFileSync } from "node:fs";

const targets = [
  // Source / page files we want to scrub user-facing brand strings in.
  "background_scripts/main.js",
  "background_scripts/all_commands.js",
  "content_scripts/hud.js",
  "lib/settings.js",
  "pages/action.html",
  "pages/action.js",
  "pages/command_listing.html",
  "pages/doc_search_completion.html",
  "pages/help_dialog_page.html",
  "pages/help_dialog_page.js",
  "pages/options.html",
  "pages/options.js",
];

// Ordered, specific replacements. Order matters: longest/most-specific first.
const replacements = [
  // Titles and headings.
  ["Vimium Options", "VimKeys Options"],
  ["Vimium Help", "VimKeys Help"],
  ["Vimium Commands", "VimKeys Commands"],
  ["Vimium Search Completion", "VimKeys Search Completion"],
  ["<span class=\"vim\">Vim</span>ium Help", "<span class=\"vim\">Vim</span>Keys Help"],

  // The stylized wordmark split used in the help header (span.vim + "ium").
  // Handle the leftover "ium" fragment after our wordmark span if present.
  // (Already covered above via full-phrase replacement.)

  // Notification copy.
  ["Vimium Upgrade", "VimKeys Upgrade"],
  ["VimiumUpgradeNotification", "VimKeysUpgradeNotification"],
  ["Vimium has been upgraded", "VimKeys has been upgraded"],
  ["Vimium has been updated", "VimKeys has been updated"],

  // New-tab page label and blank page reference.
  ["Vimium blank new tab page", "VimKeys blank new tab page"],
  ["a separate Vimium new tab", "a separate VimKeys new tab"],

  // General phrases (sentence-context). Use word-boundary-safe standalone words.
  ["Vimium's normal mode", "VimKeys's normal mode"],
  ["Vimium's \"create new tab\" command", "VimKeys's \"create new tab\" command"],
  ["Vimium commands", "VimKeys commands"],
  ["Vimium on URLs", "VimKeys on URLs"],
  ["Vimium on Gmail", "VimKeys on Gmail"],
  ["Vimium will exclude these keys", "VimKeys will exclude these keys"],
  ["Vimium is not allowed to run", "VimKeys is not allowed to run"],
  ["Vimium is missing the \"all hosts\" permission", "VimKeys is missing the \"all hosts\" permission"],
  ["extensions like Vimium", "extensions like VimKeys"],
  ["about:addons > Vimium", "about:addons > VimKeys"],
  ["Vimium keys are enabled", "VimKeys keys are enabled"],
  ["Exclude Vimium keys on this page", "Exclude VimKeys keys on this page"],
  ["Vimium UI", "VimKeys UI"],
  ["Execute a Vimium command", "Execute a VimKeys command"],
  ["Vimium Options page", "VimKeys Options page"],
  ["Enter Vimium's normal mode", "Enter VimKeys's normal mode"],
  ["Enjoying Vimium?", "Enjoying VimKeys?"],
  ["this version of Vimium", "this version of VimKeys"],
  ["Vimium supports search completion", "VimKeys supports search completion"],

  // Help-dialog version span id stays "vimium-version" (internal), but we may relabel text elsewhere.

  // The reload.html page is dev-only; leave it.
];

let touched = 0;
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
      out = out.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
    writeFileSync(rel, out);
    touched++;
    console.log(`rebranded: ${rel}`);
  }
}
console.log(`done. ${touched} file(s) changed.`);
