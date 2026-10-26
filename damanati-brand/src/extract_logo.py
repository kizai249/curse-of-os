"""Extract the approved Damanati logo artwork as clean standalone SVG.

Source: page 4 ("مكونات الشعار") of Damanati_Brand_Identity_Final.pdf, converted
with `pdftocairo -svg` into reference/ref_page04_logo_components.svg. The logo
geometry is copied verbatim from the PDF vectors - nothing is redrawn. Glyph
<use> references are resolved into plain <path> elements so the files do not
depend on any font.

Output: a dict of raw parts used by build_logos.py.
"""
import re
from pathlib import Path

SRC = Path(__file__).parent / "reference" / "ref_page04_logo_components.svg"

NUM = re.compile(r"-?\d+(?:\.\d+)?(?:e-?\d+)?")


def _bbox(d, dx=0.0, dy=0.0):
    n = [float(x) for x in NUM.findall(d)]
    xs, ys = n[0::2], n[1::2]
    return (min(xs) + dx, min(ys) + dy, max(xs) + dx, max(ys) + dy)


def _load():
    s = SRC.read_text()
    defs, body = s.split("</defs>", 1)
    glyphs = {}
    for m in re.finditer(r'<g id="(glyph-[\d-]+)">\s*<path d="([^"]*)"', defs):
        glyphs[m.group(1)] = m.group(2)
    items = []  # (kind, fill, d, dx, dy, bbox)
    fill = None
    for m in re.finditer(r"<(path|g|use)\b([^>]*)>|</g>", body):
        if m.group(0) == "</g>":
            fill = None
            continue
        kind, attrs = m.group(1), m.group(2)
        if kind == "g":
            f = re.search(r'fill="([^"]*)"', attrs)
            fill = f.group(1) if f else None
        elif kind == "use":
            gid = re.search(r'href="#([^"]*)"', attrs).group(1)
            x = float(re.search(r' x="([^"]*)"', attrs).group(1))
            y = float(re.search(r' y="([^"]*)"', attrs).group(1))
            d = glyphs.get(gid)
            if not d:
                continue  # empty glyph (space)
            items.append(("glyph", fill, d, x, y, _bbox(d, x, y)))
        else:
            if "transform" in attrs or 'fill="none"' in attrs:
                continue
            d = re.search(r' d="([^"]*)"', attrs).group(1)
            f = re.search(r'fill="([^"]*)"', attrs).group(1)
            items.append(("path", f, d, 0.0, 0.0, _bbox(d)))
    return items


def _inside(b, region):
    x0, y0, x1, y1 = region
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    return x0 <= cx <= x1 and y0 <= cy <= y1


def _role(fill):
    if fill is None:
        return "text"
    if fill.startswith("rgb(100%"):
        return "light"     # white symbol / registered mark
    if fill.startswith("rgb(13."):
        return "text"      # #231F20 wordmark
    return "brand"         # green tile


# Regions on the source page (PDF points), one per approved lockup.
REGIONS = {
    "symbol": (580, 175, 700, 295),
    "arabic": (100, 185, 330, 275),
    "english": (525, 440, 760, 525),
    "bilingual": (55, 435, 400, 518),
}


def parts():
    items = _load()
    out = {}
    for name, region in REGIONS.items():
        sel = []
        for kind, fill, d, dx, dy, b in items:
            if not _inside(b, region):
                continue
            sel.append({"role": _role(fill), "d": d, "dx": dx, "dy": dy, "bbox": b, "kind": kind})
        x0 = min(e["bbox"][0] for e in sel)
        y0 = min(e["bbox"][1] for e in sel)
        x1 = max(e["bbox"][2] for e in sel)
        y1 = max(e["bbox"][3] for e in sel)
        out[name] = {"elements": sel, "bbox": (x0, y0, x1, y1)}
    return out


if __name__ == "__main__":
    for k, v in parts().items():
        roles = {}
        for e in v["elements"]:
            roles[e["role"]] = roles.get(e["role"], 0) + 1
        print(k, [round(c, 2) for c in v["bbox"]], roles)
