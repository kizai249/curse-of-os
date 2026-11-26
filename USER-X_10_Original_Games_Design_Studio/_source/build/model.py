"""Single source of truth for every generated document: loads game data and computes costs/economics.

All economic figures are HYPOTHESES (labelled as such in every output). Prices are unverified estimates.
"""

import importlib
import math
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # _source
PKG = os.path.dirname(ROOT)  # USER-X_10_Original_Games_Design_Studio
sys.path.insert(0, os.path.join(ROOT, "data"))

import common
import research

C = common.C
BRAND = common.BRAND
CONT = common.CONTINGENCY
BUDGET_MIN, BUDGET_MAX = 3000, 7000
NEAR_LIMIT = 6500  # flag when the recommended build is within SAR 500 of the ceiling

# ---- economic hypotheses (labelled "افتراض" everywhere they appear)
HYP = {
    "ticket": 60,  # SAR per player per game session (hypothesis)
    "occupancy": 0.60,  # share of seats sold (hypothesis)
    "shift_min": 360,  # one 6-hour operating shift
    "entry_buffer": 5,  # minutes between sessions for entry/briefing handover
    "event_days_month": 8,  # operating days per month (hypothesis)
    "venue_day": 600,  # share of venue rent per game per day (hypothesis)
    "marketing_day": 300,  # share of marketing per game per day (hypothesis)
    "fees": 0.05,  # booking/payment fees on revenue (hypothesis)
}


def load_games():
    out = []
    for i in range(1, 11):
        out.append(importlib.import_module(f"games.g{i:02d}").G)
    return out


def bom_rows(g, tier):
    """tier: 'rec' | 'mvb' | 'upg'. Returns list of dicts with qty>0."""
    rows = []
    if tier == "upg":
        src = [(b[0], b[1], b[2]) for b in g["upgrade"]]
    else:
        idx = 1 if tier == "rec" else 2
        src = [(b[0], b[idx], b[3]) for b in g["bom"]]
    for cid, qty, why in src:
        if not qty:
            continue
        it = C[cid]
        rows.append(dict(it, qty=qty, why=why, total=it["price"] * qty))
    return rows


def tier_cost(g, tier):
    sub = sum(r["total"] for r in bom_rows(g, tier))
    cont = round(sub * CONT, 2)
    return dict(sub=sub, cont=cont, total=round(sub + cont, 2))


def costs(g):
    rec, mvb, upg = tier_cost(g, "rec"), tier_cost(g, "mvb"), tier_cost(g, "upg")
    upg_total = round(
        rec["total"] + upg["total"], 2
    )  # upgrade = recommended + upgrade items
    flags = []
    if rec["total"] > BUDGET_MAX:
        flags.append("تجاوز سقف 7,000 ريال")
    elif rec["total"] > NEAR_LIMIT:
        flags.append("قريب من السقف (أقل من 500 ريال هامش)")
    if rec["total"] < BUDGET_MIN:
        flags.append("أقل من 3,000 ريال")
    if upg_total > BUDGET_MAX:
        flags.append("نسخة الترقية تتجاوز 7,000 (اختيارية)")
    return dict(rec=rec, mvb=mvb, upg_items=upg, upg_total=upg_total, flags=flags)


def by_category(g, tier="rec"):
    cats = {}
    for r in bom_rows(g, tier):
        cats[r["cat"]] = cats.get(r["cat"], 0) + r["total"]
    return cats


def economics(g):
    o = g["ops"]
    cycle = o["round_min"] + o["reset_min"] + HYP["entry_buffer"]
    sessions = max(1, math.floor(HYP["shift_min"] / cycle))
    seats = o["players_round"]
    players_day = round(sessions * seats * HYP["occupancy"])
    revenue_day = players_day * HYP["ticket"]
    L = common.LABOUR
    staff_day = (
        o["operators"] * L["operator_shift"]
        + o["judges"] * L["judge_shift"]
        + o["reset_crew"] * L["reset_crew_shift"]
    )
    cons_day = o["consumables_round"] * sessions
    maint_day = g["maintenance"]["month_cost"] / HYP["event_days_month"]
    overhead_day = HYP["venue_day"] + HYP["marketing_day"] + revenue_day * HYP["fees"]
    cost_day = staff_day + cons_day + maint_day + overhead_day
    margin_day = revenue_day - cost_day
    capex = costs(g)["rec"]["total"]
    be_days = math.ceil(capex / margin_day) if margin_day > 0 else None
    return dict(
        cycle=cycle,
        sessions=sessions,
        seats=seats,
        players_day=players_day,
        revenue_day=revenue_day,
        staff_day=staff_day,
        cons_day=round(cons_day, 2),
        maint_day=round(maint_day, 2),
        cost_day=round(cost_day, 2),
        overhead_day=round(overhead_day, 2),
        margin_day=round(margin_day, 2),
        capex=capex,
        be_days=be_days,
        staff_n=o["operators"] + o["judges"] + o["reset_crew"],
    )


def weighted_score(g):
    return round(sum(g["scores"][k] * w for k, _, w in research.CRITERIA) / 100, 2)


def ranking(games):
    return sorted(games, key=lambda g: -weighted_score(g))


def best_of(games):
    s = lambda k: max(games, key=lambda g: (g["scores"][k], weighted_score(g)))
    cheapest = min(games, key=lambda g: costs(g)["rec"]["total"])
    return {
        "الأعلى إجمالًا": ranking(games)[0],
        "الأكثر متعة": s("fun"),
        "الأكثر أصالة": s("orig"),
        "الأفضل للجمهور": s("audience"),
        "الأسرع إعادة": s("reset"),
        "الأكثر أمانًا": s("safety"),
        "الأقل تكلفة": cheapest,
        "الأكثر قابلية للتوسع": s("scale"),
        "الأقوى اجتماعيًا": s("social"),
        "الأقوى تجاريًا": s("commercial"),
    }


def fmt(n):
    return f"{n:,.0f}"


def risk_level(L, S):
    r = L * S
    return ("منخفض" if r <= 2 else "متوسط" if r <= 4 else "مرتفع"), r


if __name__ == "__main__":
    gs = load_games()
    for g in ranking(gs):
        c = costs(g)
        e = economics(g)
        print(
            g["id"],
            g["ar"],
            weighted_score(g),
            "rec",
            fmt(c["rec"]["total"]),
            "mvb",
            fmt(c["mvb"]["total"]),
            "upg",
            fmt(c["upg_total"]),
            c["flags"],
            "sess",
            e["sessions"],
            "BE",
            e["be_days"],
        )
