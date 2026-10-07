# Publishing myway — step by step

This guide walks you through publishing myway to the three target stores. Before you start,
generate the build artifacts:

```bash
cd <project-dir>   # the myway source directory
npm install
npm run check      # must say "All checks passed."
npm run build      # produces dist/chrome, dist/edge, dist/firefox
```

You will submit:

- Chrome Web Store → `dist/chrome/myway-chrome-1.0.0.zip`
- Microsoft Edge Add-ons → `dist/edge/myway-edge-1.0.0.zip`
- Firefox Add-ons (AMO) → `dist/firefox/myway-firefox-1.0.0.zip`

> ⚠️ Before publishing, replace the placeholder URLs in `store/listing.md` (support email,
> homepage, privacy URL, repository) and in `background_scripts/main.js` (the changelog link in
> the upgrade notification) with your real values, then rebuild.

---

## 0. Accounts & one-time setup

| Store | Sign up | Cost | Notes |
|---|---|---|---|
| Chrome Web Store | https://chrome.google.com/webstore/devconsole/ | one-time **US$5** | verify phone + email |
| Microsoft Edge Add-ons | https://partner.microsoft.com/dashboard/microsoftedge | **free** | needs a Microsoft Partner Center account |
| Firefox Add-ons (AMO) | https://addons.mozilla.org/developers/ | **free** | verify email |

You only need the accounts once; subsequent versions are just re-uploads.

---

## 1. Chrome Web Store

1. Go to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
2. Click **Add new item** → upload `dist/chrome/myway-chrome-1.0.0.zip`.
3. **Store listing** tab — fill in from `store/listing.md` (English). Required:
   - Name, Summary, Description, Category (*Productivity*).
   - A 128×128 icon (use `icons/icon128.png`) and at least 1 screenshot (1280×800 or 640×400).
   - A small promo tile 440×280 (`store/assets/` — see SCREENSHOTS.md).
4. **Privacy** tab — paste the URL of your hosted privacy policy (see `PRIVACY.md`; host it on
   GitHub Pages or your site). Answer the data-collection questions (myway collects **none**).
5. **Permissions** justification — explain each permission briefly (see `PERMISSIONS.md`).
6. Save → **Submit for review**. First review usually takes 1–3 days.

## 2. Microsoft Edge Add-ons

1. Go to [Partner Center → Edge](https://partner.microsoft.com/dashboard/microsoftedge).
2. **Create new extension** → upload `dist/edge/myway-edge-1.0.0.zip`.
3. Fill the store listing (reuse Chrome copy; Edge supports the same fields).
4. Upload screenshots and store logo (same assets as Chrome).
5. Add the privacy policy URL and permissions justification.
6. Submit. Edge review typically takes a few days.

## 3. Firefox Add-ons (AMO)

1. Go to [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) →
   **Submit a New Add-on**.
2. Choose **On this site** → upload `dist/firefox/myway-firefox-1.0.0.zip`.
3. AMO runs automated validation (linter) on upload — it should pass since the manifest is clean
   MV3. Fix any reported issues and re-zip.
4. Fill listing details (you can provide localized English + Chinese via AMO's locale support).
5. The **source code** step: AMO may ask for source if you use obfuscation — myway ships plain
   source, so this is N/A, but you can point them to your public repo.
6. Submit for review. Firefox review can take hours to days; until approved you can publish a
   self-distributed signed build via the same console.

---

## After publishing

- Bump `version` in **both** `manifest.json` and `manifest.firefox.json` for each release, then
  rebuild. All three stores reject re-uploads of the same version.
- Keep `store/listing.md`, `PRIVACY.md`, and `PERMISSIONS.md` in sync with what you submit.
- Record each store's listing URL in `store/listing.md` for the in-extension feedback links.
