"""Editorial page system for the Damanati brand book (A4 landscape)."""
from common import C, logo, OUT
from components import mark_svg, pattern_layer

W, H = 1123, 794  # A4 landscape @96dpi

CHAPTERS = [
    ("00", "مقدمة", "Introduction"),
    ("01", "التدقيق المرجعي", "Reference Audit"),
    ("02", "استراتيجية العلامة", "Brand Strategy"),
    ("03", "نظام الشعار", "Logo System"),
    ("04", "نظام الألوان", "Colour System"),
    ("05", "الخطوط", "Typography"),
    ("06", "اللغة البصرية", "Visual Language"),
    ("07", "الهوية الحركية وثلاثية الأبعاد", "3D & Motion"),
    ("08", "التطبيقات الرقمية", "Digital Applications"),
    ("09", "الهوية المؤسسية", "Corporate Identity"),
    ("10", "التسويق والتواصل الاجتماعي", "Marketing & Social"),
    ("11", "التنفيذ والحوكمة", "Implementation & Governance"),
]
CH = {k: (a, e) for k, a, e in CHAPTERS}

BOOK_CSS = f"""
@page{{size:297mm 210mm;margin:0}}
html,body{{background:#fff}}
.page{{width:297mm;height:210mm;position:relative;overflow:hidden;page-break-after:always;break-after:page;
  padding:70px 64px 64px;background:#fff;color:{C['ink']};font:400 15.5px/1.8 Tajawal}}
.page:last-child{{page-break-after:auto;break-after:auto}}
.rh{{position:absolute;top:26px;left:64px;right:64px;display:flex;justify-content:space-between;font:500 11.5px Tajawal;color:{C['stone']};letter-spacing:.02em}}
.rh b{{color:{C['green-600']};font-weight:800}}
.ft{{position:absolute;bottom:22px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center;font:400 11px Tajawal;color:{C['stone']}}}
.ft .pn{{font:800 12px Tajawal;color:{C['ink']}}}
.dk .rh,.dk .ft{{color:rgba(255,255,255,.7)}} .dk .rh b,.dk .ft .pn{{color:#fff}}
.dk{{color:#fff}}
h1.t{{font:800 40px/1.25 Tajawal;margin-bottom:6px}}
t-en{{font:400 15.5px Tajawal;color:{C['stone']};direction:ltr;text-align:right;margin-bottom:22px}}
.dk .t-en{{color:rgba(255,255,255,.7)}}
h2{{font:800 22px/1.35 Tajawal;margin-bottom:6px}}
h3{{font:700 17.5px/1.4 Tajawal;margin-bottom:5px}}
p{{margin-bottom:8px}}
.lead{{font:400 19px/1.85 Tajawal}}
.small{{font-size:13.5px;line-height:1.7}}
.mu{{color:{C['stone']}}} .dk .mu{{color:rgba(255,255,255,.72)}}
.enp{{direction:ltr;text-align:left;font-size:13px;line-height:1.6;color:{C['stone']}}}
.g{{display:grid;gap:22px}} .g2{{grid-template-columns:1fr 1fr}} .g3{{grid-template-columns:repeat(3,1fr)}}
.g4{{grid-template-columns:repeat(4,1fr)}} .g5{{grid-template-columns:repeat(5,1fr)}} .g6{{grid-template-columns:repeat(6,1fr)}}
.card{{border:1px solid {C['sand']};border-radius:18px;padding:22px 24px;background:#fff}}
.soft{{background:{C['paper']};border-radius:18px;padding:20px 24px}}
.gr{{background:{C['green-600']};color:#fff;border-radius:18px;padding:22px 24px}}
.st{{display:inline-flex;align-items:center;gap:5px;font:700 10.5px/1 Tajawal;padding:5px 8px 4px;border-radius:999px;vertical-align:middle;white-space:nowrap}}
.st-a{{background:{C['green-600']};color:#fff}}
.st-m{{background:{C['sand']};color:{C['ink']}}}
.st-p{{border:1.2px dashed {C['warning']};color:{C['warning']};background:#fff}}
.lbl{{font:800 12.5px Tajawal;color:{C['green-600']};letter-spacing:.04em;margin-bottom:6px;display:block}}
.dk .lbl{{color:{C['mint']}}}
table.tb{{width:100%;border-collapse:collapse;font-size:13.5px;line-height:1.55}}
.tb th{{text-align:right;font-weight:800;padding:9px 10px;border-bottom:2px solid {C['ink']};font-size:12.5px}}
.tb td{{padding:9px 10px;border-bottom:1px solid {C['sand']};vertical-align:top}}
.do,.dont{{font:800 11px Tajawal;display:inline-flex;gap:5px;align-items:center}}
.do{{color:{C['green-600']}}} .dont{{color:{C['danger']}}}
.frame{{border:1px solid {C['sand']};border-radius:14px;overflow:hidden;background:#fff}}
.cap{{font:400 12px/1.5 Tajawal;color:{C['stone']};margin-top:6px}}
.kpi{{font:800 48px/1 Tajawal;color:{C['green-600']}}}
.bul{{list-style:none}} .bul li{{position:relative;padding-right:16px;margin-bottom:5px}}
.bul li:before{{content:'';position:absolute;right:0;top:.72em;width:7px;height:7px;border-radius:2px;background:{C['green-600']}}}
.dk .bul li:before{{background:{C['mint']}}}
.bul[dir=ltr] li{{padding-right:0;padding-left:16px;text-align:left}} .bul[dir=ltr] li:before{{right:auto;left:0}}
.chk{{background-image:linear-gradient(45deg,#e9e7e2 25%,transparent 25%),linear-gradient(-45deg,#e9e7e2 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e9e7e2 75%),linear-gradient(-45deg,transparent 75%,#e9e7e2 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0}}
"""

