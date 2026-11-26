"""Per-game Arabic documents (HTML -> PDF): GDD, rules, SOP, reset checklist, safety, procurement, testing plan."""

import os

from model import common

import model
from htmlkit import box, cover, doc, esc, fig, h2, kv, ol, stats, table, ul
from model import fmt

DATE = "2026-11-26"
HONEST = (
    "هذه الوثيقة تصميم مفاهيمي من فريق USER-X. اللعبة <b>لم تُختبر بعد</b> مع لاعبين؛ معايير القبول مقترحة. "
    "كل الأسعار <b>تقديرية غير مُتحقق منها</b> وتحتاج عروض أسعار مكتوبة. الأرقام الاقتصادية <b>افتراضات</b>."
)


def gfolder(g):
    return os.path.join(
        model.PKG, "02_GDD", f"Game_{g['num']:02d}_{g['en'].title().replace(' ', '_')}"
    )


def img(g, name):
    return os.path.join(gfolder(g), "3D_Concept_Images", name)


def meta(g, kind):
    return (
        f"{esc(kind)} · {esc(g['id'])} · {esc(g['category'])}<br>إعداد: فريق تصميم USER-X — جدة · تاريخ الإصدار: {DATE} · "
        f"الحالة: مسودة تصميم للمراجعة (غير مختبرة)"
    )


def players_txt(g):
    p = g["players"]
    return f"{p['min']}–{p['max']} (الأمثل {p['opt']})"


DEMO_S = 30  # live demonstration that accompanies every briefing (shown in each game's flow)


def secs(text):
    """Estimated briefing duration: spoken script at ~1.7 words/second (clear, paced delivery) + live demo."""
    return round(len(text.split()) / 1.7) + DEMO_S


# ------------------------------------------------------------------ sections reused across docs
def sec_overview(g):
    i = g["inspiration"]
    return (
        h2("A", "نظرة عامة")
        + f"<p class='lead'>{esc(g['concept'])}</p>"
        + kv(
            [
                ("الفئة", g["category"]),
                ("الوسوم", "، ".join(g["tags"])),
                ("اللاعبون", players_txt(g)),
                ("التشكيل", g["teams"]),
                ("العمر", g["age"]),
                ("المدة", f"{g['duration'][0]}–{g['duration'][1]} دقيقة للجلسة"),
                ("المكان", g["venue"]),
                ("الثيمة", g["theme"]),
                ("التجربة", g["experience"]),
            ]
        )
        + "<h3>الإلهام والأصالة</h3>"
        + kv(
            [
                ("اللعبة الشعبية", i["name"]),
                ("المصدر", i["source"] + " (انظر سجل المصادر)"),
                ("ما أُخذ", i["kept"]),
                ("ما تغيّر", i["changed"]),
            ]
        )
        + box(
            "note",
            "لم يُنسخ أي تصميم أو قاعدة أو مشهد أو عنصر بصري من برامج المسابقات التلفزيونية. الضغط النفسي ناتج عن الآلية فقط.",
        )
    )


def sec_objective(g):
    o = g["objective"]
    return h2("B", "الهدف") + kv(
        [("كيف تفوز", o["win"]), ("ما تتجنبه", o["avoid"]), ("الفائز", o["winner"])]
    )


def sec_atmos(g):
    a = g["atmosphere"]
    names = {
        "lighting": "الإضاءة",
        "sound": "الصوت",
        "symbols": "الرموز",
        "countdown": "العدّ التنازلي",
        "scoreboard": "لوحة النتائج",
        "stage": "المسرح",
        "positioning": "التموضع",
    }
    return (
        h2("C", "السرد والأجواء")
        + f"<p>{esc(g['narrative'])}</p>"
        + table(["العنصر", "التصميم"], [(names.get(k, k), v) for k, v in a.items()])
        + "<h3>عبارات المشغّل</h3>"
        + ul(g["operator_lines"])
    )


def sec_mechanics(g):
    return h2("D", "الآليات") + table(
        ["#", "المرحلة", "الوصف"],
        [(n, p, t) for n, (p, t) in enumerate(g["mechanics"], 1)],
        widths=["7%", "18%", None],
    )


