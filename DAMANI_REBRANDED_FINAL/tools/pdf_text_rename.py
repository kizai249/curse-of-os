"""Rename the brand inside the text layer of the original v1.0 PDF by deleting glyphs.

ضماناتي -> ضماني : in visual order (ي ت ا ن ا م ض) drop ت and the ا after it.
Damanati -> Damani : drop "at" (letters 6-7).
Both are pure glyph deletions: the remaining glyphs keep their shaped forms
(ن stays initial, ي stays final), so nothing is retyped or overlaid.
Which edge stays fixed depends on the layout:
- Arabic inside a sentence: the right edge (RTL justified text) -> start of the run moves right.
- A run that is only the Arabic word (logo lockup, tile on its left): the left edge.
- Latin "Damanat"+"i" next to a tile on its right: the right edge.
- Latin names in left-aligned UI text (Myriad, Instagram mock): the left edge; the separately
  drawn "i" is moved left by the same distance.

usage: python3 pdf_text_rename.py in.pdf out.pdf  -> prints a JSON log per edit"""
import json, re, sys, unicodedata
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, ByteStringObject, ContentStream, FloatObject, NameObject, TextStringObject

AR_VISUAL = "يتانامض"   # visual (left-to-right) order of ضماناتي
AR_DROP = (1, 2)
EN = "Damanat"      # the final "i" is often drawn by a separate operator
EN_DROP = (5, 6)


def tounicode(font):
    cmap = {}
    tu = font.get("/ToUnicode")
    if tu is None:
        return cmap
    data = tu.get_object().get_data().decode("latin-1")
    for block in re.findall(r"beginbfchar(.*?)endbfchar", data, re.S):
        for src, dst in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block):
            cmap[int(src, 16)] = bytes.fromhex(dst).decode("utf-16-be", "ignore")
    for block in re.findall(r"beginbfrange(.*?)endbfrange", data, re.S):
        for a, b, d in re.findall(r"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>", block):
            a, b, d = int(a, 16), int(b, 16), int(d, 16)
            for i in range(b - a + 1):
                cmap[a + i] = chr(d + i)
    return cmap


def widths(font):
    """advance (1/1000 em) per code"""
    w = {}
    if font["/Subtype"] == "/Type0":
        df = font["/DescendantFonts"][0].get_object()
        dw = float(df.get("/DW", 1000))
        arr = df.get("/W", [])
        i = 0
        while i < len(arr):
            c = int(arr[i])
            if isinstance(arr[i + 1], (list, ArrayObject)):
                for k, v in enumerate(arr[i + 1]):
                    w[c + k] = float(v)
                i += 2
            else:
                for k in range(c, int(arr[i + 1]) + 1):
                    w[k] = float(arr[i + 2])
                i += 3
        w["default"] = dw
    else:
        fc = int(font.get("/FirstChar", 0))
        for k, v in enumerate(font.get("/Widths", [])):
            w[fc + k] = float(v)
        w["default"] = 0.0
    return w


def base(u):
    u = unicodedata.normalize("NFKC", u)
    return u.replace("ـ", "")  # tatweel never part of the match


