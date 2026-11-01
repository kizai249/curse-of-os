"""Scan a tree for the old brand name inside every file format we produce.
usage: python3 scan_names.py <root> <out.json>
Formats: plain text, PDF (pdftotext + NFKC), PPTX/DOCX/XLSX (XML parts), ZIP (names + members),
images (filename only; raster content needs visual check), font/binary (skipped, listed)."""
import io, json, re, subprocess, sys, unicodedata, zipfile
from pathlib import Path

OLD = re.compile(r"damanat[iy]|ضماناتي|يتاناماض", re.I)
TEXT = {".py", ".mjs", ".js", ".md", ".txt", ".html", ".css", ".json", ".svg", ".csv", ".gpl", ".gitignore", ".xml", ".yaml", ".yml"}
OOXML = {".pptx", ".docx", ".xlsx"}
RASTER = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".mp4"}


def norm(s):
    return unicodedata.normalize("NFKC", s)


def hits_in_text(s):
    s = norm(s)
    return [s[max(0, m.start() - 25):m.end() + 25].replace("\n", " ") for m in OLD.finditer(s)]


def scan_bytes(name, data):
    ext = Path(name).suffix.lower()
    if ext in TEXT or Path(name).name == ".gitignore":
        return "text", hits_in_text(data.decode("utf-8", "ignore"))
    if ext == ".pdf":
        t = subprocess.run(["pdftotext", "-q", "-", "-"], input=data, capture_output=True).stdout.decode("utf-8", "ignore")
        return "pdf", hits_in_text(t)
    if ext in OOXML:
        z = zipfile.ZipFile(io.BytesIO(data))
        txt = " ".join(z.read(n).decode("utf-8", "ignore") for n in z.namelist() if n.endswith(".xml") or n.endswith(".rels"))
        return ext[1:], hits_in_text(txt)
    if ext == ".zip":
        z = zipfile.ZipFile(io.BytesIO(data))
        found = []
        for n in z.namelist():
            found += [f"[name] {h}" for h in hits_in_text(n)]
            kind, h = scan_bytes(n, z.read(n))
            found += [f"[{n}] {x}" for x in h]
        return "zip", found
    if ext in RASTER:
        return "raster", []
    return "binary", []


def main(root, out):
    root = Path(root)
    rows = []
    for f in sorted(p for p in root.rglob("*") if p.is_file() and "_build" not in p.parts and "__pycache__" not in p.parts):
        rel = str(f.relative_to(root))
        try:
            kind, h = scan_bytes(f.name, f.read_bytes())
        except (OSError, zipfile.BadZipFile, subprocess.SubprocessError) as e:
            # one unreadable or damaged file must not abort the audit: record it as unverified
            kind, h = "unreadable", []
            print(f"WARNING: could not scan {rel}: {e}", file=sys.stderr)
        name_hit = bool(OLD.search(rel))
        rows.append({"file": rel, "kind": kind, "name_hit": name_hit, "content_hits": len(h), "samples": h[:3]})
    json.dump(rows, open(out, "w"), ensure_ascii=False, indent=1)
    by = {}
    for r in rows:
        k = by.setdefault(r["kind"], [0, 0, 0])
        k[0] += 1; k[1] += r["content_hits"] > 0; k[2] += r["name_hit"]
    print("kind: files / with-content-hits / with-name-hits")
    for k, v in sorted(by.items()):
        print(f"  {k}: {v[0]} / {v[1]} / {v[2]}")
    print("total files", len(rows), "| content hits", sum(r["content_hits"] > 0 for r in rows), "| name hits", sum(r["name_hit"] for r in rows))


if __name__ == "__main__":
    main(*sys.argv[1:3])
