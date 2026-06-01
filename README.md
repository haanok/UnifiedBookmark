# Trove — Unified Cross-Browser Bookmark Dashboard

A dark, dev-tool-styled dashboard that unifies the bookmarks from **Chrome, Firefox, Edge
& Safari** on your Mac into one searchable view — with duplicate detection, live broken-link
triage, and folder/source filtering.

This is the real implementation of the [Claude Design](https://claude.ai/design) "Trove"
mockup: a **local Node backend** reads your actual browser bookmark stores and a **Vite + React**
front-end renders them. (The original export was a high-fidelity prototype running on sample data;
this reads your real data.)

> **Alpha / read-only.** Trove reads your bookmark files but never writes to them. "Merge" and
> "Remove/Hide" actions affect the current dashboard view only — your browsers are untouched.

## Architecture

```
server/   Node + Express. Reads bookmark stores, unifies them, checks links. Port 4000.
  parsers/  chromium.js (Chrome+Edge), firefox.js (places.sqlite), safari.js (Bookmarks.plist)
  unify.js  merges sources into one model      dedupe.js  flags same-URL duplicates
  linkChecker.js  live HTTP reachability checks
web/      Vite + React dashboard. Port 5173, proxies /api → :4000.
```

The backend exposes:
- `GET  /api/bookmarks` — unified `{ bookmarks, browsers, browserOrder, folders, stats, notices }`
- `POST /api/check-links` — body `{ ids?: string[] }`; runs live HTTP checks, returns broken set

## Requirements

- **macOS** (bookmark paths are macOS-specific for now).
- **Node ≥ 22** — the Firefox reader uses the built-in `node:sqlite` module (no native build).
  This was developed and tested on Node 26.

## Setup & run

```bash
npm run install:all     # installs root + web dependencies
npm run dev             # starts backend (:4000) and dashboard (:5173) together
```

Then open **http://localhost:5173**.

Run pieces individually if you prefer: `npm run dev:server` and `npm run dev:web`.

## Where bookmarks come from

| Browser | Source | Notes |
|---------|--------|-------|
| Chrome  | `~/Library/Application Support/Google/Chrome/*/Bookmarks` | JSON; all profiles |
| Edge    | `~/Library/Application Support/Microsoft Edge/*/Bookmarks` | same Chromium format |
| Firefox | `<profile>/places.sqlite` | copied to a temp file first (it's locked while Firefox runs) |
| Safari  | `~/Library/Safari/Bookmarks.plist` | binary plist — **needs Full Disk Access** |

Browsers that aren't installed are simply skipped.

### Granting Safari access (Full Disk Access)

macOS protects `~/Library/Safari`. To include Safari bookmarks, grant **Full Disk Access** to
the app running the server (your terminal, iTerm, or VS Code):

1. System Settings → Privacy & Security → **Full Disk Access**
2. Add (and enable) your terminal app.
3. Restart the terminal, then `npm run dev` again.

Until then, the dashboard shows a notice and the other three browsers still load normally.

## Features

- **Three layouts** (top-right switcher): Grouped by browser · uniform Grid · compact List.
- **Sidebar filtering** — smart views (All / Recently added / Duplicates / Broken), per-browser
  sources, and folder filters, all with live counts.
- **Duplicate detection & merge** — same normalized URL saved in multiple browsers is grouped;
  "Merge → keep newest" collapses a set (in the current view).
- **Broken-link triage** — opening the Broken view runs live HTTP checks and flags unreachable
  bookmarks with real status codes (404 / DNS / timeout / SSL). Re-check or hide individually.
- **Search & sort** — by recency, oldest, title, most-visited, or domain.

## Roadmap (out of scope for this alpha)

- Writing changes back to the actual browser bookmark files.
- Packaging as a desktop app (Electron / Tauri) so no terminal is needed.
- Windows / Linux bookmark paths.
- In-app settings (accent / density / card radius) — the CSS tokens are already in place.