def process(pdf_in, pdf_out):
    r = PdfReader(pdf_in)
    wr = PdfWriter(clone_from=r)
    log = []
    for pno, page in enumerate(wr.pages, 1):
        fonts = {k: v.get_object() for k, v in page["/Resources"].get("/Font", {}).items()}
        info = {k: (tounicode(f), widths(f), f["/Subtype"] == "/Type0") for k, f in fonts.items()}
        cs = ContentStream(page.get_contents(), wr)
        cur = None
        size = 1.0
        tm_a = 1.0   # horizontal scale of the text matrix
        tr = 0       # text render mode (3 = invisible text layer)
        bt_at = 0    # index of the current BT
        inserts = [] # (operation index, distance) for visible "i" shapes to translate
        pulls = []   # FIFO of distances (user units) to move the next lone "i" run left
        changed = False
        for idx, (ops, op) in enumerate(cs.operations):
            if op == b"Tf":
                cur, size = ops[0], float(ops[1])
                continue
            if op == b"BT":
                tm_a, tr, bt_at = 1.0, 0, idx
                continue
            if op == b"Tr":
                tr = int(ops[0])
                continue
            if op == b"Tm":
                tm_a = float(ops[0])
                continue
            if op not in (b"Tj", b"TJ") or cur not in info:
                continue
            cmap, wid, cid = info[cur]
            items = list(ops[0]) if op == b"TJ" else [ops[0]]
            # flatten into glyph tokens and numbers
            toks = []
            for it in items:
                if isinstance(it, (ByteStringObject, TextStringObject, bytes, str)):
                    raw = it.original_bytes if hasattr(it, "original_bytes") else (it.encode("latin-1") if isinstance(it, str) else bytes(it))
                    codes = [int.from_bytes(raw[i:i + 2], "big") for i in range(0, len(raw), 2)] if cid else list(raw)
                    toks += [("g", c) for c in codes]
                else:
                    toks.append(("n", float(it)))
            glyphs = [i for i, t in enumerate(toks) if t[0] == "g"]
            text = [base(cmap.get(toks[i][1], chr(toks[i][1]) if not cid else "")) for i in glyphs]
            if pulls and "".join(text) == "i":
                d = pulls.pop(0)
                cs.operations[idx] = ([ArrayObject([FloatObject(round(d / (size * tm_a) * 1000, 3))] + items)], b"TJ")
                log.append({"page": pno, "font": str(cur), "pulled_i_left_user_units": round(d, 3)})
                if tr == 3:
                    # invisible text layer: the visible "i" is the q ... Q shape just before this BT
                    k = bt_at - 1
                    while k >= 0 and cs.operations[k][1] != b"Q":
                        k -= 1
                    depth = 0
                    while k >= 0:
                        if cs.operations[k][1] == b"Q":
                            depth += 1
                        elif cs.operations[k][1] == b"q":
                            depth -= 1
                            if depth == 0:
                                break
                        k -= 1
                    if k >= 0:
                        inserts.append((k + 1, d))
                        log.append({"page": pno, "moved_visible_i_shape_at_op": k, "left_user_units": round(d, 3)})
                changed = True
                continue
            # build char string with mapping to glyph token positions (a glyph may map to 0..n chars)
            s, owner = "", []
            for gi, t in zip(glyphs, text):
                for ch in t:
                    s += ch
                    owner.append(gi)
            drop = set()
            for word, rm in ((AR_VISUAL, AR_DROP), (EN, EN_DROP)):
                for m in re.finditer(re.escape(word), s):
                    for k in rm:
                        drop.add(owner[m.start() + k])
            if not drop:
                continue
            removed = sum(wid.get(toks[i][1], wid["default"]) for i in drop)
            # also drop kerning numbers sitting between two dropped glyphs
            dropn = {i for i in range(1, len(toks) - 1) if toks[i][0] == "n" and i - 1 in drop and i + 1 in drop}
            only_ar = s.strip() == AR_VISUAL
            latin_ui = "MyriadPro" in str(fonts[cur].get("/BaseFont", ""))
            keep_left = only_ar or latin_ui
            lead = [] if keep_left else [("n", -removed)]
            if latin_ui and s.endswith("Damanat"):
                pulls.append(removed / 1000 * size * tm_a)   # the trailing "i" is drawn by a later run
            new = lead + [t for i, t in enumerate(toks) if i not in drop and i not in dropn]
            arr = ArrayObject()
            buf = b""
            for kind, v in new:
                if kind == "g":
                    buf += v.to_bytes(2, "big") if cid else bytes([v])
                else:
                    if buf:
                        arr.append(ByteStringObject(buf)); buf = b""
                    arr.append(FloatObject(round(v, 3)))
            if buf:
                arr.append(ByteStringObject(buf))
            cs.operations[idx] = ([arr], b"TJ")
            changed = True
            log.append({"page": pno, "font": str(cur), "text_run": s, "glyphs_removed": len(drop), "shift_1000em": round(removed, 1), "kept_edge": "left" if keep_left else "right"})
        for at, d in sorted(inserts, reverse=True):
            cs.operations.insert(at, ([FloatObject(1), FloatObject(0), FloatObject(0), FloatObject(1), FloatObject(round(-d, 3)), FloatObject(0)], b"cm"))
        if changed:
            page.replace_contents(cs)
    wr.write(pdf_out)
    for l in log:
        print(json.dumps(l, ensure_ascii=False))


if __name__ == "__main__":
    process(sys.argv[1], sys.argv[2])
