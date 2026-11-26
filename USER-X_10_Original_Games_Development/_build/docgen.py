"""Block-based document renderer: one content model -> RTL HTML/PDF (Chromium) and DOCX (python-docx).

Blocks:
  ("cover", title, subtitle, meta_lines)
  ("chapter", title, en, color)          -> page break + coloured chapter header
  ("h2", text) / ("h3", text) / ("p", text) / ("note", text)
  ("bullets", [..]) / ("numbers", [..])
  ("table", headers, rows, widths_or_None)
  ("kv", [(k, v), ...])
  ("meters", [(label, value_out_of_5), ...])
  ("img", path, caption, width_pct)
  ("imgrow", [paths], [captions])
  ("journey", text)
  ("pagebreak",)
"""

import base64
import html
import os
import subprocess

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

from common import BRAND

E = html.escape


# ----------------------------------------------------------------- HTML
CSS = """
@page { size: A4; margin: 16mm 15mm 18mm 15mm; }
:root { --ink:#0B0B0F; --signal:#FF4D00; --sand:#C9A66B; --bone:#F3EFE6; --muted:#6B6B76; --acc:#FF4D00; }
* { box-sizing: border-box; }
body { font-family: 'Tajawal', 'Cairo', sans-serif; direction: rtl; color: #16161C; font-size: 10.6pt; line-height: 1.75; margin: 0; background:#fff; }
h1,h2,h3 { font-family: 'Cairo', 'Tajawal', sans-serif; line-height: 1.35; }
h2 { font-size: 15pt; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 3px solid var(--acc); display:inline-block; break-after: avoid; }
h3 { font-size: 12pt; margin: 14px 0 6px; color: #0B0B0F; break-after: avoid; }
p { margin: 4px 0 8px; text-align: justify; }
ul, ol { margin: 4px 22px 10px 0; padding: 0; }
li { margin: 2px 0; }
table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; font-size: 9.2pt; break-inside: auto; }
tr { break-inside: avoid; }
th { background: #16161C; color: #fff; font-family: 'Cairo'; font-weight: 700; padding: 6px 6px; text-align: right; }
td { border-bottom: 1px solid #E4DFD4; padding: 5px 6px; vertical-align: top; }
tr:nth-child(even) td { background: #FAF8F3; }
.cover { height: 262mm; background: #0B0B0F; color: #fff; padding: 26mm 18mm; position: relative; break-after: page; overflow: hidden; }
.cover .x { position: absolute; left: -40mm; bottom: -30mm; font-family: 'Cairo'; font-weight: 900; font-size: 300pt; color: #FF4D00; opacity: .9; line-height: 1; }
.cover .brand { font-family: 'Cairo'; font-weight: 900; letter-spacing: 2px; font-size: 22pt; color: #FF4D00; direction: ltr; text-align: right; }
.cover h1 { font-size: 34pt; margin: 30mm 0 6mm; color: #fff; }
.cover .sub { font-size: 14pt; color: #E9E3D6; max-width: 140mm; }
.cover .meta { position: absolute; bottom: 22mm; right: 18mm; font-size: 10pt; color: #BDB6A8; }
.chapter { break-before: page; background: var(--ink); color: #fff; padding: 12mm 10mm 10mm; margin: 0 0 8mm; border-right: 10px solid var(--acc); }
.chapter .num { font-family: 'Cairo'; font-weight: 900; font-size: 11pt; color: var(--acc); letter-spacing: 1px; }
.chapter h1 { margin: 2mm 0 0; font-size: 26pt; }
.chapter .en { direction: ltr; text-align: right; color: #BDB6A8; font-family: 'Cairo'; font-weight: 700; letter-spacing: 3px; }
.note { background: #FFF6E5; border-right: 4px solid var(--sand); padding: 8px 10px; margin: 8px 0 12px; font-size: 9.6pt; }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; margin: 6px 0 12px; }
.kv div { border-bottom: 1px solid #E4DFD4; padding: 4px 2px; font-size: 9.6pt; }
.kv b { color: #0B0B0F; font-family: 'Cairo'; }
.meters { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; margin: 6px 0 12px; }
.meter { font-size: 9.4pt; }
.bar { height: 8px; background: #ECE8DF; border-radius: 4px; overflow: hidden; margin-top: 2px; }
.bar i { display: block; height: 100%; background: var(--acc); }
figure { margin: 8px 0 14px; text-align: center; break-inside: avoid; }
figure img { max-width: 100%; border-radius: 6px; }
figcaption { font-size: 8.8pt; color: var(--muted); margin-top: 3px; }
.imgrow { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; break-inside: avoid; margin: 6px 0 12px; }
.imgrow.three { grid-template-columns: 1fr 1fr 1fr; }
.imgrow figure { margin: 0; }
.journey { font-family: 'Cairo'; font-weight: 700; background: var(--bone); border-radius: 8px; padding: 10px 12px; margin: 6px 0 12px; text-align: center; color: #0B0B0F; }
.pb { break-after: page; }
"""


