"""Tokens, CSS, pattern, icon set and app-icon/favicon sources."""
import json

import tokens as T
from common import OUT, C, mark_path, LOGOS

# ---------------------------------------------------------------- tokens
def write_tokens():
    d = OUT / "15_Technical_Documentation" / "design-tokens"
    d.mkdir(parents=True, exist_ok=True)
    (d / "damanati.tokens.json").write_text(T.tokens_json())
    (d / "damanati.tokens.css").write_text("/* Damanati design tokens - generated from src/tokens.py */\n" + T.css_vars())
    swatches = {k: {"hex": v["hex"], "rgb": v["rgb"], "cmyk_naive": v["cmyk"], "status": v["status"],
                    "name": v["name"], "nameAr": v["ar"], "usage": v["use"]} for k, v in T.COLORS.items()}
    cd = OUT / "03_Color_System"
    cd.mkdir(parents=True, exist_ok=True)
    (cd / "damanati_colors.json").write_text(json.dumps(swatches, ensure_ascii=False, indent=2) + "\n")
    # GIMP/Inkscape palette
    gpl = ["GIMP Palette", "Name: Damanati", "Columns: 4", "#"]
    for k, v in T.COLORS.items():
        r, g, b = v["rgb"]
        gpl.append(f"{r:3d} {g:3d} {b:3d}\t{v['name']} ({v['status']})")
    (cd / "damanati_palette.gpl").write_text("\n".join(gpl) + "\n")
    # contrast report
    rows = ["foreground,background,ratio,AA_normal(4.5),AA_large(3.0),AAA_normal(7.0)"]
    fgs = ["ink", "stone", "white", "green-600", "green-700", "green-800", "warning", "danger", "info", "mint",
           "warning-on-dark", "danger-on-dark", "green-500"]
    bgs = ["white", "paper", "sand", "green-600", "green-700", "green-50", "ink", "night", "night-raised"]
    for f in fgs:
        for b in bgs:
            if f == b:
                continue
            r = T.contrast(C[f], C[b])
            rows.append(f"{f} {C[f]},{b} {C[b]},{r:.2f},{'pass' if r >= 4.5 else 'fail'},"
                        f"{'pass' if r >= 3 else 'fail'},{'pass' if r >= 7 else 'fail'}")
    (cd / "damanati_contrast_report.csv").write_text("\n".join(rows) + "\n")


# ---------------------------------------------------------------- pattern
def pattern_svg(fg, bg=None, cell=96, cols=8, rows=8, scale=0.37, fade=False):
    """Staggered mark pattern measured from the approved pattern page (ref. p.14):
    horizontal pitch = 2.7x mark width, alternate rows shifted by half a pitch,
    row step = 0.36x pitch."""
    d, (x0, y0, w, h) = mark_path()
    k = cell * scale / w
    step = cell * 0.36
    defs, uses = [], []
    defs.append(f'<path id="m" d="{d}" transform="scale({k:.5f}) translate({-x0:.3f} {-y0:.3f})"/>')
    W, H = cols * cell, rows * cell
    nrows = int(H / step) + 2
    for r in range(-1, nrows):
        off = (cell / 2) if r % 2 else 0
        for c in range(-1, cols + 1):
            x = c * cell + off
            y = r * step
            if -cell < x < W and -step * 2 < y < H:
                uses.append(f'<use href="#m" x="{x:.2f}" y="{y:.2f}"/>')
    grad = ""
    mask = ""
    if fade:
        grad = ('<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/>'
                '<stop offset=".35" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>'
                f'<mask id="fm"><rect width="{W}" height="{H}" fill="url(#f)"/></mask>')
        mask = ' mask="url(#fm)"'
    bgrect = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'<defs>{"".join(defs)}{grad}</defs>{bgrect}<g fill="{fg}"{mask}>{"".join(uses)}</g></svg>\n')


