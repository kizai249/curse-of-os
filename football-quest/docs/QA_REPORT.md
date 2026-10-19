# QA Report — Phase 3 (2026-10-19)

Environment: Linux cloud container, Node 22.22, Chromium headless shell 1194 (Playwright 1.56.1)
with **software** WebGL (SwiftShader). No physical device, no GPU, no Android SDK.

## What was run and passed

| Check | Command | Result |
|---|---|---|
| Strict typecheck (src + tests) | `npm run typecheck` | ✅ 0 errors |
| Unit + integration tests | `npm test` | ✅ **68 / 68** passed (8 files) |
| Production build | `npm run build` | ✅ 584 kB JS (154 kB gzip), 16 kB CSS |
| Dependency audit | `npm audit` | ✅ 0 vulnerabilities |
| End-to-end in real bundle | `npm run e2e` | ✅ **10 / 10** checks, 0 unexpected console errors/warnings |

### Unit / integration coverage (Vitest)

| Area | Covered cases |
|---|---|
| XP & levels | curve, level derivation, max-level cap, multi-level gain, invalid/NaN/negative input |
| Inventory | new item, duplicate → shards, immutability, invalid shard amounts |
| Catalog | duplicate ids rejected, weighted roll distribution (seeded), empty-rarity fallback, data sanity |
| Missions | progress/complete, rarity/game/win/score filters, claim once, unknown id, deterministic daily selection, day rotation + expiry (failure condition), definition validation |
| Rewards | validation (negative, fractional, ∞, NaN, over-limit, unknown item), ledger cap |
| Save / load | new, round-trip, invalid JSON → backup + recover, structural corruption, field repair of settings/stats, newer version → read-only & untouched, storage unavailable, quota write failure, timestamping, migration chain / missing step / too-new / garbage |
| Timing shot | full lifecycle, grading windows, streak scoring, failure, rapid repeated taps, pause freezes time, abort, restart, speed-up floor, bad deltas |
| GameSession | collect + XP + missions, cooldown/respawn, **10 concurrent taps → 1 grant**, unknown point, duplicates → shards, mini-game record, replayed run rejected, impossible scores, claim once, **concurrent double-claim → 1 grant**, authority reject / throw (timeout) → nothing granted, level-up event, daily rotation |
| Core | seeded RNG, weighted pick, hashing, day key, event bus isolation/unsubscribe, logger levels/scopes |

### E2E flows (Chromium, 390×844 touch viewport)

walk to point + collect + reveal · missions + claim · inventory + item detail · full 5-shot timing
game → results · restart → pause → exit · profile + settings (quality change) · reload persists
stats/settings · corrupted save → banner + backup · empty inventory state · offline badge on/off.

## Bugs found and fixed during this phase

| Bug | Fix | Regression guard |
|---|---|---|
| Tap-to-move overshot discovery points after camera widening; collect button vanished before it could be pressed | Taps near a point snap the walk target beside it | e2e "walk to point + collect" (taps once, waits 1.5 s, button must remain) |
| Avatar headband code rotated the whole avatar group | Rotate the headband mesh only | visual (screenshots) |
| Particle fade only dimmed the red channel | Removed incorrect fade | visual |
| `toNonIndexed()` warning on an already non-indexed geometry | Removed call | e2e fails on unexpected console warnings |
| RTL bidi reversed "+15 XP" / "120 / 25" | `dir="ltr"` / `<bdi>` on numeric chips | visual |
| Item dates shown in Hijri calendar | Gregorian calendar, Latin digits | visual |
| Daily missions didn't roll over if app stayed open past midnight | Checked every second (cheap no-op otherwise) | unit test covers rotation logic |
| `TimingShotConfig` literal types blocked test configs | Explicit interface | typecheck |

## NOT verified (and how to verify)

| Item | Why not | How |
|---|---|---|
| FPS / frame time on real phones | No GPU/device; SwiftShader gave ~10 FPS which is meaningless for devices | Open on mid-range Android (e.g. 4 GB RAM, Adreno 6xx) via `npm run dev -- --host`, read Settings → الأداء; profile with Chrome remote DevTools Performance panel |
| Memory / GC spikes on device | Same | Chrome DevTools Memory + Performance on device; watch "worst frame" in Settings |
| Battery impact | Same | Android battery stats over a 15-min session (render loop already stops off-screen) |
| Audio output | Headless runs muted | Manual check on device: volumes, ambience, suspend on background |
| Haptics | No vibration hardware | Manual on Android Chrome |
| iOS Safari | Not available | Manual on iPhone (WebGL2 + Web Audio unlock paths) |
| Android packaged build | No SDK | Phase 8 (Capacitor) |
| GPS, network retry, backend | Not implemented yet | Phase 6 |

This build is **not bug-free**; it is the tested state listed above.
