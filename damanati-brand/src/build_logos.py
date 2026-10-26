"""Build the Damanati logo package (SVG) from the extracted approved vectors.

Every variant re-uses the exact geometry from extract_logo.parts(); only fills
change. The vertical lockup is a re-arrangement of approved parts, taken from
the billboard and watch applications in the reference PDF (pp.17-18).
"""
from pathlib import Path

from extract_logo import parts
from tokens import COLORS

OUT = Path(__file__).resolve().parent.parent / "Damanati_Brand_System" / "02_Logos" / "SVG"

GREEN = COLORS["green-600"]["hex"]
INK = COLORS["ink"]["hex"]
WHITE = "#FFFFFF"

# name -> (tile, symbol, text). "knockout" punches the symbol out of the tile.
SCHEMES = {
    "primary": (GREEN, WHITE, INK),
    "reversed-on-green": (WHITE, GREEN, WHITE),
    "reversed-on-dark": (GREEN, WHITE, WHITE),
    "mono-black": (INK, WHITE, INK),
    "mono-white": (WHITE, "knockout", WHITE),
}

PAD = 0  # artwork is delivered tight; clear space is documented, not baked in


def _el(e, fill):
    k = e.get("k", 1.0)
    sc = f" scale({k:.4f})" if k != 1.0 else ""
    t = f' transform="translate({e["dx"]:.4f} {e["dy"]:.4f}){sc}"' if e["kind"] == "glyph" else ""
    return f'<path d="{e["d"]}" fill="{fill}"{t}/>'


def _group(elements, tile, symbol, text, uid):
    out, mask = [], ""
    light = [e for e in elements if e["role"] == "light"]
    if symbol == "knockout":
        mask_paths = "".join(_el(e, "#000") for e in light)
        mask = (f'<mask id="ko-{uid}" maskUnits="userSpaceOnUse" x="-10000" y="-10000" width="20000" height="20000">'
                f'<rect x="-10000" y="-10000" width="20000" height="20000" fill="#fff"/>{mask_paths}</mask>')
    for e in elements:
        if e["role"] == "brand":
            m = f' mask="url(#ko-{uid})"' if mask else ""
            out.append(_el(e, tile).replace("/>", f"{m}/>"))
        elif e["role"] == "light":
            if symbol != "knockout":
                out.append(_el(e, symbol))
        else:
            out.append(_el(e, text))
    return mask, "".join(out)


def _svg(groups, bbox, title):
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0 + 2 * PAD, y1 - y0 + 2 * PAD
    masks = "".join(g[0] for g in groups)
    body = "".join(g[1] for g in groups)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0 - PAD:.3f} {y0 - PAD:.3f} {w:.3f} {h:.3f}" '
            f'width="{w * 4:.0f}" height="{h * 4:.0f}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{"<defs>" + masks + "</defs>" if masks else ""}{body}</svg>\n')


def _vertical(p):
    """Tile on top, Arabic name, then English name - all centred."""
    sym = p["symbol"]
    ar = [e for e in p["arabic"]["elements"] if e["role"] == "text"]
    en = [e for e in p["english"]["elements"] if e["role"] == "text"]

    def bb(es):
        return (min(e["bbox"][0] for e in es), min(e["bbox"][1] for e in es),
                max(e["bbox"][2] for e in es), max(e["bbox"][3] for e in es))

    def shift(es, dx, dy):
        res = []
        for e in es:
            n = dict(e)
            n["dx"], n["dy"] = e["dx"] + dx, e["dy"] + dy
            b = e["bbox"]
            n["bbox"] = (b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy)
            res.append(n)
        return res

    def scale(es, k):
        """Scale glyphs about the group's top-left corner."""
        ox, oy = bb(es)[:2]
        res = []
        for e in es:
            n = dict(e)
            n["k"] = k
            n["dx"], n["dy"] = ox + (e["dx"] - ox) * k, oy + (e["dy"] - oy) * k
            b = e["bbox"]
            n["bbox"] = tuple(o + (v - o) * k for v, o in zip(b, (ox, oy, ox, oy)))
            res.append(n)
        return res

    # Billboard proportion (ref. p.17): the name reads at ~1.3x the lockup size.
    ar, en = scale(ar, 1.3), scale(en, 1.3)

    sx0, sy0, sx1, sy1 = sym["bbox"]
    cx = (sx0 + sx1) / 2
    gap = (sy1 - sy0) * 0.16
    a = bb(ar)
    ar2 = shift(ar, cx - (a[0] + a[2]) / 2, sy1 + gap - a[1])
    a2 = bb(ar2)
    e = bb(en)
    en2 = shift(en, cx - (e[0] + e[2]) / 2, a2[3] + gap * 1.0 - e[1])
    els = sym["elements"] + ar2 + en2
    return {"elements": els, "bbox": bb(els)}


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    p = parts()
    p["vertical"] = _vertical(p)
    labels = {
        "symbol": "Damanati symbol",
        "arabic": "ضماناتي - Arabic lockup",
        "english": "Damanati - English lockup",
        "bilingual": "ضماناتي Damanati - bilingual lockup",
        "vertical": "ضماناتي Damanati - vertical lockup",
    }
    written = []
    for lockup, data in p.items():
        for scheme, (tile, symbol, text) in SCHEMES.items():
            uid = f"{lockup}-{scheme}"
            g = _group(data["elements"], tile, symbol, text, uid)
            f = OUT / f"damanati_{lockup}_{scheme}.svg"
            f.write_text(_svg([g], data["bbox"], labels[lockup]))
            written.append(f)
    # Mark only (the white D symbol without its tile), as used in the pattern and browser tab.
    light = [e for e in p["symbol"]["elements"] if e["role"] == "light"]
    bb = (min(e["bbox"][0] for e in light), min(e["bbox"][1] for e in light),
          max(e["bbox"][2] for e in light), max(e["bbox"][3] for e in light))
    for scheme, fill in {"green": GREEN, "white": WHITE, "black": INK}.items():
        f = OUT / f"damanati_mark_{scheme}.svg"
        f.write_text(_svg([("", "".join(_el(e, fill) for e in light))], bb, "Damanati mark"))
        written.append(f)
    return written


if __name__ == "__main__":
    for f in build():
        print(f.name)
