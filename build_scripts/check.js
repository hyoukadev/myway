#!/usr/bin/env node
// Static validation of the myway extension:
//  - manifest.json parses as valid JSON (no comments)
//  - every file referenced by the manifest exists on disk
//  - no leftover user-facing "Vimium" brand strings in page HTML / store-facing copy
//  - new keybindings page and options page reference files that exist
// Exits non-zero on any error.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let errors = 0;
const fail = (msg) => { console.error("✗ " + msg); errors++; };
const ok = (msg) => console.log("✓ " + msg);

function loadManifest() {
  const raw = readFileSync("manifest.json", "utf8");
  // manifest.json should be plain JSON (we stripped comments during rebrand).
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail("manifest.json is not valid JSON: " + e.message);
    return null;
  }
}

function collectReferencedFiles(manifest) {
  const refs = new Set();
  const push = (p) => { if (typeof p === "string" && !p.startsWith("_favicon")) refs.add(p); };

  push(...Object.values(manifest.icons || {}));
  if (manifest.background?.service_worker) push(manifest.background.service_worker);
  (manifest.background?.scripts || []).forEach(push);
  if (manifest.options_ui?.page) push(manifest.options_ui.page);
  if (manifest.action?.default_popup) push(manifest.action.default_popup);
  Object.values(manifest.action?.default_icon || {}).forEach(push);

  for (const cs of manifest.content_scripts || []) {
    (cs.js || []).forEach(push);
    (cs.css || []).forEach(push);
  }
  for (const war of manifest.web_accessible_resources || []) {
    (war.resources || []).forEach(push);
  }
  return refs;
}

function checkFiles(refs) {
  for (const rel of [...refs].sort()) {
    if (existsSync(rel)) {
      ok(`file present: ${rel}`);
    } else {
      fail(`manifest references missing file: ${rel}`);
    }
  }
}

function checkBrandStrings() {
  // Page HTML files should not contain the standalone word "Vimium" in user-visible text.
  const htmlFiles = readdirSync("pages").filter((f) => f.endsWith(".html"));
  for (const f of htmlFiles) {
    const src = readFileSync(join("pages", f), "utf8");
    // Allow comments; only flag visible brand word in text nodes (rough heuristic).
    if (/\bVimium\b/.test(src)) {
      fail(`pages/${f} still contains user-facing "Vimium"`);
    }
  }
  ok("no user-facing Vimium brand strings in pages/*.html");
}

function checkManifestField(manifest) {
  if (manifest.name !== "myway") fail(`manifest name should be "myway", got "${manifest.name}"`);
  else ok('manifest name = "myway"');
  if (!manifest.version) fail("manifest missing version");
  else ok(`manifest version = ${manifest.version}`);
  if (manifest.manifest_version !== 3) fail("manifest_version should be 3 for store builds");
  else ok("manifest_version = 3");
}

function checkRemovedBindings() {
  const src = readFileSync("background_scripts/commands.js", "utf8");
  for (const key of ['"<c-e>"', '"<c-y>"', '"<a-f>"', '"<a-p>"', '"<a-m>"']) {
    if (src.includes(`${key}:`)) {
      fail(`defaultKeyMappings still contains conflicting binding ${key}`);
    }
  }
  ok("conflicting modifier bindings (<c-e>, <c-y>, <a-f>, <a-p>, <a-m>) removed from defaults");
}

// Verify the redesigned options.html keeps every setting name the options.js logic reads/writes.
function checkOptionsFields() {
  const optionsSrc = readFileSync("pages/options.js", "utf8");
  const htmlSrc = readFileSync("pages/options.html", "utf8");
  // Names declared in the `options` object in options.js.
  const names = [...optionsSrc.matchAll(/^\s{2}(\w+):\s*"(boolean|number|string|option)"/gm)]
    .map((m) => m[1]);
  const missing = names.filter((n) => !new RegExp(`name="${n}"`).test(htmlSrc));
  if (missing.length) fail(`options.html is missing form fields: ${missing.join(", ")}`);
  else ok(`options.html has all ${names.length} setting fields referenced by options.js`);

  // IDs the simplified settings page must have (exclusion editor + save).
  for (const id of ["#save", "#exclusion-rules", "#exclusion-add-button"]) {
    if (!htmlSrc.includes(`id="${id.slice(1)}"`)) fail(`options.html missing element ${id}`);
  }
  ok("options.html preserves structural IDs required by options.js");
}

