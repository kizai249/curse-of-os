# درب الكأس | Cup Trail 🏆 (working title — folder still named `football-quest`)

Fan-journey game for the 2027 continental cup hosted by Saudi Arabia — Arabic-first (RTL),
aimed at Saudi Gen Z. Travel the map between **Riyadh, Jeddah and Al Khobar**, walk the
**8 tournament stadiums** and each city's **fan zone with its landmarks**, and fill the
tournament album (team badges, fictional position cards, landmark postcards, venue stamps).
Play the cup quiz, squad builder, timing shot, and a pass-and-play **party shootout** with friends.

See [docs/CONCEPT_AR.md](docs/CONCEPT_AR.md) for the concept (Arabic) and
[docs/CONTENT_SOURCES.md](docs/CONTENT_SOURCES.md) for fact sources and licensing limits.

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
| `npm run e2e` | Build, then drive the real bundle in headless Chromium (phone viewport): map → city → stadium stamp → fan-zone landmark, missions, album, quiz, squad, party shootout, timing shot pause/exit, settings, reload persistence, v1→v2 migration, corrupted-save recovery, offline badge. Screenshots → `e2e/screenshots/` |

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
