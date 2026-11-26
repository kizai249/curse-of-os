"""Parametric 3D scene definitions for the 10 games (meters).

Coordinate convention used here: x = east, d = north (depth), z = up,
origin at the centre of the play area floor. models3d.py converts to glTF Y-up.
Each primitive: dict(k=box|cyl|sph|tor, n=name, p=(x,d,z_bottom), s=(sx,sd,sz) or r/h,
c=hex color, a=alpha, role=..., part=<STL part key or None>).
Dimensions follow each game's GDD layout section.
"""

import math

INK = "#1C1C22"
FLOOR = "#24242C"
BONE = "#F3EFE6"
GREY = "#8A8A96"
WOOD = "#B08968"
STEEL = "#B7BCC4"
ACRYL = "#DDEFFF"
GOLD = "#E8B931"


def box(n, x, d, z, sx, sd, sz, c, a=1.0, role="prop", part=None):
    return dict(
        k="box", n=n, p=(x, d, z), s=(sx, sd, sz), c=c, a=a, role=role, part=part
    )


def cyl(n, x, d, z, r, h, c, a=1.0, role="prop", part=None):
    return dict(k="cyl", n=n, p=(x, d, z), r=r, h=h, c=c, a=a, role=role, part=part)


def sph(n, x, d, z, r, c, a=1.0, role="prop"):
    return dict(k="sph", n=n, p=(x, d, z), r=r, c=c, a=a, role=role, part=None)


def tor(n, x, d, z, R, r, c, role="prop", part=None):
    return dict(k="tor", n=n, p=(x, d, z), R=R, r=r, c=c, a=1.0, role=role, part=part)


def person(n, x, d, c=GREY, role="player"):
    """1.75 m scale figure (proxy, not a character design)."""
    return [
        cyl(n + "_body", x, d, 0, 0.2, 1.45, c, 0.45, role),
        sph(n + "_head", x, d, 1.6, 0.13, c, 0.45, role),
    ]


def ring(n, cx, cd, R, i, total, start=-90):
    ang = math.radians(start + 360 * i / total)
    return cx + R * math.cos(ang), cd + R * math.sin(ang), ang


def floor(w, d):
    return [
        box("floor_area", 0, 0, -0.01, w, d, 0.01, FLOOR, role="floor"),
        box(
            "safety_border_s",
            0,
            -d / 2 + 0.03,
            0,
            w,
            0.06,
            0.005,
            "#FFD400",
            role="floor",
        ),
        box(
            "safety_border_n",
            0,
            d / 2 - 0.03,
            0,
            w,
            0.06,
            0.005,
            "#FFD400",
            role="floor",
        ),
        box(
            "safety_border_w",
            -w / 2 + 0.03,
            0,
            0,
            0.06,
            d,
            0.005,
            "#FFD400",
            role="floor",
        ),
        box(
            "safety_border_e",
            w / 2 - 0.03,
            0,
            0,
            0.06,
            d,
            0.005,
            "#FFD400",
            role="floor",
        ),
    ]


def lectern(x, d, color):
    return [
        box("operator_lectern", x, d, 0, 0.5, 0.4, 1.1, INK, part=None),
        box("operator_lectern_top", x, d, 1.1, 0.55, 0.45, 0.03, color),
    ]


def timer(x, d):
    return [
        cyl("timer_stand", x, d, 0, 0.02, 1.6, STEEL),
        box("led_timer", x, d, 1.6, 0.6, 0.05, 0.2, "#111111"),
        box("led_digits", x, d - 0.03, 1.65, 0.45, 0.01, 0.1, "#FF3B30"),
    ]


def stools(y, n, w):
    out = []
    for i in range(n):
        x = -w / 2 + (i + 0.5) * w / n
        out.append(
            cyl(f"spectator_stool_{i}", x, y, 0, 0.17, 0.45, "#3A3A44", role="audience")
        )
    return out


