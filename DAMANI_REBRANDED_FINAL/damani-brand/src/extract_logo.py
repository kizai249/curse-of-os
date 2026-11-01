"""Extract the approved Damani logo artwork as clean standalone SVG.

Source: page 4 ("مكونات الشعار") of the v1.0 brand identity guide (original reference PDF), converted
with `pdftocairo -svg` into reference/ref_page04_logo_components.svg. The logo
geometry is copied verbatim from the PDF vectors - nothing is redrawn. Glyph
<use> references are resolved into plain <path> elements so the files do not
depend on any font.

Output: a dict of raw parts used by build_logos.py.

Brand rename (Damani / ضماني): the v1.0 artwork spells the previous name. The new
wordmarks are the same approved outlines with two glyphs removed from each word
- Arabic run (7 glyphs, visual order ي ت ا ن ا م ض): drop ت and the ا before it -> ضماني
- Latin run  (8 glyphs, D a m a n a t i):            drop "a t"                 -> Damani
and the remaining glyphs closed up on the side away from the tile, so the gap
between tile and name stays exactly as approved. ن takes the origin ت had, so
its join into the final ي is unchanged. No glyph is redrawn or substituted.
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


# glyph count of a run -> visual indices removed for the new name
RENAME_DROP = {7: (1, 2), 8: (5, 6)}


def _rename(sel):
    tiles = [e for e in sel if e["role"] == "brand"]
    if not tiles:
        return sel
    tcx = (tiles[0]["bbox"][0] + tiles[0]["bbox"][2]) / 2
    text = [e for e in sel if e["role"] == "text"]
    out = [e for e in sel if e["role"] != "text"]
    for left in (True, False):
        run = sorted((e for e in text if ((e["bbox"][0] + e["bbox"][2]) / 2 < tcx) == left), key=lambda e: e["dx"])
        if not run:
            continue
        drop = RENAME_DROP[len(run)]  # KeyError = the source artwork is not what this rename expects
        width = run[drop[-1] + 1]["dx"] - run[drop[0]]["dx"]
        for i, e in enumerate(run):
            if i in drop:
                continue
            shift = width if (left and i < drop[0]) else (-width if (not left and i > drop[-1]) else 0.0)
            n = dict(e)
            n["dx"] = e["dx"] + shift
            b = e["bbox"]
            n["bbox"] = (b[0] + shift, b[1], b[2] + shift, b[3])
            out.append(n)
    return out


def parts():
    items = _load()
    out = {}
    for name, region in REGIONS.items():
        sel = []
        for kind, fill, d, dx, dy, b in items:
            if not _inside(b, region):
                continue
            sel.append({"role": _role(fill), "d": d, "dx": dx, "dy": dy, "bbox": b, "kind": kind})
        sel = _rename(sel)
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
