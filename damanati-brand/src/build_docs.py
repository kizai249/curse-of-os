"""Written documentation for the asset library (README + specs). Inventory is generated from disk."""
import shutil

import tokens as T
from common import OUT, FONTS, C

TYPO = """# Typography · الخطوط

**Typeface:** Tajawal (Arabic + Latin), weights 200, 300, 400, 500, 700, 800, 900.
**Licence:** SIL Open Font License 1.1, © 2018 Boutros International. Free for commercial use, embedding in apps
and websites. See `OFL.txt`. Source: Google Fonts (`fonts.google.com/specimen/Tajawal`).

**Logo wordmark note:** the English word "Damanati" inside the logo is Myriad Pro Bold (Adobe, commercial),
already converted to outlines in every logo file. Do not set new text in Myriad Pro; use Tajawal.

## Type scale (digital, base 16px)

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
{rows}

Rules
- Arabic paragraphs need 1.6–1.8 line height. Never add letter-spacing to Arabic.
- English set next to Arabic: ~55–60% of the Arabic size, one weight lighter, colour `stone`.
- Western digits (0–9) by default in product UI; tabular numerals in lists and tables.
- Print: headings 18–36pt, body 9.5–11pt at 150–170% leading, minimum 7pt.
"""

THREE_D = """# 3D art direction · الاتجاه ثلاثي الأبعاد

Status: **proposed**. No 3D renders are included in this package (no 3D renderer was available);
`3d_direction_preview_css.png` is a flat CSS mood preview, not a render.

| Item | Spec |
|---|---|
| Geometry | Icon tile extruded to 12% of its side, 2% bevel. Symbol raised 3% or debossed. Use the original vector (`02_Logos/SVG/damanati_symbol_primary.svg`) only. |
| Materials | Glossy green enamel (as in the leather badge, ref. p.10), frosted green glass, or matte ceramic. Symbol in ivory `#F6F4EF`. |
| Lighting | Soft key from top-right at 45°, faint cool rim, soft contact shadow. No neon reflections. |
| Background | `green-800 → night` gradient, or matte `paper` for light pieces. |
| Companions | Floating Product Passport cards, a thin metallic Lifecycle Arc ring, soft paper receipts. |
| Never | Distort the symbol, metal shields, gold padlocks, rainbow gradients. |
| Deliverables to request | 4K stills (16:9, 1:1, 9:16), turntable 6 s loop (MP4 H.264), GLB of the extruded icon for AR/web. |
"""

MOTION = """# Motion specification · مواصفات الحركة

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
{motion}

Respect `prefers-reduced-motion`: replace movement with a 120 ms fade.
"""

