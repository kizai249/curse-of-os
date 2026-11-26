"""USER-X game selection deck (RTL Arabic, 16:9)."""

import os

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

import build_docs as bd

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "USER-X_10_Games_Selection_Presentation_Arabic.pptx")
INK, BONE, SIGNAL, SAND, MUTED, PANEL = (
    "0B0B0F",
    "F3EFE6",
    "FF4D00",
    "C9A66B",
    "9A97A0",
    "1C1C22",
)
FIN = bd.FIN
REC = {
    "G06": "إنتاج أول",
    "G10": "إنتاج أول",
    "G08": "إنتاج أول — Flagship",
    "G04": "المرحلة 2 — شركات",
    "G05": "المرحلة 2",
    "G02": "المرحلة 2",
    "G01": "المرحلة 3",
    "G03": "المرحلة 3",
    "G07": "احتياطي",
    "G09": "لا يُنصح كبداية",
}

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BL = prs.slide_layouts[6]


def rgb(h):
    return RGBColor.from_string(h)


def bg(s, color=INK):
    f = s.background.fill
    f.solid()
    f.fore_color.rgb = rgb(color)


def text(
    s,
    x,
    y,
    w,
    h,
    t,
    size=18,
    color=BONE,
    bold=False,
    font="Tajawal",
    align=PP_ALIGN.RIGHT,
):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    lines = t if isinstance(t, list) else [t]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p._p.get_or_add_pPr().set("rtl", "1")
        r = p.add_run()
        r.text = ln
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.name = font
        r.font.color.rgb = rgb(color)
        rPr = r._r.get_or_add_rPr()
        cs = rPr.makeelement(qn("a:cs"), {"typeface": font})
        rPr.append(cs)
    return tb


def rect(s, x, y, w, h, color, shape=MSO_SHAPE.RECTANGLE):
    sh = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid()
    sh.fill.fore_color.rgb = rgb(color)
    sh.line.fill.background()
    return sh


def footer(s, n):
    text(s, 0.4, 7.05, 6, 0.3, "USER-X · اختيار الألعاب", 9, MUTED)
    text(s, 12.3, 7.05, 0.6, 0.3, str(n), 9, MUTED, align=PP_ALIGN.LEFT)


def table(s, x, y, w, rows, col_w, size=11, head=INK):
    nr, nc = len(rows), len(rows[0])
    gt = s.shapes.add_table(
        nr, nc, Inches(x), Inches(y), Inches(w), Inches(0.4 * nr)
    ).table
    tblPr = gt._tbl.tblPr
    tblPr.set("rtl", "1")
    for j, cw in enumerate(col_w):
        gt.columns[j].width = Inches(cw)
    for i, row in enumerate(rows):
        for j, v in enumerate(row):
            c = gt.cell(i, j)
            c.fill.solid()
            c.fill.fore_color.rgb = rgb(
                head if i == 0 else ("F7F5F0" if i % 2 else "FFFFFF")
            )
            tf = c.text_frame
            tf.text = ""
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.RIGHT
            p._p.get_or_add_pPr().set("rtl", "1")
            r = p.add_run()
            r.text = str(v)
            r.font.size = Pt(size)
            r.font.name = "Tajawal"
            r.font.bold = i == 0
            r.font.color.rgb = rgb("FFFFFF" if i == 0 else "16161C")
    return gt


n = 0
# 1 cover
s = prs.slides.add_slide(BL)
bg(s)
n += 1
text(s, 0.2, 0.2, 7, 8, "X", 400, SIGNAL, True, "Cairo", PP_ALIGN.LEFT)
text(s, 6.2, 0.7, 6.6, 0.6, "USER-X", 28, SIGNAL, True, "Cairo")
text(s, 5.2, 2.3, 7.6, 1.4, "اختر ألعابك", 54, BONE, True, "Cairo")
text(
    s,
    5.2,
    3.6,
    7.6,
    1.2,
    "عشر ألعاب إقصاء جسدية أصلية — من ألعابنا الشعبية إلى ساحة تنافس حقيقية",
    22,
    "E9E3D6",
)
text(
    s,
    5.2,
    5.9,
    7.6,
    0.8,
    [
        "جدة · الفئة 18–30 · نوفمبر 2026",
        "تصميم مفاهيمي + نماذج 3D + محاكاة قواعد — قبل اختبار اللاعبين",
    ],
    13,
    MUTED,
)

