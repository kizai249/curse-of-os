# Asset Inventory & Licensing

All shipped assets are **original to this project** — generated procedurally in code. No
third-party models, textures, sounds or fonts are bundled.

| Asset | Source | Status | Licence |
|---|---|---|---|
| Tournament facts (teams, groups, venues, dates) | Public reporting — see CONTENT_SOURCES.md | Re-verify before release | Facts (not copyrightable); no official marks used |
| 24 team fan badges | Original shield design generated from flag colours (`ui/art.ts`, `render/models.ts`) | Final candidate | Project-owned; **not** federation crests |
| 96 player position cards | Generated; fictional characters, no names/likenesses | Final candidate | Project-owned |
| 12 landmark postcards (2D) + replicas (3D) | Procedural silhouettes & primitives (`ui/art.ts`, `render/landmarks.ts`) | **TEMPORARY** — commission illustrated postcards/models | Project-owned; depicting public landmarks |
| 8 venue stamps | Generated from venue data | Final candidate | Project-owned |
| Stadium & fan-zone environments | Procedural (`render/environments.ts`) | **TEMPORARY** | Project-owned |
| Map of Saudi Arabia | Simplified outline from ~30 approximate border points | Illustrative only — replace with a licensed/official map asset before release | Project-owned drawing |
| Timing-shot stage (goal, keeper, ball) | Inline SVG | **TEMPORARY** | Project-owned |
| SFX + crowd ambience | Web Audio synthesis | **TEMPORARY** | Project-owned |
| UI icons | Unicode emoji (system font) | Temporary | Rendered by the OS font |
| Font: Tajawal | Google Fonts (CDN) | Final candidate | SIL Open Font License 1.1 |

> **Not used anywhere:** the official tournament logo, trophy design, mascot, federation crests,
> real player names or photos, sponsor logos. Adding any of them requires a signed licence.
> The official map of the Kingdom should be used for any public release (border accuracy is a legal matter).

## Replacing temporary assets

* **Models:** export glTF/GLB per `ModelKey` (`badge, card, postcard, stamp`) and per `LandmarkModel`, ~1 world unit tall, origin at centre, ≤ 3k triangles, one 512² texture atlas. Swap the
  body of `createItemModel()` for a cached `GLTFLoader` lookup — gameplay code is unaffected.
* **Audio:** replace `AudioService.play()` cases with decoded buffers (OGG/AAC, mono, 44.1 kHz).
* **No real clubs, players, kits, crests or league marks** may be used without a licence.
