#!/usr/bin/env node
// Headless runtime smoke test: loads the unpacked myway extension into a real Chromium/Edge
// browser, opens the Options page and the Key Bindings editor, captures console errors and
// page-level exceptions, and verifies the new UI actually rendered.
//
// Usage: node build_scripts/smoke.js [path-to-chrome-or-edge-exe]
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { resolve, sep } from "node:path";

const extPath = resolve("dist/unpacked");
if (!existsSync(extPath)) {
  console.error("dist/unpacked not found. Run `npm run build` first.");
  process.exit(2);
}

// Default to Edge on this machine; allow override via argv or SMOKE_BROWSER env.
const candidates = [
  process.env.SMOKE_BROWSER,
  process.argv[2],
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  // Playwright's bundled Chromium (used when Edge/Chrome can't launch).
  ...(() => {
    const home = process.env.USERPROFILE || process.env.HOME || "";
    const p = `${home}/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe`
      .replace(/\//g, sep);
    return [p];
  })(),
].filter(Boolean);
const exePath = candidates.find(existsSync);
if (!exePath) {
  console.error("No Chrome/Edge executable found. Pass its path as argv[1] or SMOKE_BROWSER env.");
  process.exit(2);
}
console.log("browser:", exePath);
console.log("extension:", extPath);

const errors = [];
const log = [];

async function attach(page, label) {
  page.on("console", (m) => {
    const t = m.type();
    const text = m.text();
    log.push(`[${label}][${t}] ${text}`);
    if (t === "error") errors.push(`[${label}] console error: ${text}`);
  });
  page.on("pageerror", (e) => errors.push(`[${label}] pageerror: ${e.message}`));
  page.on("requestfailed", (r) => {
    const u = r.url();
    // Ignore favicon and extension-internal requests that 404 harmlessly.
    if (u.includes("_favicon") || u.endsWith(".map")) return;
    errors.push(`[${label}] requestfailed: ${u} — ${r.failure()?.errorText}`);
  });
}

const browser = await puppeteer.launch({
  executablePath: exePath,
  headless: "new",
  userDataDir: resolve(`dist/.pp-${Date.now()}`),
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-popup-blocking",
  ],
});

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log("✓ " + msg);
  else { console.error("✗ " + msg); failures++; }
};

try {
  // Give the service worker a moment to register.
  await new Promise((r) => setTimeout(r, 2500));

  const page = await browser.newPage();
  await attach(page, "options");

  // --- Options page ---
  await page.goto("chrome-extension://<id>/pages/options.html", { waitUntil: "networkidle2" }).catch(() => {});
  // The <id> placeholder won't resolve; find the real extension id from the targets.
  const targets = browser.targets();
  const ext = targets.find((t) => t.type() === "service_worker" && t.url().startsWith("chrome-extension://"));
  const id = ext ? new URL(ext.url()).host : null;
  check(!!id, `service worker registered (id=${id})`);

  if (id) {
    await page.goto(`chrome-extension://${id}/pages/options.html`, { waitUntil: "networkidle2" });

    // Brand header should render.
    const brandName = await page.$eval(".brand-name", (el) => el.textContent).catch(() => null);
    check(brandName === "myway", `options: brand header shows "${brandName}"`);

    // The simplified settings page should show the exclusion rules editor.
    const hasExclusionTable = await page.$("#exclusion-rules");
    check(!!hasExclusionTable, "options: exclusion rules table present");

    // All 20 setting fields should be present in the DOM.
    const fieldCount = await page.$$eval("[name]", (els) => els.length);
    check(fieldCount >= 20, `options: ${fieldCount} named form fields present (>=20 expected)`);

    // --- Key Bindings editor ---
    const kb = await browser.newPage();
    await attach(kb, "keybindings");
    await kb.goto(`chrome-extension://${id}/pages/keybindings.html`, { waitUntil: "networkidle2" });

    // Groups should render with key caps.
    const groupCount = await kb.$$eval(".group", (els) => els.length).catch(() => 0);
    check(groupCount > 0, `keybindings: ${groupCount} command groups rendered`);

    const capCount = await kb.$$eval(".keycap", (els) => els.length).catch(() => 0);
    check(capCount > 0, `keybindings: ${capCount} key caps rendered`);

    // The recorder should be hidden initially.
    const recorderHidden = await kb.$eval("#recorder", (el) => el.classList.contains("hidden"));
    check(recorderHidden, "keybindings: recorder hidden initially");

    // Clicking the first key cap should open the recorder.
    await kb.evaluate(() => {
      const cap = document.querySelector(".keycap");
      if (cap) cap.click();
    });
    await new Promise((r) => setTimeout(r, 200));
    const recorderOpen = await kb.$eval("#recorder", (el) => !el.classList.contains("hidden"));
    check(recorderOpen, "keybindings: recorder opens on key cap click");

    // Save button should be disabled until a change.
    const saveDisabled = await kb.$eval("#save", (el) => el.disabled);
    check(saveDisabled, "keybindings: save disabled until changes");

    // --- Help dialog page (rebranded) ---
    const help = await browser.newPage();
    await attach(help, "help");
    await help.goto(`chrome-extension://${id}/pages/help_dialog_page.html`, { waitUntil: "networkidle2" });
    const helpTitle = await help.title();
    check(/myway/.test(helpTitle), `help: title is "${helpTitle}"`);
  }
} catch (e) {
  errors.push("fatal: " + e.message);
} finally {
  await browser.close();
}

console.log("\n--- console log (last 15) ---");
for (const l of log.slice(-15)) console.log(l);

console.log("\n--- result ---");
if (errors.length) {
  console.error(`\n${errors.length} runtime error(s):`);
  for (const e of errors) console.error("  " + e);
}
console.log(failures === 0 && errors.length === 0 ? "\nSMOKE PASSED" : `\nSMOKE FAILED (${failures} check failures, ${errors.length} errors)`);
process.exit(failures === 0 && errors.length === 0 ? 0 : 1);
