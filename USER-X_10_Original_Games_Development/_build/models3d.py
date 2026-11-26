"""Export the 10 game scenes: GLB, OBJ, STL parts, Blender script, spec sheet, SVG layout.

Run: python3 models3d.py  (writes into ../USER-X_10_Games_3D_Models/Game_XX)
"""

import json
import math
import os

import numpy as np
import trimesh

import games_a
import games_b
import scenes
from common import CONTINGENCY

ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "USER-X_10_Games_3D_Models")
)
GAMES = games_a.GAMES_A + games_b.GAMES_B


def hex_rgba(h, a=1.0):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [a]


def to_mesh(pr):
    """Primitive (z-up, x east, d north) -> trimesh in glTF Y-up (x, z, -d)."""
    k = pr["k"]
    x, d, z = pr["p"]
    if k == "box":
        sx, sd, sz = pr["s"]
        m = trimesh.creation.box(extents=(sx, sz, sd))
        m.apply_translation((x, z + sz / 2, -d))
    elif k == "cyl":
        m = trimesh.creation.cylinder(
            radius=pr["r"], height=max(pr["h"], 0.002), sections=32
        )
        m.apply_transform(
            trimesh.transformations.rotation_matrix(-math.pi / 2, (1, 0, 0))
        )
        m.apply_translation((x, z + max(pr["h"], 0.002) / 2, -d))
    elif k == "sph":
        m = trimesh.creation.icosphere(subdivisions=2, radius=pr["r"])
        m.apply_translation((x, z + pr["r"], -d))
    elif k == "tor":
        m = trimesh.creation.torus(
            major_radius=pr["R"],
            minor_radius=pr["r"],
            major_sections=48,
            minor_sections=16,
        )
        m.apply_transform(
            trimesh.transformations.rotation_matrix(-math.pi / 2, (1, 0, 0))
        )
        m.apply_translation((x, z + pr["r"], -d))
    else:
        raise ValueError(k)
    rgba = hex_rgba(pr["c"], pr["a"])
    mat = trimesh.visual.material.PBRMaterial(
        name=pr["n"] + "_mat",
        baseColorFactor=rgba,
        metallicFactor=0.0,
        roughnessFactor=0.7,
        alphaMode="BLEND" if pr["a"] < 1 else "OPAQUE",
    )
    m.visual = trimesh.visual.TextureVisuals(material=mat)
    return m


def build_scene(prims):
    sc = trimesh.Scene()
    for pr in prims:
        sc.add_geometry(to_mesh(pr), node_name=pr["n"], geom_name=pr["n"])
    return sc


def blender_script(g, prims):
    lines = [
        f'"""Blender {g["id"]} {g["en"]} — rebuilds the USER-X concept blockout (meters, Z-up).',
        "Generated from scenes.py. NOT executed in Blender inside the build environment;",
        "run in Blender 3.6+/4.x: Scripting tab > Open > Run Script.",
        '"""',
        "import bpy, math",
        "bpy.ops.wm.read_factory_settings(use_empty=True)",
        "def mat(name, rgba):",
        "    m = bpy.data.materials.new(name); m.use_nodes = True",
        "    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = rgba",
        "    if rgba[3] < 1:",
        "        b.inputs['Alpha'].default_value = rgba[3]",
        "        m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None",
        "    return m",
        "def put(o, name, rgba):",
        "    o.name = name; o.data.materials.append(mat(name + '_m', rgba))",
    ]
    for pr in prims:
        x, d, z = pr["p"]
        rgba = tuple(round(v, 3) for v in hex_rgba(pr["c"], pr["a"]))
        if pr["k"] == "box":
            sx, sd, sz = pr["s"]
            lines.append(
                f"bpy.ops.mesh.primitive_cube_add(size=1, location=({x:.3f},{d:.3f},{z + sz / 2:.3f})); o=bpy.context.object; o.scale=({sx:.3f},{sd:.3f},{sz:.3f}); put(o,'{pr['n']}',{rgba})"
            )
        elif pr["k"] == "cyl":
            h = max(pr["h"], 0.002)
            lines.append(
                f"bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius={pr['r']:.3f}, depth={h:.3f}, location=({x:.3f},{d:.3f},{z + h / 2:.3f})); put(bpy.context.object,'{pr['n']}',{rgba})"
            )
        elif pr["k"] == "sph":
            lines.append(
                f"bpy.ops.mesh.primitive_uv_sphere_add(radius={pr['r']:.3f}, location=({x:.3f},{d:.3f},{z + pr['r']:.3f})); put(bpy.context.object,'{pr['n']}',{rgba})"
            )
        elif pr["k"] == "tor":
            lines.append(
                f"bpy.ops.mesh.primitive_torus_add(major_radius={pr['R']:.3f}, minor_radius={pr['r']:.3f}, location=({x:.3f},{d:.3f},{z + pr['r']:.3f})); put(bpy.context.object,'{pr['n']}',{rgba})"
            )
    w, dd = g["layout"]["w"], g["layout"]["d"]
    lines += [
        f"bpy.ops.object.camera_add(location=({w * 0.9:.2f},{-dd * 1.1:.2f},{max(w, dd) * 0.8:.2f}), rotation=(math.radians(58),0,math.radians(40)))",
        "bpy.context.scene.camera = bpy.context.object",
        "bpy.ops.object.light_add(type='SUN', location=(0,0,10)); bpy.context.object.data.energy = 3",
        f"bpy.context.scene.render.filepath = '//{g['id']}_blender_render.png'",
    ]
    return "\n".join(lines) + "\n"