# 2 how to choose
s = prs.slides.add_slide(BL)
bg(s)
n += 1
text(s, 0.6, 0.4, 12.1, 0.8, "كيف تقرأ هذا العرض", 34, BONE, True, "Cairo")
pts = [
    "كل لعبة في شريحة: الفكرة، الصورة، اللاعبون، المدة، التكلفة، إعادة الضبط، الإمكانات التجارية، الدرجة، والتوصية.",
    "كل الألعاب تحت سقف 7,000 ر.س للبناء الموصى (شامل احتياطي 10%). الأسعار تقديرية ما لم تُوثّق.",
    "الصور نماذج ثلاثية الأبعاد حقيقية بالأبعاد المقترحة — نماذج مفهوم، وليست تصاميم نهائية.",
    "الدرجة من 100 نقطة على 11 معيارًا. هي اجتهاد فريق التصميم وتتغير بعد اختبار اللاعبين.",
    "آخر شريحة: ورقة اختيار تعلّم فيها على الألعاب التي تريد تصنيعها.",
]
text(s, 0.8, 1.6, 11.8, 4.8, ["•  " + p for p in pts], 20, "E9E3D6")
footer(s, n)

# 3 overview grid
s = prs.slides.add_slide(BL)
bg(s)
n += 1
text(s, 0.6, 0.3, 12.1, 0.8, "الألعاب العشر في نظرة", 30, BONE, True, "Cairo")
for i, g in enumerate(bd.GAMES):
    col, row = 4 - (i % 5), i // 5
    x, y = 0.45 + col * 2.55, 1.3 + row * 2.85
    s.shapes.add_picture(
        bd.r(g["id"], "persp"), Inches(x), Inches(y), Inches(2.4), Inches(1.5)
    )
    rect(s, x, y + 1.5, 2.4, 0.08, g["color"].lstrip("#"))
    text(s, x, y + 1.6, 2.4, 0.5, f"{g['ar']} | {g['en']}", 13, BONE, True, "Cairo")
    text(
        s,
        x,
        y + 2.05,
        2.4,
        0.5,
        f"{bd.total(g)}/100 · {bd.money(bd.capex(g))}",
        11,
        SAND,
    )
footer(s, n)

