"""Recalculate every xlsx in LibreOffice (headless) and cross-check key totals against model.py. Exit 1 on any mismatch/error."""

import glob
import os
import subprocess
import sys
import tempfile

from openpyxl import load_workbook

import model

ERR = ("#VALUE!", "#REF!", "#NAME?", "#DIV/0!", "#N/A", "#NUM!", "Err:")


def recalc(paths, out):
    cmd = ["soffice", "--headless", "--calc", "--convert-to", "xlsx", "--outdir", out, *paths]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=600)
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
        sys.exit(f"LibreOffice recalc failed for {paths}: {e}")


def main():
    files = sorted(
        glob.glob(os.path.join(model.PKG, "0*", "**", "*.xlsx"), recursive=True)
    )
    fails = []
    with tempfile.TemporaryDirectory(dir=os.path.join(model.ROOT, "out_html")) as tmp:
        # files share basenames across games -> recalc each into its own dir
        jobs = {}
        for f in files:
            d = os.path.join(tmp, str(len(jobs)))
            os.makedirs(d)
            jobs[f] = d
        for f, d in jobs.items():
            recalc([f], d)

        def wbv(f):
            path = os.path.join(jobs[f], os.path.basename(f))
            try:
                return load_workbook(path, data_only=True)
            except (OSError, ValueError, KeyError) as e:
                sys.exit(f"cannot open recalculated workbook {path}: {e}")

        nerr = 0
        for f in files:
            for ws in wbv(f).worksheets:
                for row in ws.iter_rows():
                    for c in row:
                        if isinstance(c.value, str) and c.value.startswith(ERR):
                            fails.append(
                                f"{os.path.relpath(f, model.PKG)}!{ws.title}!{c.coordinate}={c.value}"
                            )
                            nerr += 1
        games = model.load_games()
        import game_docs

        for g in games:
            c = model.costs(g)
            e = model.economics(g)
            gd = game_docs.gfolder(g)
            s = wbv(os.path.join(gd, "Equipment_BOM.xlsx"))["الملخص"]
            for row, exp in (
                (5, c["mvb"]["total"]),
                (6, c["rec"]["total"]),
                (7, c["upg_total"]),
            ):
                if abs((s.cell(row, 2).value or 0) - exp) > 0.01:
                    fails.append(
                        f"{g['id']} BOM row{row} {s.cell(row, 2).value} != {exp}"
                    )
            m = wbv(os.path.join(gd, "Game_Cost_Model.xlsx"))["الاقتصاديات"]
            got = {r: m.cell(r, 2).value for r in (8, 10, 11, 21, 22, 23, 24)}
            exp = {
                8: e["sessions"],
                10: e["players_day"],
                11: e["revenue_day"],
                21: e["cost_day"],
                22: e["margin_day"],
                23: e["capex"],
                24: e["be_days"],
            }
            for r in exp:
                if (
                    isinstance(exp[r], (int, float))
                    and abs((got[r] or 0) - exp[r]) > 0.05
                ):
                    fails.append(f"{g['id']} econ row{r} {got[r]} != {exp[r]}")
        sm = wbv(os.path.join(model.PKG, "06_Selection", "Game_Selection_Matrix.xlsx"))[
            "مصفوفة الاختيار"
        ]
        sc = 3 + len(model.research.CRITERIA)
        for i, g in enumerate(games, 6):
            if abs(sm.cell(i, sc).value - model.weighted_score(g)) > 0.01:
                fails.append(
                    f"{g['id']} score {sm.cell(i, sc).value} != {model.weighted_score(g)}"
                )
        pb = wbv(
            os.path.join(model.PKG, "05_Financials", "Portfolio_Build_Budget.xlsx")
        )["ميزانية المحفظة"]
        tot = sum(model.costs(g)["rec"]["total"] for g in games)
        if abs(pb.cell(5 + len(games), 4).value - tot) > 0.05:
            fails.append(f"portfolio total {pb.cell(5 + len(games), 4).value} != {tot}")
        print(
            f"checked {len(files)} workbooks, formula errors: {nerr}, portfolio recommended total: {tot:,.2f}"
        )
    for f in fails:
        print("FAIL", f)
    print("QC", "PASS" if not fails else f"FAIL ({len(fails)})")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
