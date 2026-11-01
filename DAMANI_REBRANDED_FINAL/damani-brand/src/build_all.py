"""Regenerate the whole Damani brand system and the delivery packages in dist/."""
import shutil
import subprocess
import sys
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
                zf.write(f, f"Damani_Brand_System/{f.relative_to(OUT)}")
    print(f"{name}: {z.stat().st_size / 1e6:.1f} MB")


def package():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    _zip("Damani_Brand_Assets.zip", [""])
    _zip("Damani_Logo_Package.zip", ["02_Logos", "README.md"])
    _zip("Damani_Design_System.zip", ["15_Technical_Documentation", "03_Color_System", "04_Typography", "06_Icons", "README.md"])
    for f in ["01_Brand_Book/Damani_Brand_Book.pdf", "01_Brand_Book/Damani_Brand_Guidelines.pdf",
              "01_Brand_Book/Damani_Brand_Presentation.pptx", "README.md"]:
        shutil.copy(OUT / f, DIST / f.split("/")[-1])


STEPS = [("logos", build_logos.build), ("foundation", build_foundation.build), ("exports", build_exports.build),
         ("applications", build_applications.build), ("motion", build_motion.build), ("book", build_book.build),
         ("pptx", build_pptx.build), ("docs", build_docs.build), ("package", package)]


def main():
    """Run every build step. A file-system, render or archive failure in any step is reported with the
    step's name and stops the build with exit code 1, so a half-built system is never mistaken for a finished one."""
    for name, step in STEPS:
        try:
            step()
        except (OSError, subprocess.CalledProcessError, zipfile.BadZipFile) as e:
            print(f"BUILD FAILED at step '{name}': {e}", file=sys.stderr)
            print("Outputs from this and later steps are incomplete; fix the cause and re-run build_all.py.", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