def sec_rules(g, with_brief=True):
    r = g["rules"]
    lab = [
        ("core", "القواعد الأساسية"),
        ("allowed", "المسموح"),
        ("prohibited", "الممنوع"),
        ("time", "الوقت"),
        ("penalties", "العقوبات"),
        ("dq", "الاستبعاد"),
        ("tiebreak", "كسر التعادل"),
        ("operator_calls", "قرارات المشغّل"),
        ("disputes", "الاعتراضات"),
    ]
    out = h2("E", "القواعد")
    for k, t in lab:
        out += f"<h3>{t}</h3>" + ul(r[k])
    out += f"<h3>قاعدة الفوز</h3><p>{esc(r['winner_rule'])}</p>"
    if with_brief:
        s = secs(g["briefing"])
        flag = (
            ""
            if 60 <= s <= 120
            else box("warn", f"الشرح المقدّر {s} ث — خارج نطاق 60–120 ث المطلوب.")
        )
        out += (
            f"<h3>نص الشرح للاعبين (مقدّر بـ {s} ثانية شاملة عرضًا عمليًا {DEMO_S} ث)</h3><div class='script'>{esc(g['briefing'])}</div>"
            + flag
        )
    return out


def sec_flow(g):
    return h2("F", "تسلسل الجلسة") + table(
        ["الوقت", "ما يحدث"], g["flow"], num_cols=(0,), widths=["14%", None]
    )


def sec_elim(g):
    e = g["elimination"]
    return (
        h2("G", "الإقصاء")
        + kv(
            [
                ("كيف", e["how"]),
                ("متى", e["when"]),
                ("الخروج", e["leave"]),
                ("أثناء الانتظار", e["waiting"]),
                ("التعويض", e["consolation"]),
                ("الإعلان", e["announce"]),
                ("النهاية", e["end"]),
            ]
        )
        + box(
            "ok",
            "الإقصاء شفاف ومحترم: يُعلن بالرقم لا بالسخرية، وكل مقصى يبقى ضيفًا مرحّبًا به، ويحق لأي لاعب الانسحاب في أي لحظة دون أي عقوبة.",
        )
    )


def sec_psych(g):
    return (
        h2("H", "التصميم النفسي (بالآلية فقط)")
        + table(["الآلية", "كيف تولّد الضغط", "الضمانة"], g["psychology"])
        + box(
            "note",
            "ممنوع في كل ألعاب USER-X: الإهانة، التحرش، الخطر الجسدي، الإكراه، التهديد الحقيقي، استغلال نقاط ضعف المشاركين أو معلوماتهم الخاصة.",
        )
    )


def sec_physical(g, with_imgs=True):
    p = g["physical"]
    W, L = p["footprint"]
    out = (
        h2("I", "التصميم المادي والأبعاد")
        + stats(
            [
                (f"{W} × {L} م", "المساحة المخصصة"),
                (f"{p['height']} م", "أقصى ارتفاع للمعدات"),
                (players_txt(g), "اللاعبون"),
            ]
        )
        + f"<p>{esc(p['layout'])}</p>"
        + table(["المكوّن", "الأبعاد", "المادة", "التصنيع"], p["components"])
        + kv(
            [
                ("اللاعبون", p["positions"]["players"]),
                ("المشغّل", p["positions"]["operator"]),
                ("الحكم", p["positions"]["judge"]),
                ("الجمهور", p["positions"]["audience"]),
                ("منطقة الأمان", p["safety_zone"]),
                ("الدخول والخروج", p["entry_exit"]),
                ("التخزين", p["storage"]),
                ("النمطية", p["modular"]),
            ]
        )
    )
    if with_imgs:
        out += (
            "<h3>نماذج ثلاثية الأبعاد (Blender — مفاهيمية)</h3>"
            + fig(
                img(g, "perspective.png"),
                "منظور — نموذج مفاهيمي بالأبعاد الحقيقية للمساحة؛ المجسمات الرمادية تمثل اللاعبين للمقياس.",
            )
            + fig(
                img(g, "dimensioned_top.png"),
                "مسقط علوي مع الأبعاد — الخط السماوي هو حدود المساحة المخصصة.",
            )
            + '<div class="grid2">'
            + fig(img(g, "front.png"), "واجهة أمامية (إسقاط متعامد)")
            + fig(img(g, "side.png"), "واجهة جانبية (إسقاط متعامد)")
            + "</div>"
            + fig(img(g, "assembly.png"), "منظور تجميعي مفكك للعناصر الرئيسية")
            + box(
                "note",
                "النماذج مفاهيمية (Block-out) بأبعاد صحيحة للمساحة والعناصر الرئيسية، وليست رسومات تصنيع نهائية. ملف .blend قابل للتعديل في 3D_Project_Files.",
            )
        )
    return out


