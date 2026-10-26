"""Raster/PDF exports of the logo package, app icons and favicons."""
import json
import re
import subprocess

from PIL import Image

from common import OUT, SRC, BUILD, LOGOS, C, mark_path

LOGO_DIR = OUT / "02_Logos"


def _svg_size(f):
    vb = [float(v) for v in re.search(r'viewBox="([^"]*)"', f.read_text()).group(1).split()]
    return vb[2], vb[3]


def _wrap(svg_file, w, h, bg="transparent"):
    return (f'<!doctype html><html><head><style>html,body{{margin:0;width:{w}px;height:{h}px;background:{bg}}}'
            f'img{{display:block;width:{w}px;height:{h}px}}</style></head><body><img src="{svg_file.as_uri()}"></body></html>')


def icon_svg(size, mark_ratio=0.60, rounded=False, bg=None, fg="#FFFFFF"):
    d, (x0, y0, w, h) = mark_path()
    k = size * mark_ratio / w
    tx = (size - w * k) / 2 - x0 * k
    ty = (size - h * k) / 2 - y0 * k
    r = size * 0.2237 if rounded else 0
    bg = bg or C["green-600"]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'<rect width="{size}" height="{size}" rx="{r:.2f}" fill="{bg}"/>'
            f'<path d="{d}" fill="{fg}" transform="translate({tx:.3f} {ty:.3f}) scale({k:.5f})"/></svg>\n')


def build():
    BUILD.mkdir(exist_ok=True)
    jobs = []
    png = LOGO_DIR / "PNG"
    pdf = LOGO_DIR / "PDF"
    png.mkdir(parents=True, exist_ok=True)
    pdf.mkdir(parents=True, exist_ok=True)
    for f in sorted(LOGOS.glob("*.svg")):
        w, h = _svg_size(f)
        for target_h in (512, 2048) if "primary" in f.name else (512,):
            W = round(w / h * target_h)
            page = BUILD / f"exp_{f.stem}_{target_h}.html"
            page.write_text(_wrap(f, W, target_h))
            jobs.append({"src": str(page), "out": str(png / f"{f.stem}_{target_h}h.png"),
                         "width": W, "height": target_h, "transparent": True})
        if "primary" in f.name or "mono-black" in f.name:
            pw, ph = w * 0.3528 * 1.0, h * 0.3528 * 1.0     # 1pt = 0.3528mm, 1:1 with source artwork
            page = BUILD / f"exp_{f.stem}_pdf.html"
            page.write_text(_wrap(f, round(w * 4), round(h * 4)).replace(
                "<style>", f"<style>@page{{size:{pw:.2f}mm {ph:.2f}mm;margin:0}}img{{width:{pw:.2f}mm!important;height:{ph:.2f}mm!important}}"
                           f"html,body{{width:{pw:.2f}mm!important;height:{ph:.2f}mm!important}}"))
            jobs.append({"src": str(page), "out": str(pdf / f"{f.stem}.pdf"), "width": 800, "height": 400,
                         "pdf": True, "pdfWidth": f"{pw:.2f}mm", "pdfHeight": f"{ph:.2f}mm"})

    # App icons and favicons
    ai = LOGO_DIR / "app_icon"
    ai.mkdir(parents=True, exist_ok=True)
    (ai / "damanati_app_icon_square_1024.svg").write_text(icon_svg(1024))
    (ai / "damanati_app_icon_rounded_1024.svg").write_text(icon_svg(1024, rounded=True))
    (ai / "favicon.svg").write_text(icon_svg(64, 0.64, rounded=True))
    # Android adaptive: 108dp canvas, mark kept inside the 66dp safe circle
    (ai / "android_adaptive_foreground.svg").write_text(
        icon_svg(432, 0.36, bg="transparent").replace('<rect width="432" height="432" rx="0.00" fill="transparent"/>', ""))
    (ai / "android_adaptive_background.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 432 432" width="432" height="432"><rect width="432" height="432" fill="{C["green-600"]}"/></svg>\n')
    sizes = {"ios_appstore_1024.png": ("damanati_app_icon_square_1024.svg", 1024, False),
             "ios_180.png": ("damanati_app_icon_square_1024.svg", 180, False),
             "ios_167.png": ("damanati_app_icon_square_1024.svg", 167, False),
             "ios_152.png": ("damanati_app_icon_square_1024.svg", 152, False),
             "ios_120.png": ("damanati_app_icon_square_1024.svg", 120, False),
             "android_play_512.png": ("damanati_app_icon_square_1024.svg", 512, False),
             "android_adaptive_foreground_432.png": ("android_adaptive_foreground.svg", 432, True),
             "android_adaptive_background_432.png": ("android_adaptive_background.svg", 432, False),
             "pwa_512.png": ("damanati_app_icon_rounded_1024.svg", 512, True),
             "pwa_192.png": ("damanati_app_icon_rounded_1024.svg", 192, True),
             "apple_touch_icon_180.png": ("damanati_app_icon_square_1024.svg", 180, False),
             "favicon_48.png": ("favicon.svg", 48, True),
             "favicon_32.png": ("favicon.svg", 32, True),
             "favicon_16.png": ("favicon.svg", 16, True)}
    for out, (svg, s, tr) in sizes.items():
        page = BUILD / f"icon_{out}.html"
        page.write_text(_wrap(ai / svg, s, s))
        jobs.append({"src": str(page), "out": str(ai / out), "width": s, "height": s, "transparent": tr})

    p = BUILD / "jobs_exports.json"
    p.write_text(json.dumps(jobs))
    subprocess.run(["node", str(SRC / "render.mjs"), str(p)], check=True, stdout=subprocess.DEVNULL)
    ico = [Image.open(ai / f"favicon_{s}.png") for s in (16, 32, 48)]
    ico[2].save(ai / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:2])
    print(f"exports ok ({len(jobs)} files)")


if __name__ == "__main__":
    build()
