"""Assemble and render the brand book and the concise guidelines PDF."""
import json
import subprocess

from book_a import build_a
from book_b import build_b
from book_kit import Book, BOOK_CSS
from common import OUT, SRC, BUILD, page_html
from components import UI_CSS

# The concise practical guide keeps only the rules people apply daily.
GUIDE_SKIP_CH = {"01"}
GUIDE_SKIP_TITLES = ["مفهوم الشعار", "الصيغ اللونية", "متاجر التطبيقات", "البريد الإلكتروني", "الموقع الإلكتروني",
                     "البداية، التعريف", "رحلة الضمان،", "الأغلفة والعروض", "لينكدإن", "الإعلانات الخارجية",
                     "عن هذا الإصدار", "نظرة عامة", "مبادئ الحركة", "استراتيجية الرسائل"]


def _title(p):
    body = p["body"] if isinstance(p["body"], str) else ""
    return body[:400]


def render(book, name, subset=None, edition="دليل الهوية الكامل", edition_en="Brand Book"):
    body, n = book.render(subset, edition, edition_en)
    html = page_html(body, f"Damanati - {edition_en}", BOOK_CSS + UI_CSS.replace(".scr{", ".scr-x{"))
    BUILD.mkdir(exist_ok=True)
    src = OUT / "01_Brand_Book" / "source" / f"{name}.html"
    src.parent.mkdir(parents=True, exist_ok=True)
    src.write_text(html)
    job = BUILD / f"jobs_{name}.json"
    job.write_text(json.dumps([{"src": str(src), "out": str(OUT / "01_Brand_Book" / f"{name}.pdf"), "width": 1123,
                                "height": 794, "pdf": True, "pdfWidth": "297mm", "pdfHeight": "210mm"}]))
    subprocess.run(["node", str(SRC / "render.mjs"), str(job)], check=True, stdout=subprocess.DEVNULL)
    print(name, n, "pages")
    return n


def build():
    book = Book()
    build_a(book)
    build_b(book)
    render(book, "Damanati_Brand_Book")
    guide = lambda p: (p["guide"] and p["ch"] not in GUIDE_SKIP_CH and (p["chrome"] or p is book.pages[0] or p is book.pages[-1])
                       and not any(t in _title(p) for t in GUIDE_SKIP_TITLES))
    render(book, "Damanati_Brand_Guidelines", guide, "إرشادات الاستخدام المختصرة", "Brand Guidelines")


if __name__ == "__main__":
    build()
