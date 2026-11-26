"""Build editable Blender concept models + renders for the 10 USER-X games.

Run:  <bvenv>/bin/python build_games.py G01 G02 ...   (no args = all)
Geometry is built in metres from each game's physical spec (data/games/gXX.py). These are
CONCEPT models (block-out level, true footprint and key dimensions) — not fabrication CAD.
"""

import math
import re
import os
import sys
import time

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
PKG = os.path.dirname(SRC)
sys.path.insert(0, os.path.join(SRC, "build"))
import model

GAMES = {g["id"]: g for g in model.load_games()}
SAMPLES = int(os.environ.get("BL_SAMPLES", "24"))
RES = int(os.environ.get("BL_RES", "1400"))


def folder(g):
    return os.path.join(
        PKG, "02_GDD", f"Game_{g['num']:02d}_{g['en'].title().replace(' ', '_')}"
    )


# ---------------------------------------------------------------- helpers
MATS = {}


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1,)


def mat(name, color, rough=0.6, metal=0.0, emit=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    rgba = hexrgb(color)
    lin = tuple(c**2.2 for c in rgba[:3]) + (1,)
    b.inputs["Base Color"].default_value = lin
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = lin
        b.inputs["Emission Strength"].default_value = emit
    MATS[name] = m
    return m


def palette():
    B = model.BRAND
    return {
        "floor": mat("floor", "#22232b", 0.92),
        "wood": mat("wood", "#b98a5a", 0.55),
        "ply": mat("ply", "#d6b88c", 0.6),
        "black": mat("black", "#141418", 0.7),
        "bone": mat("bone", B["bone"], 0.5),
        "cyan": mat("cyan", B["cyan"], 0.4, emit=1.2),
        "magenta": mat("magenta", B["magenta"], 0.4, emit=0.8),
        "gold": mat("gold", B["gold"], 0.3, 0.6),
        "felt": mat("felt", "#1f4d3a", 0.95),
        "danger": mat("danger", B["danger"], 0.5),
        "grey": mat("grey", "#8a8b96", 0.7),
        "steel": mat("steel", "#b9bcc4", 0.3, 0.9),
        "person": mat("person", "#5c5f70", 0.8),
        "white": mat("white", "#e9e9ee", 0.4),
        "shade": mat("shade", B["shade"], 0.6),
        "blue": mat("blue", "#2f7de1", 0.3),
        "sand": mat("sand", "#c9a96e", 0.9),
        "rope": mat("rope", "#d9cfb5", 0.9),
    }


P = {}
PARTS = []


def link(o, part):
    if part:
        PARTS.append(o)
    return o


def box(name, size, loc, m, rot=(0, 0, 0), part=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(P[m])
    return link(o, part)


def cyl(name, r, h, loc, m, verts=32, rot=(0, 0, 0), part=False):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r, depth=h, location=loc, vertices=verts, rotation=rot
    )
    o = bpy.context.object
    o.name = name
    o.data.materials.append(P[m])
    return link(o, part)


def sph(name, r, loc, m, part=False):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=r, location=loc, segments=24, ring_count=12
    )
    o = bpy.context.object
    o.name = name
    o.data.materials.append(P[m])
    bpy.ops.object.shade_smooth()
    return link(o, part)


def ring(name, r, w, loc, m, z=0.004, seg=64):
    """flat floor ring (tape) of width w"""
    bpy.ops.mesh.primitive_torus_add(
        major_radius=r,
        minor_radius=w / 2,
        location=loc,
        major_segments=seg,
        minor_segments=6,
    )
    o = bpy.context.object
    o.name = name
    o.scale = (1, 1, z / w)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(P[m])
    return o


def person(name, x, y, seated=False, face=0.0, m="person"):
    h = 0.85 if seated else 1.42
    z0 = 0.12 if seated else 0.0
    cyl(name + "_body", 0.17, h, (x, y, z0 + h / 2), m, verts=16)
    sph(name + "_head", 0.11, (x, y, z0 + h + 0.13), m)