def svg_layout(g, prims):
    w, dd = g["layout"]["w"], g["layout"]["d"]
    S = 90  # px per meter
    pad = 70
    W, H = w * S + pad * 2, dd * S + pad * 2 + 40

    def X(x):
        return pad + (x + w / 2) * S

    def Y(d):
        return pad + (dd / 2 - d) * S

    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" viewBox="0 0 {W:.0f} {H:.0f}" font-family="Tajawal, Cairo, sans-serif" direction="rtl">',
        '<rect width="100%" height="100%" fill="#F7F5F0"/>',
        f'<rect x="{pad}" y="{pad}" width="{w * S}" height="{dd * S}" fill="#ECE8DF" stroke="#0B0B0F" stroke-width="2"/>',
    ]
    # 1 m grid
    for i in range(1, int(w)):
        out.append(
            f'<line x1="{X(-w / 2 + i)}" y1="{pad}" x2="{X(-w / 2 + i)}" y2="{pad + dd * S}" stroke="#D5CFC2" stroke-width="1"/>'
        )
    for i in range(1, int(dd)):
        out.append(
            f'<line x1="{pad}" y1="{Y(-dd / 2 + i)}" x2="{pad + w * S}" y2="{Y(-dd / 2 + i)}" stroke="#D5CFC2" stroke-width="1"/>'
        )
    for pr in prims:
        if pr["role"] == "floor" and pr["n"] == "floor_area":
            continue
        if pr["n"].endswith("_head"):
            continue
        x, d, z = pr["p"]
        col = pr["c"]
        op = 0.55 if pr["a"] < 1 else 0.95
        if pr["role"] in ("player", "operator", "audience") and pr["k"] == "cyl":
            fill = (
                "#9AA0A6"
                if pr["role"] == "player"
                else (g["color"] if pr["role"] == "operator" else "#5A5A66")
            )
            out.append(
                f'<circle cx="{X(x):.1f}" cy="{Y(d):.1f}" r="{pr["r"] * S:.1f}" fill="{fill}" stroke="#0B0B0F" stroke-width="1"/>'
            )
        elif pr["k"] == "box":
            sx, sd, _ = pr["s"]
            out.append(
                f'<rect x="{X(x - sx / 2):.1f}" y="{Y(d + sd / 2):.1f}" width="{sx * S:.1f}" height="{sd * S:.1f}" fill="{col}" fill-opacity="{op}" stroke="#0B0B0F" stroke-width="0.6"/>'
            )
        elif pr["k"] in ("cyl", "sph"):
            out.append(
                f'<circle cx="{X(x):.1f}" cy="{Y(d):.1f}" r="{max(pr["r"] * S, 1.5):.1f}" fill="{col}" fill-opacity="{op}" stroke="#0B0B0F" stroke-width="0.6"/>'
            )
    # dimensions
    out.append(
        f'<line x1="{pad}" y1="{pad - 25}" x2="{pad + w * S}" y2="{pad - 25}" stroke="#0B0B0F" stroke-width="1.5" marker-start="url(#a)" marker-end="url(#a)"/>'
    )
    out.append(
        f'<text x="{pad + w * S / 2}" y="{pad - 32}" text-anchor="middle" font-size="16" font-weight="700">{w:.1f} م</text>'
    )
    out.append(
        f'<line x1="{pad - 25}" y1="{pad}" x2="{pad - 25}" y2="{pad + dd * S}" stroke="#0B0B0F" stroke-width="1.5"/>'
    )
    out.append(
        f'<text x="{pad - 32}" y="{pad + dd * S / 2}" text-anchor="middle" font-size="16" font-weight="700" transform="rotate(-90 {pad - 32} {pad + dd * S / 2})">{dd:.1f} م</text>'
    )
    out.append(
        f'<text x="{W / 2}" y="{pad + dd * S + 30}" text-anchor="middle" font-size="15">شمال ↑ · الجنوب = جهة المشغل · شبكة 1 م · مقياس 1 م = {S} بكسل · ● رمادي = لاعب · ● ملون = مشغل</text>'
    )
    out.append(
        f'<text x="{W / 2}" y="{H - 12}" text-anchor="middle" font-size="14" fill="#555">{g["id"]} {g["ar"]} — مخطط علوي بالمقياس (تقديري من نموذج المفهوم)</text>'
    )
    out.append("</svg>")
    return "\n".join(out)