STATUS_TAG = {
    "a": '<span class="st st-a">معتمد · Approved</span>',
    "m": '<span class="st st-m">مقاس · Measured</span>',
    "p": '<span class="st st-p">مقترح · Proposed</span>',
}


class Book:
    def __init__(self):
        self.pages = []  # (chapter, html, opts)

    def add(self, chapter, body, dark=False, bg=None, chrome=True, guide=False, pad=None, title=None):
        self.pages.append({"ch": chapter, "body": body, "dark": dark, "bg": bg, "chrome": chrome,
                           "guide": guide, "pad": pad, "title": title})

    def render(self, subset=None, edition="دليل الهوية الكامل", edition_en="Brand Book"):
        pages = [p for p in self.pages if subset is None or subset(p)]
        out = []
        toc = {}
        for i, p in enumerate(pages, 1):
            toc.setdefault(p["ch"], i)
        for i, p in enumerate(pages, 1):
            ar, en = CH[p["ch"]]
            cls = "page dk" if p["dark"] else "page"
            style = []
            if p["bg"]:
                style.append(f"background:{p['bg']}")
            if p["pad"] is not None:
                style.append(f"padding:{p['pad']}")
            chrome = ""
            if p["chrome"]:
                chrome = (f'<div class="rh"><span><b>{p["ch"]}</b> &nbsp;{ar} · <span class="en">{en}</span></span>'
                          f'<span class="en">Damanati · {edition_en} v2.0</span></div>'
                          f'<div class="ft"><span>ضماناتي · {edition}</span><span class="pn num">{i:02d}</span></div>')
            body = p["body"](toc) if callable(p["body"]) else p["body"]
            out.append(f'<section class="{cls}" style="{";".join(style)}">{body}{chrome}</section>')
        return "".join(out), len(pages)


def title(ar, en, status=None):
    s = f' {STATUS_TAG[status]}' if status else ""
    return f'<h1 class="t">{ar}{s}</h1><div class="t-en">{en}</div>'


def divider(num, ar, en, intro_ar, intro_en, accent="green"):
    bg = C["green-600"]
    return (f'{pattern_layer("rgba(255,255,255,.95)", 1, "down", 70, "top:62%")}'
            f'<div style="position:absolute;left:-90px;top:60px;opacity:.10">{mark_svg("#fff", "520px")}</div>'
            f'<div style="position:relative;margin-top:90px">'
            f'<div class="num" style="font:800 150px/1 Tajawal">{num}</div>'
            f'<h1 style="font:800 54px/1.2 Tajawal;margin-top:18px">{ar}</h1>'
            f'<div class="en" style="font:400 22px Tajawal;opacity:.8;margin-top:4px;text-align:right">{en}</div>'
            f'<div style="width:56px;height:4px;background:#fff;border-radius:4px;margin:26px 0 18px"></div>'
            f'<p style="font:400 16px/1.8 Tajawal;max-width:520px;opacity:.92">{intro_ar}</p>'
            f'<p class="en" style="font:400 12.5px/1.6 Tajawal;max-width:520px;opacity:.75;text-align:right">{intro_en}</p></div>')


def img(path, style="", cls=""):
    p = path if str(path).startswith("file:") else (OUT / path).as_uri()
    return f'<img src="{p}" class="{cls}" style="display:block;{style}">'


def swatch(hexv, name, sub="", h=90, fg=None, border=False, extra=""):
    from tokens import luminance
    fg = fg or ("#fff" if luminance(hexv) < 0.4 else C["ink"])
    b = f"border:1px solid {C['sand']};" if border else ""
    return (f'<div style="background:{hexv};color:{fg};border-radius:14px;height:{h}px;padding:12px 14px;{b}'
            f'display:flex;flex-direction:column;justify-content:space-between">'
            f'<span style="font:800 13px Tajawal">{name}</span><span class="en num" style="font:500 10.5px/1.4 Tajawal;text-align:left">{sub}{extra}</span></div>')


__all__ = ["Book", "title", "divider", "img", "swatch", "STATUS_TAG", "BOOK_CSS", "CHAPTERS", "CH", "W", "H",
           "logo", "mark_svg", "pattern_layer", "C"]
