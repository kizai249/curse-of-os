"""Monte Carlo logic checks for six USER-X games.

These are rule simulations with simple heuristic bots. They check pacing,
elimination balance and degenerate loops. They are NOT human playtest results.
Run: python3 sim.py  -> writes sim_results.json
"""

import json
import random
import statistics as st

N = 3000


def pct(xs, q):
    xs = sorted(xs)
    return xs[int(q * (len(xs) - 1))]


def summary(xs):
    return {"mean": round(st.mean(xs), 2), "p10": pct(xs, 0.1), "p90": pct(xs, 0.9)}


# ---------------- G01 THE LOCK (domino bluff) ----------------
def sim_g01(rng, players=8):
    tiles = [(a, b) for a in range(10) for b in range(a, 10)]
    lives = [2] * players
    turns = challenges = facedown = plays = 0
    first_elim_turn = None
    bluff_rep = [0] * players
    while sum(1 for x in lives if x > 0) > 2 and turns < 2000:
        pool = tiles[:]
        rng.shuffle(pool)
        hands = {
            p: [pool.pop() for _ in range(4)] for p in range(players) if lives[p] > 0
        }
        ends = None
        passes = 0
        cur = rng.choice(list(hands))
        while True:
            alive = [p for p in hands if lives[p] > 0]
            if len(alive) <= 2:
                break
            turns += 1
            h = hands[cur]
            legal = [t for t in h if ends is None or ends[0] in t or ends[1] in t]
            played = None
            lie = False
            if legal:
                played = rng.choice(legal)
                down = rng.random() < 0.35
            elif h and rng.random() < 0.45:
                played = rng.choice(h)
                down, lie = True, True
            else:
                down = False
            if played is None:
                if pool:
                    h.append(pool.pop())
                passes += 1
            else:
                passes = 0
                plays += 1
                h.remove(played)
                if down:
                    facedown += 1
                    others = [p for p in alive if p != cur]
                    pch = min(0.6, 0.2 + 0.08 * bluff_rep[cur])
                    if rng.random() < pch:
                        challenges += 1
                        ch = rng.choice(others)
                        loser = cur if lie else ch
                        if lie:
                            bluff_rep[cur] += 1
                            h.append(played)
                            if pool:
                                h.append(pool.pop())
                            played = None
                        lives[loser] -= 1
                        if lives[loser] == 0:
                            first_elim_turn = first_elim_turn or turns
                            hands.pop(loser, None)
                if played is not None:
                    v = (
                        played[0]
                        if ends is None
                        else (played[1] if played[0] in ends else played[0])
                    )
                    ends = (v, played[1]) if ends is None else (ends[0], v)
                if cur in hands and not hands[cur]:
                    lives[cur] = min(2, lives[cur] + 1)
                    break
            if passes >= len(alive) or (not pool and passes >= len(alive)):
                worst = max(
                    alive, key=lambda p: sum(a + b for a, b in hands.get(p, []))
                )
                lives[worst] -= 1
                if lives[worst] == 0:
                    first_elim_turn = first_elim_turn or turns
                break
            nxt = [p for p in hands if lives[p] > 0]
            if not nxt:
                break
            idx = (nxt.index(cur) + 1) % len(nxt) if cur in nxt else 0
            cur = nxt[idx]
    secs = turns * 12 * 0.75 + challenges * 15
    return dict(
        turns=turns,
        minutes=secs / 60,
        facedown_share=facedown / max(plays, 1),
        first_elim_min=(first_elim_turn or turns) * 12 * 0.75 / 60 + 0.0,
    )


# ---------------- G02 COUNTERFLOW (shedding) ----------------
def sim_g02(rng, players=10):
    def deck():
        d = [(s, n) for s in range(4) for n in range(10) for _ in range(2)]
        d += [
            (s, a)
            for s in range(4)
            for a in ("rev", "skip", "+2", "swap")
            for _ in range(2)
        ]
        rng.shuffle(d)
        return d

    alive = list(range(players))
    explosions = elims = 0
    total_turns = 0
    round_turns = []
    while len(alive) > 2:
        d = deck()
        hands = {p: [d.pop() for _ in range(7)] for p in alive}
        top = d.pop()
        direction, i, t = 1, 0, 0
        pending = 0
        while True:
            t += 1
            if t > 400:
                break
            p = alive[i % len(alive)]
            h = hands[p]
            legal = [c for c in h if c[0] == top[0] or c[1] == top[1]]
            if pending and not any(c[1] == "+2" for c in h):
                for _ in range(pending):
                    if not d:
                        d = deck()
                    h.append(d.pop())
                pending = 0
                legal = []
            if not legal:
                if not d:
                    d = deck()
                c = d.pop()
                if c[0] == top[0] or c[1] == top[1]:
                    legal = [c]
                    h.append(c)
                else:
                    h.append(c)
            if legal:
                c = sorted(legal, key=lambda x: isinstance(x[1], str))[0]
                h.remove(c)
                top = c
                if c[1] == "rev":
                    direction *= -1
                elif c[1] == "skip":
                    i += direction
                elif c[1] == "+2":
                    pending += 2
            if len(h) >= 10:
                explosions += 1
                elims += 1
                alive.remove(p)
                hands.pop(p)
                break
            if not h:
                for _ in range(2 if len(alive) > 6 else 1):
                    worst = max((q for q in alive if q != p), key=lambda q: len(hands[q]))
                    elims += 1
                    alive.remove(worst)
                break
            i += direction
        round_turns.append(t)
        total_turns += t
    return dict(
        minutes=total_turns * 5 * 1.2 / 60,
        explosion_share=explosions / max(elims, 1),
        round_minutes=st.mean(round_turns) * 6 / 60,
    )


