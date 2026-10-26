"""Shared paths, CSS and SVG helpers for every Damanati build script."""
import re
from pathlib import Path

import tokens as T

SRC = Path(__file__).resolve().parent
ROOT = SRC.parent
OUT = ROOT / "Damanati_Brand_System"
LOGOS = OUT / "02_Logos" / "SVG"
FONTS = SRC / "fonts"
BUILD = SRC / "_build"          # intermediate html (git-ignored)

C = {k: v["hex"] for k, v in T.COLORS.items()}

WEIGHTS = {"ExtraLight": 200, "Light": 300, "Regular": 400, "Medium": 500,
           "Bold": 700, "ExtraBold": 800, "Black": 900}


def font_face(rel_to: Path):
    out = []
    for name, w in WEIGHTS.items():
        f = (FONTS / f"Tajawal-{name}.ttf").resolve()
        out.append(f"@font-face{{font-family:'Tajawal';font-weight:{w};font-style:normal;"
                   f"src:url('{f.as_uri()}') format('truetype');}}")
    return "\n".join(out)


BASE_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Tajawal',sans-serif;color:var(--dm-color-ink);background:#fff;
  font-feature-settings:'kern' 1;text-rendering:geometricPrecision}
.en{font-family:'Tajawal',sans-serif;direction:ltr;unicode-bidi:isolate}
.num{font-variant-numeric:tabular-nums}
"""


def css(rel_to=SRC):
    return font_face(rel_to) + "\n" + T.css_vars() + BASE_CSS


def logo(name, height=None, width=None, extra=""):
    """Inline an approved logo SVG (keeps it vector inside PDFs)."""
    s = (LOGOS / f"damanati_{name}.svg").read_text()
    s = re.sub(r' width="[^"]*" height="[^"]*"', "", s, count=1)
    s = re.sub(r"<title>.*?</title>", "", s)
    style = []
    if height:
        style.append(f"height:{height}")
    if width:
        style.append(f"width:{width}")
    # unique mask ids when inlined several times
    uid = f"u{abs(hash((name, height, width, extra))) % 10**8}"
    s = s.replace('id="ko-', f'id="{uid}-ko-').replace("url(#ko-", f"url(#{uid}-ko-")
    return s.replace("<svg ", f'<svg style="{";".join(style)};display:block" {extra} ', 1)


def mark_path():
    """The D symbol path without tile and without the registered mark."""
    s = (LOGOS / "damanati_mark_green.svg").read_text()
    paths = re.findall(r'<path d="([^"]*)"', s)
    vb = re.search(r'viewBox="([^"]*)"', s).group(1)

    def area(d):
        n = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", d)]
        return (max(n[0::2]) - min(n[0::2])) * (max(n[1::2]) - min(n[1::2]))
    main = max(paths, key=area)
    n = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", main)]
    bbox = [min(n[0::2]), min(n[1::2]), max(n[0::2]) - min(n[0::2]), max(n[1::2]) - min(n[1::2])]
    return main, bbox


def page_html(body, title="Damanati", extra_css="", direction="rtl", lang="ar"):
    return (f'<!doctype html><html lang="{lang}" dir="{direction}"><head><meta charset="utf-8">'
            f"<title>{title}</title><style>{css()}{extra_css}</style></head><body>{body}</body></html>")
