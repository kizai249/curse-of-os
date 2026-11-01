"""DAMANI_GLOBAL_REBRANDING_REPORT in PDF, DOCX and XLSX from the audit data in this folder."""
import json, subprocess, sys
from collections import Counter
from pathlib import Path

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
rows = json.load(open(HERE / "report_rows.json"))
for r in rows:
    if r["status"] == "unchanged" and r["old_name_hit"]:
        r["status"] = "renamed-only"
        r["note"] = r["note"] or "المحتوى لا يحتوي الاسم (رمز/أيقونة/نمط)؛ تغيّر اسم الملف فقط"
before = json.load(open(HERE / "inventory_before.json"))
after = json.load(open(HERE / "inventory_after.json"))
qa = json.load(open(HERE / "qa_results.json"))

AR = {"renamed+regenerated": "أُعيد توليده باسم جديد", "regenerated/edited": "عُدّل المحتوى", "renamed-only": "تغيّر اسم الملف فقط",
      "unchanged": "دون تغيير (لا يحتوي الاسم)", "excluded": "مستبعد"}
live = [r for r in rows if r["status"] != "excluded"]
changed = [r for r in live if r["status"] != "unchanged"]
def cnt(pred): return sum(1 for r in changed if pred(r))
ext = lambda r: Path(r["new"]).suffix.lower()
summary = [
    ("إجمالي الملفات التي تم فحصها (قبل / بعد)", f"{len(before)} / {len(after)}"),
    ("إجمالي الملفات المعدّلة (محتوى أو اسم)", len(changed)),
    ("ملفات PDF المعدّلة", cnt(lambda r: ext(r) == ".pdf")),
    ("ملفات Word المعدّلة", "0 (لا توجد ملفات Word ضمن المشروع)"),
    ("ملفات Excel المعدّلة", "0 (لا توجد ملفات Excel ضمن المشروع)"),
    ("ملفات PowerPoint المعدّلة", cnt(lambda r: ext(r) == ".pptx")),
    ("ملفات HTML والشيفرة المصدرية المعدّلة", cnt(lambda r: ext(r) in {".html", ".py", ".mjs", ".css", ".json", ".md", ".csv", ".gpl"} or r["new"].endswith(".gitignore"))),
    ("أرشيفات ZIP المحدّثة", cnt(lambda r: ext(r) == ".zip")),
    ("الصور والتصاميم المحدّثة (PNG/SVG/GIF/MP4/ICO)", cnt(lambda r: ext(r) in {".png", ".svg", ".gif", ".mp4", ".ico", ".jpg"})),
    ("ملفات تعذّر تعديلها / استُبعدت", sum(r["status"] == "excluded" for r in rows)),
    ("ملفات تحتاج إعادة تصميم", "0 — لكن كلمتا الشعار المركّبتان تحتاجان اعتمادًا بصريًا من مالك العلامة"),
    ("ظهور الاسم القديم في المخرجات النهائية", f"{sum(x['content_hits'] for x in after)} داخل المحتوى · {sum(x['name_hit'] for x in after)} في أسماء الملفات"),
    ("ملفات اجتازت التحقق النهائي", sum(r["verified"] == "pass" for r in live)),
    ("ملفات لم تجتز التحقق", sum(r["verified"] == "fail" for r in live)),
]
excluded = [r for r in rows if r["status"] == "excluded"]
notes = [
    "الاستبدال نُفّذ في الشيفرة المصدرية ثم أُعيد توليد كل المخرجات (PDF، PPTX، الصور، الفيديو، الأرشيفات) منها؛ لا يوجد نص جديد مكتوب فوق القديم.",
    "كلمتا الشعار «ضماني» و«Damani» مركّبتان من حروف الشعار المعتمد نفسها: حُذف «ات» و«at» وضُمّت الحروف الباقية مع الحفاظ على المسافة بين المربع والاسم. لم يُرسم أي حرف من جديد.",
    "مثال التهجئة الخاطئة في صفحة الاستخدام الخاطئ صار «Damany» (خطأ إملائي في الاسم الجديد) بدل «Damanaty» — انحراف مقصود عن جدول الاستبدال.",
    "اسم ملف الدليل الأصلي استُبدل بوصف محايد: «the v1.0 brand identity guide».",
    "النطاق damani.sa في القوالب مثال توضيحي؛ ملكيته غير متحقق منها.",
    "النسخة الاحتياطية: المجلد الأصلي damanati-brand/ لم يُمس، وهو محفوظ في Git (commit 8f972bf)، مع أرشيف tar.gz وبصمة SHA-256 في 00_BACKUP/.",
]