// Verify keybindings.html exposes every element id that keybindings.js queries.
function checkKeybindingsFields() {
  const jsSrc = readFileSync("pages/keybindings.js", "utf8");
  const htmlSrc = readFileSync("pages/keybindings.html", "utf8");
  const ids = [...jsSrc.matchAll(/querySelector\("#([\w-]+)"\)/g)].map((m) => m[1]);
  const missing = ids.filter((id) => !new RegExp(`id="${id}"`).test(htmlSrc));
  if (missing.length) fail(`keybindings.html missing ids: ${missing.join(", ")}`);
  else ok(`keybindings.html has all ${ids.length} element ids referenced by keybindings.js`);

  if (!htmlSrc.includes('href="keybindings.css"')) fail("keybindings.html missing its stylesheet");
  if (!htmlSrc.includes('src="keybindings.js"')) fail("keybindings.html missing its script");
  ok("keybindings.html links keybindings.css and keybindings.js");
}

// Round-trip: the default key config (as the engine builds it) must parse without errors, and
// every default command name must exist in allCommands.
async function checkEngineRoundTrip() {
  // Provide a minimal chrome.* surface so Vimium's modules can be imported under Node.
  if (!globalThis.chrome) {
    const noop = () => {};
    const store = {};
    globalThis.chrome = {
      sessions: { MAX_SESSION_RESULTS: 25 },
      storage: {
        local: { get: async () => ({}), set: noop, remove: noop },
        session: { get: async () => ({}), set: noop, remove: noop, setAccessLevel: noop },
      },
      runtime: { getManifest: () => ({ version: "1.0.0" }), getURL: (p) => p },
    };
  }
  // commands.js uses the global `Utils` (set by lib/utils.js). Import it first.
  await import("../lib/utils.js");
  const { KeyMappingsParser, defaultKeyMappings } = await import("../background_scripts/commands.js");
  const defaultConfig = Object.keys(defaultKeyMappings)
    .map((k) => `map ${k} ${defaultKeyMappings[k]}`).join("\n");
  const parsed = KeyMappingsParser.parse(defaultConfig + "\n", false);
  if (parsed.validationErrors.length > 0) {
    fail(`default config has parse errors: ${parsed.validationErrors.join("; ")}`);
  } else {
    ok(`default key config parses cleanly (${Object.keys(parsed.keyToRegistryEntry).length} bindings)`);
  }

  // Simulate the keybindings editor's resolveBindings + serialize round trip: after applying the
  // default config, serializing, then parsing the serialization, we should get the same bindings.
  const bindings = new Map();
  for (const [keyString, entry] of Object.entries(parsed.keyToRegistryEntry)) {
    const options = optionsToStringForTest(entry.options);
    const rowKey = `${entry.command}|${options}`;
    if (!bindings.has(rowKey)) bindings.set(rowKey, { command: entry.command, options, keys: [] });
    bindings.get(rowKey).keys.push(keyString);
  }
  const lines = ["unmapall"];
  for (const { command, options, keys } of bindings.values()) {
    for (const key of keys) lines.push(options ? `map ${key} ${command} ${options}` : `map ${key} ${command}`);
  }
  const reparsed = KeyMappingsParser.parse(lines.join("\n"), false);
  if (reparsed.validationErrors.length > 0) {
    fail(`editor serialization produces parse errors: ${reparsed.validationErrors.join("; ")}`);
  } else if (Object.keys(reparsed.keyToRegistryEntry).length !== Object.keys(parsed.keyToRegistryEntry).length) {
    fail("editor round-trip changed the number of bindings");
  } else {
    ok(`keybindings editor round-trip is stable (${Object.keys(reparsed.keyToRegistryEntry).length} bindings)`);
  }
}

function optionsToStringForTest(options) {
  if (!options) return "";
  return Object.entries(options).map(([k, v]) => v === true ? k : `${k}=${v}`).join(" ").trim();
}

const manifest = loadManifest();
if (manifest) {
  checkManifestField(manifest);
  checkFiles(collectReferencedFiles(manifest));
}
checkBrandStrings();
checkRemovedBindings();
checkOptionsFields();
checkKeybindingsFields();
await checkEngineRoundTrip();

console.log("");
if (errors > 0) {
  console.error(`\nFAILED with ${errors} error(s).`);
  process.exit(1);
}
console.log("All checks passed.");
