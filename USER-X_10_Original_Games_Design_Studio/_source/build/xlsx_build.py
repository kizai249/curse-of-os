"""All Excel deliverables, Arabic RTL, with live formulas. Values are cross-checked after a LibreOffice recalc (qc.py)."""

import os

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

import game_docs
import model
from model import common, research

PKG = model.PKG
FONT = "IBM Plex Sans Arabic"
HDR = PatternFill("solid", fgColor="33354C")
INP = PatternFill("solid", fgColor="FFF4C7")
TOT = PatternFill("solid", fgColor="E6FCFD")
thin = Side(style="thin", color="C9C9D2")
BORDER = Border(top=thin, bottom=thin, left=thin, right=thin)
NOTE = "الأسعار تقديرية غير مُتحقق منها (تحتاج عروض أسعار مكتوبة). الخلايا الصفراء مدخلات قابلة للتعديل. الأرقام الاقتصادية افتراضات."


def sheet(wb, title, first=False):
    ws = wb.active if first else wb.create_sheet()
    ws.title = title
    ws.sheet_view.rightToLeft = True
    return ws


def header(ws, row, cols, widths=None):
    for i, c in enumerate(cols, 1):
        cell = ws.cell(row=row, column=i, value=c)
        cell.font = Font(name=FONT, bold=True, color="F4F4F1")
        cell.fill = HDR
        cell.alignment = Alignment(
            horizontal="center", vertical="center", wrap_text=True
        )
        cell.border = BORDER
        if widths:
            ws.column_dimensions[get_column_letter(i)].width = widths[i - 1]
    ws.row_dimensions[row].height = 30


def put(ws, row, col, val, fmt=None, bold=False, fill=None):
    c = ws.cell(row=row, column=col, value=val)
    c.font = Font(name=FONT, bold=bold)
    c.alignment = Alignment(vertical="top", wrap_text=True, horizontal="right")
    c.border = BORDER
    if fmt:
        c.number_format = fmt
    if fill:
        c.fill = fill
    return c


def title(ws, text, sub=NOTE, ncols=8):
    ws.cell(row=1, column=1, value=text).font = Font(name=FONT, bold=True, size=14)
    ws.cell(row=2, column=1, value=sub).font = Font(
        name=FONT, italic=True, size=9, color="7A0F25"
    )
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=ncols)