# game slides
for g in bd.GAMES:
    s = prs.slides.add_slide(BL)
    bg(s)
    n += 1
    acc = g["color"].lstrip("#")
    rect(s, 13.1, 0, 0.233, 7.5, acc)
    s.shapes.add_picture(
        bd.r(g["id"], "persp"), Inches(0.4), Inches(0.5), Inches(6.4), Inches(4.0)
    )
    s.shapes.add_picture(
        bd.r(g["id"], "top"), Inches(0.4), Inches(4.65), Inches(3.1), Inches(1.94)
    )
    s.shapes.add_picture(
        bd.r(g["id"], "detail"), Inches(3.7), Inches(4.65), Inches(3.1), Inches(1.94)
    )
    text(
        s,
        7.1,
        0.35,
        5.8,
        0.4,
        f"{g['id']} · الترتيب {bd.RANK[g['id']]} من 10",
        13,
        acc,
        True,
        "Cairo",
    )
    text(s, 7.1, 0.75, 5.8, 0.9, g["ar"] + "  |  " + g["en"], 32, BONE, True, "Cairo")
    text(s, 7.1, 1.65, 5.8, 0.6, g["tagline"], 14, SAND)
    text(
        s,
        7.1,
        2.25,
        5.8,
        1.9,
        g["concept"][:330] + ("…" if len(g["concept"]) > 330 else ""),
        12,
        "E9E3D6",
    )
    stats = [
        ("اللاعبون", f"{g['players'][0]}–{g['players'][2]}"),
        ("المدة", f"{g['duration']} د"),
        ("إعادة الضبط", f"{g['reset']['time']} د"),
        ("التكلفة", bd.money(bd.capex(g))),
        ("تجاري", f"{g['scores']['com']}/15"),
        ("الدرجة", f"{bd.total(g)}/100"),
    ]
    for k, (a, v) in enumerate(stats):
        cx = 7.1 + (2 - k % 3) * 1.95
        cy = 4.35 + (k // 3) * 1.0
        rect(s, cx, cy, 1.85, 0.9, PANEL)
        text(s, cx, cy + 0.05, 1.8, 0.35, a, 11, MUTED, align=PP_ALIGN.CENTER)
        text(s, cx, cy + 0.38, 1.8, 0.45, v, 17, BONE, True, "Cairo", PP_ALIGN.CENTER)
    rect(s, 7.1, 6.4, 5.8, 0.5, acc)
    text(s, 7.15, 6.43, 5.7, 0.45, "التوصية: " + REC[g["id"]], 15, INK, True, "Cairo")
    footer(s, n)

# scorecard
s = prs.slides.add_slide(BL)
bg(s, "F7F5F0")
n += 1
text(s, 0.6, 0.3, 12, 0.7, "بطاقة الاختيار — 100 نقطة", 28, INK, True, "Cairo")
rows = [
    [
        "#",
        "اللعبة",
        "تفاعل 15",
        "نفسي 10",
        "إعادة 10",
        "أصالة 10",
        "تجاري 15",
        "تكلفة 10",
        "ضبط 10",
        "تشغيل 5",
        "سلامة 5",
        "سوشال 5",
        "توسع 5",
        "المجموع",
    ]
]
for g in bd.RANKED:
    sc = g["scores"]
    rows.append(
        [
            bd.RANK[g["id"]],
            f"{g['ar']}",
            sc["eng"],
            sc["psy"],
            sc["rep"],
            sc["orig"],
            sc["com"],
            sc["aff"],
            sc["reset"],
            sc["ops"],
            sc["safe"],
            sc["social"],
            sc["scale"],
            bd.total(g),
        ]
    )
table(s, 0.5, 1.15, 12.3, rows, [0.4, 1.7] + [0.85] * 11 + [0.85], 12)
footer(s, n)

# top 3
s = prs.slides.add_slide(BL)
bg(s)
n += 1
text(s, 0.6, 0.3, 12, 0.8, "التوصية: ابدأ بثلاث", 34, BONE, True, "Cairo")
for i, gid in enumerate(("G06", "G10", "G08")):
    g = next(x for x in bd.GAMES if x["id"] == gid)
    x = 8.85 - i * 4.2
    s.shapes.add_picture(
        bd.r(gid, "persp"), Inches(x), Inches(1.3), Inches(3.95), Inches(2.47)
    )
    rect(s, x, 3.77, 3.95, 0.08, g["color"].lstrip("#"))
    text(
        s, x, 3.9, 3.95, 0.5, f"{g['ar']} — {bd.total(g)}/100", 20, BONE, True, "Cairo"
    )
    why = {
        "G06": [
            "أعلى درجة وأسرع ضبط (3 د)",
            "قاعدة معروفة محليًا = شرح دقيقة",
            "محتوى متجدد = زيارات متكررة",
        ],
        "G10": ["أرخص بناء: 4,873 ر.س", "أقوى لقطات سوشال", "حتى 16 لاعبًا"],
        "G08": ["الأكثر أصالة (10/10)", "صورة توقيع لـ USER-X", "مثالية لورش الشركات"],
    }[gid]
    text(s, x, 4.45, 3.95, 1.6, ["• " + w for w in why], 14, "E9E3D6")
text(
    s,
    0.6,
    6.2,
    12.1,
    0.7,
    "ثلاث آليات مختلفة تمامًا · 17,265 ر.س بناء · مشغل واحد لكل لعبة · إعادة ضبط ≤ 6 د",
    16,
    SAND,
    True,
    "Cairo",
)
footer(s, n)

# finance
sc = FIN["scenarios"]
k = list(sc.keys())
ms = FIN["monthly_summary"]
s = prs.slides.add_slide(BL)
bg(s, "F7F5F0")
n += 1
text(
    s,
    0.6,
    0.3,
    12,
    0.7,
    "الأرقام (3 ألعاب، نموذج شراكة مع مكان) — تقديرات",
    26,
    INK,
    True,
    "Cairo",
)
rows = [
    ["", "متحفظ", "أساسي", "نمو"],
    ["الإشغال", *[f"{int(v * 100)}%" for v in sc[k[0]]]],
    ["لاعبون/شهر", *[f"{v:,.0f}" for v in sc[k[1]]]],
    ["إيراد شهري مستقر", *[bd.money(v) for v in sc[k[6]]]],
    ["EBITDA شهري", *[bd.money(v) for v in sc[k[12]]]],
    ["أشهر الاسترداد", *[str(v) for v in sc[k[15]]]],
]
table(s, 5.3, 1.2, 7.6, rows, [2.2, 1.8, 1.8, 1.8], 14)
kp = [
    ("الاستثمار الأولي", bd.money(ms["الاستثمار الأولي"])),
    ("رأس المال المطلوب (أساسي)", bd.money(ms["رأس المال المطلوب (أكبر عجز تراكمي)"])),
    ("لاعبو التعادل/يوم", str(FIN["breakeven"]["لاعبو التعادل يوميًا"])),
    ("هامش المساهمة", f"{int(FIN['breakeven']['هامش المساهمة %'] * 100)}%"),
]
for i, (a, v) in enumerate(kp):
    rect(s, 0.5, 1.2 + i * 1.25, 4.5, 1.1, INK)
    text(s, 0.6, 1.25 + i * 1.25, 4.3, 0.4, a, 13, MUTED)
    text(s, 0.6, 1.6 + i * 1.25, 4.3, 0.6, v, 24, BONE, True, "Cairo")
text(
    s,
    5.3,
    4.2,
    7.6,
    2.2,
    [
        "• لعبة واحدة لا تغطي التكاليف الثابتة؛ الثلاث أقل تركيبة مربحة.",
        "• الربح الأكبر من فعاليات الشركات والتأجير (هامش 60–65%).",
        "• السيناريو المتحفظ خاسر ← بوابات قرار وتوسع بعد إثبات الإشغال.",
        "• النموذج قابل للتعديل: الملف USER-X_10_Games_Financial_Model.xlsx",
    ],
    14,
    "333333",
)
footer(s, n)

# timeline
s = prs.slides.add_slide(BL)
bg(s)
n += 1
text(
    s, 0.6, 0.3, 12, 0.7, "من الاعتماد إلى الإطلاق: 13 أسبوعًا", 30, BONE, True, "Cairo"
)
phases = [
    ("اعتماد واختيار", 1, 1),
    ("نماذج + اختبار", 2, 4),
    ("مراجعة التصميم", 5, 1),
    ("ترخيص ومكان", 2, 6),
    ("توريد وتصنيع", 6, 4),
    ("تدريب المشغلين", 8, 3),
    ("تسويق ما قبل الإطلاق", 6, 6),
    ("تركيب + سلامة", 10, 2),
    ("إطلاق تجريبي", 12, 1),
    ("إطلاق عام", 13, 1),
    ("تقييم 30 يوم", 17, 1),
]
wk = 0.55
for i, (lab, st, du) in enumerate(phases):
    y = 1.25 + i * 0.5
    text(s, 10.3, y - 0.02, 2.7, 0.4, lab, 13, BONE)
    x = 10.1 - (st + du - 1) * wk
    rect(
        s,
        x,
        y + 0.05,
        du * wk - 0.05,
        0.32,
        SIGNAL
        if lab
        in (
            "نماذج + اختبار",
            "توريد وتصنيع",
            "تركيب + سلامة",
            "إطلاق تجريبي",
            "إطلاق عام",
        )
        else SAND,
    )
for w in range(1, 18):
    text(s, 10.1 - w * wk, 6.85, wk, 0.3, str(w), 9, MUTED, align=PP_ALIGN.CENTER)
text(s, 0.4, 6.55, 6, 0.3, "البرتقالي = المسار الحرج · الأرقام = الأسابيع", 10, MUTED)

# next steps
s = prs.slides.add_slide(BL)
bg(s)
n += 1
text(s, 0.6, 0.3, 12, 0.8, "الخطوات التالية", 34, BONE, True, "Cairo")
text(
    s,
    0.8,
    1.5,
    11.8,
    5,
    [
        "1.  اعتماد الألعاب الثلاث",
        "2.  تسليم هوية USER-X الرسمية (الحالية مؤقتة)",
        "3.  نماذج MVP واختبار مع 30 لاعبًا (أسبوعان، ~4,800 ر.س)",
        "4.  3 عروض أسعار تصنيع بملفات STL",
        "5.  شريك المكان + التحقق من الترخيص",
        "6.  بدء محتوى ما قبل الإطلاق",
    ],
    22,
    "E9E3D6",
)
footer(s, n)

# selection sheet
s = prs.slides.add_slide(BL)
bg(s, "F7F5F0")
n += 1
text(
    s,
    0.6,
    0.3,
    12,
    0.7,
    "ورقة الاختيار — علّم ☐ على الألعاب المطلوب تصنيعها",
    26,
    INK,
    True,
    "Cairo",
)
rows = [
    [
        "تصنيع؟",
        "اللعبة",
        "اللاعبون",
        "المدة",
        "إعادة الضبط",
        "التكلفة",
        "الدرجة",
        "توصيتنا",
    ]
]
for g in bd.RANKED:
    rows.append(
        [
            "☐",
            f"{g['ar']} | {g['en']}",
            f"{g['players'][0]}–{g['players'][2]}",
            f"{g['duration']} د",
            f"{g['reset']['time']} د",
            bd.money(bd.capex(g)),
            bd.total(g),
            REC[g["id"]],
        ]
    )
table(s, 0.5, 1.15, 12.3, rows, [0.9, 3.0, 1.1, 0.9, 1.2, 1.4, 0.9, 2.9], 13)
footer(s, n)

prs.save(OUT)
print("saved", os.path.abspath(OUT), n, "slides")