def _img_uri(path):
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def to_html(blocks, doc_title):
    out = [
        f"<!doctype html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>{E(doc_title)}</title><style>{CSS}</style></head><body>"
    ]
    chap_no = 0
    for b in blocks:
        k = b[0]
        if k == "cover":
            meta = "<br>".join(E(m) for m in b[3])
            out.append(
                f"<section class='cover'><div class='brand'>USER-X</div><h1>{E(b[1])}</h1><div class='sub'>{E(b[2])}</div><div class='meta'>{meta}</div><div class='x'>X</div></section>"
            )
        elif k == "chapter":
            chap_no += 1
            out.append(
                f"<section class='chapter' style='--acc:{b[3]}'><div class='num'>{E(b[4] if len(b) > 4 else f'الفصل {chap_no}')}</div><h1>{E(b[1])}</h1><div class='en'>{E(b[2])}</div></section><div style='--acc:{b[3]}'>"
            )
            out.append(
                ""
            )  # chapters are not explicitly closed; acc is inherited by style on following div wrapper
        elif k == "h2":
            out.append(f"<h2>{E(b[1])}</h2>")
        elif k == "h3":
            out.append(f"<h3>{E(b[1])}</h3>")
        elif k == "p":
            out.append(f"<p>{E(b[1])}</p>")
        elif k == "note":
            out.append(f"<div class='note'>{E(b[1])}</div>")
        elif k in ("bullets", "numbers"):
            tag = "ul" if k == "bullets" else "ol"
            out.append(
                f"<{tag}>" + "".join(f"<li>{E(x)}</li>" for x in b[1]) + f"</{tag}>"
            )
        elif k == "table":
            hdr = "".join(f"<th>{E(str(h))}</th>" for h in b[1])
            rows = "".join(
                "<tr>" + "".join(f"<td>{E(str(c))}</td>" for c in r) + "</tr>"
                for r in b[2]
            )
            out.append(
                f"<table><thead><tr>{hdr}</tr></thead><tbody>{rows}</tbody></table>"
            )
        elif k == "kv":
            out.append(
                "<div class='kv'>"
                + "".join(
                    f"<div><b>{E(str(a))}:</b> {E(str(v))}</div>" for a, v in b[1]
                )
                + "</div>"
            )
        elif k == "meters":
            out.append(
                "<div class='meters'>"
                + "".join(
                    f"<div class='meter'>{E(a)} — {v}/5<div class='bar'><i style='width:{v * 20}%'></i></div></div>"
                    for a, v in b[1]
                )
                + "</div>"
            )
        elif k == "img":
            out.append(
                f"<figure><img src='{_img_uri(b[1])}' style='width:{b[3]}%'><figcaption>{E(b[2])}</figcaption></figure>"
            )
        elif k == "imgrow":
            cls = "imgrow three" if len(b[1]) == 3 else "imgrow"
            figs = "".join(
                f"<figure><img src='{_img_uri(p)}'><figcaption>{E(c)}</figcaption></figure>"
                for p, c in zip(b[1], b[2])
            )
            out.append(f"<div class='{cls}'>{figs}</div>")
        elif k == "journey":
            out.append(f"<div class='journey'>{E(b[1])}</div>")
        elif k == "pagebreak":
            out.append("<div class='pb'></div>")
    out.append("</body></html>")
    return "\n".join(out)