def tape_rect(name, w, l, cx, cy, m="cyan", t=0.04):
    box(name + "_n", (w, t, 0.004), (cx, cy + l / 2, 0.002), m)
    box(name + "_s", (w, t, 0.004), (cx, cy - l / 2, 0.002), m)
    box(name + "_e", (t, l, 0.004), (cx + w / 2, cy, 0.002), m)
    box(name + "_w", (t, l, 0.004), (cx - w / 2, cy, 0.002), m)


def table(name, w, d, h, x, y, top="ply", rot=0.0):
    box(name + "_top", (w, d, 0.03), (x, y, h - 0.015), top, rot=(0, 0, rot))
    c, s = math.cos(rot), math.sin(rot)
    for i, (dx, dy) in enumerate(
        [
            (w / 2 - 0.05, d / 2 - 0.05),
            (-w / 2 + 0.05, d / 2 - 0.05),
            (w / 2 - 0.05, -d / 2 + 0.05),
            (-w / 2 + 0.05, -d / 2 + 0.05),
        ]
    ):
        box(
            f"{name}_leg{i}",
            (0.04, 0.04, h - 0.03),
            (x + dx * c - dy * s, y + dx * s + dy * c, (h - 0.03) / 2),
            "grey",
        )


def whiteboard(name, x, y, rot=0.0):
    box(name, (1.2, 0.04, 0.9), (x, y, 1.45), "white", rot=(0, 0, rot))
    box(name + "_post", (0.05, 0.05, 1.0), (x, y, 0.5), "grey", rot=(0, 0, rot))
    box(name + "_foot", (0.7, 0.4, 0.03), (x, y, 0.015), "grey", rot=(0, 0, rot))


# ---------------------------------------------------------------- game builders
def build_howeila_vault(g):
    y0 = 2.3
    box("vault_frame", (1.2, 0.12, 1.2), (0, y0, 1.7), "black", part=True)
    box("tray_A", (1.16, 0.04, 1.16), (0, y0 - 0.08, 1.7), "ply", part=True)
    slots = [(0, 0)] + [
        (dx * k, dy * k)
        for k in (1, 2, 3)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
    ]
    for i, (sx, sz) in enumerate(slots):
        cyl(
            f"slot{i}",
            0.045,
            0.05,
            (sx * 0.16, y0 - 0.11, 1.7 + sz * 0.16),
            "bone",
            rot=(math.pi / 2, 0, 0),
            part=True,
        )
    box("shutter_h", (1.18, 0.006, 0.4), (0.35, y0 - 0.15, 1.7), "black", part=True)
    box("shutter_v", (0.4, 0.006, 1.18), (0, y0 - 0.16, 1.85), "shade", part=True)
    for sx in (-0.55, 0.55):
        box(f"post{sx}", (0.045, 0.045, 1.7), (sx, y0 + 0.08, 0.85), "wood", part=True)
    box("base", (1.3, 0.6, 0.018), (0, y0 + 0.08, 0.009), "ply", part=True)
    for sx in (-0.45, 0.45):
        box(f"sandbag{sx}", (0.3, 0.2, 0.12), (sx, y0 + 0.25, 0.08), "sand")
    whiteboard("hearts_board", 2.4, y0, 0)
    for i in range(8):
        a = math.radians(200 + i * (140 / 7))
        x, y = 3.5 * math.cos(a), y0 + 3.5 * math.sin(a)
        tape_rect(f"sq{i}", 0.6, 0.6, x, y)
        person(f"p{i}", x, y)
        cyl(
            f"dial{i}",
            0.14,
            0.006,
            (x, y + 0.25, 1.05),
            "cyan",
            rot=(math.pi / 2, 0, 0),
        )