# ---------------- G03 THE RUN (dice auction) ----------------
def sim_g03(rng, teams=4, per_team=3):
    pos = {(t, k): -1 for t in range(teams) for k in range(per_team)}  # -1 = home
    lives = {key: 2 for key in pos}
    fuel = [20] * teams
    done = {key: False for key in pos}
    safe = {0, 6, 12, 18}
    rounds = captures = 0
    starve_streak = [0] * teams
    max_starve = 0
    while rounds < 60:
        rounds += 1
        dice = sorted([rng.randint(1, 6) for _ in range(3)], reverse=True)
        bids = []
        for t in range(teams):
            active = [k for k in pos if k[0] == t and lives[k] > 0 and not done[k]]
            if not active:
                bids.append(-1)
                continue
            b = min(fuel[t], rng.choice([0, 1, 1, 2, 2, 3, 4]))
            bids.append(b)
            fuel[t] -= b
        order = sorted(range(teams), key=lambda t: (-bids[t], rng.random()))
        for rank, t in enumerate(order):
            if bids[t] < 0:
                continue
            if rank >= 3:
                starve_streak[t] += 1
                max_starve = max(max_starve, starve_streak[t])
                continue
            starve_streak[t] = 0
            roll = dice[rank]
            mine = [k for k in pos if k[0] == t and lives[k] > 0 and not done[k]]
            if not mine:
                continue
            k = max(mine, key=lambda x: pos[x])
            newp = pos[k] + roll
            if newp >= 24:
                done[k] = True
                continue
            pos[k] = newp
            if newp not in safe:
                for o in pos:
                    if o[0] != t and lives[o] > 0 and not done[o] and pos[o] == newp:
                        pos[o] = -1
                        lives[o] -= 1
                        captures += 1
        for t in range(teams):
            if sum(done[k] for k in pos if k[0] == t) >= 2:
                return dict(
                    rounds=rounds, captures=captures, max_starve=max_starve, finished=1
                )
    return dict(rounds=rounds, captures=captures, max_starve=max_starve, finished=0)


# ---------------- G06 THE STRANGER ----------------
def sim_g06(rng, players=10, p_detect=0.3):
    alive = list(range(players))
    stranger = rng.choice(alive)
    caught = rounds = 0
    stranger_rounds = []
    life = 0
    while len(alive) > 4:
        rounds += 1
        votes = {p: 0 for p in alive}
        for v in alive:
            if v == stranger:
                target = rng.choice([p for p in alive if p != v])
            else:
                target = (
                    stranger
                    if rng.random() < p_detect
                    else rng.choice([p for p in alive if p != v])
                )
            votes[target] += 1
        out = max(alive, key=lambda p: (votes[p], rng.random()))
        life += 1
        if out == stranger:
            caught += 1
            stranger_rounds.append(life)
            life = 0
            if rng.random() < 0.25:  # stranger guesses the word and survives
                stranger = rng.choice(alive)
                continue
            alive.remove(out)
            stranger = rng.choice(alive)
        else:
            alive.remove(out)
    return dict(rounds=rounds, catch_rate=caught / rounds)