# ---------------- XLSX
wb = Workbook()
ws = wb.active; ws.title = "Summary"; ws.sheet_view.rightToLeft = True
ws.append(["البند", "القيمة"]); [ws.append([a, str(b)]) for a, b in summary]
ws.append([]); ws.append(["ملاحظات"]); [ws.append([n]) for n in notes]
fl = wb.create_sheet("Files"); fl.sheet_view.rightToLeft = True
fl.append(["المسار القديم", "المسار الجديد", "النوع", "الحالة", "ظهور قديم قبل", "في اسم الملف قبل", "ظهور قديم بعد", "التحقق", "ملاحظة"])
for r in rows:
    fl.append([r["old"], r["new"], r["kind"], AR[r["status"]], r["old_hits"], "نعم" if r["old_name_hit"] else "لا", r["new_hits"], r["verified"], r["note"]])
q = wb.create_sheet("QA"); q.sheet_view.rightToLeft = True
q.append(["الاختبار", "النتيجة", "التفاصيل"]); [q.append([t["test"], t["result"], t["detail"]]) for t in qa]
for sh in wb.worksheets:
    for c in sh[1]: c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="2F7D6B")
    for col in sh.columns: sh.column_dimensions[col[0].column_letter].width = 46 if col[0].column == 1 else 24
    for row in sh.iter_rows():
        for c in row: c.alignment = Alignment(wrap_text=True, vertical="top", horizontal="right")
fl.auto_filter.ref = fl.dimensions
wb.save(ROOT / "DAMANI_GLOBAL_REBRANDING_REPORT.xlsx")

# ---------------- DOCX
d = docx.Document()
st = d.styles["Normal"]; st.font.name = "Tajawal"; st.element.rPr.rFonts.set(qn("w:cs"), "Tajawal")
def para(t, bold=False, size=None):
    p = d.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p._p.get_or_add_pPr().append(p._p.makeelement(qn("w:bidi"), {}))
    r = p.add_run(t); r.bold = bold; r.font.rtl = True
    if size: r.font.size = docx.shared.Pt(size)
    return p
def table(header, data):
    t = d.add_table(rows=1, cols=len(header)); t.style = "Light Grid Accent 1"
    t._tbl.tblPr.append(t._tbl.makeelement(qn("w:bidiVisual"), {}))
    for i, h in enumerate(header): t.rows[0].cells[i].text = h
    for rw in data:
        cells = t.add_row().cells
        for i, v in enumerate(rw): cells[i].text = str(v)
para("تقرير إعادة التسمية الشاملة — ضماني / Damani", True, 18)
para("DAMANI_GLOBAL_REBRANDING_REPORT · 2026-11-01")
para("الملخص", True, 14); table(["البند", "القيمة"], summary)
para("الملفات المستبعدة أو التي تعذّر تعديلها", True, 14); table(["الملف", "السبب"], [(r["old"], r["note"]) for r in excluded])
para("نتائج الاختبارات التقنية والبصرية", True, 14); table(["الاختبار", "النتيجة", "التفاصيل"], [(t["test"], t["result"], t["detail"]) for t in qa])
para("ملاحظات وقرارات", True, 14); [para("• " + n) for n in notes]
para("القائمة الكاملة للملفات وحالة كل ملف في DAMANI_GLOBAL_REBRANDING_REPORT.xlsx (ورقة Files).")
d.save(ROOT / "DAMANI_GLOBAL_REBRANDING_REPORT.docx")