# ---------------------------------------------------------------- games
def g01(c):
    P = floor(6, 6) + [box("eva_play_zone", 0, 0, 0, 3, 3, 0.02, "#0E0E10")]
    # domino chain (snake of 9 tiles, 60x30 cm)
    chain = [
        (-1.05, 0),
        (-0.45, 0),
        (0.15, 0),
        (0.6, 0.45),
        (0.6, 1.05),
        (-0.75, 0.45),
        (-0.75, 1.05),
        (0.15, -0.6),
        (0.75, -0.6),
    ]
    for i, (x, d) in enumerate(chain):
        rot = i in (3, 4, 5, 6)
        P.append(
            box(
                f"domino_tile_{i}",
                x,
                d,
                0.02,
                0.3 if rot else 0.6,
                0.6 if rot else 0.3,
                0.012,
                BONE,
                part="g01_tile" if i == 0 else None,
            )
        )
        P.append(
            box(
                f"domino_divider_{i}",
                x,
                d,
                0.032,
                0.3 if rot else 0.02,
                0.02 if rot else 0.3,
                0.002,
                "#0E0E10",
            )
        )
    for i in range(8):
        x, d, a = ring("rack", 0, 0, 2.2, i, 8)
        rx, rd = (
            0.7 if abs(math.sin(a)) > 0.7 else 0.2,
            0.2 if abs(math.sin(a)) > 0.7 else 0.7,
        )
        P.append(
            box(
                f"player_rack_{i}",
                x,
                d,
                0,
                rx,
                rd,
                0.35,
                INK,
                part="g01_rack" if i == 0 else None,
            )
        )
        P.append(cyl(f"life_disc_{i}a", x * 0.86, d * 0.86, 0.02, 0.04, 0.01, GOLD))
        P.append(
            cyl(f"life_disc_{i}b", x * 0.86 + 0.09, d * 0.86, 0.02, 0.04, 0.01, GOLD)
        )
        px, pd, _ = ring("p", 0, 0, 2.65, i, 8)
        P += person(f"player_{i}", px, pd)
    P += lectern(0, -2.75, c) + timer(0.8, -2.75)
    P.append(box("boneyard_box", -0.8, -2.7, 0, 0.7, 0.4, 0.3, WOOD))
    P += stools(2.75, 6, 4.5)
    P += person("operator", 0, -2.35, c, role="operator")
    return P, "g01_tile"


def g02(c):
    cols = ["#E63946", "#FFC300", "#06D6A0", "#4CC9F0"]
    P = floor(7, 7)
    for i in range(12):
        x, d, _ = ring("disc", 0, 0, 2.5, i, 12)
        P.append(cyl(f"floor_station_disc_{i}", x, d, 0, 0.3, 0.012, cols[i % 4]))
        if i < 10:
            P += person(f"player_{i}", x, d)
    P.append(box("discard_tower", 0, 0, 0, 0.5, 0.5, 1.2, INK, part="g02_tower"))
    P.append(box("discard_tower_window", 0, -0.255, 0.3, 0.36, 0.01, 0.8, ACRYL, 0.35))
    P.append(box("card_stack", 0, -0.2, 0.3, 0.12, 0.18, 0.35, c))
    P.append(cyl("direction_indicator", 0, 0, 1.2, 0.2, 0.02, c))
    P += timer(-3.2, 0) + timer(3.2, 0) + lectern(0, -3.2, c)
    P += stools(3.2, 6, 5)
    P += person("operator", 0, -2.85 + 0.0, c, role="operator")
    return P, "g02_tower"