def save(wb, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    wb.save(path)
    return path


NUM = "#,##0"
SAR = "#,##0.00"


def bom_sheet(wb, g, tier, label, first=False):
    ws = sheet(wb, label, first)
    title(ws, f"{g['ar']} — {label}", ncols=13)
    cols = [
        "الرمز",
        "الصنف",
        "المواصفة",
        "الوحدة",
        "الكمية",
        "سعر الوحدة (ريال، تقدير)",
        "الإجمالي",
        "الفئة",
        "نوع المورد",
        "أين",
        "مدة التوريد",
        "البديل",
        "الاستبدال",
        "لماذا",
    ]
    header(ws, 4, cols, [9, 22, 26, 8, 8, 12, 12, 10, 22, 26, 11, 24, 22, 28])
    rows = model.bom_rows(g, tier)
    r = 5
    for it in rows:
        s = common.SUPPLIERS[it["sup"]]
        vals = [
            it["id"],
            it["name"],
            it["spec"],
            it["unit"],
            it["qty"],
            it["price"],
            f"=E{r}*F{r}",
            it["cat"],
            s["ar"],
            (s["link"] + " (غير مُتحقق)") if s["link"] else s["how"],
            it["lead"],
            it["alt"],
            it["repl"],
            it["why"],
        ]
        for c, v in enumerate(vals, 1):
            put(
                ws,
                r,
                c,
                v,
                NUM if c in (5,) else SAR if c in (6, 7) else None,
                fill=INP if c in (5, 6) else None,
            )
        r += 1
    last = r - 1
    put(ws, r, 6, "المجموع الفرعي", bold=True, fill=TOT)
    put(ws, r, 7, f"=SUM(G5:G{last})", SAR, True, TOT)
    put(ws, r + 1, 5, "نسبة الطوارئ", bold=True)
    put(ws, r + 1, 6, model.CONT, "0%", fill=INP)
    put(ws, r + 1, 7, f"=G{r}*F{r + 1}", SAR, True, TOT)
    put(ws, r + 2, 6, "الإجمالي", bold=True, fill=TOT)
    put(ws, r + 2, 7, f"=G{r}+G{r + 1}", SAR, True, TOT)
    ws.freeze_panes = "C5"
    return ws, f"'{label}'!G{r + 2}", f"'{label}'!G{r}"


def equipment_bom(g):
    wb = Workbook()
    _, rec_t, _ = bom_sheet(wb, g, "rec", "الموصى بها", True)
    _, mvb_t, _ = bom_sheet(wb, g, "mvb", "الحد الأدنى")
    _, upg_t, _ = bom_sheet(wb, g, "upg", "إضافات الترقية")
    ws = sheet(wb, "الملخص")
    title(ws, f"ملخص تكلفة {g['ar']}", ncols=4)
    header(
        ws,
        4,
        ["المستوى", "الإجمالي شامل الطوارئ (ريال)", "داخل نطاق 3,000–7,000؟", "ملاحظة"],
        [28, 24, 22, 50],
    )
    data = [
        ("الحد الأدنى القابل للتشغيل", f"={mvb_t}"),
        ("الموصى بها", f"={rec_t}"),
        ("الترقية (الموصى بها + الإضافات)", f"={rec_t}+{upg_t}"),
    ]
    for i, (n, f) in enumerate(data, 5):
        put(ws, i, 1, n, bold=True)
        put(ws, i, 2, f, SAR)
        put(ws, i, 3, f'=IF(AND(B{i}>=3000,B{i}<=7000),"نعم","لا — راجع")')
        put(
            ws,
            i,
            4,
            "الحد الأدنى لا يمس السلامة ولا الآلية"
            if i == 5
            else "الترقية اختيارية"
            if i == 7
            else "",
        )
    for f in model.costs(g)["flags"]:
        put(ws, 9, 1, "تنبيه: " + f, bold=True)
    wb.move_sheet("الملخص", offset=-3)
    wb.active = 0
    return save(wb, os.path.join(game_docs.gfolder(g), "Equipment_BOM.xlsx"))


def assumptions_block(ws, r0=4):
    """writes the hypothesis inputs; returns dict of cell refs"""
    H, L = model.HYP, common.LABOUR
    items = [
        ("ticket", "سعر التذكرة لكل لاعب للجلسة (ريال)", H["ticket"], NUM),
        ("occupancy", "نسبة الإشغال", H["occupancy"], "0%"),
        ("shift_min", "مدة الوردية (دقيقة)", H["shift_min"], NUM),
        ("entry_buffer", "فاصل الدخول بين الجلسات (دقيقة)", H["entry_buffer"], NUM),
        ("event_days_month", "أيام التشغيل في الشهر", H["event_days_month"], NUM),
        ("venue_day", "حصة المكان/يوم (ريال)", H["venue_day"], NUM),
        ("marketing_day", "حصة التسويق/يوم (ريال)", H["marketing_day"], NUM),
        ("fees", "رسوم الحجز والدفع", H["fees"], "0%"),
        ("operator_shift", "أجر المشغّل للوردية", L["operator_shift"], NUM),
        ("judge_shift", "أجر الحكم للوردية", L["judge_shift"], NUM),
        ("reset_crew_shift", "أجر طاقم الإعادة للوردية", L["reset_crew_shift"], NUM),
    ]
    header(ws, r0, ["الافتراض", "القيمة", "النوع"], [42, 16, 22])
    ref = {}
    for i, (k, lab, v, f) in enumerate(items, r0 + 1):
        put(ws, i, 1, lab)
        put(ws, i, 2, v, f, fill=INP)
        put(
            ws,
            i,
            3,
            "افتراض"
            if k not in ("operator_shift", "judge_shift", "reset_crew_shift")
            else "تقدير",
        )
        ref[k] = f"$B${i}"
    return ref, r0 + len(items) + 1


def cost_model(g):
    wb = Workbook()
    ws = sheet(wb, "الافتراضات", True)
    title(
        ws,
        f"نموذج التكلفة والاقتصاديات — {g['ar']}",
        "كل القيم الاقتصادية افتراضات تخطيطية وليست توقعات مثبتة. عدّل الخلايا الصفراء.",
        3,
    )
    ref, _ = assumptions_block(ws)
    A = lambda k: f"'الافتراضات'!{ref[k]}"
    ws2 = sheet(wb, "التكلفة")
    title(ws2, "تكلفة البناء حسب الفئة (الموصى بها)", ncols=4)
    header(
        ws2,
        4,
        ["الفئة", "الحد الأدنى", "الموصى بها", "إضافات الترقية"],
        [24, 16, 16, 16],
    )
    cats = sorted(
        set(r["cat"] for t in ("rec", "mvb", "upg") for r in model.bom_rows(g, t))
    )
    m, rc, u = (model.by_category(g, t) for t in ("mvb", "rec", "upg"))
    r = 5
    for c in cats:
        put(ws2, r, 1, c)
        for j, d in enumerate((m, rc, u), 2):
            put(ws2, r, j, d.get(c, 0), SAR, fill=INP)
        r += 1
    put(ws2, r, 1, "المجموع الفرعي", bold=True, fill=TOT)
    for j in (2, 3, 4):
        L = get_column_letter(j)
        put(ws2, r, j, f"=SUM({L}5:{L}{r - 1})", SAR, True, TOT)
    put(ws2, r + 1, 1, "طوارئ", bold=True)
    put(ws2, r + 1, 5, model.CONT, "0%", fill=INP)
    put(ws2, r + 2, 1, "الإجمالي", bold=True, fill=TOT)
    for j in (2, 3, 4):
        L = get_column_letter(j)
        put(ws2, r + 1, j, f"={L}{r}*$E${r + 1}", SAR)
        put(ws2, r + 2, j, f"={L}{r}+{L}{r + 1}", SAR, True, TOT)
    capex = f"'التكلفة'!C{r + 2}"
    o = g["ops"]
    ws3 = sheet(wb, "الاقتصاديات")
    title(ws3, "الاقتصاديات اليومية (افتراضات)", ncols=3)
    header(ws3, 4, ["البند", "القيمة", "المعادلة/المصدر"], [40, 18, 46])
    rows = [
        ("مدة الجلسة (دقيقة)", o["round_min"], "من التصميم", NUM, True),
        ("إعادة التجهيز (دقيقة)", o["reset_min"], "من التصميم", "0.0", True),
        (
            "دورة الجلسة (دقيقة)",
            f"=B5+B6+{A('entry_buffer')}",
            "لعب + إعادة + دخول",
            "0.0",
            False,
        ),
        (
            "جلسات في الوردية",
            f"=MAX(1,INT({A('shift_min')}/B7))",
            "INT(الوردية/الدورة)",
            NUM,
            False,
        ),
        ("مقاعد الجلسة", o["players_round"], "من التصميم", NUM, True),
        (
            "لاعبون/يوم",
            f"=ROUND(B8*B9*{A('occupancy')},0)",
            "جلسات × مقاعد × إشغال",
            NUM,
            False,
        ),
        ("الإيراد/يوم", f"=B10*{A('ticket')}", "لاعبون × تذكرة", SAR, False),
        ("عدد المشغّلين", o["operators"], "من التصميم", NUM, True),
        ("عدد الحكام", o["judges"], "من التصميم", NUM, True),
        ("طاقم الإعادة", o["reset_crew"], "من التصميم", NUM, True),
        (
            "تكلفة الطاقم/يوم",
            f"=B12*{A('operator_shift')}+B13*{A('judge_shift')}+B14*{A('reset_crew_shift')}",
            "عدد × أجر",
            SAR,
            False,
        ),
        ("مستهلكات لكل جلسة", o["consumables_round"], "تقدير", SAR, True),
        ("مستهلكات/يوم", "=B16*B8", "لكل جلسة × جلسات", SAR, False),
        ("صيانة شهرية", g["maintenance"]["month_cost"], "تقدير", SAR, True),
        ("صيانة/يوم", f"=B18/{A('event_days_month')}", "شهري ÷ أيام", SAR, False),
        (
            "مكان + تسويق + رسوم/يوم",
            f"={A('venue_day')}+{A('marketing_day')}+B11*{A('fees')}",
            "افتراضات",
            SAR,
            False,
        ),
        ("إجمالي التكلفة/يوم", "=B15+B17+B19+B20", "مجموع", SAR, False),
        ("هامش التشغيل/يوم", "=B11-B21", "إيراد − تكلفة", SAR, False),
        ("تكلفة البناء (الموصى بها)", f"={capex}", "من ورقة التكلفة", SAR, False),
        (
            "أيام التعادل",
            '=IF(B22>0,ROUNDUP(B23/B22,0),"لا يتعادل")',
            "بناء ÷ هامش",
            NUM,
            False,
        ),
        ("هامش شهري", f"=B22*{A('event_days_month')}", "يومي × أيام", SAR, False),
    ]
    for i, (lab, v, src, f, inp) in enumerate(rows, 5):
        put(ws3, i, 1, lab, bold=not inp)
        put(ws3, i, 2, v, f, fill=INP if inp else None)
        put(ws3, i, 3, src)
    ws4 = sheet(wb, "الحساسية")
    title(ws4, "حساسية الهامش اليومي للإشغال وسعر التذكرة (افتراضات)", ncols=6)
    occs = [0.3, 0.45, 0.6, 0.75, 0.9]
    tickets = [40, 50, 60, 75, 90]
    put(ws4, 4, 1, "التذكرة ↓ / الإشغال →", bold=True, fill=TOT)
    for j, oc in enumerate(occs, 2):
        put(ws4, 4, j, oc, "0%", True, INP)
    E = "'الاقتصاديات'!"
    for i, t in enumerate(tickets, 5):
        put(ws4, i, 1, t, NUM, True, INP)
        for j in range(2, 7):
            L = get_column_letter(j)
            rev = f"ROUND({E}$B$8*{E}$B$9*{L}$4,0)*$A{i}"
            put(
                ws4,
                i,
                j,
                f"={rev}-({E}$B$15+{E}$B$17+{E}$B$19+'الافتراضات'!{ref['venue_day']}+'الافتراضات'!{ref['marketing_day']}+{rev}*'الافتراضات'!{ref['fees']})",
                NUM,
            )
    for c in range(1, 7):
        ws4.column_dimensions[get_column_letter(c)].width = 16
    return save(wb, os.path.join(game_docs.gfolder(g), "Game_Cost_Model.xlsx"))


# ---------------------------------------------------------------- master workbooks
def source_register():
    wb = Workbook()
    ws = sheet(wb, "المصادر", True)
    title(ws, "سجل مصادر البحث", research.ACCESS_NOTE, 7)
    header(
        ws,
        4,
        [
            "الرمز",
            "العنوان",
            "الناشر",
            "الرابط",
            "ما يدعمه",
            "الموثوقية",
            "حالة التحقق",
        ],
        [7, 30, 24, 50, 50, 20, 30],
    )
    for i, s in enumerate(research.SOURCES, 5):
        for c, v in enumerate(list(s) + ["وُجد عبر البحث — لم يُفتح من بيئة البناء"], 1):
            put(ws, i, c, v)
    ws2 = sheet(wb, "الألعاب الشعبية")
    title(
        ws2,
        "الألعاب الشعبية المدروسة وحالة أصلها",
        "لا ندّعي أصلًا سعوديًا لأي لعبة ما لم يذكره مصدر.",
        9,
    )
    header(
        ws2,
        4,
        [
            "اللعبة",
            "الاسم الإنجليزي",
            "المنطقة/السياق",
            "حالة الأصل",
            "اللاعبون",
            "الآلية",
            "المصادر",
            "استُخدمت في",
            "ملاحظة",
        ],
        [18, 20, 22, 36, 9, 32, 12, 12, 44],
    )
    for i, t in enumerate(research.TRAD, 5):
        vals = list(t)
        vals[6] = "، ".join(vals[6]) or "لا يوجد"
        for c, v in enumerate(vals, 1):
            put(ws2, i, c, v)
    ws3 = sheet(wb, "المفاهيم العشرون")
    title(ws3, "المفاهيم الداخلية العشرون وقرار الاختيار", "", 6)
    header(
        ws3,
        4,
        ["الرمز", "المفهوم", "الفئة", "الوصف", "القرار", "السبب"],
        [7, 20, 14, 36, 10, 50],
    )
    for i, c_ in enumerate(research.CONCEPTS, 5):
        for c, v in enumerate(c_, 1):
            put(ws3, i, c, v)
    return save(
        wb,
        os.path.join(
            PKG, "01_Master_Research", "Traditional_Games_Source_Register.xlsx"
        ),
    )


def selection_matrix(games):
    wb = Workbook()
    ws = sheet(wb, "مصفوفة الاختيار", True)
    title(
        ws,
        "مصفوفة الاختيار الموزونة (1–10 لكل معيار)",
        "الدرجات تقدير الفريق قبل الاختبار وليست نتائج قياس. عدّل الأوزان (الصف 5) لإعادة الترتيب.",
        20,
    )
    crit = research.CRITERIA
    header(
        ws,
        4,
        ["اللعبة", "الرمز"] + [c[1] for c in crit] + ["النتيجة الموزونة", "الترتيب"],
        [20, 7] + [9] * len(crit) + [12, 8],
    )
    put(ws, 5, 1, "الوزن %", bold=True, fill=TOT)
    for j, c in enumerate(crit, 3):
        put(ws, 5, j, c[2], NUM, True, INP)
    lastc = get_column_letter(2 + len(crit))
    put(ws, 5, 3 + len(crit), f"=SUM(C5:{lastc}5)", NUM, True, TOT)
    n = len(games)
    for i, g in enumerate(games, 6):
        put(ws, i, 1, g["ar"], bold=True)
        put(ws, i, 2, g["id"])
        for j, c in enumerate(crit, 3):
            put(ws, i, j, g["scores"][c[0]], NUM, fill=INP)
        sc = 3 + len(crit)
        put(
            ws,
            i,
            sc,
            f"=SUMPRODUCT(C{i}:{lastc}{i},$C$5:${lastc}$5)/$"
            + get_column_letter(sc)
            + "$5",
            "0.00",
            True,
        )
        L = get_column_letter(sc)
        put(ws, i, sc + 1, f"=RANK({L}{i},${L}$6:${L}${5 + n})", NUM, True)
    dv = DataValidation(type="whole", operator="between", formula1="1", formula2="10")
    ws.add_data_validation(dv)
    dv.add(f"C6:{lastc}{5 + n}")
    ws.freeze_panes = "C6"
    ws2 = sheet(wb, "الأفضل في")
    title(ws2, "الأفضل في كل فئة (محسوب من الدرجات والتكاليف)", "", 3)
    header(ws2, 4, ["الفئة", "اللعبة", "السبب"], [26, 24, 40])
    for i, (k, g) in enumerate(model.best_of(games).items(), 5):
        put(ws2, i, 1, k, bold=True)
        put(ws2, i, 2, f"{g['id']} — {g['ar']}")
        put(
            ws2,
            i,
            3,
            f"تكلفة موصى بها {model.fmt(model.costs(g)['rec']['total'])} ريال"
            if k == "الأقل تكلفة"
            else f"نتيجة موزونة {model.weighted_score(g)}",
        )
    return save(wb, os.path.join(PKG, "06_Selection", "Game_Selection_Matrix.xlsx"))


def portfolio_budget(games):
    wb = Workbook()
    ws = sheet(wb, "ميزانية المحفظة", True)
    title(ws, "ميزانية بناء الألعاب العشر (ريال، تقدير شامل طوارئ 10%)", ncols=8)
    header(
        ws,
        4,
        [
            "الرمز",
            "اللعبة",
            "الحد الأدنى",
            "الموصى بها",
            "الترقية",
            "ضمن السقف 7,000؟",
            "هامش حتى السقف",
            "تنبيهات",
        ],
        [7, 22, 14, 14, 14, 16, 16, 44],
    )
    for i, g in enumerate(games, 5):
        c = model.costs(g)
        vals = [
            g["id"],
            g["ar"],
            c["mvb"]["total"],
            c["rec"]["total"],
            c["upg_total"],
            f'=IF(D{i}<=7000,"نعم","لا")',
            f"=7000-D{i}",
            "؛ ".join(c["flags"]) or "—",
        ]
        for k, v in enumerate(vals, 1):
            put(
                ws,
                i,
                k,
                v,
                SAR if k in (3, 4, 5, 7) else None,
                fill=INP if k in (3, 4, 5) else None,
            )
    e = 4 + len(games)
    put(ws, e + 1, 2, "المجموع", bold=True, fill=TOT)
    for k in (3, 4, 5):
        L = get_column_letter(k)
        put(ws, e + 1, k, f"=SUM({L}5:{L}{e})", SAR, True, TOT)
    put(ws, e + 2, 2, "المتوسط", bold=True)
    for k in (3, 4, 5):
        L = get_column_letter(k)
        put(ws, e + 2, k, f"=AVERAGE({L}5:{L}{e})", SAR, True)
    ws2 = sheet(wb, "حسب الفئة")
    title(ws2, "التكلفة الموصى بها حسب فئة الإنفاق", ncols=12)
    cats = sorted({r["cat"] for g in games for r in model.bom_rows(g, "rec")})
    header(
        ws2, 4, ["اللعبة"] + cats + ["المجموع الفرعي"], [22] + [13] * (len(cats) + 1)
    )
    for i, g in enumerate(games, 5):
        d = model.by_category(g, "rec")
        put(ws2, i, 1, g["ar"], bold=True)
        for j, c in enumerate(cats, 2):
            put(ws2, i, j, d.get(c, 0), SAR)
        put(
            ws2,
            i,
            len(cats) + 2,
            f"=SUM(B{i}:{get_column_letter(len(cats) + 1)}{i})",
            SAR,
            True,
        )
    return save(wb, os.path.join(PKG, "05_Financials", "Portfolio_Build_Budget.xlsx"))


def procurement_master(games):
    wb = Workbook()
    ws = sheet(wb, "المشتريات المجمعة", True)
    title(
        ws,
        "قائمة المشتريات المجمعة للنسخ الموصى بها (قبل إعادة الاستخدام المشترك)",
        NOTE,
        10,
    )
    header(
        ws,
        4,
        [
            "الرمز",
            "الصنف",
            "المواصفة",
            "الوحدة",
            "الكمية الإجمالية",
            "سعر الوحدة",
            "الإجمالي",
            "نوع المورد",
            "الرابط/الطريقة",
            "الألعاب",
        ],
        [9, 24, 28, 8, 10, 11, 13, 24, 34, 30],
    )
    agg = {}
    for g in games:
        for r in model.bom_rows(g, "rec"):
            a = agg.setdefault(r["id"], dict(r, qty=0, games=[]))
            a["qty"] += r["qty"]
            a["games"].append(g["id"])
    for i, a in enumerate(sorted(agg.values(), key=lambda x: (x["sup"], x["id"])), 5):
        s = common.SUPPLIERS[a["sup"]]
        vals = [
            a["id"],
            a["name"],
            a["spec"],
            a["unit"],
            a["qty"],
            a["price"],
            f"=E{i}*F{i}",
            s["ar"],
            (s["link"] + " (غير مُتحقق)") if s["link"] else s["how"],
            "، ".join(a["games"]),
        ]
        for k, v in enumerate(vals, 1):
            put(ws, i, k, v, SAR if k in (6, 7) else NUM if k == 5 else None)
    e = 4 + len(agg)
    put(ws, e + 1, 6, "المجموع", bold=True, fill=TOT)
    put(ws, e + 1, 7, f"=SUM(G5:G{e})", SAR, True, TOT)
    ws2 = sheet(wb, "الموردون")
    title(
        ws2,
        "سجل أنواع الموردين",
        "الروابط وُجدت عبر بحث الويب 2026-11-26 ولم تُفتح من بيئة البناء.",
        4,
    )
    header(ws2, 4, ["الرمز", "المورد/النوع", "طريقة الطلب", "الرابط"], [9, 40, 50, 40])
    for i, (k, s) in enumerate(common.SUPPLIERS.items(), 5):
        for c, v in enumerate([k, s["ar"], s["how"], s["link"] or "—"], 1):
            put(ws2, i, c, v)
    ws3 = sheet(wb, "طلب عرض سعر")
    title(ws3, "كيف تحصل على عرض سعر", "", 1)
    ws3.column_dimensions["A"].width = 110
    for i, t in enumerate(common.QUOTE_HOWTO, 4):
        put(ws3, i, 1, f"{i - 3}. {t}")
    return save(wb, os.path.join(PKG, "05_Financials", "Procurement_Master_List.xlsx"))


def event_economics(games):
    wb = Workbook()
    ws = sheet(wb, "الافتراضات", True)
    title(
        ws,
        "نموذج اقتصاديات الفعالية — الافتراضات",
        "كل القيم افتراضات تخطيطية. عدّل الأصفر.",
        3,
    )
    ref, _ = assumptions_block(ws)
    A = lambda k: f"'الافتراضات'!{ref[k]}"
    ws2 = sheet(wb, "حسب اللعبة")
    title(ws2, "الاقتصاديات اليومية لكل لعبة (افتراضات)", ncols=16)
    cols = [
        "الرمز",
        "اللعبة",
        "مدة الجلسة",
        "إعادة",
        "مقاعد",
        "مشغّلون",
        "حكام",
        "طاقم إعادة",
        "مستهلكات/جلسة",
        "صيانة شهرية",
        "بناء موصى",
        "جلسات/وردية",
        "لاعبون/يوم",
        "إيراد/يوم",
        "تكلفة/يوم",
        "هامش/يوم",
        "أيام التعادل",
    ]
    header(ws2, 4, cols, [7, 18] + [11] * 15)
    for i, g in enumerate(games, 5):
        o = g["ops"]
        vals = [
            g["id"],
            g["ar"],
            o["round_min"],
            o["reset_min"],
            o["players_round"],
            o["operators"],
            o["judges"],
            o["reset_crew"],
            o["consumables_round"],
            g["maintenance"]["month_cost"],
            model.costs(g)["rec"]["total"],
            f"=MAX(1,INT({A('shift_min')}/(C{i}+D{i}+{A('entry_buffer')})))",
            f"=ROUND(L{i}*E{i}*{A('occupancy')},0)",
            f"=M{i}*{A('ticket')}",
            f"=F{i}*{A('operator_shift')}+G{i}*{A('judge_shift')}+H{i}*{A('reset_crew_shift')}+I{i}*L{i}+J{i}/{A('event_days_month')}+{A('venue_day')}+{A('marketing_day')}+N{i}*{A('fees')}",
            f"=N{i}-O{i}",
            f'=IF(P{i}>0,ROUNDUP(K{i}/P{i},0),"لا يتعادل")',
        ]
        for k, v in enumerate(vals, 1):
            put(
                ws2,
                i,
                k,
                v,
                SAR if k in (9, 10, 11, 14, 15, 16) else NUM if k > 2 else None,
                fill=INP if 3 <= k <= 11 else None,
            )
    e = 4 + len(games)
    put(ws2, e + 1, 2, "المجموع", bold=True, fill=TOT)
    for k in (11, 13, 14, 15, 16):
        L = get_column_letter(k)
        put(ws2, e + 1, k, f"=SUM({L}5:{L}{e})", SAR, True, TOT)
    return save(wb, os.path.join(PKG, "05_Financials", "Event_Economics_Model.xlsx"))


def cashflow(games):
    wb = Workbook()
    ws = sheet(wb, "خطة الإطلاق", True)
    title(
        ws,
        "خطة الإنفاق والتدفق النقدي للإطلاق (6 أشهر، افتراضات)",
        "سيناريو تخطيطي: بناء أعلى 5 ألعاب أولًا ثم الخمس الباقية. كل الإيرادات افتراضات.",
        9,
    )
    top = model.ranking(games)
    header(
        ws,
        4,
        [
            "البند",
            "الشهر 1",
            "الشهر 2",
            "الشهر 3",
            "الشهر 4",
            "الشهر 5",
            "الشهر 6",
            "المجموع",
            "ملاحظة",
        ],
        [34] + [13] * 7 + [40],
    )
    b1 = sum(model.costs(g)["rec"]["total"] for g in top[:5])
    b2 = sum(model.costs(g)["rec"]["total"] for g in top[5:])
    m1 = sum(model.economics(g)["margin_day"] for g in top[:5])
    m2 = sum(model.economics(g)["margin_day"] for g in top[5:])
    rows = [
        ("بناء المرحلة 1 (أعلى 5)", [b1, 0, 0, 0, 0, 0], "تكلفة البناء الموصى بها"),
        ("بناء المرحلة 2 (5 الباقية)", [0, 0, b2, 0, 0, 0], ""),
        ("اختبار ونماذج أولية", [3000, 2000, 2000, 0, 0, 0], "افتراض"),
        ("أيام تشغيل", [0, 4, 6, 8, 8, 8], "افتراض — الشهر 1 بناء واختبار فقط"),
        ("هامش يومي — المرحلة 1", [m1] * 6, "من نموذج الاقتصاديات"),
        ("هامش يومي — المرحلة 2", [0, 0, 0, m2, m2, m2], "تبدأ الشهر 4"),
    ]
    for i, (lab, vals, note) in enumerate(rows, 5):
        put(ws, i, 1, lab, bold=True)
        for j, v in enumerate(vals, 2):
            put(ws, i, j, round(v, 2), SAR, fill=INP)
        put(ws, i, 8, f"=SUM(B{i}:G{i})", SAR)
        put(ws, i, 9, note)
    put(ws, 11, 1, "هامش التشغيل الشهري", bold=True, fill=TOT)
    put(ws, 12, 1, "صافي التدفق الشهري", bold=True, fill=TOT)
    put(ws, 13, 1, "التدفق التراكمي", bold=True, fill=TOT)
    for j in range(2, 8):
        L = get_column_letter(j)
        put(ws, 11, j, f"={L}8*({L}9+{L}10)", SAR, True, TOT)
        put(ws, 12, j, f"={L}11-{L}5-{L}6-{L}7", SAR, True, TOT)
        put(
            ws,
            13,
            j,
            f"={L}12" if j == 2 else f"={get_column_letter(j - 1)}13+{L}12",
            SAR,
            True,
            TOT,
        )
    put(
        ws,
        15,
        1,
        "تحذير: هذا سيناريو افتراضي للتخطيط فقط، ولا يشمل رأس مال تأسيس الشركة أو الرواتب الثابتة أو التراخيص.",
        bold=True,
    )
    return save(wb, os.path.join(PKG, "05_Financials", "Launch_Cashflow_Plan.xlsx"))


def staff_requirements(games):
    wb = Workbook()
    ws = sheet(wb, "الطاقم لكل لعبة", True)
    title(ws, "متطلبات الطاقم لكل لعبة ولكل وردية (6 ساعات)", ncols=8)
    header(
        ws,
        4,
        [
            "الرمز",
            "اللعبة",
            "مشغّلون",
            "حكام",
            "طاقم إعادة",
            "الإجمالي",
            "تكلفة الوردية (ريال، تقدير)",
            "ملاحظة",
        ],
        [7, 20, 10, 10, 12, 10, 18, 40],
    )
    L = common.LABOUR
    put(ws, 3, 3, L["operator_shift"], NUM, fill=INP)
    put(ws, 3, 4, L["judge_shift"], NUM, fill=INP)
    put(ws, 3, 5, L["reset_crew_shift"], NUM, fill=INP)
    put(ws, 3, 2, "أجر الوردية ←", bold=True)
    for i, g in enumerate(games, 5):
        o = g["ops"]
        vals = [
            g["id"],
            g["ar"],
            o["operators"],
            o["judges"],
            o["reset_crew"],
            f"=SUM(C{i}:E{i})",
            f"=C{i}*$C$3+D{i}*$D$3+E{i}*$E$3",
            "المشغّل يمكن أن يكون مذيعًا مدرّبًا",
        ]
        for k, v in enumerate(vals, 1):
            put(ws, i, k, v, NUM if 3 <= k <= 7 else None)
    e = 4 + len(games)
    put(ws, e + 1, 2, "كل الألعاب معًا", bold=True, fill=TOT)
    for k in range(3, 8):
        Lt = get_column_letter(k)
        put(ws, e + 1, k, f"=SUM({Lt}5:{Lt}{e})", NUM, True, TOT)
    ws2 = sheet(wb, "أدوار الفعالية")
    title(ws2, "أدوار مشتركة على مستوى الفعالية", ncols=4)
    header(ws2, 4, ["الدور", "العدد", "المسؤولية", "ملاحظة"], [24, 8, 56, 30])
    roles = [
        ("مدير الفعالية", 1, "القرار النهائي، التنسيق، التواصل مع المكان", "إلزامي"),
        (
            "مسؤول السلامة",
            1,
            "جولات فحص، إيقاف أي لعبة، سجل الحوادث",
            "إلزامي، مدرّب إسعاف",
        ),
        ("مسعف", 1, "إسعافات أولية في الموقع", "إلزامي لأكثر من 50 مشاركًا (توصية)"),
        ("استقبال وتسجيل", 2, "التحقق من العمر والموافقة والسؤال الصحي", ""),
        ("مذيع رئيسي", 1, "ربط الفقرات والإعلانات العامة", "اختياري"),
        ("فني صوت وإضاءة", 1, "تشغيل الأنظمة المشتركة", ""),
        ("طاقم احتياطي", 2, "تغطية الاستراحات والإعادة", ""),
    ]
    for i, r in enumerate(roles, 5):
        for k, v in enumerate(r, 1):
            put(ws2, i, k, v)
    return save(wb, os.path.join(PKG, "04_Operations", "Staff_Requirements.xlsx"))


def scheduling(games):
    wb = Workbook()
    ws = sheet(wb, "نموذج الجدولة", True)
    title(
        ws,
        "نموذج جدولة الجلسات في يوم الفعالية",
        "عدّل بداية اليوم ومدة الوردية والفاصل (أصفر).",
        8,
    )
    put(ws, 3, 1, "بداية اليوم (ساعة عشرية، 16 = 4 م)", bold=True)
    put(ws, 3, 2, 16, "0.00", fill=INP)
    put(ws, 3, 3, "الوردية (دقيقة)", bold=True)
    put(ws, 3, 4, model.HYP["shift_min"], NUM, fill=INP)
    put(ws, 3, 5, "فاصل الدخول", bold=True)
    put(ws, 3, 6, model.HYP["entry_buffer"], NUM, fill=INP)
    header(
        ws,
        5,
        [
            "الرمز",
            "اللعبة",
            "لعب (د)",
            "إعادة (د)",
            "دورة (د)",
            "جلسات",
            "مقاعد/جلسة",
            "مقاعد/وردية",
        ],
        [7, 20, 10, 10, 10, 10, 12, 12],
    )
    for i, g in enumerate(games, 6):
        o = g["ops"]
        vals = [
            g["id"],
            g["ar"],
            o["round_min"],
            o["reset_min"],
            f"=C{i}+D{i}+$F$3",
            f"=MAX(1,INT($D$3/E{i}))",
            o["players_round"],
            f"=F{i}*G{i}",
        ]
        for k, v in enumerate(vals, 1):
            put(
                ws,
                i,
                k,
                v,
                "0.0" if k in (3, 4, 5) else NUM if k > 2 else None,
                fill=INP if k in (3, 4, 7) else None,
            )
    e = 5 + len(games)
    put(ws, e + 1, 2, "المجموع", bold=True, fill=TOT)
    put(ws, e + 1, 8, f"=SUM(H6:H{e})", NUM, True, TOT)
    ws2 = sheet(wb, "جدول الجلسات")
    title(ws2, "أوقات بدء الجلسات (محسوبة من الورقة السابقة)", ncols=20)
    header(ws2, 4, ["اللعبة"] + [f"جلسة {n}" for n in range(1, 19)], [20] + [9] * 18)
    for i, g in enumerate(games, 5):
        put(ws2, i, 1, g["ar"], bold=True)
        src = i + 1
        for n in range(1, 19):
            f = f"=IF({n}<='نموذج الجدولة'!F{src},TEXT(('نموذج الجدولة'!$B$3*60+({n}-1)*'نموذج الجدولة'!E{src})/1440,\"hh:mm\"),\"\")"
            put(ws2, i, n + 1, f)
    return save(wb, os.path.join(PKG, "04_Operations", "Event_Scheduling_Model.xlsx"))


def inventory(games):
    wb = Workbook()
    ws = sheet(wb, "المخزون", True)
    title(
        ws,
        "سجل المخزون والقطع الاحتياطية",
        "يُعبأ عمود «الموجود فعليًا» عند الجرد. الكميات المطلوبة من النسخ الموصى بها.",
        10,
    )
    header(
        ws,
        4,
        [
            "الرمز",
            "اللعبة",
            "الصنف",
            "الوحدة",
            "المطلوب",
            "الموجود فعليًا",
            "الفرق",
            "حد إعادة الطلب",
            "الحالة",
            "موقع التخزين",
        ],
        [7, 18, 26, 8, 9, 12, 9, 12, 16, 22],
    )
    r = 5
    for g in games:
        for it in model.bom_rows(g, "rec"):
            if it["cat"] in ("عمالة", "خدمات"):
                continue
            vals = [
                g["id"],
                g["ar"],
                it["name"],
                it["unit"],
                it["qty"],
                None,
                f'=IF(F{r}="","",F{r}-E{r})',
                max(1, round(it["qty"] * 0.1)),
                f'=IF(F{r}="","لم يُجرد",IF(F{r}<H{r},"اطلب الآن",IF(F{r}<E{r},"ناقص","مكتمل")))',
                g["physical"]["storage"][:40],
            ]
            for k, v in enumerate(vals, 1):
                put(
                    ws,
                    r,
                    k,
                    v,
                    NUM if k in (5, 6, 7, 8) else None,
                    fill=INP if k == 6 else None,
                )
            r += 1
    ws.freeze_panes = "D5"
    ws2 = sheet(wb, "قطع احتياطية")
    title(ws2, "القطع الاحتياطية الموصى بها لكل لعبة", ncols=3)
    header(
        ws2,
        4,
        ["اللعبة", "القطعة الاحتياطية", "تكلفة صيانة شهرية (ريال)"],
        [22, 60, 18],
    )
    rr = 5
    for g in games:
        for sp in g["maintenance"]["spares"]:
            put(ws2, rr, 1, g["ar"])
            put(ws2, rr, 2, sp)
            put(ws2, rr, 3, g["maintenance"]["month_cost"], NUM)
            rr += 1
    return save(wb, os.path.join(PKG, "04_Operations", "Inventory_Management.xlsx"))


def build_all():
    games = model.load_games()
    out = []
    for g in games:
        out += [equipment_bom(g), cost_model(g)]
    out += [
        source_register(),
        selection_matrix(games),
        portfolio_budget(games),
        procurement_master(games),
        event_economics(games),
        cashflow(games),
        staff_requirements(games),
        scheduling(games),
        inventory(games),
    ]
    return out


if __name__ == "__main__":
    for p in build_all():
        print(os.path.relpath(p, PKG))
