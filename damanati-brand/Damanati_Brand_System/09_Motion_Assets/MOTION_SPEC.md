# Motion specification · مواصفات الحركة

## Rendered: "The Seal" logo reveal
- Files: `damanati_logo_reveal_seal_1920x1080.mp4` (H.264, 30 fps, 3.6 s), `damanati_logo_reveal_seal_640.gif`,
  `keyframes/`, editable source `source/logo_reveal_seal.html` (frame-driven by `window.setT(seconds)`).
- Timeline: 0.00–0.70 tile scales 72→100% and fades in · 0.35–1.35 clockwise sweep reveals the D ·
  1.30–1.60 ® fades in · 1.45–2.35 symbol rises into the vertical lockup, Arabic then English names rise 18px ·
  2.20–3.60 pattern band fades in at the bottom; hold.
- Easing: `seal` cubic-bezier(.7,0,.2,1) style (implemented as cubic in-out). Final frame = approved vertical lockup.
- Sound (proposed, not produced): soft click when the arc closes + short rising tone.

## Storyboard specs (not rendered)
| Concept | Objective | Duration | Behaviour | Camera | Output |
|---|---|---|---|---|---|
| Passport Filed | Social post / ad | 6 s | A passport card slides in and settles on a stack; status chip turns from grey to "ساري". | Static, 20° top-down | 4:5, 9:16 MP4 |
| Lifecycle Arc | Explain reminders | 8 s | The ring draws; at 90% it turns to "expiring" and a reminder notification appears. | Slow dolly-in 10% | 16:9, 1:1 MP4 |
| Deck Transition | Presentation covers | 1.2 s | Pattern wipes right-to-left then fades to reveal the section title. | — | PPTX morph |

## UI motion tokens
- `duration-fast`: 120ms
- `duration-base`: 220ms
- `duration-slow`: 420ms
- `duration-reveal`: 900ms
- `ease-standard`: cubic-bezier(.2,0,0,1)
- `ease-enter`: cubic-bezier(0,0,.2,1)
- `ease-exit`: cubic-bezier(.4,0,1,1)
- `ease-seal`: cubic-bezier(.7,0,.2,1)

Respect `prefers-reduced-motion`: replace movement with a 120 ms fade.
