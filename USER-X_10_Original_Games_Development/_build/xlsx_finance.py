"""USER-X financial model — every output is a live Excel formula.

Inputs are yellow. Change the scenario (Assumptions!B5), the venue model (B18)
and the game selection (Games!C5:C14) and every sheet recalculates.
"""

import os

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.worksheet.datavalidation import DataValidation

import games_a
import games_b
from common import CONTINGENCY, PREOPENING, SHARED_INFRA
from xlsx_common import PCT, PCT1, SAR, SAR0, header, name, put, sheet, title, widths

GAMES = games_a.GAMES_A + games_b.GAMES_B
OUT = os.path.join(
    os.path.dirname(__file__), "..", "USER-X_10_Games_Financial_Model.xlsx"
)
DEFAULT_SELECTED = {"G06", "G10", "G08"}
LAUNCH_CAMPAIGN = (
    12000,
    25000,
    50000,
)  # one-time launch campaign by scenario (see marketing plan)


def capex(g):
    return round(sum(r[3] * r[4] for r in g["bom"]) * (1 + CONTINGENCY))


def mvp(g):
    return round(sum(r[3] * r[5] for r in g["bom"]))


def build():
    wb = Workbook()
    # ------------------------------------------------------------ Assumptions
    A = sheet(wb, "الافتراضات", first=True)
    title(
        A,
        "USER-X — نموذج مالي قابل للتهيئة | الافتراضات",
        "الخلايا الصفراء مدخلات قابلة للتعديل. كل الأرقام تقديرية ما لم يُذكر مصدر. العملة: ريال سعودي.",
        7,
    )
    header(
        A,
        4,
        ["البند", "القيمة الفعّالة", "متحفظ", "أساسي", "نمو", "الوحدة", "ملاحظة/مصدر"],
    )
    put(A, 5, 1, "السيناريو المختار", bold=True)
    put(A, 5, 2, "أساسي", inp=True, bold=True)
    dv = DataValidation(type="list", formula1='"متحفظ,أساسي,نمو"', allow_blank=False)
    A.add_data_validation(dv)
    dv.add("B5")
    put(A, 6, 1, "رقم السيناريو")
    put(A, 6, 2, "=MATCH(B5,C4:E4,0)")
    name(wb, "ScenIdx", "'الافتراضات'!$B$6")
    scen = [
        (
            "Util",
            "نسبة إشغال المقاعد المتاحة",
            (0.10, 0.18, 0.30),
            PCT,
            "نسبة المقاعد المباعة من السعة النظرية — ليست السعة القصوى",
        ),
        ("MktMonthly", "تسويق شهري مستمر", (8000, 12000, 18000), SAR, "من خطة التسويق"),
        ("CorpEvents", "فعاليات شركات شهريًا", (1, 2, 4), SAR0, "تبدأ من الشهر 2"),
        (
            "RentalDays",
            "أيام تأجير/نشر ألعاب شهريًا",
            (0, 1, 3),
            SAR0,
            "تبدأ من الشهر 3",
        ),
        ("Sponsor", "رعاية شهرية", (0, 0, 5000), SAR, "تبدأ من الشهر 4 — غير مضمونة"),
        (
            "LaunchCampaign",
            "حملة الإطلاق (مرة واحدة)",
            LAUNCH_CAMPAIGN,
            SAR,
            "من خطة التسويق",
        ),
    ]
    r = 7
    for nm, label, vals, fmt, note in scen:
        put(A, r, 1, label)
        put(A, r, 2, f"=INDEX(C{r}:E{r},ScenIdx)", fmt=fmt, bold=True)
        for j, v in enumerate(vals):
            put(A, r, 3 + j, v, fmt=fmt, inp=True)
        put(A, r, 6, "%" if fmt == PCT else "ر.س/عدد")
        put(A, r, 7, note, wrap=True)
        name(wb, nm, f"'الافتراضات'!$B${r}")
        r += 1
    for j, s in enumerate(("متحفظ", "أساسي", "نمو")):
        A.cell(row=4, column=3 + j, value=s)
    r += 1
    fixed = [
        (
            "Days",
            "أيام التشغيل شهريًا",
            26,
            SAR0,
            "يوم",
            "إغلاق يوم واحد أسبوعيًا تقريبًا",
        ),
        (
            "Hours",
            "ساعات التشغيل يوميًا (متوسط)",
            7,
            SAR0,
            "ساعة",
            "أيام الأسبوع 6 س، نهاية الأسبوع 9 س",
        ),
        (
            "Realization",
            "نسبة السعر المحقق بعد الباقات والخصومات",
            0.85,
            PCT,
            "%",
            "افتراض",
        ),
        (
            "VAT",
            "ضريبة القيمة المضافة (الأسعار المعلنة شاملة)",
            0.15,
            PCT,
            "%",
            "النظام السعودي 15%",
        ),
        (
            "FeeRate",
            "رسوم الدفع الإلكتروني",
            0.025,
            PCT1,
            "%",
            "تقدير لمدى (مدى/بطاقات)",
        ),
        ("Cons", "مستهلكات لكل لاعب", 1.5, SAR, "ر.س", "مناديل، أقلام، أظرف"),
        (
            "VenueModel",
            "نموذج المكان",
            "شراكة",
            None,
            "شراكة/إيجار",
            "الشراكة = نسبة من الإيراد بدل إيجار ثابت (أقل رأس مال)",
        ),
        (
            "RevShare",
            "نسبة الشريك من صافي إيراد التذاكر (نموذج الشراكة)",
            0.25,
            PCT,
            "%",
            "افتراض تفاوضي",
        ),
        (
            "Rent",
            "إيجار شهري (نموذج الإيجار) ~200 م²",
            15000,
            SAR,
            "ر.س",
            "تقدير تجاري؛ المستودعات 150–210 ر.س/م²/سنة (قوائم عقار) أقل لكنها تحتاج تجهيز",
        ),
        ("UtilLease", "كهرباء وماء (الإيجار فقط)", 1500, SAR, "ر.س", "تقدير"),
        (
            "RateOp",
            "تكلفة المشغل بالساعة (محمّلة)",
            40,
            SAR,
            "ر.س/س",
            "دوام جزئي — تقدير",
        ),
        ("RateAsst", "تكلفة المساعد بالساعة", 30, SAR, "ر.س/س", "تقدير"),
        (
            "AsstShare",
            "حصة المساعد لكل لعبة (يخدم لعبتين)",
            0.5,
            PCT,
            "%",
            "مشاركة المساعدين",
        ),
        (
            "OpsMgr",
            "مدير عمليات (دوام كامل)",
            9000,
            SAR,
            "ر.س/شهر",
            "تقدير يشمل التأمينات",
        ),
        ("CS", "خدمة عملاء/حجوزات (دوام جزئي)", 4000, SAR, "ر.س/شهر", "تقدير"),
        ("Insurance", "تأمين مسؤولية", 600, SAR, "ر.س/شهر", "تقدير — يحتاج عرض سعر"),
        ("Admin", "إدارية وبرامج (حجز، محاسبة)", 1500, SAR, "ر.س/شهر", "تقدير"),
        ("Cleaning", "نظافة", 1200, SAR, "ر.س/شهر", "تقدير"),
        ("Storage", "تخزين ونقل", 1000, SAR, "ر.س/شهر", "تقدير"),
        (
            "MaintPct",
            "صيانة واستبدال شهريًا (% من تكلفة الألعاب)",
            0.02,
            PCT1,
            "%",
            "تقدير",
        ),
        ("Contingency", "احتياطي تشغيلي", 0.05, PCT, "%", "على المصروفات"),
        (
            "CorpPrice",
            "متوسط سعر فعالية شركة (3 ساعات حتى 40 شخص)",
            9000,
            SAR,
            "ر.س",
            "انظر التسعير",
        ),
        (
            "CorpCostPct",
            "تكلفة مباشرة لفعالية الشركة",
            0.35,
            PCT,
            "%",
            "طاقم إضافي ونقل",
        ),
        ("RentalPrice", "سعر يوم تأجير لعبة مع مشغل", 3500, SAR, "ر.س", "انظر التسعير"),
        ("RentalCostPct", "تكلفة مباشرة للتأجير", 0.40, PCT, "%", "نقل وطاقم"),
        (
            "StartCap",
            "رأس المال المبدئي المتاح",
            150000,
            SAR,
            "ر.س",
            "مدخل يحدده المؤسس",
        ),
    ]
    for nm, label, val, fmt, unit, note in fixed:
        put(A, r, 1, label)
        put(A, r, 2, val, fmt=fmt, inp=True, bold=True)
        put(A, r, 6, unit)
        put(A, r, 7, note, wrap=True)
        name(wb, nm, f"'الافتراضات'!$B${r}")
        if nm == "VenueModel":
            dv2 = DataValidation(type="list", formula1='"شراكة,إيجار"')
            A.add_data_validation(dv2)
            dv2.add(f"B{r}")
        r += 1
    widths(A, [46, 16, 12, 12, 12, 12, 60])

    # ------------------------------------------------------------ Costs
    C = sheet(wb, "تكاليف_الألعاب")
    title(
        C,
        "تكاليف الإنتاج والبنية المشتركة وما قبل التشغيل",
        "A تكلفة اللعبة | B البنية المشتركة | F مرة واحدة تُعاد الاستفادة منها — كل الأسعار تقديرية ما لم تُوثق في ملف المشتريات",
        12,
    )
    cats = [
        "fab",
        "mat",
        "props",
        "print",
        "elec",
        "light",
        "audio",
        "store",
        "tools",
        "safety",
        "install",
        "spare",
    ]
    from common import CATS

    header(
        C,
        4,
        ["اللعبة"]
        + [CATS[k] for k in cats]
        + [
            "المجموع",
            "احتياطي 10%",
            "البناء الموصى",
            "نموذج MVP",
            "ترقية مميزة (اختيارية)",
        ],
    )
    for i, g in enumerate(GAMES):
        row = 5 + i
        put(C, row, 1, f"{g['id']} {g['ar']}", bold=True)
        for j, k in enumerate(cats):
            put(
                C,
                row,
                2 + j,
                round(sum(r_[3] * r_[4] for r_ in g["bom"] if r_[0] == k), 2),
                fmt=SAR0,
            )
        put(C, row, 14, f"=SUM(B{row}:M{row})", fmt=SAR0)
        put(C, row, 15, f"=N{row}*{CONTINGENCY}", fmt=SAR0)
        put(C, row, 16, f"=N{row}+O{row}", fmt=SAR0, bold=True)
        put(C, row, 17, mvp(g), fmt=SAR0)
        put(C, row, 18, sum(p[1] for p in g["premium"]), fmt=SAR0)
    put(C, 15, 1, "فحص الميزانية: أعلى بناء موصى ≤ 7,000؟", bold=True)
    put(C, 15, 16, '=IF(MAX(P5:P14)<=7000,"نعم ✔","لا — أعد التصميم")', bold=True)
    r0 = 18
    put(
        C,
        r0,
        1,
        "B — البنية التشغيلية المشتركة (تُشترى مرة واحدة لكل الألعاب)",
        bold=True,
    )
    header(C, r0 + 1, ["البند", "English", "الكمية", "سعر الوحدة", "التكلفة", "الغرض"])
    for i, (ar, en, q, u, why) in enumerate(SHARED_INFRA):
        rr = r0 + 2 + i
        put(C, rr, 1, ar, wrap=True)
        put(C, rr, 2, en)
        put(C, rr, 3, q, inp=True)
        put(C, rr, 4, u, fmt=SAR0, inp=True)
        put(C, rr, 5, f"=C{rr}*D{rr}", fmt=SAR0)
        put(C, rr, 6, why, wrap=True)
    end = r0 + 1 + len(SHARED_INFRA)
    put(C, end + 1, 1, "إجمالي البنية المشتركة", bold=True)
    put(C, end + 1, 5, f"=SUM(E{r0 + 2}:E{end})", fmt=SAR0, bold=True)
    name(wb, "SharedInfra", f"'تكاليف_الألعاب'!$E${end + 1}")
    p0 = end + 4
    put(C, p0, 1, "F/D — تكاليف ما قبل التشغيل (مرة واحدة)", bold=True)
    header(C, p0 + 1, ["البند", "", "", "", "التكلفة"])
    for i, (ar, v) in enumerate(PREOPENING):
        rr = p0 + 2 + i
        put(C, rr, 1, ar, wrap=True)
        put(C, rr, 5, v, fmt=SAR0, inp=True)
    rr = p0 + 2 + len(PREOPENING)
    put(C, rr, 1, "حملة الإطلاق (حسب السيناريو)", wrap=True)
    put(C, rr, 5, "=LaunchCampaign", fmt=SAR0)
    put(C, rr + 1, 1, "إجمالي ما قبل التشغيل", bold=True)
    put(C, rr + 1, 5, f"=SUM(E{p0 + 2}:E{rr})", fmt=SAR0, bold=True)
    name(wb, "Preopening", f"'تكاليف_الألعاب'!$E${rr + 1}")
    k0 = rr + 4
    put(C, k0, 1, "تصنيف التكاليف (A–F)", bold=True)
    header(C, k0 + 1, ["الفئة", "يشمل", "أين في النموذج"])
    classes = [
        (
            "A تكلفة اللعبة",
            "تصنيع، مكونات، طباعة، صناديق، سلامة، تركيب واختبار، احتياطي",
            "هذه الورقة الصفوف 5–14",
        ),
        (
            "B بنية مشتركة",
            "صوت، شاشات، إضاءة، تسجيل، أعمدة، خلفية تصوير",
            "هذه الورقة — البنية المشتركة",
        ),
        ("C المكان", "إيجار أو حصة شريك، كهرباء، نظافة", "الافتراضات + التدفق الشهري"),
        (
            "D مصاريف الشركة",
            "مدير عمليات، خدمة عملاء، إدارة، تأمين، تسويق",
            "التدفق الشهري",
        ),
        (
            "E تكاليف الفعاليات",
            "طاقم ونقل إضافي لكل فعالية شركة/تأجير",
            "نسب التكلفة المباشرة في الافتراضات",
        ),
        (
            "F مرة واحدة ويعاد استخدامها",
            "تراخيص، نماذج أولية، تدريب، تجهيز موقع، حملة إطلاق",
            "ما قبل التشغيل",
        ),
    ]
    for i, cl in enumerate(classes):
        for j, v in enumerate(cl):
            put(C, k0 + 2 + i, 1 + j, v, wrap=True)
    widths(C, [44, 14, 10, 12, 12, 12, 10, 10, 10, 10, 12, 10, 12, 12, 14, 12, 14])

    # ------------------------------------------------------------ Games
    G = sheet(wb, "الألعاب")
    title(
        G,
        "اختيار الألعاب والسعة والإيراد الشهري (يحسب حسب السيناريو)",
        "اكتب 1 في عمود «مختارة» للألعاب التي ستُصنّع. السعة الفعلية = السعة النظرية × الإشغال × عامل الطلب (من تقييم اللعبة).",
        26,
    )
    cols = [
        "الرمز",
        "اللعبة",
        "مختارة (1/0)",
        "تكلفة البناء",
        "MVP",
        "لاعبون/جلسة",
        "سعر التذكرة",
        "مدة الخانة (د)",
        "مشغلون",
        "مساعدون",
        "المساحة م²",
        "إعادة الضبط (د)",
        "التقييم /100",
        "عامل الطلب",
        "جلسات/يوم",
        "سعة المقاعد/شهر",
        "لاعبون متوقعون/شهر",
        "إيراد إجمالي/شهر",
        "صافي بدون ضريبة",
        "تكلفة الطاقم/شهر",
        "تكاليف متغيرة",
        "هامش المساهمة",
        "هامش %",
        "صيانة/شهر",
        "سعة معدلة بالطلب",
        "إيراد عند إشغال 100%",
    ]
    header(G, 4, cols)
    for i, g in enumerate(GAMES):
        r_ = 5 + i
        put(G, r_, 1, g["id"], bold=True)
        put(G, r_, 2, g["ar"])
        put(G, r_, 3, 1 if g["id"] in DEFAULT_SELECTED else 0, inp=True, bold=True)
        put(G, r_, 4, f"='تكاليف_الألعاب'!P{r_}", fmt=SAR0)
        put(G, r_, 5, f"='تكاليف_الألعاب'!Q{r_}", fmt=SAR0)
        put(G, r_, 6, g["practical_players"], inp=True)
        put(G, r_, 7, g["price"], fmt=SAR0, inp=True)
        put(G, r_, 8, g["slot"], inp=True)
        put(G, r_, 9, g["staffing"]["operators"], inp=True)
        put(G, r_, 10, g["staffing"]["assistants"], inp=True)
        put(G, r_, 11, round(g["layout"]["w"] * g["layout"]["d"], 1))
        put(G, r_, 12, g["reset"]["time"])
        put(G, r_, 13, sum(g["scores"].values()))
        put(G, r_, 14, f"=ROUND(M{r_}/80,2)", fmt="0.00")
        put(G, r_, 15, f"=FLOOR(Hours*60/H{r_},1)")
        put(G, r_, 16, f"=O{r_}*F{r_}*Days", fmt=SAR0)
        put(G, r_, 17, f"=ROUND(P{r_}*Util*N{r_},0)", fmt=SAR0)
        put(G, r_, 18, f"=Q{r_}*G{r_}*Realization", fmt=SAR0)
        put(G, r_, 19, f"=R{r_}/(1+VAT)", fmt=SAR0)
        put(G, r_, 20, f"=(I{r_}*RateOp+J{r_}*RateAsst*AsstShare)*Hours*Days", fmt=SAR0)
        put(
            G,
            r_,
            21,
            f'=Q{r_}*Cons+R{r_}*FeeRate+IF(VenueModel="شراكة",S{r_}*RevShare,0)',
            fmt=SAR0,
        )
        put(G, r_, 22, f"=S{r_}-T{r_}-U{r_}", fmt=SAR0, bold=True)
        put(G, r_, 23, f"=IF(S{r_}=0,0,V{r_}/S{r_})", fmt=PCT)
        put(G, r_, 24, f"=D{r_}*MaintPct", fmt=SAR0)
        put(G, r_, 25, f"=P{r_}*N{r_}", fmt=SAR0)
        put(G, r_, 26, f"=Y{r_}*G{r_}*Realization", fmt=SAR0)
    put(G, 15, 2, "إجمالي المختارة", bold=True)
    put(G, 15, 3, "=SUM(C5:C14)", bold=True)
    for col in range(4, 27):
        L = G.cell(row=4, column=col).column_letter
        if col in (14, 23):
            continue
        put(G, 15, col, f"=SUMPRODUCT($C$5:$C$14,{L}5:{L}14)", fmt=SAR0, bold=True)
    put(G, 15, 23, "=IF(S15=0,0,V15/S15)", fmt=PCT, bold=True)
    for nm, col in (
        ("SelCapex", "D"),
        ("SelPlayers", "Q"),
        ("SelGross", "R"),
        ("SelNet", "S"),
        ("SelStaff", "T"),
        ("SelVar", "U"),
        ("SelContrib", "V"),
        ("SelMaint", "X"),
        ("SelCap", "P"),
        ("SelDemandCap", "Y"),
        ("SelFullRev", "Z"),
        ("SelArea", "K"),
        ("SelOps", "I"),
        ("SelAsst", "J"),
    ):
        name(wb, nm, f"'الألعاب'!${col}$15")
    widths(
        G,
        [
            7,
            14,
            9,
            11,
            9,
            9,
            9,
            9,
            8,
            8,
            9,
            9,
            9,
            9,
            9,
            11,
            11,
            12,
            12,
            12,
            11,
            12,
            8,
            10,
            11,
            12,
        ],
    )
    G.freeze_panes = "C5"

    # ------------------------------------------------------------ Pricing
    P = sheet(wb, "التسعير")
    title(
        P,
        "التسعير: الأرضية والموصى والمميز",
        "الأرضية = أقل سعر يغطي التكلفة المتغيرة وتكلفة الطاقم عند إشغال الجلسة المتوقع. مقارنة السوق: غرف الهروب بجدة 91–200 ر.س للشخص (مصادر في ورقة المراجع).",
        9,
    )
    header(
        P,
        4,
        [
            "اللعبة",
            "لاعبون متوقعون/جلسة",
            "تكلفة طاقم/جلسة",
            "متغير/لاعب (تقريبي)",
            "سعر أرضية (شامل الضريبة)",
            "سعر موصى",
            "سعر مميز (جلسة خاصة/ذروة)",
            "منطق",
        ],
    )
    for i, g in enumerate(GAMES):
        r_ = 5 + i
        gr = "'الألعاب'!"
        put(P, r_, 1, f"{g['id']} {g['ar']}")
        put(P, r_, 2, f"=MAX(1,{gr}F{r_}*Util*{gr}N{r_})", fmt="0.0")
        put(P, r_, 3, f"={gr}T{r_}/({gr}O{r_}*Days)", fmt=SAR0)
        put(P, r_, 4, f"=Cons+{gr}G{r_}*FeeRate", fmt=SAR0)
        put(
            P,
            r_,
            5,
            f'=ROUNDUP((C{r_}/B{r_}+D{r_})*(1+VAT)/(Realization*(1-IF(VenueModel="شراكة",RevShare,0))),0)',
            fmt=SAR0,
        )
        put(P, r_, 6, f"={gr}G{r_}", fmt=SAR0, bold=True)
        put(P, r_, 7, f"=ROUND({gr}G{r_}*1.3,-1)-1", fmt=SAR0)
        put(
            P,
            r_,
            8,
            "الموصى بين أرضية التكلفة وسعر غرف الهروب؛ لعبة الجلسة أقصر من غرفة الهروب (30–40 د)",
            wrap=True,
        )
    b0 = 17
    put(P, b0, 1, "باقات ومنتجات", bold=True)
    header(
        P, b0 + 1, ["المنتج", "السعر الموصى", "الأرضية", "المميز", "الوحدة", "ملاحظات"]
    )
    pk = [
        ("تذكرة لعبة واحدة (فرد)", 69, 49, 89, "للشخص", "أيام الأسبوع/نهاية الأسبوع"),
        (
            "ليلة USER-X — 3 ألعاب (~2 ساعة)",
            159,
            129,
            189,
            "للشخص",
            "الباقة الأساسية للمجموعات",
        ),
        ("مجموعة 8–12 (لعبة واحدة)", 590, 450, 790, "للمجموعة", "حجز حصري للجلسة"),
        ("جلسة خاصة (لعبتين، حتى 14)", 1490, 1190, 1890, "للمجموعة", "عيد ميلاد/شلة"),
        (
            "فعالية شركة (3 ساعات، 3 ألعاب، حتى 40)",
            9000,
            6500,
            14000,
            "للفعالية",
            "مع ملخص فريق وتقرير صور",
        ),
        (
            "نشر لعبة في فعالية (يوم + مشغل)",
            3500,
            2500,
            5000,
            "لليوم/لعبة",
            "داخل جدة؛ النقل خارج جدة إضافي",
        ),
        (
            "باقة موسمية (رمضان/المواسم) لكل ليلة",
            179,
            149,
            219,
            "للشخص",
            "تتضمن ضيافة خفيفة عبر الشريك",
        ),
    ]
    for i, row in enumerate(pk):
        for j, v in enumerate(row):
            put(
                P,
                b0 + 2 + i,
                1 + j,
                v,
                fmt=SAR0 if isinstance(v, int) else None,
                inp=isinstance(v, int),
                wrap=True,
            )
    widths(P, [40, 14, 14, 14, 16, 12, 18, 50])

    # ------------------------------------------------------------ Unit economics
    U = sheet(wb, "اقتصاديات_الوحدة")
    title(
        U,
        "اقتصاديات الوحدة لكل لعبة (السيناريو الحالي)",
        "صافي = بدون ضريبة القيمة المضافة. تكلفة الطاقم محمّلة على ساعات التشغيل.",
        13,
    )
    header(
        U,
        4,
        [
            "اللعبة",
            "صافي إيراد/لاعب",
            "لاعبون/جلسة",
            "إيراد/جلسة",
            "إيراد/يوم",
            "إيراد/شهر",
            "تكلفة مباشرة/جلسة",
            "تكلفة/لاعب",
            "مساهمة/جلسة",
            "هامش المساهمة %",
            "مساهمة/شهر",
            "لاعبو التعادل/جلسة",
            "يغطي الطاقم؟",
        ],
    )
    for i, g in enumerate(GAMES):
        r_ = 5 + i
        gr = "'الألعاب'!"
        put(U, r_, 1, f"{g['id']} {g['ar']}")
        put(U, r_, 2, f"={gr}G{r_}*Realization/(1+VAT)", fmt=SAR0)
        put(U, r_, 3, f"={gr}F{r_}*Util*{gr}N{r_}", fmt="0.0")
        put(U, r_, 4, f"=B{r_}*C{r_}", fmt=SAR0)
        put(U, r_, 5, f"=D{r_}*{gr}O{r_}", fmt=SAR0)
        put(U, r_, 6, f"={gr}S{r_}", fmt=SAR0)
        put(U, r_, 7, f"=({gr}T{r_}+{gr}U{r_})/({gr}O{r_}*Days)", fmt=SAR0)
        put(U, r_, 8, f"=IF(C{r_}=0,0,G{r_}/C{r_})", fmt=SAR0)
        put(U, r_, 9, f"=D{r_}-G{r_}", fmt=SAR0)
        put(U, r_, 10, f"=IF(D{r_}=0,0,I{r_}/D{r_})", fmt=PCT)
        put(U, r_, 11, f"={gr}V{r_}", fmt=SAR0, bold=True)
        put(
            U,
            r_,
            12,
            f'=({gr}T{r_}/({gr}O{r_}*Days))/(B{r_}-Cons-{gr}G{r_}*FeeRate-IF(VenueModel="شراكة",B{r_}*RevShare,0))',
            fmt="0.0",
        )
        put(U, r_, 13, f'=IF(C{r_}>=L{r_},"نعم","لا")', bold=True)
    widths(U, [18, 12, 11, 12, 12, 13, 13, 11, 12, 12, 13, 13, 11])

    # ------------------------------------------------------------ Monthly / cash flow
    M = sheet(wb, "التدفق_الشهري")
    title(
        M,
        "التوقعات الشهرية والتدفق النقدي — 24 شهرًا (السيناريو المختار)",
        "الشهر 1 يتضمن الاستثمار الأولي. منحنى النمو مدخل قابل للتعديل.",
        23,
    )
    mc = [
        "الشهر",
        "منحنى النمو",
        "إيراد التذاكر (صافي)",
        "إيراد الشركات",
        "إيراد التأجير",
        "الرعاية",
        "إجمالي الإيراد",
        "تكاليف متغيرة",
        "الطاقم",
        "المكان الثابت",
        "فريق ثابت",
        "تسويق",
        "مصاريف أخرى",
        "احتياطي",
        "إجمالي المصروفات",
        "EBITDA",
        "استثمار لمرة واحدة",
        "صافي التدفق",
        "النقد المتوفر",
        "تراكمي التدفق",
        "مساعد: أول شهر ربح",
        "مساعد: الاسترداد",
        "لاعبون",
    ]
    header(M, 4, mc)
    ramp = [0.45, 0.6, 0.72, 0.82, 0.9, 0.95] + [1.0] * 18
    for i in range(24):
        r_ = 5 + i
        mth = i + 1
        put(M, r_, 1, mth)
        put(M, r_, 2, ramp[i], fmt=PCT, inp=True)
        put(M, r_, 3, f"=SelNet*B{r_}", fmt=SAR0)
        put(M, r_, 4, f"=IF(A{r_}>=2,CorpEvents,0)*CorpPrice/(1+VAT)", fmt=SAR0)
        put(M, r_, 5, f"=IF(A{r_}>=3,RentalDays,0)*RentalPrice/(1+VAT)", fmt=SAR0)
        put(M, r_, 6, f"=IF(A{r_}>=4,Sponsor,0)", fmt=SAR0)
        put(M, r_, 7, f"=SUM(C{r_}:F{r_})", fmt=SAR0, bold=True)
        put(M, r_, 8, f"=SelVar*B{r_}+D{r_}*CorpCostPct+E{r_}*RentalCostPct", fmt=SAR0)
        put(M, r_, 9, "=SelStaff", fmt=SAR0)
        put(M, r_, 10, '=IF(VenueModel="إيجار",Rent+UtilLease,0)', fmt=SAR0)
        put(M, r_, 11, "=OpsMgr+CS", fmt=SAR0)
        put(M, r_, 12, "=MktMonthly", fmt=SAR0)
        put(M, r_, 13, "=Insurance+Admin+Cleaning+Storage+SelMaint", fmt=SAR0)
        put(M, r_, 14, f"=SUM(H{r_}:M{r_})*Contingency", fmt=SAR0)
        put(M, r_, 15, f"=SUM(H{r_}:N{r_})", fmt=SAR0, bold=True)
        put(M, r_, 16, f"=G{r_}-O{r_}", fmt=SAR0, bold=True)
        put(M, r_, 17, "=SelCapex+SharedInfra+Preopening" if mth == 1 else 0, fmt=SAR0)
        put(M, r_, 18, f"=P{r_}-Q{r_}", fmt=SAR0)
        put(M, r_, 19, f"=StartCap+T{r_}", fmt=SAR0, bold=True)
        put(M, r_, 20, f"=R{r_}" if mth == 1 else f"=T{r_ - 1}+R{r_}", fmt=SAR0)
        put(M, r_, 21, f"=IF(P{r_}>0,A{r_},999)")
        put(M, r_, 22, f"=IF(T{r_}>=0,A{r_},999)")
        put(M, r_, 23, f"=SelPlayers*B{r_}", fmt=SAR0)
    s0 = 31
    summ = [
        ("إيراد السنة 1", "=SUM(G5:G16)", SAR),
        ("إيراد السنة 2", "=SUM(G17:G28)", SAR),
        ("EBITDA السنة 1", "=SUM(P5:P16)", SAR),
        ("EBITDA السنة 2", "=SUM(P17:P28)", SAR),
        ("لاعبون السنة 1", "=SUM(W5:W16)", SAR0),
        ("متوسط الإيراد الشهري (السنة 1)", "=AVERAGE(G5:G16)", SAR),
        (
            "أول شهر بـ EBITDA موجب",
            '=IF(MIN(U5:U28)=999,"لم يتحقق خلال 24 شهرًا",MIN(U5:U28))',
            None,
        ),
        (
            "شهر استرداد الاستثمار (التراكمي ≥ 0)",
            '=IF(MIN(V5:V28)=999,"لم يتحقق خلال 24 شهرًا",MIN(V5:V28))',
            None,
        ),
        ("أقل رصيد نقدي خلال الفترة", "=MIN(S5:S28)", SAR),
        ("رأس المال المطلوب (أكبر عجز تراكمي)", "=MAX(0,-MIN(T5:T28))", SAR),
        ("الاستثمار الأولي", "=Q5", SAR),
        (
            "مدة التشغيل الممكنة بالحرق الحالي (شهر)",
            '=IF(P5>=0,"لا يوجد حرق",ROUND(S5/-P5,1))',
            None,
        ),
        (
            "حجوزات المجموعات المتوقعة/شهر (متوسط 8 لاعبين)",
            "=ROUND(AVERAGE(W5:W16)*0.55/8,0)",
            SAR0,
        ),
        ("فعاليات شركات (السنة 1)", "=CorpEvents*11", SAR0),
        ("أيام تأجير (السنة 1)", "=RentalDays*10", SAR0),
    ]
    put(M, s0 - 1, 1, "الخلاصة", bold=True)
    for i, (lab, f, fmt) in enumerate(summ):
        put(M, s0 + i, 1, lab, bold=True)
        M.merge_cells(start_row=s0 + i, start_column=1, end_row=s0 + i, end_column=3)
        put(M, s0 + i, 4, f, fmt=fmt, bold=True)
        M.merge_cells(start_row=s0 + i, start_column=4, end_row=s0 + i, end_column=5)
    for nm, i in (
        ("Y1Rev", 0),
        ("Y2Rev", 1),
        ("Y1EBITDA", 2),
        ("Y2EBITDA", 3),
        ("BEMonth", 6),
        ("PaybackMonth", 7),
        ("CapReq", 9),
        ("InitInvest", 10),
    ):
        name(wb, nm, f"'التدفق_الشهري'!$D${s0 + i}")
    widths(M, [7, 9] + [12] * 21)
    M.freeze_panes = "B5"
    ch = LineChart()
    ch.title = "الإيراد مقابل المصروفات وEBITDA"
    ch.height, ch.width = 8, 22
    for col in (7, 15, 16):
        ch.add_data(
            Reference(M, min_col=col, min_row=4, max_row=28), titles_from_data=True
        )
    ch.set_categories(Reference(M, min_col=1, min_row=5, max_row=28))
    M.add_chart(ch, "G31")
    ch2 = LineChart()
    ch2.title = "النقد المتوفر"
    ch2.height, ch2.width = 8, 22
    ch2.add_data(Reference(M, min_col=19, min_row=4, max_row=28), titles_from_data=True)
    ch2.set_categories(Reference(M, min_col=1, min_row=5, max_row=28))
    M.add_chart(ch2, "G48")

    # ------------------------------------------------------------ Break-even
    B = sheet(wb, "التعادل")
    title(
        B,
        "نقطة التعادل (التشغيل المستقر — الشهر 7+)",
        "التكاليف الثابتة تشمل الطاقم لأنهم يُدفعون طوال ساعات التشغيل.",
        4,
    )
    be = [
        (
            "التكاليف الثابتة الشهرية (طاقم + مكان + فريق + تسويق + أخرى)",
            "='التدفق_الشهري'!I11+'التدفق_الشهري'!J11+'التدفق_الشهري'!K11+'التدفق_الشهري'!L11+'التدفق_الشهري'!M11",
            SAR,
        ),
        ("مع الاحتياطي", "=B5*(1+Contingency)", SAR),
        (
            "مساهمة الإيرادات الأخرى (شركات/تأجير/رعاية) شهريًا",
            "=CorpEvents*CorpPrice/(1+VAT)*(1-CorpCostPct)+RentalDays*RentalPrice/(1+VAT)*(1-RentalCostPct)+Sponsor",
            SAR,
        ),
        (
            "صافي إيراد اللاعب (متوسط مرجح)",
            "=IF(SelPlayers=0,0,SelNet/SelPlayers)",
            SAR,
        ),
        ("تكلفة متغيرة لكل لاعب", "=IF(SelPlayers=0,0,SelVar/SelPlayers)", SAR),
        ("مساهمة كل لاعب", "=B8-B9", SAR),
        (
            "لاعبو التعادل شهريًا",
            '=IF(B10<=0,"غير ممكن",ROUNDUP(MAX(0,B6-B7)/B10,0))',
            SAR0,
        ),
        ("لاعبو التعادل يوميًا", "=IF(ISNUMBER(B11),ROUNDUP(B11/Days,0),B11)", SAR0),
        (
            "متوسط لاعبين لكل جلسة (المختارة)",
            "=IF(SUMPRODUCT('الألعاب'!C5:C14,'الألعاب'!O5:O14)=0,0,SUMPRODUCT('الألعاب'!C5:C14,'الألعاب'!O5:O14,'الألعاب'!F5:F14)/SUMPRODUCT('الألعاب'!C5:C14,'الألعاب'!O5:O14))",
            "0.0",
        ),
        (
            "جلسات التعادل يوميًا (عند امتلاء الجلسة)",
            "=IF(ISNUMBER(B12),ROUNDUP(B12/B13,0),B12)",
            SAR0,
        ),
        ("إيراد التعادل يوميًا (صافي)", "=IF(ISNUMBER(B12),B12*B8,B12)", SAR),
        ("إيراد التعادل شهريًا (صافي)", "=IF(ISNUMBER(B11),B11*B8+B7,B11)", SAR),
        ("الإشغال المطلوب للتعادل", "=IF(ISNUMBER(B11),B11/SelCap,B11)", PCT),
        ("الإشغال المفترض في السيناريو", "=SelPlayers/SelCap", PCT),
        ("هامش المساهمة %", "=IF(B8=0,0,B10/B8)", PCT),
        ("زمن التعادل (أول شهر EBITDA موجب)", "=BEMonth", None),
        ("زمن استرداد الاستثمار", "=PaybackMonth", None),
    ]
    header(B, 4, ["المؤشر", "القيمة"])
    for i, (lab, f, fmt) in enumerate(be):
        put(B, 5 + i, 1, lab, wrap=True)
        put(B, 5 + i, 2, f, fmt=fmt, bold=True)
    widths(B, [60, 20])

    # ------------------------------------------------------------ Scenarios
    S = sheet(wb, "السيناريوهات")
    title(
        S,
        "مقارنة السيناريوهات — شهر تشغيل مستقر للألعاب المختارة",
        "يحسب كل سيناريو بقيمه الخاصة بغض النظر عن السيناريو المختار في الافتراضات.",
        5,
    )
    header(S, 4, ["البند", "متحفظ", "أساسي", "نمو"])
    rows_s = [
        ("الإشغال", "='الافتراضات'!{c}7", PCT),
        ("لاعبون/شهر", "={c}5*SelDemandCap", SAR0),
        ("صافي التذاكر", "={c}5*SelFullRev/(1+VAT)", SAR),
        ("إيراد الشركات", "='الافتراضات'!{c}9*CorpPrice/(1+VAT)", SAR),
        ("إيراد التأجير", "='الافتراضات'!{c}10*RentalPrice/(1+VAT)", SAR),
        ("رعاية", "='الافتراضات'!{c}11", SAR),
        ("إجمالي الإيراد/شهر", "=SUM({c}7:{c}10)", SAR),
        (
            "تكاليف متغيرة",
            '={c}6*Cons+{c}7*(1+VAT)*FeeRate+IF(VenueModel="شراكة",{c}7*RevShare,0)+{c}8*CorpCostPct+{c}9*RentalCostPct',
            SAR,
        ),
        ("طاقم", "=SelStaff", SAR),
        (
            "ثابت (مكان+فريق+أخرى)",
            '=IF(VenueModel="إيجار",Rent+UtilLease,0)+OpsMgr+CS+Insurance+Admin+Cleaning+Storage+SelMaint',
            SAR,
        ),
        ("تسويق", "='الافتراضات'!{c}8", SAR),
        ("احتياطي", "=SUM({c}12:{c}15)*Contingency", SAR),
        ("EBITDA شهري", "={c}11-SUM({c}12:{c}16)", SAR),
        ("EBITDA سنوي (×12 مستقر)", "={c}17*12", SAR),
        ("إيراد سنوي (×12 مستقر)", "={c}11*12", SAR),
        (
            "أشهر الاسترداد (الاستثمار ÷ EBITDA)",
            "=IF({c}17<=0,\"لا يسترد\",ROUND((SelCapex+SharedInfra+Preopening-LaunchCampaign+'الافتراضات'!{c}12)/{c}17,1))",
            None,
        ),
    ]
    for i, (lab, f, fmt) in enumerate(rows_s):
        put(S, 5 + i, 1, lab, bold=lab.startswith("EBITDA") or lab.startswith("إجمالي"))
        for j, col in enumerate(("C", "D", "E")):
            put(
                S,
                5 + i,
                2 + j,
                f.format(c="BCD"[j])
                if "{c}5" in f
                or "{c}7" in f
                or "{c}6" in f
                or "{c}11" in f
                or "{c}12" in f
                or "{c}17" in f
                else f.format(c=col),
                fmt=fmt,
            )
    # fix: rows referencing assumptions must use assumption columns C/D/E; rows referencing this sheet use B/C/D
    for i, (lab, f, fmt) in enumerate(rows_s):
        for j in range(3):
            if "'الافتراضات'!{c}" in f and "{c}5" not in f and "{c}17" not in f:
                S.cell(row=5 + i, column=2 + j).value = f.format(c="CDE"[j])
            elif "'الافتراضات'!{c}" in f:
                S.cell(row=5 + i, column=2 + j).value = f.replace(
                    "'الافتراضات'!{c}", "'الافتراضات'!" + "CDE"[j]
                ).format(c="BCD"[j])
            else:
                S.cell(row=5 + i, column=2 + j).value = f.format(c="BCD"[j])
    widths(S, [40, 16, 16, 16])
    bc = BarChart()
    bc.title = "EBITDA الشهري حسب السيناريو"
    bc.add_data(
        Reference(S, min_col=2, max_col=4, min_row=17, max_row=17),
        from_rows=True,
        titles_from_data=False,
    )
    bc.set_categories(Reference(S, min_col=2, max_col=4, min_row=4))
    bc.height, bc.width = 7, 14
    S.add_chart(bc, "F4")

    # ------------------------------------------------------------ Portfolio
    PF = sheet(wb, "المحفظة")
    title(
        PF,
        "نماذج المحفظة: لعبة، لعبتان، ثلاث، خمس، عشر (السيناريو الحالي)",
        "علامات 1/0 قابلة للتعديل لكل تركيبة. المساحة = مجموع مساحات الألعاب × 1.3 + 40 م² استقبال وانتظار.",
        8,
    )
    combos = [
        ("1 لعبة", {"G06"}),
        ("2 لعبتان", {"G06", "G10"}),
        ("3 ألعاب (موصى)", {"G06", "G10", "G08"}),
        ("5 ألعاب", {"G06", "G10", "G08", "G04", "G02"}),
        ("10 ألعاب", {g["id"] for g in GAMES}),
    ]
    header(PF, 4, ["اللعبة"] + [c[0] for c in combos])
    for i, g in enumerate(GAMES):
        put(PF, 5 + i, 1, f"{g['id']} {g['ar']}")
        for j, (_, st) in enumerate(combos):
            put(PF, 5 + i, 2 + j, 1 if g["id"] in st else 0, inp=True)
    metrics = [
        ("تكلفة الألعاب", "=SUMPRODUCT({c}5:{c}14,'الألعاب'!$D$5:$D$14)", SAR),
        (
            "الاستثمار الأولي (ألعاب + مشترك + ما قبل التشغيل)",
            "={c}16+SharedInfra+Preopening",
            SAR,
        ),
        (
            "المساحة المطلوبة م²",
            "=ROUND(SUMPRODUCT({c}5:{c}14,'الألعاب'!$K$5:$K$14)*1.3+40,0)",
            SAR0,
        ),
        (
            "طاقم في الوردية (مشغلون + مساعدون + مضيف)",
            "=SUMPRODUCT({c}5:{c}14,'الألعاب'!$I$5:$I$14)+ROUNDUP(SUMPRODUCT({c}5:{c}14,'الألعاب'!$J$5:$J$14)*AsstShare,0)+1",
            SAR0,
        ),
        ("لاعبون/شهر", "=Util*SUMPRODUCT({c}5:{c}14,'الألعاب'!$Y$5:$Y$14)", SAR0),
        (
            "صافي التذاكر/شهر",
            "=Util*SUMPRODUCT({c}5:{c}14,'الألعاب'!$Z$5:$Z$14)/(1+VAT)",
            SAR,
        ),
        (
            "إيراد آخر/شهر",
            "=CorpEvents*CorpPrice/(1+VAT)+RentalDays*RentalPrice/(1+VAT)+Sponsor",
            SAR,
        ),
        ("طاقم/شهر", "=SUMPRODUCT({c}5:{c}14,'الألعاب'!$T$5:$T$14)", SAR),
        (
            "متغير/شهر",
            '={c}20*Cons+{c}21*(1+VAT)*FeeRate+IF(VenueModel="شراكة",{c}21*RevShare,0)+CorpEvents*CorpPrice/(1+VAT)*CorpCostPct+RentalDays*RentalPrice/(1+VAT)*RentalCostPct',
            SAR,
        ),
        (
            "ثابت/شهر",
            '=(IF(VenueModel="إيجار",Rent+UtilLease,0)+OpsMgr+CS+MktMonthly+Insurance+Admin+Cleaning+Storage+{c}16*MaintPct)',
            SAR,
        ),
        (
            "EBITDA شهري مستقر",
            "=({c}21+{c}22-{c}23-{c}24-{c}25)-({c}23+{c}24+{c}25)*Contingency",
            SAR,
        ),
        (
            "أشهر الاسترداد التقريبية",
            '=IF({c}26<=0,"لا يسترد",ROUND({c}17/{c}26,1))',
            None,
        ),
        (
            "تعقيد التشغيل (ألعاب × طاقم)",
            '=IF({c}19<=4,"منخفض",IF({c}19<=8,"متوسط","مرتفع"))',
            None,
        ),
    ]
    for i, (lab, f, fmt) in enumerate(metrics):
        put(PF, 16 + i, 1, lab, bold=True, wrap=True)
        for j in range(len(combos)):
            col = "BCDEF"[j]
            put(
                PF,
                16 + i,
                2 + j,
                f.format(c=col),
                fmt=fmt,
                bold=lab.startswith("EBITDA"),
            )
    widths(PF, [44, 14, 14, 16, 14, 14])

    # ------------------------------------------------------------ Sensitivity
    SN = sheet(wb, "الحساسية")
    title(
        SN,
        "تحليل الحساسية: EBITDA الشهري المستقر حسب السعر والإشغال (الألعاب المختارة)",
        "الصفوف: مضاعف السعر. الأعمدة: نسبة الإشغال. باقي الافتراضات من ورقة الافتراضات.",
        9,
    )
    utils = [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5]
    mults = [0.8, 0.9, 1.0, 1.1, 1.2]
    put(SN, 4, 1, "السعر × / الإشغال →", bold=True)
    for j, u in enumerate(utils):
        put(SN, 4, 2 + j, u, fmt=PCT, inp=True, bold=True)
    fixed_expr = '(SelStaff+IF(VenueModel="إيجار",Rent+UtilLease,0)+OpsMgr+CS+MktMonthly+Insurance+Admin+Cleaning+Storage+SelMaint)'
    other = "(CorpEvents*CorpPrice/(1+VAT)*(1-CorpCostPct)+RentalDays*RentalPrice/(1+VAT)*(1-RentalCostPct)+Sponsor)"
    for i, m in enumerate(mults):
        r_ = 5 + i
        put(SN, r_, 1, m, fmt='0.0"x"', inp=True, bold=True)
        for j in range(len(utils)):
            col = "BCDEFGH"[j]
            net = f"({col}$4*SelFullRev*$A{r_}/(1+VAT))"
            var = f'({col}$4*SelDemandCap*Cons+{net}*(1+VAT)*FeeRate+IF(VenueModel="شراكة",{net}*RevShare,0))'
            put(
                SN,
                r_,
                2 + j,
                f"=({net}-{var}-{fixed_expr}*(1+Contingency)+{other})",
                fmt=SAR0,
            )
    put(
        SN,
        12,
        1,
        "تفسير: الخلايا السالبة تعني خسارة تشغيلية شهرية. الإشغال الأساسي في النموذج 18% ومضاعف السعر 1.0.",
        wrap=True,
    )
    SN.merge_cells("A12:H12")
    widths(SN, [22] + [13] * 7)

    # ------------------------------------------------------------ References
    RF = sheet(wb, "المراجع")
    title(
        RF,
        "مراجع الأسعار والسوق (تمت زيارتها 2026-11-26)",
        "أي رقم غير مذكور هنا = تقدير يحتاج عرض سعر.",
        3,
    )
    from common import MARKET_REFS, VERIFIED_REFS

    header(RF, 4, ["المرجع", "القيمة", "الرابط"])
    rr = 5
    for k, (lab, val, url) in VERIFIED_REFS.items():
        put(RF, rr, 1, lab, wrap=True)
        put(RF, rr, 2, val)
        put(RF, rr, 3, url)
        rr += 1
    for lab, url in MARKET_REFS:
        put(RF, rr, 1, lab, wrap=True)
        put(RF, rr, 2, "—")
        put(RF, rr, 3, url)
        rr += 1
    widths(RF, [60, 12, 90])

    wb.save(OUT)
    print("saved", os.path.abspath(OUT))


if __name__ == "__main__":
    build()
