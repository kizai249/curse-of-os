"""Editable Office files: GDD_Arabic.docx per game, Operations Manual docx, master pptx deck (RTL Arabic)."""

import os
import sys

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from pptx import Presentation
from pptx.dml.color import RGBColor as PRGB
from pptx.util import Emu, Inches
from pptx.util import Pt as PPt

import game_docs
import model
from model import common, fmt, research

FONT = "IBM Plex Sans Arabic"
TITLE_FONT = "Kufam"
B = model.BRAND


def _rtl_run(run, size=None, bold=False, color=None, font=FONT):
    run.font.name = font
    run.font.size = Pt(size) if size else None
    run.font.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color.lstrip("#"))
    rpr = run._element.get_or_add_rPr()
    for tag in ("w:rtl", "w:cs"):
        el = OxmlElement(tag)
        rpr.append(el)
    rf = rpr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts")
        rpr.append(rf)
    rf.set(qn("w:cs"), font)
    rf.set(qn("w:ascii"), font)
    rf.set(qn("w:hAnsi"), font)
    if size:
        szcs = OxmlElement("w:szCs")
        szcs.set(qn("w:val"), str(int(size * 2)))
        rpr.append(szcs)
    if bold:
        rpr.append(OxmlElement("w:bCs"))


def para(d, text, size=10.5, bold=False, color=None, style=None, font=FONT):
    p = d.add_paragraph(style=style) if style else d.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p.paragraph_format.right_to_left = True
    _rtl_run(p.add_run(str(text)), size, bold, color, font)
    return p


def heading(d, text, level=1):
    size = {0: 26, 1: 15, 2: 12}[level]
    p = para(d, text, size, True, B["void"] if level else B["magenta"], font=TITLE_FONT)
    p.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    p.paragraph_format.keep_with_next = True
    if level == 1:
        pPr = p._element.get_or_add_pPr()
        bdr = OxmlElement("w:pBdr")
        b_ = OxmlElement("w:bottom")
        for k, v in (
            ("val", "single"),
            ("sz", "12"),
            ("color", B["cyan"].lstrip("#")),
            ("space", "2"),
        ):
            b_.set(qn(f"w:{k}"), v)
        bdr.append(b_)
        pPr.append(bdr)
    return p


def bullets(d, items):
    if isinstance(items, str):
        items = [items]
    for i in items:
        para(d, f"• {i}", 10)


def dtable(d, head, rows):
    t = d.add_table(rows=1, cols=len(head))
    t.style = "Table Grid"
    tblPr = t._element.tblPr
    bidi = OxmlElement("w:bidiVisual")
    tblPr.append(bidi)
    for i, h in enumerate(head):
        c = t.rows[0].cells[i]
        c.text = ""
        p = c.paragraphs[0]
        p.paragraph_format.right_to_left = True
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        _rtl_run(p.add_run(str(h)), 9, True, B["bone"])
        sh = OxmlElement("w:shd")
        sh.set(qn("w:val"), "clear")
        sh.set(qn("w:fill"), B["shade"].lstrip("#"))
        c._element.get_or_add_tcPr().append(sh)
    for r in rows:
        cells = t.add_row().cells
        for i, v in enumerate(r):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            p.paragraph_format.right_to_left = True
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            _rtl_run(p.add_run(str(v)), 8.5)
    d.add_paragraph()
    return t


def save_office(obj, path):
    try:
        obj.save(path)
    except OSError as e:
        sys.exit(f"cannot save {path}: {e}")


def new_doc():
    d = Document()
    s = d.sections[0]
    s.page_height, s.page_width = Cm(29.7), Cm(21)
    for side in ("left_margin", "right_margin", "top_margin", "bottom_margin"):
        setattr(s, side, Cm(1.8))
    sp = s._sectPr
    sp.append(OxmlElement("w:bidi"))
    st = d.styles["Normal"]
    st.font.name = FONT
    st.font.size = Pt(10.5)
    return d


