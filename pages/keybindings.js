import "./all_content_scripts.js";
import { allCommands } from "../background_scripts/all_commands.js";
import { Commands, defaultKeyMappings, KeyMappingsParser } from "../background_scripts/commands.js";

// Group display order and titles.
const GROUP_TITLES = {
  navigation: "Navigating the page",
  vomnibar: "Using the Vomnibar",
  find: "Using find",
  history: "Navigating history",
  tabs: "Manipulating tabs",
  misc: "Miscellaneous",
};
const GROUP_ORDER = ["navigation", "vomnibar", "find", "history", "tabs", "misc"];

// Bindings model: Map keyed by `${command}|${options}` -> { command, options, keys: [string] }.
// `keys` is a list of key strings (e.g. ["j"], ["<c-e>"], or [] when unbound).
let bindings = new Map();
let originalSerialized = ""; // Serialized form at load time, to detect changes.
let isDirty = false;

// ----- Parsing current state -----

// Compute the effective key->command map the same way Commands.loadKeyMappings does, but we keep
// the raw key->RegistryEntry so we can invert it into command->keys.
function resolveBindings() {
  const userText = Settings.get("keyMappings") || "";
  const defaultConfig = Object.keys(defaultKeyMappings)
    .map((k) => `map ${k} ${defaultKeyMappings[k]}`)
    .join("\n");
  const parsed = KeyMappingsParser.parse(defaultConfig + "\n" + userText, false);
  // parsed.keyToRegistryEntry: { keyString: RegistryEntry{command, options:{}, keySequence} }
  const result = new Map();
  for (const [keyString, entry] of Object.entries(parsed.keyToRegistryEntry)) {
    const options = optionsToString(entry.options);
    const rowKey = `${entry.command}|${options}`;
    if (!result.has(rowKey)) {
      result.set(rowKey, { command: entry.command, options, keys: [] });
    }
    result.get(rowKey).keys.push(keyString);
  }
  return result;
}

// Serialize the options object back into the text form used in `map` lines.
function optionsToString(options) {
  if (!options) return "";
  const parts = [];
  for (const [k, v] of Object.entries(options)) {
    if (v === true) parts.push(k);
    else parts.push(`${k}=${v}`);
  }
  return parts.join(" ").trim();
}

// ----- Serialization -----

// Serialize the current `bindings` model into a keyMappings config text that, combined with the
// defaults, reproduces the model exactly. We use `unmapall` then re-`map` everything, so the user's
// intent is explicit and unambiguous regardless of default changes across versions.
function serialize() {
  const lines = ["unmapall"];
  for (const { command, options, keys } of bindings.values()) {
    for (const key of keys) {
      lines.push(options ? `map ${key} ${command} ${options}` : `map ${key} ${command}`);
    }
  }
  return lines.join("\n") + "\n";
}

function computeSerialized() {
  // A compact signature for dirty comparison: ignore ordering of keys.
  const sig = [];
  for (const [rowKey, b] of bindings.entries()) {
    sig.push(rowKey + ":" + [...b.keys].sort().join(","));
  }
  return sig.sort().join("|");
}

// ----- Rendering -----

const groupsEl = document.querySelector("#groups");
const saveButtons = [document.querySelector("#save"), document.querySelector("#save-2")];
const bannerEl = document.querySelector("#status-banner");

function prettyKey(keyString) {
  // <c-e> -> ⌃E-ish display; keep the raw token but capitalize letter for readability.
  return keyString
    .replace(/<c-([^>]+)>/g, (_, k) => `Ctrl+${label(k)}`)
    .replace(/<a-([^>]+)>/g, (_, k) => `Alt+${label(k)}`)
    .replace(/<m-([^>]+)>/g, (_, k) => `⌘+${label(k)}`)
    .replace(/<s-([^>]+)>/g, (_, k) => `Shift+${label(k)}`)
    .replace(/<space>/g, "Space")
    .replace(/<enter>/g, "↵")
    .replace(/<up>|<down>|<left>|<right>/g, (m) => ({ "<up>": "↑", "<down>": "↓", "<left>": "←", "<right>": "→" }[m]));
}
function label(k) {
  if (k.length === 1) return k.toUpperCase();
  return k.charAt(0).toUpperCase() + k.slice(1);
}

