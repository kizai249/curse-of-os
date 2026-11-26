"""Write per-game HTML and render jobs. Usage: python build_game_pdfs.py [dims|docs] [G01 ...]"""

import json
import os
import subprocess
import sys

import game_docs
import model

OUT = os.path.join(model.ROOT, "out_html")


def run(jobs, name):
    jp = os.path.join(OUT, f"jobs_{name}.json")
    write(jp, json.dumps(jobs, ensure_ascii=False))
    try:
        subprocess.run(["node", os.path.join(model.ROOT, "build", "render.js"), jp], check=True)
    except (OSError, subprocess.CalledProcessError) as e:
        sys.exit(f"render failed for {jp}: {e}")


def write(path, text):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
    except OSError as e:
        sys.exit(f"cannot write {path}: {e}")


def main():
    mode = sys.argv[1]
    ids = sys.argv[2:]
    games = [g for g in model.load_games() if not ids or g["id"] in ids]
    jobs = []
    for g in games:
        gd = game_docs.gfolder(g)
        if mode == "dims":
            html, w, h = game_docs.dimension_page(g)
            hp = os.path.join(OUT, g["id"], "dims.html")
            write(hp, html)
            jobs.append(
                {
                    "html": hp,
                    "png": game_docs.img(g, "dimensioned_top.png"),
                    "w": w,
                    "h": h,
                }
            )
        else:
            for name, fn in game_docs.DOCS:
                hp = os.path.join(OUT, g["id"], name.replace(".pdf", ".html"))
                write(hp, fn(g))
                jobs.append(
                    {
                        "html": hp,
                        "pdf": os.path.join(gd, name),
                        "label": f"{g['en']} · {name[:-4]}",
                    }
                )
    run(jobs, mode)


if __name__ == "__main__":
    main()
