# Asset Inventory & Licensing

All shipped assets are **original to this project** — generated procedurally in code. No
third-party models, textures, sounds or fonts are bundled.

| Asset | Source | Status | Licence |
|---|---|---|---|
| 16 collectibles (`config/items.ts`) — names, descriptions, fictional characters | Written for this project | Final copy (review with marketing) | Project-owned |
| Collectible 3D models (`render/models.ts`) | Procedural Three.js primitives | **TEMPORARY** — replace per `ModelKey` with glTF | Project-owned |
| Avatar (mascot) | Procedural | **TEMPORARY** | Project-owned |
| Arena: pitch, stands, crowd, floodlights, palms, goals | Procedural | **TEMPORARY** (correct scale: FIFA-like 7.32 × 2.44 m goals) | Project-owned |
| Inventory thumbnails | Rendered at runtime from the models above | Auto-updates when models change | Project-owned |
| Timing-shot stage (goal, keeper, ball) | Inline SVG | **TEMPORARY** | Project-owned |
| SFX + crowd ambience (`services/AudioService.ts`) | Web Audio synthesis | **TEMPORARY** | Project-owned |
| UI icons | Unicode emoji (system font) | Temporary | Rendered by the OS font |
| Font: Tajawal | Google Fonts (loaded from CDN, not bundled) | Final candidate | SIL Open Font License 1.1 |

## Replacing temporary assets

* **Models:** export glTF/GLB per `ModelKey` (`ball, boots, gloves, kit, scarf, cone, whistle, trophy,
  card`), ~1 world unit tall, origin at centre, ≤ 3k triangles, one 512² texture atlas. Swap the
  body of `createItemModel()` for a cached `GLTFLoader` lookup — gameplay code is unaffected.
* **Audio:** replace `AudioService.play()` cases with decoded buffers (OGG/AAC, mono, 44.1 kHz).
* **No real clubs, players, kits, crests or league marks** may be used without a licence.