def bom_table(g, tier, compact=False):
    if compact:
        rows = model.bom_rows(g, tier)
        c = model.tier_cost(g, tier)
        body = [(r['name'], r['spec'], fmt(r['qty']), fmt(r['price']), fmt(r['total']), common.SUPPLIERS[r['sup']]['ar'], r['lead'], r['why']) for r in rows]
        foot = [('المجموع الفرعي', '', '', '', fmt(c['sub']), '', '', ''), (f'طوارئ {int(model.CONT * 100)}%', '', '', '', fmt(c['cont']), '', '', ''), ('الإجمالي', '', '', '', fmt(c['total']), '', '', '')]
        return table(['الصنف', 'المواصفة', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'نوع المورد', 'التوريد', 'لماذا'], body, num_cols=(2, 3, 4), foot=foot)
    rows = model.bom_rows(g, tier)
    body = [
        (
            r["name"],
            r["spec"],
            fmt(r["qty"]),
            r["unit"],
            fmt(r["price"]),
            fmt(r["total"]),
            common.SUPPLIERS[r["sup"]]["ar"],
            r["lead"],
            r["alt"],
            r["repl"],
            r["why"],
        )
        for r in rows
    ]
    c = model.tier_cost(g, tier)
    foot = [
        ("المجموع الفرعي", "", "", "", "", fmt(c["sub"]), "", "", "", "", ""),
        (
            f"احتياطي طوارئ {int(model.CONT * 100)}%",
            "",
            "",
            "",
            "",
            fmt(c["cont"]),
            "",
            "",
            "",
            "",
            "",
        ),
        ("الإجمالي", "", "", "", "", fmt(c["total"]), "", "", "", "", ""),
    ]
    return table(
        [
            "الصنف",
            "المواصفة",
            "الكمية",
            "الوحدة",
            "سعر الوحدة",
            "الإجمالي",
            "نوع المورد",
            "مدة التوريد",
            "البديل",
            "الاستبدال",
            "لماذا",
        ],
        body,
        num_cols=(2, 4, 5),
        foot=foot,
    )


def sec_bom(g):
    c = model.costs(g)
    flags = "".join(box("warn", "تنبيه ميزانية: " + esc(f)) for f in c["flags"])
    return (
        h2("J", "قائمة المواد والتكلفة (BOM)")
        + stats(
            [
                (fmt(c["mvb"]["total"]), "الحد الأدنى القابل للتشغيل (ريال)"),
                (fmt(c["rec"]["total"]), "النسخة الموصى بها (ريال)"),
                (fmt(c["upg_total"]), "نسخة الترقية (ريال)"),
            ]
        )
        + flags
        + box(
            "note",
            esc(common.VAT_NOTE)
            + " الحد الأدنى لا يمس السلامة ولا الآلية الأساسية؛ الفرق تشطيب وكميات احتياطية.",
        )
        + "<h3>النسخة الموصى بها</h3>"
        + bom_table(g, "rec", True)
        + "<h3>إضافات الترقية (فوق الموصى بها)</h3>"
        + bom_table(g, "upg", True)
    )


def sec_reset(g):
    r = g["reset"]
    return (
        h2("K", "نظام إعادة التجهيز")
        + stats(
            [
                (f"{r['time_s']} ث", "زمن الإعادة المستهدف"),
                (r["who"], "المسؤول"),
                (f"{len(r['checklist'])}", "بنود الفحص"),
            ]
        )
        + "<h3>ما يُعاد</h3>"
        + ul(r["what"])
        + "<h3>التسلسل</h3>"
        + ol(r["sequence"])
        + "<h3>قائمة الفحص</h3>"
        + ul(r["checklist"], "chk")
        + '<div class="grid2"><div><h3>الأدوات</h3>'
        + ul(r["tools"])
        + "<h3>المستهلكات</h3>"
        + ul(r["consumables"])
        + "</div><div><h3>أخطاء شائعة</h3>"
        + ul(r["mistakes"])
        + "<h3>تسريع</h3>"
        + ul(r["faster"])
        + "</div></div>"
        + kv(
            [
                (
                    "تجهيز مسبق",
                    "، ".join(r["prep"]) if isinstance(r["prep"], list) else r["prep"],
                ),
                ("التخزين", r["storage"]),
                ("التحقق", r["verify"]),
            ]
        )
    )


def staff_rows(g):
    o = g["ops"]
    L = common.LABOUR
    return [
        (
            "مشغّل/مذيع",
            o["operators"],
            "يدير الشرح والإيقاع والإعلانات ويقرر الإيقاف",
            fmt(L["operator_shift"]),
        ),
        (
            "حكم",
            o["judges"],
            "يراقب القواعد والسلامة ويسجّل النتائج",
            fmt(L["judge_shift"]),
        ),
        (
            "طاقم إعادة",
            o["reset_crew"],
            "يعيد التجهيز بين الجولات حسب القائمة",
            fmt(L["reset_crew_shift"]),
        ),
    ]