def gdd_docx(g):
    d = new_doc()
    para(d, "USER-X", 12, True, B["cyan"], font=TITLE_FONT)
    heading(d, g["ar"], 0)
    para(d, g["en"], 13, True, "#777777")
    para(d, g["tagline"], 13)
    para(
        d,
        "وثيقة تصميم اللعبة (GDD) — مسودة قابلة للتعديل · لم تُختبر بعد · الأسعار تقديرية · الاقتصاديات افتراضات",
        9,
        color=B["danger"],
    )
    pp = game_docs.img(g, "perspective.png")
    if os.path.exists(pp):
        d.add_picture(pp, width=Cm(17))
    i = g["inspiration"]
    heading(d, "A. نظرة عامة")
    para(d, g["concept"])
    dtable(
        d,
        ["البند", "القيمة"],
        [
            ("الفئة", g["category"]),
            ("اللاعبون", game_docs.players_txt(g)),
            ("المدة", f"{g['duration'][0]}–{g['duration'][1]} د"),
            ("المكان", g["venue"]),
            ("الإلهام", f"{i['name']} ({i['source']})"),
            ("ما أُخذ", i["kept"]),
            ("ما تغيّر", i["changed"]),
        ],
    )
    heading(d, "B. الهدف")
    dtable(
        d,
        ["البند", "القيمة"],
        [
            ("كيف تفوز", g["objective"]["win"]),
            ("ما تتجنبه", g["objective"]["avoid"]),
            ("الفائز", g["objective"]["winner"]),
        ],
    )
    heading(d, "C. السرد والأجواء")
    para(d, g["narrative"])
    dtable(d, ["العنصر", "التصميم"], list(g["atmosphere"].items()))
    heading(d, "D. الآليات")
    dtable(d, ["المرحلة", "الوصف"], g["mechanics"])
    heading(d, "E. القواعد")
    for k, t in (
        ("core", "الأساسية"),
        ("allowed", "المسموح"),
        ("prohibited", "الممنوع"),
        ("time", "الوقت"),
        ("penalties", "العقوبات"),
        ("tiebreak", "كسر التعادل"),
    ):
        heading(d, t, 2)
        bullets(d, g["rules"][k])
    heading(d, f"نص الشرح (≈ {game_docs.secs(g['briefing'])} ث شاملة العرض العملي)", 2)
    para(d, g["briefing"], 11)
    heading(d, "F. التسلسل")
    dtable(d, ["الوقت", "ما يحدث"], g["flow"])
    heading(d, "G. الإقصاء")
    dtable(d, ["البند", "القيمة"], list(g["elimination"].items()))
    heading(d, "H. التصميم النفسي")
    dtable(d, ["الآلية", "كيف", "الضمانة"], g["psychology"])
    heading(d, "I. التصميم المادي")
    W, L = g["physical"]["footprint"]
    para(
        d,
        f"المساحة {W}×{L} م · أقصى ارتفاع {g['physical']['height']} م. {g['physical']['layout']}",
    )
    dtable(d, ["المكوّن", "الأبعاد", "المادة", "التصنيع"], g["physical"]["components"])
    dp = game_docs.img(g, "dimensioned_top.png")
    if os.path.exists(dp):
        d.add_picture(dp, width=Cm(17))
    heading(d, "J. قائمة المواد (الموصى بها)")
    c = model.costs(g)
    dtable(
        d,
        ["الصنف", "الكمية", "سعر الوحدة", "الإجمالي", "لماذا"],
        [
            (r["name"], r["qty"], fmt(r["price"]), fmt(r["total"]), r["why"])
            for r in model.bom_rows(g, "rec")
        ],
    )
    para(
        d,
        f"الإجماليات شاملة طوارئ 10%: الحد الأدنى {fmt(c['mvb']['total'])} · الموصى بها {fmt(c['rec']['total'])} · الترقية {fmt(c['upg_total'])} ريال (تقديرية)",
        bold=True,
    )
    for f in c["flags"]:
        para(d, "تنبيه: " + f, color=B["danger"], bold=True)
    heading(d, "K. إعادة التجهيز")
    para(d, f"الهدف {g['reset']['time_s']} ث · المسؤول: {g['reset']['who']}")
    bullets(d, g["reset"]["sequence"])
    heading(d, "L. التشغيل")
    o = g["ops"]
    para(
        d,
        f"مشغّلون {o['operators']} · حكام {o['judges']} · طاقم إعادة {o['reset_crew']} · مدة الجلسة {o['round_min']} د",
    )
    heading(d, "M. السلامة")
    dtable(
        d,
        ["الخطر", "السبب", "قبل", "الضوابط", "بعد"],
        [(h, c_, f"{a}×{b}", ct, f"{x}×{y}") for h, c_, a, b, ct, x, y in g["safety"]],
    )
    heading(d, "N. الصيانة")
    bullets(d, g["maintenance"]["daily"] + g["maintenance"]["weekly"])
    heading(d, "O. الاقتصاديات (افتراضات)")
    _, rows = game_docs.econ_rows(g)
    dtable(d, ["البند", "القيمة", "النوع"], rows)
    p = os.path.join(game_docs.gfolder(g), "GDD_Arabic.docx")
    save_office(d, p)
    return p


