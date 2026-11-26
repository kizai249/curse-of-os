"""Copy renders/.blend into 03_3D_Models and write the package README + file index."""

import glob
import os
import sys
import shutil

import game_docs
import model

PKG = model.PKG


def copy_file(src, dst):
    try:
        shutil.copy(src, dst)
    except OSError as e:
        sys.exit(f"cannot copy {src} -> {dst}: {e}")


def copy_3d():
    base = os.path.join(PKG, "03_3D_Models")
    subs = {
        "Renders": "perspective.png",
        "Top_Views": "top.png",
        "Perspective_Views": "perspective.png",
        "Dimensioned_Concepts": "dimensioned_top.png",
    }
    for g in model.load_games():
        tag = f"{g['id']}_{g['slug']}"
        for sub, name in subs.items():
            d = os.path.join(base, sub)
            os.makedirs(d, exist_ok=True)
            if sub == "Renders":
                for v in ("perspective", "front", "side", "assembly"):
                    copy_file(
                        game_docs.img(g, f"{v}.png"), os.path.join(d, f"{tag}_{v}.png")
                    )
            else:
                copy_file(game_docs.img(g, name), os.path.join(d, f"{tag}_{name}"))
        d = os.path.join(base, "Blender_Files")
        os.makedirs(d, exist_ok=True)
        for b in glob.glob(
            os.path.join(game_docs.gfolder(g), "3D_Project_Files", "*.blend")
        ):
            copy_file(b, d)


def readme():
    games = model.load_games()
    rank = model.ranking(games)
    lines = [
        "# USER-X — 10 ألعاب إقصائية أصلية (استوديو التصميم)",
        "",
        "حزمة تصميم كاملة بالعربية: بحث، 10 وثائق تصميم (GDD)، نماذج Blender، تشغيل، مشتريات، ميزانيات، واختيار.",
        "",
        "## الحالة الصادقة",
        "",
        "- **لم تُختبر أي لعبة مع لاعبين بعد.** معايير القبول في خطط الاختبار مقترحة.",
        "- **كل الأسعار تقديرية** لجدة (نوفمبر 2026) ولم يُتحقق منها؛ اطلب عروض أسعار مكتوبة (انظر أدلة المشتريات).",
        "- **روابط الموردين والمصادر** وُجدت عبر بحث الويب ولم تُفتح من بيئة البناء؛ تحقق منها قبل الاستخدام.",
        "- **الأرقام الاقتصادية افتراضات** قابلة للتعديل في ملفات Excel (الخلايا الصفراء).",
        "- **النماذج ثلاثية الأبعاد مفاهيمية** (Block-out) بأبعاد صحيحة للمساحة والعناصر الرئيسية، وليست رسومات تصنيع.",
        "",
        "## الألعاب",
        "",
        "| الترتيب | الرمز | اللعبة | الفئة | الموصى بها (ريال) | الحد الأدنى | تنبيه |",
        "|---|---|---|---|---|---|---|",
    ]
    for i, g in enumerate(rank, 1):
        c = model.costs(g)
        lines.append(
            f"| {i} | {g['id']} | {g['ar']} ({g['en']}) | {g['category']} | {model.fmt(c['rec']['total'])} | {model.fmt(c['mvb']['total'])} | {'؛ '.join(c['flags']) or '—'} |"
        )
    lines += [
        "",
        "## المجلدات",
        "",
        "- `01_Master_Research` — بحث الألعاب الشعبية، سجل المصادر (xlsx)، ملخص البحث والمفاهيم العشرين.",
        "- `02_GDD/Game_XX_*` — لكل لعبة: GDD (pdf/docx)، القواعد، SOP، قائمة الإعادة، السلامة، BOM وتكلفة (xlsx)، المشتريات، الاختبار، صور 3D وملف .blend.",
        "- `03_3D_Models` — كتالوج PDF، الصور، المساقط العلوية والمقيسة، ملفات Blender.",
        "- `04_Operations` — دليل التشغيل (pdf/docx)، خطة الفعالية، الطاقم، الجدولة، المخزون، نظام الإعادة، السلامة والطوارئ.",
        "- `05_Financials` — ميزانية المحفظة، المشتريات المجمعة، اقتصاديات الفعالية، خطة التدفق النقدي.",
        "- `06_Selection` — مصفوفة الاختيار (xlsx) وتقرير الاختيار والتوصية.",
        "- `07_Master_Presentation` — العرض الرئيسي (pptx/pdf).",
        "- `_source` — البيانات والمولدات: كل الملفات تُولّد من مصدر بيانات واحد (`_source/data`).",
        "",
        "## إعادة التوليد",
        "",
        "```bash",
        "bash _source/build/build_all.sh",
        "```",
        "",
        "يتطلب: Python 3 مع openpyxl وpython-docx وpython-pptx وfonttools، وbpy (Blender 5.1 كحزمة Python)، وNode + Playwright (Chromium)، وLibreOffice.",
        "الخطوط: IBM Plex Sans Arabic وKufam (رخصة OFL، في `_source/fonts`).",
        "",
    ]
    with open(os.path.join(PKG, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    try:
        copy_3d()
        readme()
        print("packaged")
    except OSError as e:  # disk/permission/missing-file errors: name the file, stop the build
        sys.exit(f"build step failed: {e}")