def spec_md(g, prims, hero, parts_written):
    sub = sum(r[3] * r[4] for r in g["bom"])
    comps = sorted(
        {
            pr["n"].rstrip("0123456789_ab").rstrip("_")
            for pr in prims
            if pr["role"] not in ("player", "operator", "audience")
        }
    )
    L = [
        f"# {g['id']} — {g['ar']} | {g['en']}",
        "",
        "## ما هذا المجلد",
        "- `model/` نموذج ثلاثي الأبعاد حقيقي مولّد بالكود (GLB + OBJ) يعكس أبعاد المخطط في وثيقة التصميم.",
        "- `fabrication_stl/` قطع تصنيع رئيسية بالمليمتر (STL) جاهزة كمرجع للنجار/محل الليزر.",
        "- `blender/` سكربت Blender يعيد بناء المشهد (مولّد، **لم يُشغَّل داخل Blender في بيئة البناء**).",
        "- `renders/` لقطات مُصيّرة من ملف GLB (أمامي، جانبي، علوي، منظور، منظور اللاعب، تفصيل مكوّن).",
        "- `layout/` مخطط علوي بالمقياس SVG/PNG.",
        "",
        "## الأبعاد",
        f"- مساحة اللعب: {g['layout']['w']} × {g['layout']['d']} م = {g['layout']['w'] * g['layout']['d']:.1f} م² (شاملة ممر الأمان).",
        *[f"- {n}" for n in g["layout"]["notes"]],
        "",
        "## المواد وملاحظات التصنيع",
    ]
    for r in g["bom"]:
        if r[0] in ("fab", "props", "mat", "print"):
            L.append(f"- **{r[1]}** × {r[3]} — {r[6]} — {r[7]} — {r[9]}")
    L += [
        "",
        "## قائمة المكونات في النموذج",
        "، ".join(comps),
        "",
        "## قطع STL",
        *[f"- `{p}` — {desc}" for p, desc in parts_written],
        "",
        f"## الميزانية المرتبطة\n- مجموع البنود: {sub:,.0f} ريال + احتياطي 10% = {sub * (1 + CONTINGENCY):,.0f} ريال (تقديري).",
        "",
        "## حدود النموذج",
        "- نموذج مفهوم (blockout) بأشكال أولية: صناديق وأسطوانات. ليس تصميمًا صناعيًا نهائيًا ولا رسومات ورشة معتمدة.",
        "- الأشخاص مجسمات مقياس 1.75 م فقط.",
        "- الطباعة والرسومات والهوية غير مطبقة على الأسطح (ألوان فقط).",
        "- يجب أن تُراجع الرسومات التنفيذية مع الورشة قبل القص (سماكات، تجميع، مفصلات، حواف).",
    ]
    return "\n".join(L) + "\n"


def main():
    index = []
    for g in GAMES:
        n = int(g["id"][1:])
        base = os.path.join(ROOT, f"Game_{n:02d}")
        for sub in ("model", "fabrication_stl", "blender", "renders", "layout"):
            os.makedirs(os.path.join(base, sub), exist_ok=True)
        prims, hero = scenes.BUILDERS[g["id"]](g["color"])
        sc = build_scene(prims)
        glb = os.path.join(base, "model", f"{g['id']}_{g['en'].replace(' ', '_')}.glb")
        sc.export(glb)
        sc.export(
            os.path.join(base, "model", f"{g['id']}_{g['en'].replace(' ', '_')}.obj")
        )
        # hero component GLB for detail render
        parts_written = []
        for key, (desc, pp) in scenes.PARTS.items():
            if key.startswith(g["id"].lower()):
                mesh = trimesh.util.concatenate([to_mesh(p) for p in pp])
                m_mm = mesh.copy()
                m_mm.apply_scale(1000.0)
                # STL in Z-up mm for fabrication tools
                m_mm.apply_transform(
                    trimesh.transformations.rotation_matrix(math.pi / 2, (1, 0, 0))
                )
                m_mm.export(os.path.join(base, "fabrication_stl", f"{key}.stl"))
                parts_written.append((f"{key}.stl", desc))
                build_scene(pp).export(os.path.join(base, "model", f"{key}_detail.glb"))
        with open(
            os.path.join(base, "blender", f"{g['id']}_build_scene.py"),
            "w",
            encoding="utf-8",
        ) as f:
            f.write(blender_script(g, prims))
        with open(
            os.path.join(base, "layout", f"{g['id']}_layout_top.svg"),
            "w",
            encoding="utf-8",
        ) as f:
            f.write(svg_layout(g, prims))
        with open(os.path.join(base, "README_spec.md"), "w", encoding="utf-8") as f:
            f.write(spec_md(g, prims, hero, parts_written))
        b = sc.bounds
        index.append(
            dict(
                id=g["id"],
                folder=f"Game_{n:02d}",
                glb=os.path.relpath(glb, ROOT),
                prims=len(prims),
                bounds_m=[round(float(v), 2) for v in (b[1] - b[0])],
                parts=[p for p, _ in parts_written],
                hero=hero,
                w=g["layout"]["w"],
                d=g["layout"]["d"],
            )
        )
        print(
            g["id"],
            len(prims),
            "prims, bounds",
            np.round(b[1] - b[0], 2),
            "parts",
            [p for p, _ in parts_written],
        )
    with open(os.path.join(ROOT, "models_index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