function render() {
  groupsEl.innerHTML = "";

  // Invert bindings for lookup: which keys map to which rowKey (for conflict detection).
  const keyToRowKey = new Map();
  for (const [rowKey, b] of bindings.entries()) {
    for (const k of b.keys) keyToRowKey.set(k, rowKey);
  }

  for (const group of GROUP_ORDER) {
    const commands = allCommands.filter((c) => c.group === group);
    if (commands.length === 0) continue;

    const section = document.createElement("section");
    section.className = "group";
    section.dataset.group = group;

    const header = document.createElement("header");
    header.textContent = GROUP_TITLES[group] || group;
    section.appendChild(header);

    for (const cmd of commands) {
      const rowKey = `${cmd.name}|`;
      // Also match option-bearing variants (e.g. reload|hard).
      const variants = [...bindings.entries()].filter(
        ([k]) => k === rowKey || k.startsWith(`${cmd.name}|`),
      );
      const rowEl = buildCommandRow(cmd, variants, keyToRowKey);
      section.appendChild(rowEl);
    }
    groupsEl.appendChild(section);
  }

  applyFilters();
  detectConflicts(keyToRowKey);
}

function buildCommandRow(cmd, variants, keyToRowKey) {
  const row = document.createElement("div");
  row.className = "binding";
  if (cmd.advanced) row.classList.add("advanced");

  const desc = document.createElement("div");
  desc.className = "desc";
  desc.innerHTML = `<span>${escapeHtml(cmd.desc)}</span>`;
  if (variants.length === 0) {
    desc.querySelector("span").textContent += " ";
    const small = document.createElement("small");
    small.textContent = "not bound";
    desc.appendChild(small);
  }

  const keysWrap = document.createElement("div");
  keysWrap.className = "keys";

  const actions = document.createElement("div");
  actions.className = "actions";

  if (variants.length === 0) {
    // Unbound command: show a single "+ add" cap.
    keysWrap.appendChild(makeAddCap(cmd, "", keyToRowKey));
  } else {
    for (const [rowKey, b] of variants) {
      if (b.keys.length === 0) {
        keysWrap.appendChild(makeAddCap(cmd, b.options, keyToRowKey, rowKey));
      } else {
        for (const k of b.keys) {
          keysWrap.appendChild(makeKeyCap(k, cmd, b.options, rowKey, keyToRowKey));
        }
        // An extra "+" to add another binding to this variant.
        keysWrap.appendChild(makeAddCap(cmd, b.options, keyToRowKey, rowKey));
      }
    }
  }

  row.appendChild(desc);
  row.appendChild(keysWrap);
  row.appendChild(actions);
  return row;
}

function makeKeyCap(keyString, cmd, options, rowKey, keyToRowKey) {
  const cap = document.createElement("kbd");
  cap.className = "keycap";
  cap.textContent = prettyKey(keyString);
  cap.title = `${keyString} — click to rebind`;
  if (!isDefaultBinding(keyString, cmd.name, options)) cap.classList.add("custom");
  cap.addEventListener("click", (e) => {
    e.stopPropagation();
    startRecording(cap, (newKey) => {
      if (!newKey) {
        // Cancelled; keep current.
        return;
      }
      // Remove old key from its row, add new key to this row.
      removeKeyEverywhere(keyString);
      addKey(rowKey, newKey);
      markDirty();
      render();
    });
  });
  return cap;
}

function makeAddCap(cmd, options, keyToRowKey, rowKey) {
  const cap = document.createElement("kbd");
  cap.className = "keycap empty";
  cap.textContent = "+";
  cap.title = "Add a binding";
  const targetRowKey = rowKey || `${cmd.name}|`;
  cap.addEventListener("click", (e) => {
    e.stopPropagation();
    startRecording(cap, (newKey) => {
      if (!newKey) return;
      addKey(targetRowKey, newKey);
      markDirty();
      render();
    });
  });
  return cap;
}

function makeRemoveBtn() {
  const b = document.createElement("button");
  b.className = "icon-btn";
  b.textContent = "✕";
  b.title = "Remove";
  return b;
}

// ----- Binding mutations -----

function ensureRow(rowKey) {
  const [command, ...optParts] = rowKey.split("|");
  const options = optParts.join("|");
  if (!bindings.has(rowKey)) {
    bindings.set(rowKey, { command, options, keys: [] });
  }
  return bindings.get(rowKey);
}

function addKey(rowKey, key) {
  // Don't allow the same key on two rows; if it exists elsewhere, remove it there first.
  removeKeyEverywhere(key);
  const row = ensureRow(rowKey);
  if (!row.keys.includes(key)) row.keys.push(key);
}

function removeKeyEverywhere(key) {
  for (const b of bindings.values()) {
    b.keys = b.keys.filter((k) => k !== key);
  }
}

function isDefaultBinding(key, command, options) {
  return options === "" && defaultKeyMappings[key] === command;
}

// ----- Recording -----

const recorderEl = document.querySelector("#recorder");
const recorderKeysEl = document.querySelector("#recorder-keys");
const recorderTitle = document.querySelector("#recorder-title");
const recorderHintSpan = document.querySelector("#recorder-hint span");
let recordingSequence = [];
let recordingCallback = null;

function startRecording(cap, callback) {
  recordingSequence = [];
  recordingCallback = callback;
  recorderKeysEl.innerHTML = "";
  recorderTitle.textContent = "Press a key…";
  recorderHintSpan.textContent = cap.title || "new binding";
  cap.classList.add("recording");
  recorderEl.classList.remove("hidden");
}