def sec_sop(g):
    return (
        h2("L", "إجراءات التشغيل (SOP)")
        + table(
            ["الدور", "العدد", "المسؤولية", "أجر الوردية (ريال، تقدير)"],
            staff_rows(g),
            num_cols=(1, 3),
        )
        + "<h3>قبل الجلسة</h3>"
        + ul(
            [
                "فحص السلامة حسب القسم M وقائمة الإعادة K",
                "التأكد من موافقة كل لاعب وسؤاله عن أي حالة صحية تمنعه",
                "تشغيل الصوت والمؤقت والتأكد من الإضاءة",
                "شرح طريقة الانسحاب الآمن: يرفع اللاعب يده ويقول «انسحاب»",
            ],
            "chk",
        )
        + "<h3>أثناء الجلسة</h3>"
        + ol([f"{t}: {x}" for t, x in g["flow"]])
        + "<h3>قرارات وصلاحيات</h3>"
        + ul(g["rules"]["operator_calls"] + g["rules"]["disputes"])
        + "<h3>بعد الجلسة</h3>"
        + ul(
            [
                "شكر كل المشاركين بالاسم المختار أو الرقم",
                "تنفيذ إعادة التجهيز",
                "تسجيل أي ملاحظة أو حادث في سجل الحوادث",
            ]
        )
    )


def risk_rows(g):
    rows = []
    for hz, cause, L_, S_, ctrl, rL, rS in g["safety"]:
        lv, r = model.risk_level(L_, S_)
        rlv, rr = model.risk_level(rL, rS)
        cls = {"منخفض": "p-low", "متوسط": "p-med", "مرتفع": "p-high"}
        rows.append(
            (
                hz,
                cause,
                f"{L_}×{S_}={r}",
                f"<span class='pill {cls[lv]}'>{lv}</span>",
                ctrl,
                f"{rL}×{rS}={rr}",
                f"<span class='pill {cls[rlv]}'>{rlv}</span>",
            )
        )
    return rows


def sec_safety(g):
    x = g["safety_extra"]
    return (
        h2("M", "تقييم السلامة والمخاطر")
        + box(
            "note",
            "المقياس: الاحتمال (1–3) × الشدة (1–3). ≤2 منخفض، 3–4 متوسط، ≥6 مرتفع. لا تُشغّل اللعبة بأي خطر متبقٍ «مرتفع».",
        )
        + table(
            ["الخطر", "السبب", "قبل", "المستوى", "الضوابط", "بعد", "المتبقي"],
            risk_rows(g),
            num_cols=(2, 5),
        )
        + kv(
            [
                ("معدات الوقاية", x["ppe"]),
                ("اللافتات", x["signage"]),
                ("الإيقاف الطارئ", x["estop"]),
                ("إمكانية الوصول", x["access"]),
            ]
        )
    )


def sec_maint(g):
    m = g["maintenance"]
    return (
        h2("N", "الصيانة")
        + '<div class="grid2"><div><h3>يومي</h3>'
        + ul(m["daily"])
        + "<h3>أسبوعي</h3>"
        + ul(m["weekly"])
        + "</div><div><h3>التنظيف</h3>"
        + ul(m["cleaning"])
        + "<h3>قطع احتياطية</h3>"
        + ul(m["spares"])
        + "</div></div>"
        + kv([("تكلفة شهرية تقديرية", f"{fmt(m['month_cost'])} ريال")])
    )


def econ_rows(g):
    e = model.economics(g)
    H = model.HYP
    return e, [
        ("سعر التذكرة لكل لاعب للجلسة", f"{H['ticket']} ريال", "افتراض"),
        ("نسبة الإشغال", f"{int(H['occupancy'] * 100)}%", "افتراض"),
        ("مدة الوردية", f"{H['shift_min']} دقيقة", "افتراض"),
        ("دورة الجلسة (لعب + إعادة + دخول)", f"{e['cycle']:.1f} دقيقة", "محسوب"),
        ("جلسات في الوردية", e["sessions"], "محسوب"),
        ("مقاعد الجلسة", e["seats"], "من التصميم"),
        ("لاعبون/يوم", e["players_day"], "محسوب"),
        ("إيراد/يوم", f"{fmt(e['revenue_day'])} ريال", "محسوب من افتراضات"),
        ("طاقم/يوم", f"{fmt(e['staff_day'])} ريال", "تقدير"),
        ("مستهلكات/يوم", f"{fmt(e['cons_day'])} ريال", "تقدير"),
        ("صيانة/يوم", f"{fmt(e['maint_day'])} ريال", "تقدير"),
        ("حصة المكان والتسويق والرسوم/يوم", f"{fmt(e['overhead_day'])} ريال", "افتراض"),
        ("هامش التشغيل/يوم", f"{fmt(e['margin_day'])} ريال", "محسوب"),
        ("تكلفة البناء (الموصى بها)", f"{fmt(e['capex'])} ريال", "تقدير"),
        (
            "أيام التعادل",
            e["be_days"] if e["be_days"] else "لا يتعادل",
            "محسوب من افتراضات",
        ),
    ]