def build_saqla_rush(g):
    for r, yy in enumerate((-1.125, 1.125)):
        for c, xx in enumerate((-0.95, 0.95)):
            table(f"t{r}{c}", 1.8, 0.75, 0.75, xx, yy)
            for k, dx in enumerate((-0.45, 0.45)):
                sx = xx + dx
                box(
                    f"tray{r}{c}{k}",
                    (0.6, 0.45, 0.03),
                    (sx, yy, 0.765),
                    "felt",
                    part=(r == 0 and c == 0),
                )
                for j, gx in enumerate((-0.08, 0.08)):
                    box(
                        f"gate{r}{c}{k}{j}",
                        (0.02, 0.02, 0.06),
                        (sx + gx, yy - math.copysign(0.2, yy) * -1, 0.81),
                        "cyan",
                        part=(r == 0 and c == 0),
                    )
                for p in range(5):
                    cyl(
                        f"puck{r}{c}{k}{p}",
                        0.025,
                        0.015,
                        (sx - 0.15 + p * 0.07, yy + 0.05, 0.788),
                        "magenta" if k else "gold",
                        part=(r == 0 and c == 0),
                    )
                box(
                    f"bag{r}{c}{k}",
                    (0.1, 0.1, 0.04),
                    (sx + 0.2, yy - 0.12, 0.8),
                    "danger",
                )
                box(
                    f"bin{r}{c}{k}",
                    (0.3, 0.2, 0.12),
                    (sx, yy - math.copysign(0.45, yy) * -1, 0.6),
                    "black",
                )
                person(f"p{r}{c}{k}", sx, yy + math.copysign(0.75, yy))
    box("timer", (0.6, 0.08, 0.35), (4.0, 0, 1.6), "black")
    box("timer_face", (0.5, 0.01, 0.25), (4.0, -0.05, 1.6), "cyan")
    box("timer_post", (0.05, 0.05, 1.45), (4.0, 0, 0.72), "grey")


def build_carrom_ring(g):
    for k, yy in enumerate((-1.3, 1.3)):
        table(f"tab{k}", 1.8, 0.6, 0.8, 0, yy, top="white")
        for side in (-1, 1):
            box(
                f"rail{k}{side}",
                (1.8, 0.02, 0.03),
                (0, yy + side * 0.31, 0.815),
                "black",
                part=(k == 0),
            )
        box(f"gutter{k}", (0.1, 0.6, 0.06), (0.95, yy, 0.78), "felt", part=(k == 0))
        for r, mname in ((0.2, "cyan"), (0.12, "magenta"), (0.05, "gold")):
            cyl(
                f"ring{k}{r}",
                r,
                0.002 + (0.2 - r) * 0.01,
                (0.55, yy, 0.802 + (0.2 - r) * 0.005),
                mname,
                part=(k == 0),
            )
        for d in range(3):
            cyl(
                f"disc{k}{d}",
                0.03,
                0.01,
                (-0.75 + d * 0.08, yy, 0.806),
                "danger" if d else "bone",
                part=(k == 0),
            )
        for p, px in enumerate((-1.4, -1.6)):
            person(f"pl{k}{p}", px, yy + (0.25 if p else -0.25))
    for j in range(6):
        person(f"aud{j}", 2.6, -2.5 + j, m="shade")


def build_last_majlis(g):
    for i, (cx, cy) in enumerate([(-1.7, -1.7), (1.7, -1.7), (-1.7, 1.7), (1.7, 1.7)]):
        tape_rect(f"maj{i}", 2.2, 2.2, cx, cy, m="gold", t=0.03)
        table(f"low{i}", 0.6, 0.6, 0.35, cx, cy, top="wood")
        for j, (dx, dy) in enumerate([(0, 0.65), (0, -0.65), (0.65, 0), (-0.65, 0)]):
            box(
                f"cush{i}{j}",
                (0.6, 0.6, 0.1),
                (cx + dx, cy + dy, 0.05),
                "magenta" if i == 0 else "shade",
                part=(i == 0),
            )
            person(f"p{i}{j}", cx + dx, cy + dy, seated=True)
        if i == 0:
            for t in range(4):
                box(
                    f"role{t}",
                    (0.06, 0.06, 0.01),
                    (cx - 0.1 + t * 0.065, cy, 0.355),
                    "gold",
                    part=True,
                )
            box(
                "pouch",
                (0.15, 0.2, 0.02),
                (cx + 0.2, cy + 0.15, 0.36),
                "black",
                part=True,
            )
    whiteboard("seals_board", 0, 3.6, 0)