def ops_docx():
    d = new_doc()
    para(d, "USER-X", 12, True, B["cyan"], font=TITLE_FONT)
    heading(d, "دليل تشغيل فعاليات USER-X", 0)
    para(
        d,
        "نسخة قابلة للتعديل — إجراءات مقترحة تُعتمد بعد الاختبار",
        9,
        color=B["danger"],
    )
    heading(d, "1. الأدوار")
    dtable(
        d,
        ["الدور", "المسؤولية"],
        [
            ("مدير الفعالية", "القرار النهائي والتنسيق"),
            ("مسؤول السلامة", "إيقاف أي لعبة وسجل الحوادث"),
            ("مشغّل اللعبة", "الشرح والإيقاع والإعلانات"),
            ("الحكم", "القواعد والنتائج"),
            ("طاقم الإعادة", "إعادة التجهيز"),
            ("الاستقبال", "العمر والموافقة والسؤال الصحي"),
        ],
    )
    heading(d, "2. مبادئ السلوك")
    bullets(
        d,
        [
            "لا سخرية ولا تعليق على الشكل أو اللهجة.",
            "الإقصاء يُعلن بالرقم وباحترام.",
            "كلمة «انسحاب» توقف المشاركة فورًا بلا عقوبة.",
            "لا تصوير دون موافقة مكتوبة.",
        ],
    )
    heading(d, "3. الألعاب")
    dtable(
        d,
        ["اللعبة", "الطاقم", "الجلسة (د)", "الإعادة (ث)", "لاعبون/جلسة"],
        [
            (
                g["ar"],
                model.economics(g)["staff_n"],
                g["ops"]["round_min"],
                g["reset"]["time_s"],
                g["ops"]["players_round"],
            )
            for g in model.load_games()
        ],
    )
    heading(d, "4. الطوارئ")
    bullets(
        d,
        [
            "أوقف وأعلن «توقف».",
            "أسعف واتصل: 911 (الرقم الموحد في منطقة مكة) · 997 إسعاف · 998 دفاع مدني.",
            "أخلِ عبر المخارج المحددة.",
            "سجّل الحادث.",
        ],
    )
    p = os.path.join(model.PKG, "04_Operations", "USER-X_Operations_Manual.docx")
    save_office(d, p)
    return p


# ---------------------------------------------------------------- pptx
def rgb(h):
    return PRGB.from_string(h.lstrip("#"))


def _rtl(paragraph):
    pPr = paragraph._p.get_or_add_pPr()
    pPr.set("rtl", "1")
    pPr.set("algn", "r")


def tb(slide, x, y, w, h, text, size=18, bold=False, color=None, font=FONT):
    shp = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = shp.text_frame
    tf.word_wrap = True
    lines = text if isinstance(text, list) else [text]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        _rtl(p)
        r = p.add_run()
        r.text = str(ln)
        r.font.size = PPt(size)
        r.font.bold = bold
        r.font.name = font
        r.font.color.rgb = rgb(color or B["bone"])
    return shp


