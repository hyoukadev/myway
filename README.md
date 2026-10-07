# myway

A keyboard-driven browser extension with **Helix-editor-style keybindings** and a **unified
command palette** — a refined fork of [Vimium](https://github.com/philc/vimium) (MIT).

## Key features

1. **Helix-style keybindings.** `j/k/h/l` to scroll, `g` prefix for goto (`gg`=top, `ge`=bottom,
   `gn`/`gp`=next/prev tab), `Space` as the leader key for pickers and actions, `:` for command
   mode. See the full key map below.
2. **Unified palette.** Press `o` (or `Space f`) to open one search box that blends **tabs,
   bookmarks, history, and commands** — grouped by type, MRU-sorted within each group.
3. **Minimal settings.** The options page only manages which sites myway is active on (URL
   whitelist). No clutter.
4. **Multi-store ready.** Builds for Chrome, Edge, and Firefox (all MV3).

## Default key map (Helix-inspired)

| Key | Action | | Key | Action |
|---|---|---|---|---|
| `j` `k` | scroll down/up | | `o` | unified palette |
| `h` `l` | scroll left/right | | `:` | command mode |
| `d` `u` | half-page down/up | | `/` | find in page |
| `gg` `ge` | scroll to top/bottom | | `n` `N` | next/prev match |
| `gh` `gl` | scroll to left/right edge | | `y` | copy current URL |
| `gn` `gp` | next/previous tab | | `p` `P` | open copied URL (this/new tab) |
| `gd` | follow link (hint mode) | | `x` `X` | close/restore tab |
| `gu` `gU` | go up/root of URL | | `t` | new tab |
| `g0` `g$` | first/last tab | | `r` `R` | reload (hard) |
| `Space f` | unified palette | | `Space b` | tab picker |
| `Space y` | copy URL | | `Space w …` | tab/window prefix |
| `?` | help dialog | | `i` | insert mode |

Full details in [docs/](docs/).

## Build

```bash
npm install
npm run check       # static validation
npm run build       # dist/chrome, dist/edge, dist/firefox + dist/unpacked
npm run smoke       # headless runtime test
```

Load `dist/unpacked/` via `chrome://extensions` → Developer mode → Load unpacked.

## Credits & license

Derived from [Vimium](https://github.com/philc/vimium) by Phil Crosby & Ilya Sukhar (MIT). See
`CREDITS` and `MIT-LICENSE.txt`.