DS = """# Damanati design system · نظام التصميم

Status legend: **approved** (in the v1.0 guide) · **measured** (read from v1.0 artwork) · **proposed** (new in v2.0).
These are interface specifications proposed for the product; they are not extracted from an existing app build.

## 1. Tokens
- `design-tokens/damanati.tokens.json` — W3C Design Tokens (DTCG) format, each colour carries `status`.
- `design-tokens/damanati.tokens.css` — CSS custom properties + light/dark semantic aliases (`[data-theme="dark"]`).

## 2. Colour
| Token | Hex | Status | Use |
|---|---|---|---|
{colors}

Contrast pairs are calculated in `../03_Color_System/damanati_contrast_report.csv` (WCAG 2.x formula).
Brand green on white = 4.92:1 (AA normal text). `green-500` on white = 3.22:1 → large text / graphics only.

## 3. Spacing, radius, elevation
- Spacing scale (4-pt base): {spacing}
- Radius: {radius}. Product cards 16–18px; app icon / hero tiles 22.4%.
- Elevation: {shadow_keys} levels (`--dm-shadow-1..4`). Use 1 for cards, 2 for raised cards, 3 for sheets, 4 for modals.

## 4. Grid and responsive behaviour
| Breakpoint | Columns | Margin | Gutter |
|---|---|---|---|
| < 768 (mobile) | 4 | 20px | 12px |
| 768–1023 (tablet) | 8 | 32px | 16px |
| ≥ 1024 (desktop, design at 1440) | 12 | 96px @1440 | 24px |

## 5. Components (styling principles)
| Component | Spec |
|---|---|
| Primary button | Height 54 (mobile) / 46 (web), radius 16, `green-600` fill, white Tajawal 700 16px. Pressed: `green-700`. Focus: 2px ring `green-700`, 2px offset. |
| Secondary button | Transparent, 1.5px border `green-200`, text `green-600`. |
| Input | Height 56, radius 16, fill `paper`, border 1.5px `sand`; focus: white fill, border `green-600`, 4px halo `green-100`. Phone numbers LTR-isolated. |
| Warranty card | Radius 18, border `sand`, 14px padding; 3px status edge on the inline-start side; 52px product tile; status chip; elapsed-time bar 4px. |
| Status chip | Pill, 12px Tajawal 500, icon 14px + label + colour. Never colour alone. Active / Expiring (≤30 days, proposed threshold) / Expired. |
| Lifecycle ring | Stroke 8–10% of diameter, round caps, 6–8° gaps, always paired with a labelled legend. |
| Tab bar | 84px incl. home indicator, 4 items, active colour `green-600` (`mint` in dark). |
| Notification | App icon (symbol, no ®) + bold title + one sentence with a concrete date or count. |
| Empty state | Line illustration in a dashed 22.4% tile, title (22px/800), one sentence, one primary action. |

## 6. Iconography
24×24 grid, 2px padding, 1.75px stroke (2px at 20px), round caps and joins, `currentColor`.
Sizes: {icons}. Directional icons mirror in RTL; object icons do not. Files: `../06_Icons/`.

## 7. RTL / LTR
- Set `dir="rtl"` on Arabic documents; use logical CSS properties (`margin-inline-start`, `inset-inline-end`).
- Isolate Latin strings, numbers, phone numbers and URLs (`unicode-bidi: isolate`).
- Progress bars and timelines start from the right in Arabic.
- The bilingual logo lockup is never mirrored.

## 8. Naming conventions
- Logos: `damanati_{{lockup}}_{{scheme}}[_{{size}}h].{{ext}}` — lockup: symbol | arabic | english | bilingual | vertical | mark;
  scheme: primary | reversed-on-green | reversed-on-dark | mono-black | mono-white.
- Icons: `dm-icon-{{name}}.svg`. Tokens: `--dm-{{group}}-{{name}}`.
- Applications: `{{channel}}_{{nn}}_{{description}}[_{{size}}].png` with an editable `source/*.html` beside it.

## 9. Export dimensions
| Asset | Size |
|---|---|
| iOS App Store icon | 1024×1024, no alpha |
| Android adaptive icon | 432×432 foreground (safe 66dp) + background |
| Favicon | 16 / 32 / 48 ICO + SVG |
| App Store screenshot (6.7") | 1290×2796 |
| Google Play feature graphic | 1024×500 |
| Instagram post / story | 1080×1080 / 1080×1920 |
| LinkedIn cover / X header | 1584×396 / 1500×500 |
| Email header | 600×200 (@2x 1200×400) |

## 10. Formats
SVG for vectors (preferred), PNG for transparent rasters, PDF for print, MP4/GIF for motion, PPTX for editable decks.
EPS/AI are not included; open the SVG/PDF in Illustrator to save as AI/EPS.

## 11. Accessibility requirements
Text ≥ 4.5:1 (large ≥ 3:1), non-text UI ≥ 3:1, status never by colour alone, touch targets ≥ 44pt / 48dp,
visible focus ring, text scaling to 200% without clipping, `prefers-reduced-motion` respected.
These are design requirements; a WCAG conformance claim needs an audit of the shipped product.
"""

README = """# Damanati Brand System v2.0 · نظام هوية ضماناتي

مكتبة أصول هوية **ضماناتي** (Damanati). الشعار والأخضر وخط تجوال والنمط محفوظة كما اعتُمدت في الإصدار 1.0؛
هذا الإصدار يضيف النظام المحيط بها. كل ملف هنا موجود فعليًا وتم توليده والتحقق منه.

The Damanati brand asset library. The logo, green, Tajawal and pattern are preserved exactly as approved in v1.0;
v2.0 adds the surrounding system. Every file listed here exists and was generated and checked.

## Start here
| You are… | Open |
|---|---|
| Anyone | `01_Brand_Book/Damanati_Brand_Book.pdf` (80 pp.) or the short `Damanati_Brand_Guidelines.pdf` |
| Executive | `01_Brand_Book/Damanati_Brand_Presentation.pptx` |
| Designer | `02_Logos/`, `05_Graphic_Elements/`, `06_Icons/`, `14_Templates/` |
| Developer | `15_Technical_Documentation/` (tokens JSON/CSS + DESIGN_SYSTEM.md), `06_Icons/damanati-icons-sprite.svg` |
| Marketing | `12_Social_Media/`, `13_Mockups/`, `10_Digital_Applications/` |

## Status of every rule
- **Approved** — stated in `Damanati_Brand_Identity_Final.pdf` (v1.0).
- **Measured** — read from the v1.0 artwork, not stated in it.
- **Proposed** — new in v2.0; needs brand-owner approval before roll-out.

## Folder inventory (generated)
{inventory}

## Key specifications
- Brand green `#2F7D6B` (RGB 47 125 107) · Ink `#231F20` · Stone `#6B675F` · White — ratio 60 / 30 / 5 / 5.
- Typeface: Tajawal 200–900, SIL OFL 1.1 (fonts in `04_Typography/`).
- Clear space: x = stroke of the D bowl ≈ 1/6 of the icon tile width. Minimum size: 10 mm / 48 px (symbol).
- English spelling: **Damanati**. Product term in English: **warranty** (not "guarantee").

## Known limitations
- CMYK values are naive conversions; run a print proof and confirm Pantone matches with the printer.
- No EPS/AI files: use the SVG or PDF logos (vector) and save to AI/EPS in Illustrator if needed.
- 3D: art direction + CSS preview only, no 3D renders. Motion: one rendered reveal ("The Seal"); three more concepts are specs.
- Mockups are flat artwork and CSS device frames, not photographic scenes. The photographic mockups in the v1.0 guide (pp.17–21) remain valid.
- All product names, stores, people and figures in the screens are illustrative; no third-party brands or partnerships are implied.
- PowerPoint text uses Tajawal: install the fonts in `04_Typography/` before editing, or text falls back to a system font.
- The HTML sources reference fonts and images by absolute `file://` paths of the build machine; after moving the folder, re-run `python3 src/build_all.py` to regenerate them with correct paths.
- A fully editable PPTX version of the 80-page book was not produced; the editable master of the book is the HTML in `01_Brand_Book/source/`, built by `src/build_book.py`.

## Rebuilding
All assets are generated from code in `damanati-brand/src/` (Python 3 + Playwright Chromium + ffmpeg):
`python3 src/build_all.py` regenerates everything and the zip packages in `dist/`.
The original logo geometry comes from `src/reference/ref_page04_logo_components.svg` (page 4 of the v1.0 PDF).
"""


