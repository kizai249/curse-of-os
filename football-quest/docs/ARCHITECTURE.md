# Football Quest — Technical Architecture

## Layering

```
            ┌──────────────────────────────────────────────┐
  input ──▶ │ ui/  (DOM, Arabic RTL)   render/ (Three.js)  │  presentation — replaceable
            └───────────────┬──────────────────────────────┘
                            │ commands            ▲ events (EventBus<SessionEvents>)
            ┌───────────────▼──────────────────────────────┐
            │ game/GameSession — the ONLY writer of state  │  application service
            └──┬────────────┬──────────────┬──────────┬────┘
               │            │              │          │
      domain/ (pure)   minigames/ (pure)  persistence/  services/ (interfaces)
      progression       TimingShot        SaveManager    RewardAuthority
      inventory                            saveSchema    Analytics, Audio
      catalog, missions                    migrations    (Location, Network: phase 6)
      rewards
               │
          config/  — tournament facts (teams, groups, cities, venues, landmarks) → generated
                     item catalogue & locations; balance, missions, minigames
          core/    — Logger, EventBus, Rng, Clock, Result
```

Rules:

* `domain/`, `minigames/`, `persistence/` and `game/` import **nothing** from DOM or Three.js →
  fully unit-testable in Node and portable to C#/Unity.
* State (`SaveData`) is immutable. Each command builds the next state and `commit()`s it:
  in-memory first, then persistence, then a `saveChanged` event.
* Screens never call each other; they use `navigate()` and react to session events.
* Expected failures are values (`Result<T, E>`), not exceptions. Exceptions are reserved for
  programming errors (invalid config, NaN XP) and are caught at the boundary (router, boot,
  global `error`/`unhandledrejection` handlers).

## Content model

`config/tournament.ts` is the single source of truth. From it:

* `config/items.ts → buildCatalog()` generates 140 collectibles (24 badges, 96 position cards,
  12 landmark postcards, 8 venue stamps).
* `config/locations.ts → buildLocations()` generates 11 locations: one fan zone per city
  (landmark ring + extra spots) and one stadium per venue (centre stamp + 7 random spots).
  Fixed points carry `grantItemId`; others roll from `RANDOM_DROP_POOL`.
* `minigames/quizBank.ts` generates every quiz question from the same data, so the quiz can
  never contradict the album. Unconfirmed facts (`unconfirmed: true`) are never quizzed.

The UI is a map → city → location flow; `UIController` owns a single `ArenaScene` and rebuilds
it per location (stadium in venue palette with a name board, or fan zone with landmark replicas,
24 team flags (instanced) and a big screen; sea plane for coastal cities).

## Key flows

**Discovery collect** — `UIController.collect()` → `GameSession.collectDiscovery(pointId)`:
point exists → not on cooldown → not already in flight (`pending` set) → roll item (seeded RNG
injected) → `RewardAuthority.authorize()` → re-check cooldown → apply inventory/XP/stats/missions
→ commit → UI plays reveal.

**Mini-game** — `TimingShot` is a pure state machine (`start → active ⇄ paused → success|failure`,
or `aborted`) advanced by `tick(dtMs)`. The screen only renders snapshots and forwards input.
On finish, `GameSession.recordMiniGame(result)` validates game id, score range (`maxScore`),
duplicate `runId` (ledger), authorises the XP and commits.

**Squad builder** — the UI only sends card ids; `GameSession.submitSquad()` checks ownership,
duplicates and kind, scores the lineup itself (`scoreSquad`) and records the run.

**Party shootout** — pure `PartyShootout` state machine (2–4 players, 5 rounds, sudden death up
to 5 extra rounds, then shared win). Pass-and-play on one device; XP goes to the device owner.

**Mission claim** — validated against current state, authorised, re-validated after the await
(state may have changed), recorded in the ledger, reward applied. Double taps and concurrent
claims grant exactly once (tested).

## Persistence

* Key `fq.save`, JSON, `version: 2` (v1 → v2 migration: retired items → 5 shards per copy, old point cooldowns cleared; XP/missions/settings kept; `reconcileMissions` aligns mission lists on every load). Level is *derived* from `totalXp`, never stored.
* Load outcomes: `new | loaded | migrated | recovered | incompatible | unavailable`.
  * corrupted → raw payload copied to `fq.save.backup`, fresh profile, banner shown.
  * newer version → session is **read-only**: the newer save is never overwritten.
  * storage blocked (private mode) → memory-only session with a banner.
* Cosmetic sections (settings, stats, arena timers) are repaired field-by-field; progress
  sections (player, XP, inventory, missions, ledger) must validate or the save is treated as corrupt.
* Migrations: add `MIGRATIONS[n]` (n → n+1) + a test whenever `SAVE_VERSION` is bumped.

## Security posture (honest)

The MVP is **client-only**. `LocalRewardAuthority` validates structure and limits but a
determined player can edit `localStorage`. Therefore:

* No leaderboards, trading or purchases are enabled.
* All reward paths already go through `RewardAuthority.authorize()` with a `grantId`, so a
  server implementation (phase 6) can become authoritative without touching gameplay code.
* No secrets, keys or backend URLs exist in the client.

## Rendering & performance

* One `WebGLRenderer`; the loop runs **only** while the arena is visible and the tab is
  foregrounded (stopped behind overlay screens and on `visibilitychange`).
* Draw-call budget: crowd (224 blocks) and palms are `InstancedMesh`; no dynamic lights besides
  hemisphere + one directional.
* Quality presets (`config/balance.ts → PERFORMANCE`): pixel-ratio cap 1 / 1.5 / 2, shadows off /
  1024 / 2048, antialias off on low.
* `ParticlePool` — fixed 160-particle buffer, one draw call, zero per-burst allocation.
* `PerfMonitor` — rolling FPS and worst frame (GC/shader-compile spikes), shown in Settings.
* Item thumbnails are rendered once from the same 3D models with a short-lived context.