# ---------------- PDF (HTML -> Chromium)
font = (ROOT / "damani-brand/src/fonts/Tajawal-Regular.ttf").as_uri(); fontb = (ROOT / "damani-brand/src/fonts/Tajawal-Bold.ttf").as_uri()
def tbl(h, data): return "<table><tr>" + "".join(f"<th>{x}</th>" for x in h) + "</tr>" + "".join("<tr>" + "".join(f"<td>{x}</td>" for x in rw) + "</tr>" for rw in data) + "</table>"
logo = (ROOT / "damani-brand/Damani_Brand_System/02_Logos/SVG/damani_bilingual_primary.svg").as_uri()
by_status = Counter(AR[r["status"]] for r in rows)
html = f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{{font-family:T;src:url('{font}')}} @font-face{{font-family:T;font-weight:700;src:url('{fontb}')}}
@page{{size:A4;margin:16mm 14mm}} body{{font-family:T;color:#231F20;font-size:11pt;line-height:1.7}}
h1{{font-size:22pt;margin:8px 0 2px}} h2{{font-size:14pt;color:#2F7D6B;border-bottom:2px solid #2F7D6B;padding-bottom:3px;margin-top:22px}}
table{{width:100%;border-collapse:collapse;font-size:9.5pt;margin:6px 0}} th{{background:#2F7D6B;color:#fff;text-align:right;padding:5px 7px}}
td{{border-bottom:1px solid #ECE8DF;padding:5px 7px;vertical-align:top}} .en{{direction:ltr;unicode-bidi:isolate}} .mu{{color:#6B675F;font-size:9.5pt}}
.k{{display:inline-block;background:#F0F7F5;border-radius:8px;padding:8px 12px;margin:3px;font-weight:700}}</style></head><body>
<img src="{logo}" style="height:40px"><h1>تقرير إعادة التسمية الشاملة</h1><div class="mu">ضماناتي ← ضماني · <span class="en">→ Damani</span> · 2026-11-01 · DAMANI_GLOBAL_REBRANDING_REPORT</div>
<h2>الملخص</h2>{tbl(["البند","القيمة"], summary)}
<div>{''.join(f'<span class="k">{k}: {v}</span>' for k, v in by_status.items())}</div>
<h2>الملفات المستبعدة / التي تعذّر تعديلها</h2>{tbl(["الملف","السبب"], [(r["old"], r["note"]) for r in excluded])}
<h2>نتائج الاختبارات التقنية والبصرية</h2>{tbl(["الاختبار","النتيجة","التفاصيل"], [(t["test"], t["result"], t["detail"]) for t in qa])}
<h2>ملاحظات وقرارات</h2><ul>{''.join(f'<li>{n}</li>' for n in notes)}</ul>
<h2>قائمة الملفات ({len(rows)})</h2>{tbl(["الملف الجديد","الحالة","قبل","بعد","التحقق"], [(f'<span class="en">{r["new"] or r["old"]}</span>', AR[r["status"]], r["old_hits"], r["new_hits"], r["verified"]) for r in rows])}
</body></html>"""
src = HERE / "report.html"; src.write_text(html)
job = HERE / "report_job.json"
job.write_text(json.dumps([{"src": str(src), "out": str(ROOT / "DAMANI_GLOBAL_REBRANDING_REPORT.pdf"), "width": 800, "height": 1100, "pdf": True, "pdfWidth": "210mm", "pdfHeight": "297mm"}]))
subprocess.run(["node", str(ROOT / "damani-brand/src/render.mjs"), str(job)], check=True, stdout=subprocess.DEVNULL)
print("report ok", Counter(r["status"] for r in rows))