def sec_econ(g):
    e, rows = econ_rows(g)
    return (
        h2("O", "الاقتصاديات (افتراضات)")
        + box(
            "warn",
            "كل الأرقام هنا افتراضات تخطيطية وليست توقعات مُثبتة. الملف Game_Cost_Model.xlsx يتيح تغيير الافتراضات وإعادة الحساب.",
        )
        + table(["البند", "القيمة", "النوع"], rows, num_cols=(1,))
    )


def sec_tests_short(g):
    return (
        h2("P", "الاختبار المقترح")
        + box("warn", "لم تُنفَّذ أي من هذه الاختبارات بعد. المعايير مقترحة للقبول.")
        + table(["الاختبار", "الطريقة", "معيار القبول المقترح"], g["tests"])
    )


# ------------------------------------------------------------------ documents
def gdd(g):
    body = cover(
        "وثيقة تصميم اللعبة (GDD)",
        g["ar"],
        g["en"],
        g["tagline"],
        meta(g, "وثيقة تصميم"),
        "مسودة تصميم — لم تُختبر بعد",
        img(g, "perspective.png"),
    )
    body += box("note", HONEST)
    for f in (
        sec_overview,
        sec_objective,
        sec_atmos,
        sec_mechanics,
        sec_rules,
        sec_flow,
        sec_elim,
        sec_psych,
        sec_physical,
        sec_bom,
        sec_reset,
        sec_sop,
        sec_safety,
        sec_maint,
        sec_econ,
        sec_tests_short,
    ):
        body += f(g)
    return doc(f"GDD — {g['ar']}", body)


def rules(g):
    s = secs(g["briefing"])
    body = cover(
        "قواعد اللعبة",
        g["ar"],
        g["en"],
        g["tagline"],
        meta(g, "القواعد"),
        "للاعبين والطاقم",
    )
    body += (
        h2("", "الشرح الرسمي للاعبين")
        + f"<div class='script'>{esc(g['briefing'])}</div><p class='small'>المدة المقدّرة: {s} ثانية.</p>"
        + box(
            "ok",
            "المشاركة اختيارية بالكامل. يمكنك الانسحاب في أي لحظة برفع يدك وقول «انسحاب» دون أي عقوبة أو إحراج. لن يُطلب منك أي شيء يمس خصوصيتك أو سلامتك.",
        )
    )
    body += (
        sec_objective(g) + sec_rules(g, with_brief=False) + sec_flow(g) + sec_elim(g)
    )
    return doc(f"قواعد — {g['ar']}", body)


def sop(g):
    body = cover(
        "إجراءات تشغيل اللعبة (SOP)",
        g["ar"],
        g["en"],
        g["tagline"],
        meta(g, "SOP"),
        "للطاقم",
    )
    o = g["ops"]
    body += stats(
        [
            (o["operators"] + o["judges"] + o["reset_crew"], "أفراد الطاقم"),
            (f"{o['round_min']} د", "مدة الجلسة"),
            (o["players_round"], "لاعبون في الجلسة"),
        ]
    )
    body += sec_sop(g)
    body += (
        h2("", "عبارات المشغّل")
        + ul(g["operator_lines"])
        + h2("", "نص الشرح")
        + f"<div class='script'>{esc(g['briefing'])}</div>"
    )
    body += sec_elim(g) + sec_reset(g)
    body += h2("", "التعامل مع الحوادث") + ol(
        [
            "أوقف اللعبة فورًا بإعلان «توقف» وإيقاف المؤقت والصوت.",
            "قيّم الحالة؛ استخدم حقيبة الإسعاف أو اتصل بالطوارئ 997 (الإسعاف) / 911 حسب الحاجة.",
            "أبعد الجمهور وامنح الشخص خصوصيته.",
            "سجّل الحادث (الوقت، ما حدث، الإجراء) في سجل الحوادث.",
            "لا تستأنف قبل إزالة السبب وموافقة مسؤول السلامة.",
        ]
    )
    return doc(f"SOP — {g['ar']}", body)


