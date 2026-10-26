# Damanati Brand System v2.0 · نظام هوية ضماناتي

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
| Folder | Files | Contents |
|---|---|---|
| `01_Brand_Book/` | 5 | Brand book PDF, concise guidelines PDF, executive presentation PPTX, HTML sources |
| `02_Logos/` | 91 | SVG (5 lockups × 5 schemes + marks), PNG 512/2048, vector PDF, app icons, favicons |
| `03_Color_System/` | 3 | Palette JSON, GIMP/Inkscape .gpl, WCAG contrast report CSV |
| `04_Typography/` | 9 | Tajawal TTF (7 weights), OFL licence, type scale |
| `05_Graphic_Elements/` | 7 | Pattern in 6 variants (SVG) + PNG for slides |
| `06_Icons/` | 25 | 24 brand icons (SVG) + sprite |
| `07_Illustrations/` | 6 | Illustration components (PNG + HTML source) |
| `08_3D_Assets/` | 3 | 3D art direction spec + CSS mood preview |
| `09_Motion_Assets/` | 10 | Logo reveal MP4 + GIF + keyframes + HTML source, motion spec |
| `10_Digital_Applications/` | 42 | App screens, landing page, email, banners, store graphics (PNG + HTML source) |
| `11_Corporate_Identity/` | 23 | Business card, letterhead, covers, slides, ID card, folder (PNG, print PDF, HTML source) |
| `12_Social_Media/` | 20 | Instagram posts/stories, LinkedIn, X, profile assets |
| `13_Mockups/` | 10 | Campaign key visual, billboard, event backdrop, roll-up, merchandise |
| `14_Templates/` | 3 | Blank social template, editable PPTX slide template |
| `15_Technical_Documentation/` | 3 | Design tokens (JSON/CSS), DESIGN_SYSTEM.md |

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
