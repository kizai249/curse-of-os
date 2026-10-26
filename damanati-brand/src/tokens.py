"""Single source of truth for Damanati design tokens.

status:
  approved  - stated in the reference brand guide (Damanati_Brand_Identity_Final.pdf)
  measured  - read from the reference artwork, not stated as a value in the guide
  proposed  - added by this system; needs brand-owner approval
"""
import colorsys
import json


def _rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hex(rgb):
    return "#" + "".join(f"{max(0, min(255, round(c))):02X}" for c in rgb)


def _cmyk(h):
    """Naive device-independent conversion. Print values must be proofed."""
    r, g, b = (c / 255 for c in _rgb(h))
    k = 1 - max(r, g, b)
    if k >= 1:
        return (0, 0, 0, 100)
    return tuple(round(v * 100) for v in ((1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k))


def luminance(h):
    def ch(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = _rgb(h)
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def _shade(base, lightness):
    r, g, b = (c / 255 for c in _rgb(base))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    # keep hue, ease saturation down at the extremes so tints don't go neon
    s2 = s * (0.55 + 0.45 * (1 - abs(lightness - 0.45) / 0.55))
    return _hex(tuple(c * 255 for c in colorsys.hls_to_rgb(h, lightness, s2)))


BASE_GREEN = "#2F7D6B"

_GREEN_STEPS = {"50": 0.955, "100": 0.91, "200": 0.82, "300": 0.68, "400": 0.53,
                "500": 0.43, "700": 0.27, "800": 0.20, "900": 0.13}


def _c(name, hex_, status, use, ar):
    return {"name": name, "ar": ar, "hex": hex_, "rgb": _rgb(hex_), "cmyk": _cmyk(hex_), "status": status, "use": use}


COLORS = {
    "green-600": _c("Damanati Green", BASE_GREEN, "approved", "Primary brand colour: logo tile, primary actions, headers, brand surfaces (~60%).", "الأخضر الرئيسي"),
    "white": _c("White", "#FFFFFF", "approved", "Breathing space, cards, reversed logo (~30%).", "الأبيض"),
    "stone": _c("Dark Stone", "#6B675F", "approved", "Secondary text, metadata, dividers on light surfaces (~5%).", "الرمادي الداكن"),
    "ink": _c("Ink Black", "#231F20", "approved", "Wordmark, headlines, body text, dark surfaces (~5%).", "الأسود"),
}
for step, light in _GREEN_STEPS.items():
    COLORS[f"green-{step}"] = _c(f"Green {step}", _shade(BASE_GREEN, light), "proposed",
                                 "Tint/shade of Damanati Green for UI states, charts and depth.", f"أخضر {step}")
COLORS.update({
    "paper": _c("Paper", "#F7F5F0", "measured", "Warm light background (measured from the light-background panel, ref. p.10).", "ورقي"),
    "sand": _c("Sand", "#ECE8DF", "proposed", "Secondary light surface, table stripes, input fills.", "رملي"),
    "night": _c("Night", "#141716", "proposed", "Dark-theme background (from the dark app screen, ref. p.21).", "ليلي"),
    "night-raised": _c("Night Raised", "#1F2422", "proposed", "Dark-theme cards.", "ليلي مرتفع"),
    "mint": _c("Mint Signal", "#7FD1B9", "proposed", "Accent on dark surfaces only: active states, highlights, chart emphasis.", "نعناعي"),
    "success": _c("Valid", "#2F7D6B", "proposed", "Warranty active / valid (reuses brand green).", "ساري"),
    "warning": _c("Expiring", "#94600F", "proposed", "Warranty expiring soon (≤30 days).", "ينتهي قريبًا"),
    "danger": _c("Expired", "#B4382F", "proposed", "Warranty expired, destructive actions, errors.", "منتهي"),
    "warning-on-dark": _c("Expiring (dark)", "#E0A526", "proposed", "Expiring status on dark surfaces.", "ينتهي قريبًا - داكن"),
    "danger-on-dark": _c("Expired (dark)", "#E07A70", "proposed", "Expired status on dark surfaces.", "منتهي - داكن"),
    "info": _c("Info", "#2D6A8F", "proposed", "Neutral information, links in long text.", "معلومة"),
})
# Proper ordering for display
ORDER_GREEN = ["green-50", "green-100", "green-200", "green-300", "green-400", "green-500",
               "green-600", "green-700", "green-800", "green-900"]

FONT_AR = "Tajawal"
FONT_EN = "Tajawal"

TYPE_SCALE = [
    # token, size px, line-height, weight, tracking(em), usage
    ("display", 56, 1.1, 800, -0.01, "Covers, campaign headlines"),
    ("h1", 40, 1.2, 800, -0.005, "Page titles"),
    ("h2", 30, 1.25, 700, 0, "Section titles"),
    ("h3", 22, 1.35, 700, 0, "Card titles, sub-sections"),
    ("body-lg", 18, 1.7, 400, 0, "Lead paragraphs"),
    ("body", 16, 1.7, 400, 0, "Running text (Arabic needs the taller line-height)"),
    ("label", 14, 1.4, 500, 0, "Buttons, inputs, tabs"),
    ("caption", 12, 1.5, 400, 0.01, "Metadata, timestamps, footnotes"),
    ("figure", 32, 1.0, 800, 0, "Numbers: days remaining, totals"),
]

SPACING = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]
RADIUS = {"xs": 4, "sm": 8, "md": 12, "lg": 16, "xl": 24, "tile": "22.4%", "pill": 999}
SHADOW = {
    "1": "0 1px 2px rgba(35,31,32,.06), 0 1px 1px rgba(35,31,32,.04)",
    "2": "0 4px 12px rgba(35,31,32,.08)",
    "3": "0 12px 32px rgba(35,31,32,.12)",
    "4": "0 24px 60px rgba(20,23,22,.20)",
}
MOTION = {
    "duration-fast": "120ms", "duration-base": "220ms", "duration-slow": "420ms", "duration-reveal": "900ms",
    "ease-standard": "cubic-bezier(.2,0,0,1)", "ease-enter": "cubic-bezier(0,0,.2,1)",
    "ease-exit": "cubic-bezier(.4,0,1,1)", "ease-seal": "cubic-bezier(.7,0,.2,1)",
}
ICON_SIZES = [16, 20, 24, 32, 48]
BREAKPOINTS = {"sm": 360, "md": 768, "lg": 1024, "xl": 1440}


def css_vars():
    lines = [":root {"]
    for k, v in COLORS.items():
        lines.append(f"  --dm-color-{k}: {v['hex']};")
    lines.append(f"  --dm-font-ar: '{FONT_AR}', 'Noto Kufi Arabic', system-ui, sans-serif;")
    lines.append(f"  --dm-font-en: '{FONT_EN}', 'Segoe UI', system-ui, sans-serif;")
    for t, size, lh, w, tr, _ in TYPE_SCALE:
        lines += [f"  --dm-type-{t}-size: {size / 16:.4g}rem;", f"  --dm-type-{t}-line: {lh};",
                  f"  --dm-type-{t}-weight: {w};", f"  --dm-type-{t}-tracking: {tr}em;"]
    for i, s in enumerate(SPACING):
        lines.append(f"  --dm-space-{i}: {s}px;")
    for k, v in RADIUS.items():
        lines.append(f"  --dm-radius-{k}: {v if isinstance(v, str) else str(v) + 'px'};")
    for k, v in SHADOW.items():
        lines.append(f"  --dm-shadow-{k}: {v};")
    for k, v in MOTION.items():
        lines.append(f"  --dm-motion-{k}: {v};")
    lines.append("}")
    lines += [
        "",
        "/* Semantic aliases - light theme */",
        ":root, [data-theme=\"light\"] {",
        "  --dm-bg: var(--dm-color-white);",
        "  --dm-bg-subtle: var(--dm-color-paper);",
        "  --dm-surface: var(--dm-color-white);",
        "  --dm-text: var(--dm-color-ink);",
        "  --dm-text-muted: var(--dm-color-stone);",
        "  --dm-brand: var(--dm-color-green-600);",
        "  --dm-brand-strong: var(--dm-color-green-700);",
        "  --dm-on-brand: var(--dm-color-white);",
        "  --dm-border: var(--dm-color-sand);",
        "  --dm-focus: var(--dm-color-green-700);",
        "}",
        "[data-theme=\"dark\"] {",
        "  --dm-bg: var(--dm-color-night);",
        "  --dm-bg-subtle: var(--dm-color-night-raised);",
        "  --dm-surface: var(--dm-color-night-raised);",
        "  --dm-text: #F2F1EE;",
        "  --dm-text-muted: #A8A39A;",
        "  --dm-brand: var(--dm-color-green-500);",
        "  --dm-brand-strong: var(--dm-color-mint);",
        "  --dm-on-brand: var(--dm-color-white);",
        "  --dm-border: #2C3330;",
        "  --dm-focus: var(--dm-color-mint);",
        "}",
    ]
    return "\n".join(lines) + "\n"


def tokens_json():
    data = {
        "$description": "Damanati design tokens. status: approved | measured | proposed.",
        "color": {k: {"$value": v["hex"], "$type": "color", "name": v["name"], "nameAr": v["ar"],
                      "status": v["status"], "usage": v["use"]} for k, v in COLORS.items()},
        "font": {"arabic": {"$value": FONT_AR, "status": "approved"},
                 "latin": {"$value": FONT_EN, "status": "proposed",
                           "note": "Reference guide names Tajawal; the English wordmark is Myriad Pro Bold (outlined in logo files only)."}},
        "type": {t: {"size": {"$value": f"{s}px"}, "lineHeight": {"$value": lh}, "weight": {"$value": w},
                     "letterSpacing": {"$value": f"{tr}em"}, "usage": u, "status": "proposed"}
                 for t, s, lh, w, tr, u in TYPE_SCALE},
        "space": {str(i): {"$value": f"{s}px", "$type": "dimension"} for i, s in enumerate(SPACING)},
        "radius": {k: {"$value": v if isinstance(v, str) else f"{v}px"} for k, v in RADIUS.items()},
        "shadow": {k: {"$value": v} for k, v in SHADOW.items()},
        "motion": {k: {"$value": v} for k, v in MOTION.items()},
        "iconSize": {str(s): {"$value": f"{s}px"} for s in ICON_SIZES},
        "breakpoint": {k: {"$value": f"{v}px"} for k, v in BREAKPOINTS.items()},
    }
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    for k in ORDER_GREEN:
        v = COLORS[k]
        print(k, v["hex"], f"on white {contrast(v['hex'], '#FFFFFF'):.2f}", f"on ink {contrast(v['hex'], '#231F20'):.2f}")
    for k in ["stone", "ink", "warning", "danger", "info", "mint", "paper", "sand"]:
        v = COLORS[k]
        print(k, v["hex"], f"white {contrast(v['hex'], '#FFFFFF'):.2f}", f"paper {contrast(v['hex'], '#F7F5F0'):.2f}", f"night {contrast(v['hex'], '#141716'):.2f}")