def reset_doc(g):
    r = g["reset"]
    body = (
        f"<h1>قائمة إعادة التجهيز — {esc(g['ar'])}</h1><p class='small'>{esc(g['en'])} · الهدف: {r['time_s']} ثانية · المسؤول: {esc(r['who'])} · تُطبع وتُغلّف وتُعلّق عند اللعبة</p>"
        + h2("1", "التسلسل (مع التوقيت)")
        + ul(r["sequence"], "chk")
        + h2("2", "فحص قبل بدء الجولة التالية")
        + ul(r["checklist"], "chk")
        + h2("3", "التحقق النهائي")
        + f"<p>{esc(r['verify'])}</p>"
        + '<div class="grid2"><div>'
        + h2("", "أخطاء شائعة")
        + ul(r["mistakes"])
        + "</div><div>"
        + h2("", "للتسريع")
        + ul(r["faster"])
        + "</div></div>"
        + table(
            ["الجولة", "وقت البدء", "وقت الانتهاء", "المدة (ث)", "المسؤول", "ملاحظات"],
            [(str(n), "", "", "", "", "") for n in range(1, 9)],
        )
    )
    body += box(
        "note",
        "جدول التوقيت أعلاه سجل فارغ يُعبأ أثناء التشغيل لقياس زمن الإعادة الفعلي مقابل الهدف.",
    )
    return doc(f"إعادة التجهيز — {g['ar']}", body)


def safety(g):
    body = cover(
        "تقييم السلامة والمخاطر",
        g["ar"],
        g["en"],
        g["tagline"],
        meta(g, "السلامة"),
        "يجب اعتماده قبل التشغيل",
    )
    body += sec_safety(g)
    body += (
        h2("", "ضوابط عامة إلزامية")
        + ul(
            [
                "موافقة طوعية من كل مشارك، والعمر 18+ بإثبات.",
                "سؤال صحي قبل الدخول (إصابات، حمل، حالات قلب، صرع ضوئي عند وجود إضاءة وامضة).",
                "كلمة انسحاب واضحة: «انسحاب» توقف مشاركة اللاعب فورًا دون عقوبة.",
                "ماء متاح، واستراحة عند الحاجة.",
                "حقيبة إسعافات أولية وشخص مدرّب في الموقع.",
                "مخارج طوارئ واضحة وممرات لا تقل عن 1.2 م.",
                "منع السخرية أو التعليقات الجارحة من الطاقم أو الجمهور.",
                "التصوير بموافقة مكتوبة فقط.",
            ]
        )
        + h2("", "إجراء الطوارئ")
        + ol(
            [
                "أوقف اللعبة وأعلن «توقف».",
                "قيّم وأسعف أو اتصل بـ 997 (الإسعاف) / 998 (الدفاع المدني) / 911.",
                "أخلِ المنطقة عند الحاجة عبر المخرج المحدد.",
                "سجّل الحادث وأبلغ مدير الفعالية.",
            ]
        )
        + h2("", "سجل الحوادث")
        + table(
            ["التاريخ/الوقت", "الموقع", "الوصف", "الإجراء", "المسؤول"],
            [("", "", "", "", "")] * 6,
        )
        + h2("", "الاعتماد")
        + table(
            ["الدور", "الاسم", "التوقيع", "التاريخ"],
            [("مسؤول السلامة", "", "", ""), ("مدير التشغيل", "", "", "")],
        )
    )
    return doc(f"السلامة — {g['ar']}", body)