def html_to_pdf(html_path, pdf_path, footer_label):
    js = f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://{html_path}', {{ waitUntil: 'load' }});
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({{ path: '{pdf_path}', format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#777;padding:0 15mm;display:flex;justify-content:space-between;font-family:Tajawal"><span>USER-X · {footer_label}</span><span><span class=pageNumber></span> / <span class=totalPages></span></span></div>',
    margin: {{ top: '14mm', bottom: '16mm', left: '0mm', right: '0mm' }} }});
  await b.close();
}})();
"""
    subprocess.run(["node", "-e", js], check=True, cwd="/opt/node-tools")


# ----------------------------------------------------------------- DOCX
def _rtl_par(p):
    pPr = p._p.get_or_add_pPr()
    bidi = OxmlElement("w:bidi")
    bidi.set(qn("w:val"), "1")
    pPr.append(bidi)
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT


def _run(p, text, size=10.5, bold=False, color=None, font=None):
    r = p.add_run(text)
    f = font or BRAND["font_body"]
    r.font.name = f
    r.font.size = Pt(size)
    r.font.bold = bold
    rPr = r._r.get_or_add_rPr()
    rf = rPr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts")
        rPr.append(rf)
    for a in ("w:ascii", "w:hAnsi", "w:cs"):
        rf.set(qn(a), f)
    rtl = OxmlElement("w:rtl")
    rtl.set(qn("w:val"), "1")
    rPr.append(rtl)
    szcs = OxmlElement("w:szCs")
    szcs.set(qn("w:val"), str(int(size * 2)))
    rPr.append(szcs)
    if bold:
        bcs = OxmlElement("w:bCs")
        rPr.append(bcs)
    if color:
        r.font.color.rgb = RGBColor.from_string(color.lstrip("#"))
    return r


def _para(doc, text, size=10.5, bold=False, color=None, font=None, space_after=4):
    p = doc.add_paragraph()
    _rtl_par(p)
    p.paragraph_format.space_after = Pt(space_after)
    _run(p, text, size, bold, color, font)
    return p


def _shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hexcolor.lstrip("#"))
    tcPr.append(shd)


def _table(doc, headers, rows, head_color="16161C"):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    tblPr = t._tbl.tblPr
    bv = OxmlElement("w:bidiVisual")
    tblPr.append(bv)
    for i, h in enumerate(headers):
        c = t.rows[0].cells[i]
        c.paragraphs[0].text = ""
        _rtl_par(c.paragraphs[0])
        _run(c.paragraphs[0], str(h), 9, True, "#FFFFFF", BRAND["font_head"])
        _shade(c, head_color)
    for ri, r in enumerate(rows):
        cells = t.add_row().cells
        for i, v in enumerate(r):
            cells[i].paragraphs[0].text = ""
            _rtl_par(cells[i].paragraphs[0])
            _run(cells[i].paragraphs[0], str(v), 8.8)
            if ri % 2:
                _shade(cells[i], "FAF8F3")
    doc.add_paragraph()
    return t


def to_docx(blocks, path):
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    sec.orientation = WD_ORIENT.PORTRAIT
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Cm(1.8))
    sec.top_margin = sec.bottom_margin = Cm(1.6)
    st = doc.styles["Normal"]
    st.font.name = BRAND["font_body"]
    st.font.size = Pt(10.5)
    for b in blocks:
        k = b[0]
        if k == "cover":
            _para(doc, "USER-X", 26, True, BRAND["signal"], BRAND["font_head"], 30)
            _para(doc, b[1], 28, True, BRAND["ink"], BRAND["font_head"], 10)
            _para(doc, b[2], 14, False, "#444444")
            for m in b[3]:
                _para(doc, m, 10, False, "#777777")
            doc.add_page_break()
        elif k == "chapter":
            doc.add_page_break()
            t = doc.add_table(rows=1, cols=1)
            c = t.rows[0].cells[0]
            _shade(c, "0B0B0F")
            c.paragraphs[0].text = ""
            _rtl_par(c.paragraphs[0])
            _run(
                c.paragraphs[0],
                (b[4] if len(b) > 4 else "") + "  ",
                11,
                True,
                b[3],
                BRAND["font_head"],
            )
            p2 = c.add_paragraph()
            _rtl_par(p2)
            _run(p2, b[1], 24, True, "#FFFFFF", BRAND["font_head"])
            p3 = c.add_paragraph()
            _rtl_par(p3)
            _run(p3, b[2], 11, True, "#BDB6A8", BRAND["font_head"])
            doc.add_paragraph()
        elif k == "h2":
            _para(doc, b[1], 15, True, BRAND["ink"], BRAND["font_head"], 6)
        elif k == "h3":
            _para(doc, b[1], 12, True, "#333333", BRAND["font_head"], 4)
        elif k == "p":
            _para(doc, b[1])
        elif k == "note":
            t = doc.add_table(rows=1, cols=1)
            c = t.rows[0].cells[0]
            _shade(c, "FFF6E5")
            c.paragraphs[0].text = ""
            _rtl_par(c.paragraphs[0])
            _run(c.paragraphs[0], b[1], 9.5)
            doc.add_paragraph()
        elif k in ("bullets", "numbers"):
            for i, x in enumerate(b[1]):
                _para(
                    doc,
                    ("• " if k == "bullets" else f"{i + 1}. ") + x,
                    10,
                    space_after=2,
                )
        elif k == "table":
            _table(doc, b[1], b[2])
        elif k == "kv":
            _table(doc, ["البند", "القيمة"], [(a, v) for a, v in b[1]], "2A2A33")
        elif k == "meters":
            _table(
                doc,
                ["المؤشر", "المستوى /5", ""],
                [(a, v, "█" * v + "░" * (5 - v)) for a, v in b[1]],
                "2A2A33",
            )
        elif k == "img":
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.add_run().add_picture(b[1], width=Cm(17.4 * b[3] / 100))
            _para(doc, b[2], 8.5, False, "#777777")
        elif k == "imgrow":
            n = len(b[1])
            t = doc.add_table(rows=2, cols=n)
            for i, (pth, cap) in enumerate(zip(b[1], b[2])):
                cp = t.rows[0].cells[i].paragraphs[0]
                cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                cp.add_run().add_picture(pth, width=Cm(17 / n - 0.3))
                t.rows[1].cells[i].paragraphs[0].text = ""
                _rtl_par(t.rows[1].cells[i].paragraphs[0])
                _run(t.rows[1].cells[i].paragraphs[0], cap, 8, False, "#777777")
            doc.add_paragraph()
        elif k == "journey":
            _para(doc, b[1], 11, True, BRAND["ink"], BRAND["font_head"])
        elif k == "pagebreak":
            doc.add_page_break()
    doc.save(path)


def render_all(blocks, base_path, doc_title, footer_label, pdf=True, docx=True):
    html_path = base_path + ".html"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(to_html(blocks, doc_title))
    if pdf:
        html_to_pdf(
            os.path.abspath(html_path),
            os.path.abspath(base_path + ".pdf"),
            footer_label,
        )
    if docx:
        to_docx(blocks, base_path + ".docx")
    return html_path
