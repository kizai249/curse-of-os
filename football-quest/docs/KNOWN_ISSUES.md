# Known Issues & Incomplete Features

## Not implemented yet (by phase)

| Feature | Phase | Notes |
|---|---|---|
| Tactics quiz mini-game | 4 | Shown as non-interactive "قريباً" card |
| Squad-builder mini-game | 4 | Card items already carry `position` (GK/DF/MF/FW) for it |
| Achievements | 4 | |
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
5. **Performance was not measured on real devices.** Headless software rendering (SwiftShader)
   ran at ~10 FPS, which says nothing about GPU devices. See QA_REPORT.md.