def build_pebble_market(g):
    ring("market_circle", 3.5, 0.05, (0, 0, 0.002), "cyan")
    for i in range(4):
        a = math.radians(45 + i * 90)
        x, y = 3.2 * math.cos(a), 3.2 * math.sin(a)
        table(f"barter{i}", 0.6, 0.6, 1.1, x, y, top="felt")
        for k in range(5):
            cyl(
                f"gem{i}{k}",
                0.01,
                0.006,
                (x - 0.1 + k * 0.05, y, 1.105),
                ["cyan", "magenta", "gold", "danger", "blue"][k],
                part=(i == 0),
            )
    table("audit", 1.8, 0.75, 0.75, 0, 3.75, top="white")
    for k in range(5):
        box(
            f"sort{k}",
            (0.3, 0.25, 0.03),
            (-0.6 + k * 0.3, 3.75, 0.77),
            ["cyan", "magenta", "gold", "danger", "blue"][k],
            part=True,
        )
    box("treasury", (0.25, 0.25, 0.25), (-4.2, 3.4, 0.95), "ply", part=True)
    box("treasury_stand", (0.3, 0.3, 0.82), (-4.2, 3.4, 0.41), "grey")
    for i in range(12):
        a = i * math.tau / 12 + 0.2
        person(f"p{i}", 1.8 * math.cos(a), 1.8 * math.sin(a))


def build_tug_maze(g):
    for k, cx in enumerate((-2.0, 2.0)):
        part = k == 0
        box(f"base{k}", (1.6, 1.6, 0.018), (cx, 0, 0.009), "ply", part=part)
        box(f"post{k}", (0.09, 0.09, 0.85), (cx, 0, 0.44), "wood", part=part)
        box(f"gimbal{k}", (0.3, 0.3, 0.04), (cx, 0, 0.88), "steel", part=part)
        tilt = (math.radians(4), math.radians(-3), 0)
        box(f"board{k}", (1.0, 1.0, 0.018), (cx, 0, 0.92), "black", rot=tilt, part=part)
        for w, (wx, wy, sx, sy) in enumerate(
            [
                (0, 0.49, 1.0, 0.02),
                (0, -0.49, 1.0, 0.02),
                (0.49, 0, 0.02, 1.0),
                (-0.49, 0, 0.02, 1.0),
                (0.1, 0.2, 0.6, 0.02),
                (-0.2, -0.1, 0.02, 0.5),
                (0.25, -0.25, 0.4, 0.02),
            ]
        ):
            box(
                f"wall{k}{w}",
                (sx, sy, 0.04),
                (cx + wx, wy, 0.95),
                "cyan",
                rot=tilt,
                part=part,
            )
        sph(f"ball{k}", 0.025, (cx - 0.3, 0.3, 0.97), "magenta", part=part)
        for j, (dx, dy) in enumerate([(0.8, 0), (-0.8, 0), (0, 0.8), (0, -0.8)]):
            cyl(
                f"pulley{k}{j}",
                0.05,
                0.03,
                (cx + dx, dy, 0.06),
                "steel",
                rot=(math.pi / 2, 0, 0),
                part=part,
            )
            L = 2.2
            hx, hy = (
                cx + dx + math.copysign(L, dx) if dx else cx,
                dy + math.copysign(L, dy) if dy else 0,
            )
            mid = ((cx + dx + hx) / 2, (dy + hy) / 2, 0.75)
            if dx:
                cyl(f"rope{k}{j}", 0.006, L, mid, "rope", rot=(0, math.pi / 2, 0))
            else:
                cyl(f"rope{k}{j}", 0.006, L, mid, "rope", rot=(math.pi / 2, 0, 0))
            cyl(
                f"ropeup{k}{j}",
                0.006,
                0.9,
                (cx + dx * 0.8, dy * 0.8, 0.5),
                "rope",
                rot=(
                    0.5 * (dy != 0) * math.copysign(1, dy or 1),
                    -0.5 * (dx != 0) * math.copysign(1, dx or 1),
                    0,
                ),
            )
            person(
                f"p{k}{j}",
                hx + (math.copysign(0.3, dx) if dx else 0),
                hy + (math.copysign(0.3, dy) if dy else 0),
            )
        for s in range(4):
            box(
                f"sand{k}{s}",
                (0.3, 0.2, 0.12),
                (cx + (0.6 if s % 2 else -0.6), 0.6 if s < 2 else -0.6, 0.08),
                "sand",
            )