def g03(c):
    P = floor(7, 7)
    teamc = ["#E63946", "#FFC300", "#06D6A0", c]
    sq = []
    for gx in range(7):
        for gd in range(7):
            if gx in (0, 6) or gd in (0, 6):
                sq.append((gx, gd))
    for i, (gx, gd) in enumerate(sq):
        x, d = -1.8 + gx * 0.6, -1.8 + gd * 0.6
        safe = (gx, gd) in ((0, 3), (6, 3), (3, 0), (3, 6))
        P.append(
            box(
                f"track_square_{i}",
                x,
                d,
                0,
                0.58,
                0.58,
                0.02,
                GOLD if safe else ("#2F3440" if i % 2 else "#3B4252"),
                part="g03_square" if i == 0 else None,
            )
        )
    for k, (hx, hd) in enumerate(
        ((-2.85, -2.85), (2.85, -2.85), (2.85, 2.85), (-2.85, 2.85))
    ):
        P.append(box(f"home_base_{k}", hx, hd, 0, 1.2, 1.2, 0.02, teamc[k], 0.9))
        P += person(f"player_home_{k}", hx, hd, teamc[k])
    for k, (gx, gd) in enumerate(((2, 0), (6, 2), (4, 6), (0, 4))):
        P += person(f"pawn_{k}", -1.8 + gx * 0.6, -1.8 + gd * 0.6, teamc[k])
    P.append(cyl("dice_arena", 0, 0, 0, 0.6, 0.15, "#3A3A44"))
    P.append(cyl("dice_arena_floor", 0, 0, 0.0, 0.5, 0.155, "#24242C"))
    for k, (x, d) in enumerate(((-0.15, 0.1), (0.18, 0.12), (0.0, -0.2))):
        P.append(
            box(
                f"giant_die_{k}",
                x,
                d,
                0.155,
                0.3,
                0.3,
                0.3,
                BONE,
                part="g03_die" if k == 0 else None,
            )
        )
    P.append(box("progress_board", 0, -3.3, 0.6, 1.2, 0.05, 0.85, BONE))
    P.append(box("progress_board_legs", 0, -3.3, 0, 0.9, 0.04, 0.6, STEEL))
    P += person("operator", 0.9, -3.2, c, role="operator")
    return P, "g03_die"