def procurement(g):
    rows = model.bom_rows(g, "rec")
    groups = {}
    for r in rows:
        groups.setdefault(r["sup"], []).append(r)
    p = g["procurement"]
    body = cover(
        "دليل المشتريات",
        g["ar"],
        g["en"],
        g["tagline"],
        meta(g, "المشتريات"),
        "أسعار تقديرية — اطلب عروض أسعار",
    )
    body += box(
        "warn",
        "لم يُتحقق من أي سعر أو رابط من بيئة العمل (حجب الشبكة). الروابط وُجدت عبر بحث الويب بتاريخ 2026-11-26 ويجب فتحها والتأكد منها. كل سعر هنا تقدير لجدة يحتاج عرض سعر مكتوب.",
    )
    body += h2("1", "كيف تطلب عرض سعر") + ol(common.QUOTE_HOWTO)
    body += (
        h2("2", "خطة الشراء")
        + kv(
            [
                ("يُصنّع", "، ".join(p["fabricate"])),
                ("يُشترى جاهزًا", "، ".join(p["buy"])),
                ("يُعاد استخدامه", "، ".join(p["reuse"])),
                ("يُطلب أولًا", "، ".join(p["first"])),
                ("مخاطر التأخير", "، ".join(p["delays"])),
            ]
        )
        + "<h3>التسلسل</h3>"
        + ol(p["sequence"])
        + "<h3>فحص الجودة عند الاستلام</h3>"
        + ul(p["qa"], "chk")
    )
    body += h2("3", "المشتريات حسب نوع المورد")
    for sid, items in groups.items():
        s = common.SUPPLIERS[sid]
        link = (
            f"<span class='ltr'>{esc(s['link'])}</span> (غير مُتحقق)"
            if s["link"]
            else "لا رابط — زيارة/اتصال مباشر"
        )
        sub = sum(i["total"] for i in items)
        body += f"<h3>{esc(s['ar'])}</h3>" + kv(
            [
                ("طريقة الطلب", s["how"]),
                ("الرابط", link),
                ("إجمالي تقديري", f"{fmt(sub)} ريال"),
            ]
        )
        body += table(
            [
                "الصنف",
                "المواصفة",
                "الكمية",
                "سعر تقديري",
                "الإجمالي",
                "مدة التوريد",
                "البديل",
            ],
            [
                (
                    i["name"],
                    i["spec"],
                    fmt(i["qty"]),
                    fmt(i["price"]),
                    fmt(i["total"]),
                    i["lead"],
                    i["alt"],
                )
                for i in items
            ],
            num_cols=(2, 3, 4),
        )
    c = model.costs(g)
    body += h2("4", "ملخص الميزانية") + table(
        ["المستوى", "المجموع الفرعي", "طوارئ 10%", "الإجمالي"],
        [
            (
                "الحد الأدنى",
                fmt(c["mvb"]["sub"]),
                fmt(c["mvb"]["cont"]),
                fmt(c["mvb"]["total"]),
            ),
            (
                "الموصى به",
                fmt(c["rec"]["sub"]),
                fmt(c["rec"]["cont"]),
                fmt(c["rec"]["total"]),
            ),
            ("الترقية (الموصى به + إضافات)", "", "", fmt(c["upg_total"])),
        ],
        num_cols=(1, 2, 3),
    )
    body += "".join(box("warn", "تنبيه: " + esc(f)) for f in c["flags"])
    return doc(f"المشتريات — {g['ar']}", body)


def testing(g):
    body = cover(
        "خطة الاختبار",
        g["ar"],
        g["en"],
        g["tagline"],
        meta(g, "الاختبار"),
        "مقترحة — لم تُنفّذ",
    )
    body += box(
        "warn",
        "هذه خطة مقترحة. لم يُختبر شيء بعد، ولا توجد نتائج. جدول النتائج أدناه فارغ عمدًا ويُعبأ بعد الاختبار الفعلي.",
    )
    body += h2("1", "الاختبارات ومعايير القبول") + table(
        ["#", "الاختبار", "الطريقة", "معيار القبول المقترح"],
        [(n, *t) for n, t in enumerate(g["tests"], 1)],
    )
    body += h2("2", "بروتوكول جلسة الاختبار") + ol(
        [
            f"تجنيد {g['players']['opt']} متطوعًا (18–30، رجالًا ونساءً حسب الفعالية) بموافقة مكتوبة.",
            "نموذج أولي بالحد الأدنى (MVB) قبل التصنيع الكامل.",
            "ثلاث جلسات كاملة على الأقل مع ساعة إيقاف لكل مرحلة.",
            "مراقب مستقل يسجل: فهم الشرح، مدة الجولات، زمن الإعادة، الحوادث، لحظات الحيرة.",
            "استبيان بعد الجلسة: المتعة (1–5)، الوضوح (1–5)، العدالة (1–5)، هل شعرت بإحراج؟ (نعم/لا + تعليق).",
            "مراجعة النتائج مقابل المعايير وتعديل التصميم ثم إعادة الاختبار.",
        ]
    )
    body += h2("3", "قرار الإطلاق (Go / No-Go)") + ul(
        [
            "Go: كل معايير السلامة متحققة + ≥ 80% من المعايير الأخرى + متوسط المتعة ≥ 3.8/5 + لا أحد أبلغ عن إحراج جدي.",
            "No-Go: أي حادث سلامة متوسط أو أعلى، أو زمن إعادة يتجاوز الهدف بأكثر من 50%، أو متوسط وضوح < 3.5/5.",
        ]
    )
    body += h2("4", "سجل النتائج (يُعبأ بعد الاختبار)") + table(
        ["الاختبار", "النتيجة المقاسة", "متحقق؟", "ملاحظات"],
        [(t[0], "", "", "") for t in g["tests"]],
    )
    return doc(f"الاختبار — {g['ar']}", body)