def build_seven_floors(g):
    R, n = 3.6, 8
    for i in range(n):
        a = math.radians(-150 + i * (120 / (n - 1)))
        x, y = R * math.cos(a), R * math.sin(a) + 2.6
        part = i == 0
        box(f"plinth{i}", (0.6, 0.6, 0.05), (x, y, 0.025), "ply", part=part)
        box(f"col{i}", (0.5, 0.5, 0.8), (x, y, 0.45), "black", part=part)
        cyl(f"wobble{i}", 0.15, 0.02, (x, y, 0.87), "cyan", part=part)
        z = 0.88
        for k in range(7):
            s = 0.10 - k * 0.011
            hgt = 0.05 if k < 6 else 0.06
            if k < 6:
                box(
                    f"blk{i}{k}",
                    (s, s, hgt),
                    (x, y, z + hgt / 2),
                    "wood" if k % 2 == 0 else "bone",
                    rot=(0, 0, k * 0.2),
                    part=part,
                )
            else:
                cyl(f"blk{i}{k}", 0.02, hgt, (x, y, z + hgt / 2), "gold", part=part)
            z += hgt
            if i % 3 == 2 and k == 3:
                break
        sph(f"bell{i}", 0.04, (x + 0.18, y + 0.15, 0.88), "gold", part=part)
        box(f"tray{i}", (0.4, 0.15, 0.03), (x - 0.05, y - 0.32, 0.86), "ply", part=part)
        px, py = (R + 0.7) * math.cos(a), (R + 0.7) * math.sin(a) + 2.6
        person(f"p{i}", px, py)
    for j in range(5):
        person(f"aud{j}", -1.0 + j * 0.5, 2.0, m="shade")


def stones_grid(prefix, cx, cy, size, z, n=4, part=False):
    cell = size / n
    box(prefix + "_board", (size, size, 0.018), (cx, cy, z), "black", part=part)
    for i in range(n + 1):
        o = -size / 2 + i * cell
        box(
            f"{prefix}_gx{i}",
            (0.004, size, 0.002),
            (cx + o, cy, z + 0.01),
            "cyan",
            part=part,
        )
        box(
            f"{prefix}_gy{i}",
            (size, 0.004, 0.002),
            (cx, cy + o, z + 0.01),
            "cyan",
            part=part,
        )
    k = 0
    for i in range(n):
        for j in range(n):
            if (i * 7 + j * 3) % 4 == 0 and k < 10:
                cyl(
                    f"{prefix}_st{i}{j}",
                    cell * 0.32,
                    0.015,
                    (
                        cx - size / 2 + cell * (i + 0.5),
                        cy - size / 2 + cell * (j + 0.5),
                        z + 0.017,
                    ),
                    "bone" if k % 2 else "magenta",
                    part=part,
                )
                k += 1