function stopRecording(commit) {
  recorderEl.classList.add("hidden");
  const seq = recordingSequence;
  recordingSequence = [];
  const cb = recordingCallback;
  recordingCallback = null;
  // Clear recording styling on any cap.
  for (const el of document.querySelectorAll(".keycap.recording")) el.classList.remove("recording");
  if (commit && cb) {
    const key = seq.join("");
    cb(key || null);
  }
}

document.addEventListener("keydown", (event) => {
  if (!recorderEl.classList.contains("hidden")) {
    event.preventDefault();
    event.stopPropagation();
    if (KeyboardUtils.isEscape(event)) {
      stopRecording(false);
      return;
    }
    if (event.key === "Enter" && recordingSequence.length > 0) {
      stopRecording(true);
      return;
    }
    const keyChar = KeyboardUtils.getKeyCharString(event);
    if (!keyChar) return; // ignore bare modifier presses
    // Backspace removes the last key in the sequence.
    if (KeyboardUtils.isBackspace(event)) {
      recordingSequence.pop();
    } else {
      recordingSequence.push(keyChar);
    }
    recorderKeysEl.innerHTML = "";
    for (const k of recordingSequence) {
      const c = document.createElement("kbd");
      c.className = "keycap";
      c.textContent = prettyKey(k);
      recorderKeysEl.appendChild(c);
    }
    // Single-key bindings are by far the most common; auto-confirm after one key unless it's a
    // modifier-prefixed key, which can stand alone. We keep it simple: confirm on Enter.
  }
});

// ----- Dirty / save -----

function markDirty() {
  isDirty = computeSerialized() !== originalSerialized;
  for (const b of saveButtons) {
    b.disabled = !isDirty;
    b.textContent = isDirty ? "Save changes" : "No changes";
  }
}

async function save() {
  const text = serialize();
  try {
    await Settings.set("keyMappings", text);
    originalSerialized = computeSerialized();
    isDirty = false;
    for (const b of saveButtons) {
      b.disabled = true;
      b.textContent = "Saved";
    }
    showBanner("Saved. Your new key bindings are now active.", "info");
  } catch (e) {
    showBanner("Failed to save: " + e.message, "conflict");
  }
}

function showBanner(message, kind) {
  bannerEl.textContent = message;
  bannerEl.className = "banner " + (kind || "info");
  setTimeout(() => bannerEl.classList.add("hidden"), 3500);
}

// ----- Reset -----

document.querySelector("#reset-all").addEventListener("click", () => {
  if (!confirm("Reset all key bindings to myway defaults? Your customizations will be lost.")) {
    return;
  }
  bindings = new Map();
  for (const [key, command] of Object.entries(defaultKeyMappings)) {
    const rowKey = `${command}|`;
    if (!bindings.has(rowKey)) bindings.set(rowKey, { command, options: "", keys: [] });
    bindings.get(rowKey).keys.push(key);
  }
  markDirty();
  render();
});

// ----- Filters (search + advanced) -----

const searchInput = document.querySelector("#search");
const showAdvancedInput = document.querySelector("#show-advanced");
searchInput.addEventListener("input", applyFilters);
showAdvancedInput.addEventListener("change", () => {
  document.body.classList.toggle("show-advanced", showAdvancedInput.checked);
  applyFilters();
});

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  for (const row of groupsEl.querySelectorAll(".binding")) {
    const desc = row.querySelector(".desc").textContent.toLowerCase();
    const match = !q || desc.includes(q);
    row.classList.toggle("dimmed", !match);
  }
  // Hide groups that have no visible bindings.
  for (const group of groupsEl.querySelectorAll(".group")) {
    const anyVisible = [...group.querySelectorAll(".binding")].some(
      (r) => !r.classList.contains("dimmed") && getComputedStyle(r).display !== "none",
    );
    group.style.display = anyVisible ? "" : "none";
  }
}

// ----- Conflict detection -----

function detectConflicts(keyToRowKey) {
  // A "conflict" is the same key string appearing more than once — impossible given our model, but
  // we flag keys that are common modifiers the user might regret (e.g. bare <c-c>).
  // For now this is informational only.
}

// ----- Init -----

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function init() {
  await Settings.onLoaded();
  bindings = resolveBindings();
  originalSerialized = computeSerialized();
  render();
  for (const b of saveButtons) b.addEventListener("click", save);
}

const testEnv = globalThis.window == null ||
  globalThis.window.location.search.includes("dom_tests=true");
if (!testEnv) {
  document.addEventListener("DOMContentLoaded", async () => {
    await Settings.onLoaded();
    DomUtils.injectUserCss();
    await Commands.init();
    await init();
  });
}

export { resolveBindings, serialize };