def dimension_page(g):
    """HTML page drawing dimension lines over the top render (screenshot -> dimensioned_top.png)."""
    W, L = g["physical"]["footprint"]
    rx = 1400
    ry = int(rx * L / W)
    scale = max(W, L) * 1.12
    ppm = rx / scale  # pixels per metre
    pad = 130
    fw, fl = W * ppm, L * ppm
    x0, y0 = pad + (rx - fw) / 2, pad + (ry - fl) / 2
    tw, th = rx + 2 * pad, ry + 2 * pad
    cy, mg = model.BRAND["cyan"], model.BRAND["magenta"]
    bar = ppm  # 1 m
    svg = f"""<svg width="{tw}" height="{th}" xmlns="http://www.w3.org/2000/svg" style="position:absolute;left:0;top:0">
<defs><marker id="a" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{cy}"/></marker></defs>
<line x1="{x0}" y1="{y0 - 50}" x2="{x0 + fw}" y2="{y0 - 50}" stroke="{cy}" stroke-width="3" marker-start="url(#a)" marker-end="url(#a)"/>
<line x1="{x0}" y1="{y0 - 65}" x2="{x0}" y2="{y0}" stroke="{cy}" stroke-width="1.5" stroke-dasharray="6 5"/><line x1="{x0 + fw}" y1="{y0 - 65}" x2="{x0 + fw}" y2="{y0}" stroke="{cy}" stroke-width="1.5" stroke-dasharray="6 5"/>
<line x1="{x0 + fw + 50}" y1="{y0}" x2="{x0 + fw + 50}" y2="{y0 + fl}" stroke="{cy}" stroke-width="3" marker-start="url(#a)" marker-end="url(#a)"/>
<line x1="{x0 + fw}" y1="{y0}" x2="{x0 + fw + 65}" y2="{y0}" stroke="{cy}" stroke-width="1.5" stroke-dasharray="6 5"/><line x1="{x0 + fw}" y1="{y0 + fl}" x2="{x0 + fw + 65}" y2="{y0 + fl}" stroke="{cy}" stroke-width="1.5" stroke-dasharray="6 5"/>
<rect x="{pad}" y="{th - 70}" width="{bar}" height="14" fill="{mg}"/><rect x="{pad + bar}" y="{th - 70}" width="{bar}" height="14" fill="#F4F4F1"/>
</svg>"""
    return (
        doc(
            "dims",
            f"""<style>body{{margin:0;background:#0B0B0F;}} .t{{position:absolute;color:#F4F4F1;font-family:Kufam;font-size:30px;}} .s{{position:absolute;color:#A9A9B6;font-family:Plex;font-size:22px;}}</style>
<div style="position:relative;width:{tw}px;height:{th}px;background:#0B0B0F">
<img src="file://{img(g, "top.png")}" style="position:absolute;left:{pad}px;top:{pad}px;width:{rx}px;height:{ry}px">{svg}
<div class="t" style="left:{x0 + fw / 2 - 60}px;top:{y0 - 105}px;direction:ltr">{W:.1f} m</div>
<div class="t" style="left:{x0 + fw + 64}px;top:{y0 + fl / 2 - 20}px;direction:ltr">{L:.1f} m</div>
<div class="s" style="left:{pad}px;top:{th - 48}px;direction:ltr">0 — 1 — 2 m</div>
<div class="s" style="right:{pad}px;top:{th - 58}px">مسقط علوي · {esc(g["ar"])} · المساحة {W}×{L} م · أقصى ارتفاع {g["physical"]["height"]} م</div>
<div class="s" style="right:{pad}px;top:24px">الخط السماوي = حدود المساحة المخصصة · المجسمات الرمادية = لاعبون (للمقياس)</div>
</div>""",
        ),
        tw,
        th,
    )


DOCS = [
    ("GDD_Arabic.pdf", gdd),
    ("Game_Rules.pdf", rules),
    ("Game_Operations_SOP.pdf", sop),
    ("Reset_Checklist.pdf", reset_doc),
    ("Safety_Risk_Assessment.pdf", safety),
    ("Procurement_Guide.pdf", procurement),
    ("Game_Testing_Plan.pdf", testing),
]
