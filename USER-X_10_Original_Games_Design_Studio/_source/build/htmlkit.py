"""Shared HTML/CSS kit for Arabic RTL A4 documents rendered to PDF by Chromium (render.js)."""

import html
import os

from model import BRAND, ROOT

FONT_DIR = os.path.join(ROOT, "fonts")
AR = "U+0600-06FF, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF, U+200C-200F, U+25CC"
LAT = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2190-21FF, U+2212, U+2215, U+2610-2612, U+2713-2717"


def _ff(fam, file, weight, rng):
    return f"@font-face{{font-family:'{fam}';src:url('file://{FONT_DIR}/{file}.woff2') format('woff2');font-weight:{weight};unicode-range:{rng};}}"


FONTS = "\n".join(
    [
        _ff("Plex", "ibm-plex-sans-arabic-arabic-400-normal", 400, AR),
        _ff("Plex", "ibm-plex-sans-arabic-latin-400-normal", 400, LAT),
        _ff("Plex", "ibm-plex-sans-arabic-arabic-700-normal", 700, AR),
        _ff("Plex", "ibm-plex-sans-arabic-latin-700-normal", 700, LAT),
        _ff("Kufam", "kufam-arabic-800-normal", 800, AR),
        _ff("Kufam", "kufam-latin-800-normal", 800, LAT),
    ]
)

B = BRAND
CSS = (
    FONTS
    + f"""
@page {{ size: A4; margin: 14mm 13mm 16mm 13mm; }}
* {{ box-sizing: border-box; }}
html {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{ font-family: 'Plex', 'DejaVu Sans', sans-serif; color: {B["void"]}; font-size: 10.2pt; line-height: 1.75; margin: 0; background: #fff; }}
h1, h2, h3, .k {{ font-family: 'Kufam', 'Plex', sans-serif; font-weight: 800; line-height: 1.35; }}
h1 {{ font-size: 21pt; margin: 0 0 4mm; }}
h2 {{ font-size: 13.5pt; margin: 7mm 0 2.5mm; padding: 1.6mm 3mm; background: {B["void"]}; color: {B["bone"]}; border-right: 3mm solid {B["cyan"]}; break-after: avoid; }}
h2 .tag {{ display: inline-block; background: {B["magenta"]}; color: {B["void"]}; padding: 0 2.2mm; margin-left: 2.5mm; font-size: 10.5pt; }}
h3 {{ font-size: 11pt; margin: 4.5mm 0 1.5mm; color: {B["shade"]}; border-bottom: 0.4mm solid {B["cyan"]}; display: inline-block; break-after: avoid; }}
p {{ margin: 1.2mm 0 2mm; }}
ul, ol {{ margin: 1mm 0 2.5mm; padding-right: 6mm; padding-left: 0; }}
li {{ margin: 0.6mm 0; }}
table {{ width: 100%; border-collapse: collapse; margin: 2mm 0 3.5mm; font-size: 8.8pt; line-height: 1.5; }}
th {{ background: {B["shade"]}; color: {B["bone"]}; font-weight: 700; padding: 1.6mm 1.8mm; text-align: right; }}
td {{ padding: 1.4mm 1.8mm; border-bottom: 0.25mm solid #d9d9e0; vertical-align: top; }}
tr:nth-child(even) td {{ background: #f6f6f8; }}
tr {{ break-inside: avoid; }}
td.n, th.n {{ text-align: left; direction: ltr; white-space: nowrap; font-variant-numeric: tabular-nums; }}
tfoot td {{ font-weight: 700; background: #ecebe6 !important; border-top: 0.5mm solid {B["void"]}; }}
.ltr {{ direction: ltr; unicode-bidi: isolate; display: inline-block; }}
.note {{ border-right: 1.6mm solid {B["cyan"]}; background: #eefcfd; padding: 2.2mm 3.5mm; margin: 2.5mm 0; break-inside: avoid; font-size: 9.2pt; }}
.warn {{ border-right: 1.6mm solid {B["danger"]}; background: #fff0f3; padding: 2.2mm 3.5mm; margin: 2.5mm 0; break-inside: avoid; font-size: 9.2pt; }}
.ok {{ border-right: 1.6mm solid {B["gold"]}; background: #fff9e6; padding: 2.2mm 3.5mm; margin: 2.5mm 0; break-inside: avoid; font-size: 9.2pt; }}
.script {{ background: {B["void"]}; color: {B["bone"]}; padding: 4mm 5mm; border-right: 2mm solid {B["magenta"]}; font-size: 10.5pt; line-height: 1.95; break-inside: avoid; }}
.grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }}
.grid3 {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; }}
.kv {{ display: grid; grid-template-columns: 34mm 1fr; gap: 0.8mm 3mm; margin: 2mm 0; }}
.kv b {{ color: {B["shade"]}; }}
.stat {{ border: 0.4mm solid {B["void"]}; padding: 2.5mm 3mm; break-inside: avoid; }}
.stat .v {{ font-family: 'Kufam'; font-size: 16pt; direction: ltr; text-align: right; }}
.stat .l {{ font-size: 8.5pt; color: {B["shade"]}; }}
figure {{ margin: 2mm 0 4mm; break-inside: avoid; }}
figure img {{ width: 100%; display: block; border: 0.3mm solid #ccc; }}
figcaption {{ font-size: 8.5pt; color: {B["shade"]}; margin-top: 1mm; }}
.chk {{ list-style: none; padding-right: 0; }}
.chk li {{ padding: 1.6mm 9mm 1.6mm 0; position: relative; border-bottom: 0.25mm dashed #cfcfd6; break-inside: avoid; }}
.chk li::before {{ content: ''; position: absolute; right: 0; top: 2.2mm; width: 4.6mm; height: 4.6mm; border: 0.5mm solid {B["void"]}; }}
.pill {{ display: inline-block; padding: 0 2.5mm; border-radius: 3mm; font-size: 8.5pt; font-weight: 700; }}
.p-low {{ background: #dff7e8; }} .p-med {{ background: #fff1c7; }} .p-high {{ background: #ffd6de; }}
.cover {{ height: 265mm; background: {B["void"]}; color: {B["bone"]}; padding: 22mm 18mm; position: relative; break-after: page; overflow: hidden; }}
.cover .brand {{ font-family: 'Kufam'; font-size: 13pt; letter-spacing: 1mm; color: {B["cyan"]}; direction: ltr; text-align: right; }}
.cover .doc {{ margin-top: 40mm; font-size: 12pt; color: {B["magenta"]}; font-weight: 700; }}
.cover h1 {{ font-size: 36pt; color: {B["bone"]}; margin: 3mm 0 2mm; }}
.cover .en {{ font-family: 'Kufam'; direction: ltr; text-align: right; font-size: 14pt; color: #9a9bab; letter-spacing: 0.8mm; }}
.cover .tagline {{ font-size: 14pt; margin-top: 8mm; max-width: 150mm; }}
.cover .meta {{ position: absolute; bottom: 22mm; right: 18mm; left: 18mm; font-size: 9pt; color: #b9b9c6; border-top: 0.3mm solid #33354c; padding-top: 4mm; }}
.cover .bar {{ position: absolute; left: 0; top: 0; bottom: 0; width: 7mm; background: linear-gradient({B["cyan"]}, {B["magenta"]}); }}
.cover .status {{ display: inline-block; margin-top: 10mm; border: 0.4mm solid {B["gold"]}; color: {B["gold"]}; padding: 1mm 4mm; font-size: 9.5pt; }}
.cover img {{ position: absolute; bottom: 48mm; left: 18mm; right: 18mm; width: calc(100% - 36mm); opacity: 0.92; border: 0.3mm solid #33354c; }}
.pb {{ break-before: page; }}
.small {{ font-size: 8.5pt; color: #55566a; }}
.lead {{ font-size: 11.5pt; }}
"""
)


