# Known Issues & Incomplete Features

## Not implemented yet (by phase)

| Feature | Phase | Notes |
|---|---|---|
| Achievements | 4 | |
| Online group features: city league, fan clubs, match predictions, card trading | 6 | Listed in-game as «قريباً أونلاين»; need backend + accounts |
| Match schedule per venue (which teams play where) | 4 | Not added — needs the official fixture list |
| Editable display name | 4 | Guest name is auto-generated |
| GPS map mode, location permissions, play-area limits | 6 | Arena mode needs no GPS; `locationOptIn` setting reserved |
| Account auth, server reward authority, leaderboards | 6 | Blocked on choosing a backend + credentials |
| Network layer (timeout/retry/offline queue) | 6 | No network calls exist yet; offline badge is shown |
| Remote config | 6 | All tunables already centralised in `src/config/` |
| Final art, music, 3D item preview in detail sheet | 5 | All current assets are temporary procedural ones |
| Android (Capacitor) build, device profiling | 7–8 | Needs Android SDK + physical devices |

## Known issues / limitations

1. **Rewards are not tamper-proof.** Client-side validation only (`LocalRewardAuthority`).
   Acceptable for a single-player MVP; must be server-authoritative before any competitive feature.
2. **Bundle size** 584 kB (154 kB gzip), dominated by Three.js. Tree-shaking/code-splitting
   of the arena is a phase-7 task.
3. **Fonts and emoji icons** come from Google Fonts / the OS; first run offline falls back to
   the system Arabic font. Emoji rendering differs between Android vendors.
4. **Point cooldowns use the device clock.** Changing the clock can respawn points early
   (only affects local single-player progress).
5. **Group E 4th team (Yemen) is unconfirmed** — flagged in data and UI, never used in the quiz.
6. **Map outline is illustrative**, not cartographic; replace with an official map before release.
7. **Venue capacities differ between sources**; shown as approximate («حوالي»).
8. **Party shootout is same-device only**; scores are not shared online.
9. **Performance was not measured on real devices.** Headless software rendering (SwiftShader)
   ran at ~10 FPS, which says nothing about GPU devices. See QA_REPORT.md.
