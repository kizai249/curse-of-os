# Damanati design system · نظام التصميم

Status legend: **approved** (in the v1.0 guide) · **measured** (read from v1.0 artwork) · **proposed** (new in v2.0).
These are interface specifications proposed for the product; they are not extracted from an existing app build.

## 1. Tokens
- `design-tokens/damanati.tokens.json` — W3C Design Tokens (DTCG) format, each colour carries `status`.
- `design-tokens/damanati.tokens.css` — CSS custom properties + light/dark semantic aliases (`[data-theme="dark"]`).

## 2. Colour
| Token | Hex | Status | Use |
|---|---|---|---|
| `green-600` | #2F7D6B | approved | Primary brand colour: logo tile, primary actions, headers, brand surfaces (~60%). |
| `white` | #FFFFFF | approved | Breathing space, cards, reversed logo (~30%). |
| `stone` | #6B675F | approved | Secondary text, metadata, dividers on light surfaces (~5%). |
| `ink` | #231F20 | approved | Wordmark, headlines, body text, dark surfaces (~5%). |
| `green-50` | #F0F7F5 | proposed | Tint/shade of Damanati Green for UI states, charts and depth. |
| `green-100` | #E2EFEC | proposed | Tint/shade of Damanati Green for UI states, charts and depth. |
| `green-200` | #C3E0D9 | proposed | Tint/shade of Damanati Green for UI states, charts and depth. |
| `green-300` | #8FCBBE | proposed | Tint/shade of Damanati Green for UI states, charts and depth. |
| `green-400` | #54BAA3 | proposed | Tint/shade of Damanati Green for UI states, charts and depth. |
| `green-500` | #3D9F88 | proposed | Tint/shade of Damanati Green for UI states, charts and depth. |
| `green-700` | #2A5F53 | proposed | Tint/shade of Damanati Green for UI states, charts and depth. |
| `green-800` | #21453D | proposed | Tint/shade of Damanati Green for UI states, charts and depth. |
| `green-900` | #162C27 | proposed | Tint/shade of Damanati Green for UI states, charts and depth. |
| `paper` | #F7F5F0 | measured | Warm light background (measured from the light-background panel, ref. p.10). |
| `sand` | #ECE8DF | proposed | Secondary light surface, table stripes, input fills. |
| `night` | #141716 | proposed | Dark-theme background (from the dark app screen, ref. p.21). |
| `night-raised` | #1F2422 | proposed | Dark-theme cards. |
| `mint` | #7FD1B9 | proposed | Accent on dark surfaces only: active states, highlights, chart emphasis. |
| `success` | #2F7D6B | proposed | Warranty active / valid (reuses brand green). |
| `warning` | #94600F | proposed | Warranty expiring soon (≤30 days). |
| `danger` | #B4382F | proposed | Warranty expired, destructive actions, errors. |
| `warning-on-dark` | #E0A526 | proposed | Expiring status on dark surfaces. |
| `danger-on-dark` | #E07A70 | proposed | Expired status on dark surfaces. |
| `info` | #2D6A8F | proposed | Neutral information, links in long text. |

Contrast pairs are calculated in `../03_Color_System/damanati_contrast_report.csv` (WCAG 2.x formula).
Brand green on white = 4.92:1 (AA normal text). `green-500` on white = 3.22:1 → large text / graphics only.

## 3. Spacing, radius, elevation
- Spacing scale (4-pt base): 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
- Radius: xs 4px, sm 8px, md 12px, lg 16px, xl 24px, tile 22.4%, pill 999px. Product cards 16–18px; app icon / hero tiles 22.4%.
- Elevation: 4 levels (`--dm-shadow-1..4`). Use 1 for cards, 2 for raised cards, 3 for sheets, 4 for modals.

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
Sizes: 16px, 20px, 24px, 32px, 48px. Directional icons mirror in RTL; object icons do not. Files: `../06_Icons/`.

## 7. RTL / LTR
- Set `dir="rtl"` on Arabic documents; use logical CSS properties (`margin-inline-start`, `inset-inline-end`).
- Isolate Latin strings, numbers, phone numbers and URLs (`unicode-bidi: isolate`).
- Progress bars and timelines start from the right in Arabic.
- The bilingual logo lockup is never mirrored.

## 8. Naming conventions
- Logos: `damanati_{lockup}_{scheme}[_{size}h].{ext}` — lockup: symbol | arabic | english | bilingual | vertical | mark;
  scheme: primary | reversed-on-green | reversed-on-dark | mono-black | mono-white.
- Icons: `dm-icon-{name}.svg`. Tokens: `--dm-{group}-{name}`.
- Applications: `{channel}_{nn}_{description}[_{size}].png` with an editable `source/*.html` beside it.

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