def esc(x):
    return html.escape(str(x))


def doc(title, body):
    return f'<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>{esc(title)}</title><style>{CSS}</style></head><body>{body}</body></html>'


def cover(doc_type, title, en="", tagline="", meta="", status="", img=None):
    im = f'<img src="file://{img}">' if img and os.path.exists(img) else ""
    st = f'<div class="status">{esc(status)}</div>' if status else ""
    return (
        f'<section class="cover"><div class="bar"></div><div class="brand">USER-X</div><div class="doc">{esc(doc_type)}</div>'
        f'<h1>{esc(title)}</h1><div class="en">{esc(en)}</div><div class="tagline">{esc(tagline)}</div>{st}{im}'
        f'<div class="meta">{meta}</div></section>'
    )


def ul(items, cls=""):
    if items is None:
        return ""
    if isinstance(items, str):
        return f"<p>{esc(items)}</p>"
    c = f' class="{cls}"' if cls else ""
    return f"<ul{c}>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ul>"


def ol(items):
    return "<ol>" + "".join(f"<li>{esc(i)}</li>" for i in items) + "</ol>"


def table(head, rows, num_cols=(), foot=None, widths=None):
    th = "".join(
        f'<th class="{"n" if i in num_cols else ""}"'
        + (f' style="width:{widths[i]}"' if widths and widths[i] else "")
        + f">{esc(h)}</th>"
        for i, h in enumerate(head)
    )
    body = "".join(
        "<tr>"
        + "".join(
            f'<td class="{"n" if i in num_cols else ""}">{c if str(c).startswith("<") else esc(c)}</td>'
            for i, c in enumerate(r)
        )
        + "</tr>"
        for r in rows
    )
    ft = ""
    if foot:
        ft = (
            "<tfoot>"
            + "".join(
                "<tr>"
                + "".join(
                    f'<td class="{"n" if i in num_cols else ""}">{esc(c)}</td>'
                    for i, c in enumerate(r)
                )
                + "</tr>"
                for r in foot
            )
            + "</tfoot>"
        )
    return f"<table><thead><tr>{th}</tr></thead><tbody>{body}</tbody>{ft}</table>"


def kv(pairs):
    return (
        '<div class="kv">'
        + "".join(
            f"<b>{esc(k)}</b><span>{v if str(v).startswith('<') else esc(v)}</span>"
            for k, v in pairs
        )
        + "</div>"
    )


def h2(tag, text):
    t = f'<span class="tag">{esc(tag)}</span>' if tag else ""
    return f"<h2>{t}{esc(text)}</h2>"


def box(cls, text):
    return f'<div class="{cls}">{text}</div>'


def fig(path, caption):
    if not os.path.exists(path):
        return box("warn", f"الصورة غير موجودة: {esc(os.path.basename(path))}")
    return f'<figure><img src="file://{path}"><figcaption>{esc(caption)}</figcaption></figure>'


def stats(items):
    return (
        '<div class="grid3">'
        + "".join(
            f'<div class="stat"><div class="v">{esc(v)}</div><div class="l">{esc(lbl)}</div></div>'
            for v, lbl in items
        )
        + "</div>"
    )