def g04(c):
    P = floor(7, 6)
    P.append(
        box("auctioneer_podium", 0, 2.4, 0, 0.7, 0.5, 1.15, INK, part="g04_podium")
    )
    P.append(box("auctioneer_podium_front", 0, 2.14, 0.15, 0.6, 0.02, 0.85, c))
    P.append(box("price_board", 1.4, 2.6, 0.8, 1.2, 0.05, 0.9, BONE))
    P.append(box("price_board_easel", 1.4, 2.6, 0, 0.9, 0.05, 0.8, STEEL))
    props = ["#C1121F", "#F4A261", "#6D597A", "#2A9D8F", "#E9C46A", "#264653"]
    for i in range(6):
        ang = math.radians(200 + i * 28)
        x, d = 2.3 * math.cos(ang) * 1.05, 0.6 + 2.3 * math.sin(ang) * 0.9
        P.append(box(f"souq_stall_crate_{i}", x, d + 1.6, 0, 0.6, 0.4, 0.9, WOOD))
        P.append(box(f"asset_prop_{i}", x, d + 1.6, 0.9, 0.25, 0.2, 0.25, props[i]))
    P.append(box("bank_table", 3.0, 0, 0, 0.6, 1.8, 0.74, "#E6E6E6"))
    P.append(box("sealed_bid_box", 3.0, 0.4, 0.74, 0.25, 0.25, 0.3, ACRYL, 0.4))
    for i in range(10):
        x = -2.0 + (i % 5) * 0.9
        d = 0.2 - (i // 5) * 0.9
        P += person(f"trader_{i}", x, d)
        P.append(cyl(f"bid_paddle_{i}", x + 0.25, d, 1.3, 0.11, 0.01, BONE))
    P += person("auctioneer", 0, 2.85, c, role="operator")
    P += person("banker", 3.45, 0, GREY, role="operator")
    P += stools(-2.7, 6, 5)
    return P, "g04_podium"


def g05(c):
    P = floor(6, 5)
    P.append(box("partition_frame", 0, 0, 0, 3.6, 0.05, 1.8, "#101014", part=None))
    P.append(box("partition_print", 0, 0, 0.9, 1.0, 0.06, 0.4, c))
    for side in (-1, 1):
        for k in (-0.9, 0.9):
            P.append(
                box(
                    f"booth_table_{side}_{k}",
                    k,
                    side * 0.4,
                    0,
                    1.8,
                    0.6,
                    0.74,
                    "#E6E6E6",
                )
            )
        for j in range(5):
            x = -1.44 + j * 0.72
            P.append(
                box(
                    f"choice_box_{side}_{j}",
                    x,
                    side * 0.35,
                    0.74,
                    0.2,
                    0.15,
                    0.1,
                    WOOD,
                    part="g05_choice_box" if (side, j) == (1, 0) else None,
                )
            )
            if j < 4:
                P.append(
                    box(
                        f"booth_divider_{side}_{j}",
                        x + 0.36,
                        side * 0.4,
                        0.74,
                        0.01,
                        0.6,
                        0.6,
                        "#C8C8D0",
                        0.8,
                    )
                )
            P += person(f"player_{side}_{j}", x, side * 1.05)
    P.append(box("reputation_board", 2.6, 0, 0.8, 0.05, 1.2, 0.9, BONE))
    P.append(box("reputation_board_easel", 2.6, 0, 0, 0.05, 0.9, 0.8, STEEL))
    for j in range(3):
        P.append(
            cyl(
                f"jury_stool_{j}",
                -2.6,
                -0.6 + j * 0.6,
                0,
                0.18,
                0.75,
                "#3A3A44",
                role="audience",
            )
        )
    P += person("operator", 2.3, -0.7, c, role="operator")
    return P, "g05_choice_box"


def g06(c):
    P = floor(6.5, 6.5) + [cyl("floor_circle", 0, 0, 0, 2.6, 0.004, "#3A1D22")]
    P.append(cyl("floor_circle_inner", 0, 0, 0, 2.0, 0.005, FLOOR))
    for i in range(10):
        x, d, a = ring("podium", 0, 0, 2.3, i, 10)
        P.append(
            box(
                f"player_podium_{i}",
                x,
                d,
                0,
                0.3,
                0.3,
                1.0,
                INK,
                part="g06_podium" if i == 0 else None,
            )
        )
        P.append(box(f"podium_cap_{i}", x, d, 1.0, 0.32, 0.32, 0.02, c))
        tx, td = x - 0.22 * math.cos(a), d - 0.22 * math.sin(a)
        P.append(
            cyl(
                f"vote_tube_{i}",
                tx,
                td,
                0.55,
                0.035,
                0.4,
                ACRYL,
                0.35,
                part="g06_tube" if i == 0 else None,
            )
        )
        P.append(
            cyl(f"vote_stones_{i}", tx, td, 0.55, 0.03, 0.025 * (i % 4), "#9AD1D4")
        )
        px, pd, _ = ring("p", 0, 0, 2.7, i, 10)
        P += person(f"player_{i}", px, pd)
    P += lectern(0, -3.0, c) + timer(0.9, -3.0)
    P += stools(3.0, 6, 5)
    P += person("operator", 0, -2.65 - 0.0, c, role="operator")
    return P, "g06_podium"


def g07(c):
    P = floor(6, 6)
    W, H, D0, y0 = 1.82, 1.82, 0.39, 2.3
    P.append(box("shelf_back", 0, y0 + 0.19, 0, W, 0.02, H, "#DCD3C3", part=None))
    for i in range(6):
        P.append(box(f"shelf_v_{i}", -W / 2 + i * W / 5, y0, 0, 0.03, D0, H, "#EFE8DC"))
        P.append(box(f"shelf_h_{i}", 0, y0, i * H / 5, W, D0, 0.03, "#EFE8DC"))
    cols = ["#8D6E63", GOLD, "#2E7D32", "#C62828", "#1565C0", "#6A1B9A", "#E0E0E0"]
    for r in range(5):
        for q in range(5):
            x = -W / 2 + (q + 0.5) * W / 5
            z = r * H / 5 + 0.03
            if (r + q) % 3 == 0:
                P.append(
                    cyl(f"prop_{r}_{q}", x, y0, z, 0.07, 0.2, cols[(r * 5 + q) % 7])
                )
            else:
                P.append(
                    box(
                        f"prop_{r}_{q}",
                        x,
                        y0,
                        z,
                        0.16,
                        0.14,
                        0.12 + 0.04 * (q % 3),
                        cols[(r * 5 + q) % 7],
                    )
                )
    for x in (-1.15, 1.15):
        P.append(cyl(f"curtain_post_{x}", x, y0 - 0.35, 0, 0.025, 2.0, STEEL))
    P.append(box("curtain_rail", 0, y0 - 0.35, 2.0, 2.3, 0.04, 0.04, STEEL))
    P.append(
        box("curtain_panel_left", -0.8, y0 - 0.35, 0.05, 0.6, 0.03, 1.95, "#3A0F12")
    )
    P.append(
        box("answer_line", 0, y0 - 3.0, 0, 5.0, 0.08, 0.005, "#FFD400", role="floor")
    )
    for i in range(10):
        P += person(f"player_{i}", -2.25 + i * 0.5, y0 - 3.35)
    for x in (-2.2, 2.2):
        P.append(cyl(f"flood_stand_{x}", x, y0 - 1.2, 0, 0.02, 1.8, STEEL))
        P.append(box(f"flood_light_{x}", x, y0 - 1.2, 1.8, 0.25, 0.1, 0.2, "#222"))
    P += person("assistant_backstage", 0.5, y0 + 0.75, GREY, role="operator")
    P += person("operator", 2.6, y0 - 0.4, c, role="operator")
    P += stools(-2.7, 6, 5)
    return P, "g07_cubby"


def g08(c):
    P = floor(6, 6)
    P.append(box("well_pedestal", 0, 0, 0, 0.5, 0.5, 0.5, INK, part="g08_pedestal"))
    P.append(box("well_acrylic", 0, 0, 0.5, 0.4, 0.4, 0.7, ACRYL, 0.3, part="g08_well"))
    P.append(box("well_water_balls", 0, 0, 0.51, 0.37, 0.37, 0.3, GOLD, 0.95))
    levels = [8, 11, 5, 9, 3, 12, 7, 10, 6, 4]
    for i in range(10):
        x, d, a = ring("tube", 0, 0, 2.0, i, 10)
        P.append(box(f"catch_tray_{i}", x, d, 0, 0.4, 0.4, 0.04, "#30303A"))
        P.append(
            box(
                f"tube_base_{i}",
                x,
                d,
                0.04,
                0.35,
                0.35,
                0.05,
                INK,
                part="g08_tube_base" if i == 0 else None,
            )
        )
        P.append(
            cyl(
                f"player_tube_{i}",
                x,
                d,
                0.09,
                0.05,
                1.0,
                ACRYL,
                0.3,
                part="g08_tube" if i == 0 else None,
            )
        )
        P.append(cyl(f"tube_balls_{i}", x, d, 0.09, 0.045, 0.04 * levels[i], GOLD))
        P.append(cyl(f"thirst_line_{i}", x, d, 0.09 + 0.12, 0.052, 0.012, "#E63946"))
        px, pd, _ = ring("p", 0, 0, 2.45, i, 10)
        P += person(f"player_{i}", px, pd)
    P.append(box("counting_tray", 0.6, -2.9, 0.0, 0.45, 0.45, 0.75, "#E6E6E6"))
    P += person("operator", 0, -2.9, c, role="operator")
    P += stools(2.9, 6, 4.5)
    return P, "g08_well_assembly"


def g09(c):
    P = floor(6, 5)
    for b, d0 in ((0, 0.9), (1, -1.1)):
        P.append(
            box(
                f"board_{b}",
                0,
                d0,
                0.71,
                2.4,
                0.7,
                0.04,
                "#3E2C23",
                part="g09_board" if b == 0 else None,
            )
        )
        for lx in (-1.0, 1.0):
            P.append(box(f"trestle_{b}_{lx}", lx, d0, 0, 0.05, 0.6, 0.71, STEEL))
        for row in (-1, 1):
            for k in range(6):
                x = -0.85 + k * 0.34
                P.append(
                    cyl(
                        f"bowl_{b}_{row}_{k}",
                        x,
                        d0 + row * 0.17,
                        0.75,
                        0.12,
                        0.08,
                        WOOD,
                    )
                )
                P.append(
                    sph(f"seed_{b}_{row}_{k}", x, d0 + row * 0.17, 0.8, 0.03, "#D9C7A7")
                )
        for sx in (-1.1, 1.1):
            P.append(
                box(f"store_basket_{b}_{sx}", sx, d0, 0.75, 0.16, 0.5, 0.1, "#A0855B")
            )
        P.append(box(f"chess_clock_{b}", 0, d0 + 0.42, 0.75, 0.18, 0.08, 0.08, "#111"))
        for side in (-1, 1):
            for j in (-0.4, 0.4):
                P += person(f"player_{b}_{side}_{j}", j, d0 + side * 0.75)
    P.append(box("bracket_board", 2.6, 0, 0.8, 0.05, 0.9, 0.6, BONE))
    P += person("operator", 1.6, 0.9, c, role="operator")
    P += stools(-2.2, 6, 5)
    return P, "g09_board"


def g10(c):
    P = floor(7, 5)
    for side in (-1, 1):
        d0 = side * 1.55
        P.append(box(f"table_{side}", 0, d0, 0, 1.8, 0.6, 0.74, "#E6E6E6"))
        P.append(box(f"velvet_cloth_{side}", 0, d0, 0.74, 1.9, 0.7, 0.01, "#2B1640"))
        for b in (-0.45, 0.45):
            P.append(
                box(
                    f"bench_{side}_{b}",
                    b * 2,
                    d0 + side * 0.65,
                    0,
                    0.9 * 2 - 0.05,
                    0.3,
                    0.45,
                    "#3A3A44",
                )
            )
        for j in range(6):
            x = -0.75 + j * 0.3
            P += person(f"player_{side}_{j}", x, d0 + side * 0.65)
            P.append(
                sph(
                    f"fist_{side}_{j}a",
                    x - 0.06,
                    d0 - side * 0.15,
                    0.78,
                    0.045,
                    "#C69C7A",
                )
            )
            P.append(
                sph(
                    f"fist_{side}_{j}b",
                    x + 0.06,
                    d0 - side * 0.15,
                    0.78,
                    0.045,
                    "#C69C7A",
                )
            )
    P.append(tor("hero_ring", 0.0, 0.0, 0.02, 0.025, 0.006, GOLD, part="g10_ring"))
    P.append(box("finder_lane", 0, 0, 0, 3.0, 1.9, 0.004, "#24242C", role="floor"))
    for x, d in ((-3.0, -2.0), (3.0, -2.0), (-3.0, 2.0), (3.0, 2.0)):
        P.append(cyl(f"spot_stand_{x}_{d}", x, d, 0, 0.02, 2.0, STEEL))
        P.append(cyl(f"spotlight_{x}_{d}", x, d, 2.0, 0.09, 0.2, "#222"))
    P += person("finder", -0.6, 0.0, "#F3EFE6")
    P += person("operator", 2.9, 0.0, c, role="operator")
    return P, "g10_ring"


BUILDERS = {
    "G01": g01,
    "G02": g02,
    "G03": g03,
    "G04": g04,
    "G05": g05,
    "G06": g06,
    "G07": g07,
    "G08": g08,
    "G09": g09,
    "G10": g10,
}

# Fabrication parts exported as STL (mm) — exact production dims from the BOM
PARTS = {
    "g01_tile": (
        "بلاطة دومينو 600×300×10 مم",
        [box("tile", 0, 0, 0, 0.6, 0.3, 0.01, BONE)],
    ),
    "g01_rack": (
        "رف بلاطات 700×200×350 مم",
        [
            box("rack_base", 0, 0, 0, 0.7, 0.2, 0.02, INK),
            box("rack_front", 0, -0.09, 0, 0.7, 0.02, 0.35, INK),
            box("rack_slot_wall", 0, 0.0, 0, 0.7, 0.012, 0.12, INK),
            box("rack_side_l", -0.34, 0, 0, 0.02, 0.2, 0.35, INK),
            box("rack_side_r", 0.34, 0, 0, 0.02, 0.2, 0.35, INK),
        ],
    ),
    "g02_tower": (
        "عمود الإلقاء 500×500×1200 مم",
        [
            box("tower_body", 0, 0, 0, 0.5, 0.5, 1.2, INK),
            box("tower_slot_cap", 0, 0, 1.2, 0.5, 0.5, 0.02, INK),
        ],
    ),
    "g03_die": ("نرد إسفنجي 300 مم", [box("die", 0, 0, 0, 0.3, 0.3, 0.3, BONE)]),
    "g03_square": (
        "مربع مسار 600×600×20 مم",
        [box("square", 0, 0, 0, 0.6, 0.6, 0.02, GOLD)],
    ),
    "g04_podium": (
        "منصة الدلّال 700×500×1150 مم",
        [
            box("podium", 0, 0, 0, 0.7, 0.5, 1.15, INK),
            box("podium_top", 0, 0, 1.15, 0.75, 0.55, 0.03, INK),
        ],
    ),
    "g05_choice_box": (
        "صندوق اختيار 200×150×100 مم",
        [
            box("cb_bottom", 0, 0, 0, 0.2, 0.15, 0.006, WOOD),
            box("cb_wall_n", 0, 0.072, 0, 0.2, 0.006, 0.1, WOOD),
            box("cb_wall_s", 0, -0.072, 0, 0.2, 0.006, 0.1, WOOD),
            box("cb_wall_w", -0.097, 0, 0, 0.006, 0.15, 0.1, WOOD),
            box("cb_wall_e", 0.097, 0, 0, 0.006, 0.15, 0.1, WOOD),
        ],
    ),
    "g06_podium": (
        "منصة لاعب 300×300×1000 مم",
        [
            box("podium", 0, 0, 0, 0.3, 0.3, 1.0, INK),
            box("cap", 0, 0, 1.0, 0.32, 0.32, 0.02, INK),
        ],
    ),
    "g06_tube": (
        "أنبوب تصويت Ø70×400 مم",
        [
            cyl("tube", 0, 0, 0, 0.035, 0.4, ACRYL),
            cyl("tube_base", 0, 0, 0, 0.05, 0.01, INK),
        ],
    ),
    "g07_cubby": (
        "خانة رف 330×390×330 مم (مرجع)",
        [box("cubby", 0, 0, 0, 0.33, 0.39, 0.33, WOOD)],
    ),
    "g08_well_assembly": ("تجميعة البئر: قاعدة + صندوق أكريليك + كرات (مرجع بصري، ليست قطعة قص)", [box("pedestal", 0, 0, 0, 0.5, 0.5, 0.5, INK), box("well", 0, 0, 0.5, 0.4, 0.4, 0.7, ACRYL, 0.3), box("balls", 0, 0, 0.51, 0.37, 0.37, 0.3, GOLD), cyl("tube", 0.45, 0.1, 0, 0.05, 1.0, ACRYL, 0.3), cyl("tube_balls", 0.45, 0.1, 0, 0.045, 0.32, GOLD), cyl("thirst", 0.45, 0.1, 0.12, 0.052, 0.012, "#E63946")]),
    "g08_pedestal": (
        "قاعدة البئر 500×500×500 مم",
        [box("pedestal", 0, 0, 0, 0.5, 0.5, 0.5, INK)],
    ),
    "g08_well": (
        "صندوق البئر الأكريليك 400×400×700 مم",
        [box("well", 0, 0, 0, 0.4, 0.4, 0.7, ACRYL)],
    ),
    "g08_tube_base": (
        "قاعدة أنبوب 350×350×50 مم",
        [box("base", 0, 0, 0, 0.35, 0.35, 0.05, INK)],
    ),
    "g08_tube": ("أنبوب لاعب Ø100×1000 مم", [cyl("tube", 0, 0, 0, 0.05, 1.0, ACRYL)]),
    "g09_board": (
        "لوح المنقلة 2400×700×40 مم",
        [box("board", 0, 0, 0, 2.4, 0.7, 0.04, "#3E2C23")],
    ),
    "g10_ring": ("خاتم اللعب Ø50 مم", [tor("ring", 0, 0, 0, 0.025, 0.006, GOLD)]),
}
