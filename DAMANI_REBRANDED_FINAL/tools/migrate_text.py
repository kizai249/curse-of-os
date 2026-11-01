"""Brand-name migration for the Damani source tree (text files only).
Order matters: specific phrases first, then the general name map.
usage: python3 migrate_text.py <src_dir>   -> prints a per-file change log as JSON lines"""
import json
import sys
from pathlib import Path

SPECIFIC = [
    # reference to the user's original v1.0 file: keep the fact, drop the old name
    ("Damanati_Brand_Identity_Final.pdf", "the v1.0 brand identity guide (original reference PDF)"),
    # intentional misspelling example on the misuse page: misspell the NEW name
    ("Damanaty", "Damany"),
]
GENERAL = [("ضماناتي", "ضماني"), ("DAMANATI", "DAMANI"), ("Damanati", "Damani"), ("damanati", "damani")]
EXT = {".py", ".mjs", ".md", ".txt", ".json", ".css", ".html", ".svg", ".csv", ".gpl", ".gitignore"}
SKIP = {"ref_page04_logo_components.svg"}   # archival glyph geometry of the v1.0 PDF, no readable text


def main(root):
    for f in sorted(Path(root).rglob("*")):
        if not f.is_file() or f.name in SKIP or (f.suffix not in EXT and f.name != ".gitignore"):
            continue
        s = f.read_text(encoding="utf-8")
        counts = {}
        for old, new in SPECIFIC + GENERAL:
            n = s.count(old)
            if n:
                counts[old] = n
                s = s.replace(old, new)
        if counts:
            f.write_text(s, encoding="utf-8")
            print(json.dumps({"file": str(f.relative_to(root)), "replacements": counts}, ensure_ascii=False))


if __name__ == "__main__":
    main(sys.argv[1])