def build_shadow_istaffat(g):
    for t, (tx, ty) in enumerate([(-2.3, -1.6), (2.3, -1.6), (-2.3, 1.6), (2.3, 1.6)]):
        table(f"tab{t}", 1.8, 0.75, 0.75, tx, ty)
        for b, dx in enumerate((-0.45, 0.45)):
            stones_grid(f"bd{t}{b}", tx + dx, ty, 0.48, 0.76, part=(t == 0 and b == 0))
            box(f"clock{t}{b}", (0.18, 0.08, 0.07), (tx + dx, ty + 0.3, 0.785), "shade")
            for side in (-1, 1):
                cyl(
                    f"stool{t}{b}{side}",
                    0.17,
                    0.45,
                    (tx + dx, ty + side * 0.65, 0.225),
                    "grey",
                    verts=16,
                )
                person(f"p{t}{b}{side}", tx + dx, ty + side * 0.65, seated=True)
    table("final", 1.2, 1.2, 0.75, 0, 0, top="shade")
    stones_grid("final", 0, 0, 0.9, 0.76)


def build_the_well(g):
    yw = 1.8
    for i in range(5):
        x = -1.6 + i * 0.8
        cyl(f"well{i}", 0.225, 0.7, (x, yw, 0.35), "ply", verts=8, part=(i == 2))
        cyl(f"lid{i}", 0.24, 0.03, (x, yw, 0.715), "black", verts=8, part=(i == 2))
        cyl(f"mouth{i}", 0.075, 0.032, (x, yw, 0.72), "cyan", verts=16, part=(i == 2))
    for sx in (-1.8, 1.8):
        box(f"gpost{sx}", (0.095, 0.095, 1.6), (sx, yw, 0.8), "wood", part=True)
        box(f"gfoot{sx}", (0.6, 0.6, 0.04), (sx, yw, 0.02), "ply")
        box(f"gsand{sx}", (0.3, 0.2, 0.12), (sx, yw + 0.25, 0.1), "sand")
    box("beam", (3.7, 0.095, 0.095), (0, yw, 1.65), "wood", part=True)
    cyl(
        "pulley", 0.06, 0.03, (0, yw, 1.55), "steel", rot=(math.pi / 2, 0, 0), part=True
    )
    cyl("bucket_rope", 0.005, 0.5, (0, yw, 1.3), "rope", part=True)
    cyl("bucket", 0.07, 0.1, (0, yw, 1.0), "grey", part=True)
    sph("water", 0.05, (0, yw, 1.06), "blue", part=True)
    for i in range(16):
        a = math.radians(200 + i * (140 / 15))
        x, y = 3.0 * math.cos(a), yw + 3.0 * math.sin(a) - 0.4
        person(f"p{i}", x, y)
    for t, (tx, ty) in enumerate(
        [(-2.0, -0.6), (-0.7, -1.3), (0.7, -1.3), (2.0, -0.6)]
    ):
        table(
            f"hi{t}", 1.2, 0.6, 1.05, tx, ty, rot=math.atan2(yw - ty, -tx) - math.pi / 2
        )
    whiteboard("score", -3.4, 2.2, 0.4)


def build_taqiya_circle(g):
    R = 2.0
    ring("path_in", 2.55, 0.04, (0, 0, 0.002), "cyan")
    ring("path_out", 3.35, 0.04, (0, 0, 0.002), "cyan")
    ring("aud_line", 3.95, 0.03, (0, 0, 0.002), "magenta")
    behind = {1, 5, 9}
    for i in range(12):
        a = i * math.tau / 12
        x, y = R * math.cos(a), R * math.sin(a)
        box(
            f"cush{i}",
            (0.5, 0.5, 0.1),
            (x, y, 0.05),
            "magenta",
            rot=(0, 0, a),
            part=(i == 0),
        )
        person(f"p{i}", x, y, seated=True)
        px, py = (R - 0.45) * math.cos(a + 0.12), (R - 0.45) * math.sin(a + 0.12)
        cyl(f"peg{i}", 0.015, 0.4, (px, py, 0.2), "wood", part=(i == 0))
        box(f"pegbase{i}", (0.12, 0.12, 0.03), (px, py, 0.015), "black", part=(i == 0))
        for r in range(3):
            cyl(
                f"life{i}{r}",
                0.04,
                0.012,
                (px, py, 0.05 + r * 0.02),
                "gold",
                part=(i == 0),
            )
        if i in behind:
            tx, ty = (R + 0.35) * math.cos(a), (R + 0.35) * math.sin(a)
            bpy.ops.mesh.primitive_uv_sphere_add(
                radius=0.09, location=(tx, ty, 0.0), segments=24, ring_count=12
            )
            o = bpy.context.object
            o.name = f"taqiya{i}"
            o.scale = (1, 1, 0.6)
            o.data.materials.append(P["bone"])
            link(o, True)
    person("carrier", 2.95 * math.cos(2.2), 2.95 * math.sin(2.2), m="shade")
    for j in range(10):
        a = j * math.tau / 10 + 0.3
        person(f"aud{j}", 4.4 * math.cos(a), 4.4 * math.sin(a), m="shade")


