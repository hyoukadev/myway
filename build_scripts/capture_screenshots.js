#!/usr/bin/env node
// Captures real 1280x800 store screenshots from the loaded myway extension, replacing the
// placeholder promo art. Run after `npm run build` (needs dist/unpacked).
import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const extPath = resolve("dist/unpacked");
if (!existsSync(extPath)) {
  console.error("dist/unpacked not found. Run `npm run build` first.");
  process.exit(2);
}
const exePath = [
  process.env.SMOKE_BROWSER,
  process.argv[2],
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Users/ZIV3/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe",
].filter(Boolean).find(existsSync);
if (!exePath) { console.error("No Chrome/Edge found."); process.exit(2); }

mkdirSync("store/screenshots", { recursive: true });

const browser = await puppeteer.launch({
  executablePath: exePath,
  headless: "new",
  userDataDir: resolve(`dist/.pp-shot-${Date.now()}`),
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    "--no-first-run", "--no-default-browser-check",
  ],
});

let failures = 0;
const check = (c, m) => { c ? console.log("✓ " + m) : (console.error("✗ " + m), failures++); };

try {
  await new Promise((r) => setTimeout(r, 2500));
  const id = browser.targets()
    .find((t) => t.type() === "service_worker" && t.url().startsWith("chrome-extension://"));
  const extId = id ? new URL(id.url()).host : null;
  check(!!extId, `extension loaded (id=${extId})`);

  async function shoot(url, file, { dark = false } = {}) {
    const page = await browser.newPage();
    await page.emulateMediaFeatures(dark ? [{ name: "prefers-color-scheme", value: "dark" }] : []);
    await page.goto(`chrome-extension://${extId}/${url}`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600)); // let CSS settle
    await page.screenshot({ path: `store/screenshots/${file}` });
    console.log("  captured store/screenshots/" + file);
    await page.close();
  }

  if (extId) {
    await shoot("pages/options.html", "01-options.png");
    await shoot("pages/keybindings.html", "02-keybindings.png");
    await shoot("pages/help_dialog_page.html", "03-help.png");
    await shoot("pages/options.html", "04-options-dark.png", { dark: true });
    await shoot("pages/keybindings.html", "05-keybindings-dark.png", { dark: true });
  }
} catch (e) {
  console.error("fatal:", e.message);
  failures++;
} finally {
  await browser.close();
}
console.log(failures === 0 ? "\nSCREENSHOTS DONE" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