def inventory():
    desc = {
        "01_Brand_Book": "Brand book PDF, concise guidelines PDF, executive presentation PPTX, HTML sources",
        "02_Logos": "SVG (5 lockups × 5 schemes + marks), PNG 512/2048, vector PDF, app icons, favicons",
        "03_Color_System": "Palette JSON, GIMP/Inkscape .gpl, WCAG contrast report CSV",
        "04_Typography": "Tajawal TTF (7 weights), OFL licence, type scale",
        "05_Graphic_Elements": "Pattern in 6 variants (SVG) + PNG for slides",
        "06_Icons": "24 brand icons (SVG) + sprite",
        "07_Illustrations": "Illustration components (PNG + HTML source)",
        "08_3D_Assets": "3D art direction spec + CSS mood preview",
        "09_Motion_Assets": "Logo reveal MP4 + GIF + keyframes + HTML source, motion spec",
        "10_Digital_Applications": "App screens, landing page, email, banners, store graphics (PNG + HTML source)",
        "11_Corporate_Identity": "Business card, letterhead, covers, slides, ID card, folder (PNG, print PDF, HTML source)",
        "12_Social_Media": "Instagram posts/stories, LinkedIn, X, profile assets",
        "13_Mockups": "Campaign key visual, billboard, event backdrop, roll-up, merchandise",
        "14_Templates": "Blank social template, editable PPTX slide template",
        "15_Technical_Documentation": "Design tokens (JSON/CSS), DESIGN_SYSTEM.md",
    }
    lines = ["| Folder | Files | Contents |", "|---|---|---|"]
    for d in sorted(p for p in OUT.iterdir() if p.is_dir()):
        n = sum(1 for f in d.rglob("*") if f.is_file())
        lines.append(f"| `{d.name}/` | {n} | {desc.get(d.name, '')} |")
    return "\n".join(lines)


def build():
    ty = OUT / "04_Typography"
    (ty / "fonts").mkdir(parents=True, exist_ok=True)
    for f in FONTS.glob("*.ttf"):
        shutil.copy(f, ty / "fonts" / f.name)
    shutil.copy(FONTS / "OFL.txt", ty / "OFL.txt")
    rows = "\n".join(f"| `{t}` | {s}px | {lh} | {w} | {u} |" for t, s, lh, w, tr, u in T.TYPE_SCALE)
    (ty / "TYPOGRAPHY.md").write_text(TYPO.replace("{rows}", rows))
    (OUT / "08_3D_Assets" / "3D_ART_DIRECTION.md").write_text(THREE_D)
    (OUT / "09_Motion_Assets" / "MOTION_SPEC.md").write_text(
        MOTION.replace("{motion}", "\n".join(f"- `{k}`: {v}" for k, v in T.MOTION.items())))
    colors = "\n".join(f"| `{k}` | {v['hex']} | {v['status']} | {v['use']} |" for k, v in T.COLORS.items())
    (OUT / "15_Technical_Documentation" / "DESIGN_SYSTEM.md").write_text(
        DS.replace("{colors}", colors).replace("{spacing}", ", ".join(str(s) for s in T.SPACING))
          .replace("{radius}", ", ".join(f"{k} {v if isinstance(v, str) else str(v) + 'px'}" for k, v in T.RADIUS.items()))
          .replace("{shadow_keys}", str(len(T.SHADOW))).replace("{icons}", ", ".join(f"{s}px" for s in T.ICON_SIZES))
          .replace("{{", "{").replace("}}", "}"))
    (OUT / "README.md").write_text(README.replace("{inventory}", inventory()))
    print("docs ok")


if __name__ == "__main__":
    build()
