"""Regenerate the whole Damanati brand system and the delivery packages in dist/."""
import shutil
import zipfile

import build_applications
import build_book
import build_docs
import build_exports
import build_foundation
import build_logos
import build_motion
import build_pptx
from common import OUT, ROOT

DIST = ROOT / "dist"


def _zip(name, folders):
    z = DIST / name
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder in folders:
            base = OUT / folder if folder else OUT
            files = [base] if base.is_file() else sorted(p for p in base.rglob("*") if p.is_file())
            for f in files:
                zf.write(f, f"Damanati_Brand_System/{f.relative_to(OUT)}")
    print(f"{name}: {z.stat().st_size / 1e6:.1f} MB")


def package():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    _zip("Damanati_Brand_Assets.zip", [""])
    _zip("Damanati_Logo_Package.zip", ["02_Logos", "README.md"])
    _zip("Damanati_Design_System.zip", ["15_Technical_Documentation", "03_Color_System", "04_Typography", "06_Icons", "README.md"])
    for f in ["01_Brand_Book/Damanati_Brand_Book.pdf", "01_Brand_Book/Damanati_Brand_Guidelines.pdf",
              "01_Brand_Book/Damanati_Brand_Presentation.pptx", "README.md"]:
        shutil.copy(OUT / f, DIST / f.split("/")[-1])


if __name__ == "__main__":
    build_logos.build()
    build_foundation.build()
    build_exports.build()
    build_applications.build()
    build_motion.build()
    build_book.build()
    build_pptx.build()
    build_docs.build()
    package()