EXPLODE_AXIS = {"G01": (0, -1, 0)}
EXPLODE_GAP = {"G01": 0.18, "G06": 0.3, "G09": 0.35}

BUILDERS = {
    f"G{i:02d}": f
    for i, f in enumerate([build_howeila_vault, build_saqla_rush, build_carrom_ring, build_last_majlis, build_pebble_market, build_tug_maze, build_seven_floors, build_shadow_istaffat, build_the_well, build_taqiya_circle], 1)
}


# ---------------------------------------------------------------- scene / cameras / render
def setup_scene(g):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    PARTS.clear()
    P.clear()
    P.update(palette())
    s = bpy.context.scene
    s.unit_settings.system = "METRIC"
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = SAMPLES
    try:
        s.cycles.use_denoising = True
    except (
        Exception
    ):  # denoiser not compiled in this build — renders stay valid, just noisier
        pass
    s.render.film_transparent = False
    s.view_settings.view_transform = "Standard"
    w = bpy.data.worlds.new("world")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Color"].default_value = (
        0.012,
        0.012,
        0.016,
        1,
    )
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
    s.world = w
    W, L = g["physical"]["footprint"]
    box("floor", (W + 14, L + 14, 0.02), (0, 0, -0.011), "floor")
    # footprint outline (cyan) = the game's allocated floor area
    tape_rect("footprint", W, L, 0, 0, m="cyan", t=0.05)

    def light(name, kind, loc, rot, energy, color=(1, 1, 1), size=None):
        ld = bpy.data.lights.new(name, kind)
        ld.energy = energy
        ld.color = color
        if size and kind == "AREA":
            ld.size = size
        lo = bpy.data.objects.new(name, ld)
        s.collection.objects.link(lo)
        lo.location = loc
        lo.rotation_euler = rot

    light(
        "key",
        "SUN",
        (0, 0, 10),
        (math.radians(40), math.radians(15), math.radians(-35)),
        3.2,
    )
    light("fill", "AREA", (0, 0, 7), (0, 0, 0), 900, size=max(W, L))
    light(
        "rim_c",
        "POINT",
        (-W / 2 - 1, L / 2 + 1, 2.5),
        (0, 0, 0),
        600,
        color=(0.0, 0.87, 0.9),
    )
    light(
        "rim_m",
        "POINT",
        (W / 2 + 1, -L / 2 - 1, 2.5),
        (0, 0, 0),
        500,
        color=(0.96, 0.3, 0.97),
    )
    return s


def add_cam(name, loc, rot, ortho=None, lens=35):
    cd = bpy.data.cameras.new(name)
    if ortho:
        cd.type = "ORTHO"
        cd.ortho_scale = ortho
    else:
        cd.lens = lens
    cd.clip_end = 200
    co = bpy.data.objects.new(name, cd)
    bpy.context.scene.collection.objects.link(co)
    co.location = loc
    co.rotation_euler = rot
    return co


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def render(s, cam, path, rx, ry):
    s.camera = cam
    s.render.resolution_x, s.render.resolution_y = rx, ry
    s.render.filepath = path
    try:
        bpy.ops.render.render(write_still=True)
    except RuntimeError as e:
        sys.exit(f"render failed for {path}: {e}")