def write_patterns():
    d = OUT / "05_Graphic_Elements" / "patterns"
    d.mkdir(parents=True, exist_ok=True)
    variants = {
        "green-on-white": (C["green-600"], C["white"], False),
        "white-on-green": (C["white"], C["green-600"], False),
        "tint-on-green": (C["green-500"], C["green-600"], False),
        "green-on-paper": (C["green-200"], C["paper"], False),
        "fade-white-on-green": (C["white"], C["green-600"], True),
        "transparent-green": (C["green-600"], None, False),
    }
    for name, (fg, bg, fade) in variants.items():
        (d / f"damanati_pattern_{name}.svg").write_text(pattern_svg(fg, bg, fade=fade, cols=8, rows=5))


# ---------------------------------------------------------------- icons
# 24x24 grid, 1.75 stroke, round caps/joins, 2px live-area padding, corner radius 3.
ICONS = {
    "warranty": '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h5"/><path d="M13.5 16.2l1.6 1.6 3-3.2"/>',
    "receipt": '<path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    "product": '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"/><path d="M3 12h18"/>',
    "calendar": '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none"/>',
    "expiry": '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.8M9.5 3h5"/>',
    "bell": '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2H4.5z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    "shield-check": '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
    "scan": '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7.5 12h9"/>',
    "camera": '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.3"/>',
    "folder": '<path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h3.5l2 2.2H18a2.5 2.5 0 0 1 2.5 2.5v7.8A2.5 2.5 0 0 1 18 20H6a2.5 2.5 0 0 1-2.5-2.5z"/>',
    "store": '<path d="M4.5 9.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V9.5"/><path d="M3.5 9.5L5.2 4h13.6l1.7 5.5a2.6 2.6 0 0 1-5.1.6 2.6 2.6 0 0 1-5.2 0 2.6 2.6 0 0 1-5.1-.6z"/><path d="M10 20.5v-5h4v5"/>',
    "timeline": '<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><path d="M6 8.2v7.6M10.5 6H20M10.5 18H17M10.5 12H15"/>',
    "renew": '<path d="M19.5 12a7.5 7.5 0 0 1-13.2 4.9M4.5 12a7.5 7.5 0 0 1 13.2-4.9"/><path d="M18 3.5v3.8h-3.8M6 20.5v-3.8h3.8"/>',
    "service": '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    "document": '<path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    "share": '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4"/>',
    "search": '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "user": '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    "home": '<path d="M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15V15h-6v5.5H5.5A1.5 1.5 0 0 1 4 19z"/>',
    "lock": '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    "check-circle": '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>',
    "alert": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.3" r="1" fill="currentColor" stroke="none"/>',
    "x-circle": '<circle cx="12" cy="12" r="8.5"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>',
}
ICON_AR = {
    "warranty": "ضمان", "receipt": "فاتورة", "product": "منتج", "calendar": "تاريخ", "expiry": "انتهاء",
    "bell": "تنبيه", "shield-check": "محمي", "scan": "مسح", "camera": "تصوير", "folder": "أرشيف",
    "store": "متجر", "timeline": "سجل", "renew": "تجديد", "service": "صيانة", "document": "مستند",
    "share": "مشاركة", "search": "بحث", "plus": "إضافة", "user": "حسابي", "home": "الرئيسية",
    "lock": "خصوصية", "check-circle": "ساري", "alert": "قريبًا", "x-circle": "منتهي",
}


def icon_svg(name, size=24, color="currentColor", stroke=1.75):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" '
            f'stroke="{color}" stroke-width="{stroke}" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>')


def write_icons():
    d = OUT / "06_Icons" / "svg"
    d.mkdir(parents=True, exist_ok=True)
    for n in ICONS:
        (d / f"dm-icon-{n}.svg").write_text(icon_svg(n) + "\n")
    sprite = "".join(f'<symbol id="dm-{n}" viewBox="0 0 24 24">{p}</symbol>' for n, p in ICONS.items())
    (OUT / "06_Icons" / "damanati-icons-sprite.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" fill="none" stroke="currentColor" '
        f'stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{sprite}</svg>\n')


def build():
    write_tokens()
    write_patterns()
    write_icons()


if __name__ == "__main__":
    build()
    print("foundation ok")
