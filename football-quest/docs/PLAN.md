# Football Quest — Audit & Implementation Plan

## 1. Audit of the existing repository (2026-10-19)

| Area | Finding |
|---|---|
| Repo | `kizai249/curse-of-os` — hosts **«لعنة أوس» (Curse of Os)**, an unrelated Arabic psychological ARG. |
| Engine / stack | None. Vanilla HTML/CSS/JS SPA, no package.json, no build, no tests. |
| Duplicated systems | Two parallel apps: `index.html + js/*` (modular) and `hub.html + script.js + style.css` (monolithic, 8 mini-games). They share no code. |
| Backend | Supabase insert-only analytics table (`supabase/migrations/001_game_events.sql`); keys are placeholders, so nothing is connected. |
| Football Quest assets / GDD / screen designs | **None exist.** No art direction document, asset inventory or interaction spec was found. |
| Unity | Not installed in this environment (no editor, no licence, no Android SDK). |

**Decision (confirmed with the product owner):** build Football Quest as a *separate* web project in
`football-quest/`, leaving «لعنة أوس» untouched.

## 2. Technical direction and why

| Option | Verdict |
|---|---|
| Unity + C# | Preferred by the brief, but cannot be compiled, run, rendered or built for Android here. Any Unity code written now would be unverified. |
| **TypeScript + Three.js + Vite (chosen)** | Real-time 3D (WebGL) on mid-range phones, runs and is testable here, ships to Android via PWA now and Capacitor wrapper later, tiny dependency surface (1 runtime dep). |
| Retain the Curse of Os vanilla JS | No types, no tests, no module system — wrong foundation for a production game. |

Domain logic is engine-agnostic (pure TS, no DOM/Three imports), so it can be ported to C#/Unity
later with the test suite as the specification.

## 3. Architecture (summary — see ARCHITECTURE.md)

```
src/core         Logger, EventBus, Rng, Clock, Result          (no game knowledge)
src/config       balance, items, missions, arena, minigames    (all tunable numbers)
src/domain       progression, inventory, catalog, missions, rewards  (pure rules)
src/persistence  versioned save schema, migrations, SaveManager
src/minigames    pure, tick-driven mini-game rules
src/services     RewardAuthority, network, location, analytics, audio, remote config
src/game         GameSession — the only place rules are combined and state is committed
src/render       Three.js arena, models, particles (replaceable presentation)
src/ui           DOM screens (Arabic, RTL), router, HUD
```

## 4. Phases and status

| Phase | Scope | Status |
|---|---|---|
| 1 | Audit, plan | ✅ this document |
| 2 | Project setup, core, domain, persistence, mini-game rules, tests | ✅ |
| 3 | One playable loop: 3D arena → discover → collect → timing-shot mini-game → results → missions/inventory | 🚧 in progress |
| 4 | Achievements, quiz + squad mini-games, profile polish | ⏳ |
| 5 | Art pass, audio pass, transitions | ⏳ (temporary procedural assets in place) |
| 6 | GPS map mode, backend (auth, server reward validation, leaderboards) | ⏳ blocked on provider/credentials decision |
| 7 | Perf profiling on devices, e2e tests | ⏳ |
| 8 | Android build (Capacitor) + release docs | ⏳ needs Android SDK / device |

## 5. Risks

| Risk | Mitigation |
|---|---|
| Client-side rewards can be tampered with | `RewardAuthority` interface; local impl is explicitly non-authoritative. Leaderboards stay disabled until a server authority exists. |
| WebGL cost on low-end Android | Quality presets (pixel-ratio cap, shadows, particles), FPS monitor, object pooling. |
| GPS play safety / privacy | Arena mode needs no location. Map mode will be opt-in with permission UX, play-area restrictions and speed lock (phase 6). |
| No approved art direction | Procedural, clearly-labelled temporary assets behind a `modelKey` interface so final models swap in without gameplay changes. |
| Unity expectation | Pure-TS domain + tests make a later port mechanical. |

## 6. Acceptance criteria for the MVP loop (phase 3)

1. A guest profile is created automatically and persists across reloads.
2. Player walks in a 3D arena (tap-to-move) and collects glowing discovery points within range.
3. Collected item is revealed with rarity; duplicates convert to shards; point goes on cooldown.
4. Timing-shot mini-game has start/active/pause/success/failure/results states, restart and exit.
5. XP, level, missions progress and can be claimed exactly once.
6. Corrupted/newer saves never crash the game nor destroy data.
7. `npm run typecheck`, `npm test` and `npm run build` pass.
