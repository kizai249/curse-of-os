# Football Quest ⚽ (working title)

Original football exploration & collection game for mobile — Arabic-first (RTL), aimed at
Saudi Gen Z. Explore a 3D desert-night stadium, collect original football collectibles,
complete missions and play mini-games.

> Lives in its own folder; the surrounding repository («لعنة أوس») is a separate project.

## Quick start (local development mode — no credentials needed)

```bash
cd football-quest
npm ci              # Node ≥ 20. If npm 10 fails with "edgesOut", use: npx npm@11 ci
npm run dev         # http://localhost:5173 — open on a phone via your LAN IP for touch testing
```

Everything runs on-device: guest profile, saves in `localStorage`, no backend, no API keys.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run typecheck` | Strict TypeScript check of src + tests |
| `npm test` | Vitest unit + integration tests (Node, no browser) |
| `npm run build` | Typecheck + production bundle in `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run e2e` | Build, then drive the real bundle in headless Chromium (phone viewport): collect, missions, inventory, full mini-game, pause/exit, settings, reload persistence, corrupted-save recovery, offline badge. Screenshots → `e2e/screenshots/` |

`npm run e2e` needs a Chromium for Playwright 1.56.1: `npx playwright install chromium`
(already present in the Claude Code cloud environment).

## Reproducible build

```bash
npm ci && npm run typecheck && npm test && npm run build
```
Output: static files in `dist/` (relative paths — host on any static server/CDN).

## Android

**Not yet built or verified** (no Android SDK/device in the build environment). Planned path
(phase 8): wrap `dist/` with Capacitor 7 → `npx cap add android` → `npx cap open android` →
build a signed AAB in Android Studio. Until then the game can be played in Chrome for Android
and added to the home screen.

## External services

None required for the MVP. Planned (phase 6, not configured): authentication + server-side
reward validation + leaderboards (e.g. Firebase or Supabase), and a map tile provider for GPS
mode. Secrets will be supplied via environment variables at build/deploy time
(`.env.local`, git-ignored) — **never** committed and never shipped for privileged access.

## Docs

* [docs/PLAN.md](docs/PLAN.md) — audit, decisions, phases, risks, acceptance criteria
* [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — modules, flows, persistence, security posture
* [docs/ASSETS.md](docs/ASSETS.md) — asset inventory & licensing
* [docs/QA_REPORT.md](docs/QA_REPORT.md) — what was actually tested and what wasn't