def build(gid):
    g = GAMES[gid]
    t0 = time.time()
    s = setup_scene(g)
    BUILDERS[gid](g)
    W, L = g["physical"]["footprint"]
    big = max(W, L)
    out = folder(g)
    img = os.path.join(out, "3D_Concept_Images")
    proj = os.path.join(out, "3D_Project_Files")
    os.makedirs(img, exist_ok=True)
    os.makedirs(proj, exist_ok=True)
    persp = add_cam(
        "CAM_Perspective", (-big * 0.72, -big * 0.88, big * 0.62), (0, 0, 0)
    )
    look_at(persp, (0, 0, 0.6))
    top = add_cam("CAM_Top", (0, 0, 30), (0, 0, 0), ortho=W * 1.12)
    front = add_cam(
        "CAM_Front", (0, -40, 0), (math.radians(90), 0, 0), ortho=max(W * 1.08, 5.0)
    )
    front.location.z = front.data.ortho_scale * 0.5 / 2 - 0.3
    side = add_cam(
        "CAM_Side",
        (40, 0, 0),
        (math.radians(90), 0, math.radians(90)),
        ortho=max(L * 1.08, 5.0),
    )
    side.location.z = side.data.ortho_scale * 0.5 / 2 - 0.3
    blend = os.path.join(proj, f"{gid}_{g['slug']}.blend")
    try:
        bpy.ops.wm.save_as_mainfile(filepath=blend)
    except RuntimeError as e:
        sys.exit(f"cannot save {blend}: {e}")
    rx = RES
    render(s, persp, os.path.join(img, "perspective.png"), rx, int(rx * 0.625))
    ty = int(rx * L / W * 1.0)
    top.data.ortho_scale = max(W, L) * 1.12
    render(s, top, os.path.join(img, "top.png"), rx, ty)
    render(s, front, os.path.join(img, "front.png"), rx, rx // 2)
    render(s, side, os.path.join(img, "side.png"), rx, rx // 2)
    # assembly / exploded view of the key apparatus
    keep = set(PARTS)
    for o in list(s.objects):
        if o.type == "MESH" and o not in keep:
            o.hide_render = True
    if PARTS:
        ax = Vector(EXPLODE_AXIS.get(gid, (0, 0, 1)))
        groups = {}
        for o in PARTS:
            groups.setdefault(re.sub(r"[\d_.-]+.*$", "", o.name) or o.name, []).append(o)
        order = sorted(groups, key=lambda k: sum(o.location.dot(ax) for o in groups[k]) / len(groups[k]))
        for rnk, k in enumerate(order):
            for o in groups[k]:
                o.location += ax * (rnk * EXPLODE_GAP.get(gid, 0.22))
        mn = Vector(
            (
                min(o.location.x for o in PARTS),
                min(o.location.y for o in PARTS),
                min(o.location.z for o in PARTS),
            )
        )
        mx = Vector(
            (
                max(o.location.x for o in PARTS),
                max(o.location.y for o in PARTS),
                max(o.location.z for o in PARTS),
            )
        )
        c = (mn + mx) / 2
        span = max((mx - mn).length, 0.8)
        asm = add_cam(
            "CAM_Assembly",
            (c.x - span * 1.1, c.y - span * 1.4, c.z + span * 0.8),
            (0, 0, 0),
            lens=45,
        )
        look_at(asm, c)
        render(s, asm, os.path.join(img, "assembly.png"), rx, int(rx * 0.625))
    print(gid, "done", round(time.time() - t0, 1), "s", flush=True)


if __name__ == "__main__":
    try:
        ids = [a for a in sys.argv[1:] if a.startswith("G")] or list(BUILDERS)
        for gid in ids:
            build(gid)
    except (OSError, RuntimeError) as e:  # disk/permission/missing-file errors: name the file, stop the build
        sys.exit(f"build step failed: {e}")