def bg(slide, color=B["void"]):
    f = slide.background.fill
    f.solid()
    f.fore_color.rgb = rgb(color)


def bar(slide, prs):
    s = slide.shapes.add_shape(
        1, prs.slide_width - Inches(0.18), 0, Inches(0.18), prs.slide_height
    )
    s.fill.solid()
    s.fill.fore_color.rgb = rgb(B["cyan"])
    s.line.fill.background()


def ptable(slide, x, y, w, head, rows, size=11):
    t = slide.shapes.add_table(
        len(rows) + 1,
        len(head),
        Inches(x),
        Inches(y),
        Inches(w),
        Inches(0.35 * (len(rows) + 1)),
    ).table
    for j, h in enumerate(reversed(head)):
        c = t.cell(0, j)
        c.text = str(h)
        c.fill.solid()
        c.fill.fore_color.rgb = rgb(B["shade"])
    for i, r in enumerate(rows, 1):
        for j, v in enumerate(reversed(r)):
            t.cell(i, j).text = str(v)
            t.cell(i, j).fill.solid()
            t.cell(i, j).fill.fore_color.rgb = rgb("#15161C" if i % 2 else "#1E1F28")
    for i in range(len(rows) + 1):
        for j in range(len(head)):
            for p in t.cell(i, j).text_frame.paragraphs:
                _rtl(p)
                for r in p.runs:
                    r.font.size = PPt(size)
                    r.font.name = FONT
                    r.font.color.rgb = rgb(B["bone"])
                    r.font.bold = i == 0


