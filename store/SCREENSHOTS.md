# Screenshots & store graphics guide

Real 1280×800 screenshots are **already captured** for you in `store/screenshots/`:

| File | Shows |
|---|---|
| `store/screenshots/01-options.png` | Options page — brand header, section nav, "Keys & shortcuts" card |
| `store/screenshots/02-keybindings.png` | Visual Key Bindings editor — 6 command groups, clickable key caps |
| `store/screenshots/03-help.png` | In-extension Help dialog (rebranded "myway Help") |
| `store/screenshots/04-options-dark.png` | Options page in dark theme |
| `store/screenshots/05-keybindings-dark.png` | Key bindings editor in dark theme |

Upload these directly to each store (3–5 are ideal). To re-capture after UI changes:

```bash
npm run build && npm run screenshots
```

Tip: for an in-page "link hints" screenshot you still need a real content page — load the
extension in your normal browser, open e.g. a search results page, and press `f`.

## Store icon / logo

- `icons/icon128.png` — already generated, 128×128. Upload as the store icon.

## Promo tiles (optional but recommended for Chrome)

| Tile | Size | Notes |
|---|---|---|
| Small promo | 440×280 | generated at `store/assets/promo-440x280.png` |
| Marquee promo | 1400×560 | optional; stretch the small promo or design a hero |

These can be generated with:

```bash
node build_scripts/build_store_assets.js
```

## Generating store assets programmatically

Run the asset generator (creates promo tiles + a 1280×800 hero placeholder using the myway
brand palette, useful as a fallback if you can't capture real screenshots immediately):

```bash
npm run assets   # writes store/assets/*.png
```

Replace the placeholders with real screenshots before submitting — stores prefer authentic UI
captures over generated art.