# ---------------- G08 THE WELL ----------------
def sim_g08(rng, players=10, well0=30, refills=(15, 20, 25), greedy_share=0.3):
    """Tuned rules: well starts 30, season +15/20/25, fair-share drought rule."""
    tubes = [8] * players
    alive = list(range(players))
    kinds = {p: ("greedy" if rng.random() < greedy_share else "fair") for p in alive}
    well = well0
    droughts = elim = rounds = 0
    for _ in range(6):
        rounds += 1
        well += rng.choice(refills)
        share = well // len(alive)
        claims = {}
        for p in alive:
            if kinds[p] == "greedy":
                c = rng.choice([5, 6])
            else:
                c = min(6, max(0, share + rng.choice([-1, 0, 0, 1])))
                if tubes[p] <= 4:
                    c = min(6, c + 2)
            claims[p] = c
        if sum(claims.values()) <= well:
            for p in alive:
                tubes[p] += claims[p]
            well = int((well - sum(claims.values())) * 1.5)
        else:
            droughts += 1
            for p in alive:
                if claims[p] <= share:
                    tubes[p] += claims[p]
                    well -= claims[p]
            well = int(well * 2 / 3)
            for p in alive:
                if kinds[p] == "greedy" and rng.random() < 0.4:
                    kinds[p] = "fair"
        for p in list(alive):
            tubes[p] -= 3
            if tubes[p] < 3:
                alive.remove(p)
                well += max(tubes[p], 0)
                elim += 1
        if len(alive) <= 1:
            break
    return {"droughts": droughts, "eliminated": elim, "rounds": rounds}


# ---------------- G10 THE HIDDEN RING ----------------
def sim_g10(rng, team=6, tell=0.18):
    a, b = team, team
    rounds = elim_finder = elim_hider = draws = 0
    hiding = 0
    while a > 1 and b > 1 and rounds < 80:
        rounds += 1
        n_fists = (a if hiding == 0 else b) * 2
        ring = rng.randrange(n_fists)
        decoy_used = rng.random() < 0.08
        remaining = list(range(n_fists))
        outcome = None
        first = True
        while len(remaining) > 1:
            # finder reads tells: chance to spot the ring hand
            if rng.random() < tell * (2 if len(remaining) <= 4 else 1):
                if decoy_used and rng.random() < 0.3:
                    outcome = "finder_out"
                else:
                    outcome = "hider_out" if first else "point"
                break
            pick = rng.choice([x for x in remaining])
            if pick == ring:
                outcome = "finder_out"
                break
            remaining.remove(pick)
            first = False
        if outcome is None:
            outcome = "point"
        if outcome == "finder_out":
            elim_finder += 1
            if hiding == 0:
                b -= 1
            else:
                a -= 1
        elif outcome == "hider_out":
            elim_hider += 1
            if hiding == 0:
                a -= 1
            else:
                b -= 1
        else:
            draws += 1
        hiding = 1 - hiding
    return dict(
        rounds=rounds,
        finder_success=(draws + elim_hider) / rounds,
        minutes=rounds * 2.2,
    )


def main():
    rng = random.Random(2026)
    out = {
        "note": "محاكاة مونت كارلو ببوتات بسيطة تتبع القواعد — تتحقق من الإيقاع والتوازن، وليست نتائج اختبار لاعبين حقيقيين.",
        "runs_per_game": N,
    }

    r = [sim_g01(rng) for _ in range(N)]
    out["g01"] = {
        "minutes": summary([x["minutes"] for x in r]),
        "facedown_share": round(st.mean(x["facedown_share"] for x in r), 2),
        "first_elim_min": summary([round(x["first_elim_min"], 1) for x in r]),
    }
    r = [sim_g02(rng) for _ in range(N)]
    out["g02"] = {
        "minutes": summary([round(x["minutes"], 1) for x in r]),
        "explosion_share": round(st.mean(x["explosion_share"] for x in r), 2),
        "round_minutes": summary([round(x["round_minutes"], 1) for x in r]),
    }
    r = [sim_g03(rng) for _ in range(N)]
    out["g03"] = {
        "rounds": summary([x["rounds"] for x in r]),
        "captures": summary([x["captures"] for x in r]),
        "max_starve_streak": summary([x["max_starve"] for x in r]),
        "finished_share": round(st.mean(x["finished"] for x in r), 2),
    }
    r = [sim_g06(rng) for _ in range(N)]
    out["g06"] = {
        "rounds": summary([x["rounds"] for x in r]),
        "catch_rate": round(st.mean(x["catch_rate"] for x in r), 2),
    }
    r = [sim_g08(rng) for _ in range(N)]
    out["g08"] = {
        "droughts_ge1_share": round(st.mean(x["droughts"] >= 1 for x in r), 2),
        "eliminated": summary([x["eliminated"] for x in r]),
        "rounds": summary([x["rounds"] for x in r]),
    }
    r = [sim_g10(rng) for _ in range(N)]
    out["g10"] = {
        "rounds": summary([x["rounds"] for x in r]),
        "finder_success": round(st.mean(x["finder_success"] for x in r), 2),
        "minutes": summary([round(x["minutes"], 1) for x in r]),
    }
    with open("sim_results.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