def deck():
    games = model.load_games()
    rank = model.ranking(games)
    prs = Presentation()
    prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)
    blank = prs.slide_layouts[6]

    def slide(title, sub=None):
        s = prs.slides.add_slide(blank)
        bg(s)
        bar(s, prs)
        tb(s, 0.6, 0.35, 12.2, 0.8, title, 30, True, B["bone"], TITLE_FONT)
        if sub:
            tb(s, 0.6, 1.05, 12.2, 0.5, sub, 14, False, B["cyan"])
        return s

    s = prs.slides.add_slide(blank)
    bg(s)
    bar(s, prs)
    tb(s, 0.8, 0.8, 11.8, 0.6, "USER-X", 20, True, B["cyan"], TITLE_FONT)
    tb(
        s,
        0.8,
        2.0,
        11.8,
        1.5,
        "10 ألعاب إقصائية أصلية",
        54,
        True,
        B["bone"],
        TITLE_FONT,
    )
    tb(
        s,
        0.8,
        3.5,
        11.8,
        1.0,
        "مستلهمة من الألعاب الشعبية · ضغط من الآلية فقط · 3,000–7,000 ريال للعبة",
        20,
        False,
        B["magenta"],
    )
    tb(
        s,
        0.8,
        5.8,
        11.8,
        0.8,
        "جدة · 2026-11-26 · مسودة تصميم — لم تُختبر بعد، الأسعار تقديرية",
        13,
        False,
        "#A9A9B6",
    )

    s = slide("المبادئ", "ما نعد به اللاعب")
    tb(
        s,
        0.6,
        1.8,
        12,
        4.8,
        [
            "• الإلهام فقط من برامج الإقصاء — لا نسخ لأي تصميم أو قاعدة أو مشهد.",
            "• التوتر من الوقت والمعلومة والمخاطرة والقرار.",
            "• لا إهانة، لا خطر جسدي، لا إكراه، لا استغلال.",
            "• مشاركة طوعية وانسحاب حر في أي لحظة.",
            "• حلول ميكانيكية بسيطة وإعادة تجهيز 2–5 دقائق.",
            "• بحث صادق: لا ننسب لعبة للسعودية بلا مصدر.",
        ],
        20,
    )

    s = slide("المحفظة", "عشر آليات مختلفة")
    ptable(
        s,
        0.6,
        1.7,
        12.1,
        ["الرمز", "اللعبة", "الفئة", "اللاعبون", "الإعادة", "الموصى بها (ريال)"],
        [
            (
                g["id"],
                g["ar"],
                g["category"],
                game_docs.players_txt(g),
                f"{g['reset']['time_s']} ث",
                fmt(model.costs(g)["rec"]["total"]),
            )
            for g in games
        ],
        12,
    )

    for g in games:
        s = slide(f"{g['id']} · {g['ar']}", g["tagline"])
        pp = game_docs.img(g, "perspective.png")
        if os.path.exists(pp):
            s.shapes.add_picture(pp, Inches(0.5), Inches(1.7), width=Inches(6.6))
        c = model.costs(g)
        tb(
            s,
            7.3,
            1.7,
            5.4,
            4.8,
            [
                g["category"],
                f"اللاعبون: {game_docs.players_txt(g)}",
                f"الإعادة: {g['reset']['time_s']} ث",
                f"مستلهمة من: {g['inspiration']['name']}",
                f"الموصى بها: {fmt(c['rec']['total'])} ريال",
                f"الحد الأدنى: {fmt(c['mvb']['total'])} ريال",
                f"النتيجة الموزونة: {model.weighted_score(g)}",
            ]
            + [f"⚠ {f}" for f in c["flags"]],
            16,
        )

    s = slide("مصفوفة الاختيار", "درجات مقدّرة قبل الاختبار — 15 معيارًا موزونًا")
    ptable(
        s,
        0.6,
        1.7,
        12.1,
        ["#", "اللعبة", "النتيجة", "المتعة", "السلامة", "التكلفة", "الإعادة"],
        [
            (
                i,
                g["ar"],
                model.weighted_score(g),
                g["scores"]["fun"],
                g["scores"]["safety"],
                g["scores"]["cost"],
                g["scores"]["reset"],
            )
            for i, g in enumerate(rank, 1)
        ],
        12,
    )

    s = slide("الأفضل في كل فئة")
    ptable(
        s,
        0.6,
        1.5,
        12.1,
        ["الفئة", "اللعبة"],
        [(k, f"{g['id']} — {g['ar']}") for k, g in model.best_of(games).items()],
        13,
    )

    tot = sum(model.costs(g)["rec"]["total"] for g in games)
    t3 = sum(model.costs(g)["rec"]["total"] for g in rank[:3])
    t5 = sum(model.costs(g)["rec"]["total"] for g in rank[:5])
    s = slide("الميزانية", "تقديرات شاملة طوارئ 10% — تحتاج عروض أسعار")
    tb(
        s,
        0.6,
        1.8,
        12,
        4.5,
        [
            f"كل الألعاب العشر (الموصى بها): {fmt(tot)} ريال",
            f"أفضل 3: {fmt(t3)} ريال",
            f"أفضل 5: {fmt(t5)} ريال",
            f"ألعاب قريبة من السقف: {'، '.join(g['ar'] for g in games if model.costs(g)['flags'])}",
            "الاقتصاديات في 05_Financials افتراضات قابلة للتعديل.",
        ],
        22,
    )

    s = slide("الخطوات التالية")
    tb(
        s,
        0.6,
        1.8,
        12,
        4.8,
        [
            "1. نماذج أولية بالحد الأدنى لأفضل 3 ألعاب.",
            "2. جلسات اختبار مع متطوعين وفق خطط الاختبار.",
            "3. عروض أسعار مكتوبة وتحديث BOM.",
            "4. تحقق نهائي من مصادر البحث.",
            "5. قرار Go/No-Go ثم بناء المرحلة الثانية.",
        ],
        22,
    )
    p = os.path.join(
        model.PKG, "07_Master_Presentation", "USER-X_10_Games_Master_Deck.pptx"
    )
    os.makedirs(os.path.dirname(p), exist_ok=True)
    save_office(prs, p)
    return p


def build_all():
    out = [gdd_docx(g) for g in model.load_games()]
    out += [ops_docx(), deck()]
    return out


if __name__ == "__main__":
    try:
        for x in build_all():
            print(os.path.relpath(x, model.PKG))
        _ = (common, research)
    except OSError as e:  # disk/permission/missing-file errors: name the file, stop the build
        sys.exit(f"build step failed: {e}")
