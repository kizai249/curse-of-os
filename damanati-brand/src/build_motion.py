"""Render the "Seal" logo reveal (MP4 + GIF) frame by frame with Chromium + ffmpeg.

Timeline (3.6 s, 30 fps), easing = tokens MOTION ease-seal:
  0.00-0.70  tile scales 0.72 -> 1.00 and fades in
  0.35-1.35  the D is revealed by a clockwise sweep (Lifecycle Arc)
  1.30-1.60  registered mark fades in
  1.45-2.35  symbol rises, Arabic then English names rise in
  2.20-3.60  pattern band breathes in at the bottom; hold
The final frame is the approved vertical lockup, untouched.
"""
import shutil
import subprocess

from build_logos import _vertical, _el
from extract_logo import parts
from components import pattern_layer
from common import OUT, SRC, BUILD, page_html, C

FPS, DUR = 30, 3.6
W, H = 1920, 1080


def lockup_svg():
    p = parts()
    v = _vertical(p)
    x0, y0, x1, y1 = v["bbox"]
    sym = [e for e in v["elements"] if e["role"] in ("brand", "light")]
    ar = [e for e in v["elements"] if e["role"] == "text" and e["bbox"][1] < (p["symbol"]["bbox"][3] + 60)]
    en = [e for e in v["elements"] if e["role"] == "text" and e not in ar]
    tile = [e for e in sym if e["role"] == "brand"]
    light = [e for e in sym if e["role"] == "light"]
    reg = min(light, key=lambda e: (e["bbox"][2] - e["bbox"][0]))
    dmark = [e for e in light if e is not reg]
    sx0, sy0, sx1, sy1 = p["symbol"]["bbox"]
    cx, cy = (sx0 + sx1) / 2, (sy0 + sy1) / 2
    g = lambda es, fill: "".join(_el(e, fill) for e in es)
    return (f'<svg id="lk" viewBox="{x0:.2f} {y0:.2f} {x1 - x0:.2f} {y1 - y0:.2f}" style="height:560px;overflow:visible">'
            f'<defs><mask id="sweep" maskUnits="userSpaceOnUse" x="{sx0 - 20}" y="{sy0 - 20}" width="{sx1 - sx0 + 40}" height="{sy1 - sy0 + 40}">'
            f'<path id="sw" fill="#fff" d=""/></mask></defs>'
            f'<g id="sym" data-cx="{cx:.2f}" data-cy="{cy:.2f}" data-shift="{(y0 + y1) / 2 - cy:.2f}"><g id="tile">{g(tile, "#fff")}</g>'
            f'<g mask="url(#sweep)">{g(dmark, C["green-600"])}</g><g id="reg">{g([reg], C["green-600"])}</g></g>'
            f'<g id="ar">{g(ar, "#fff")}</g><g id="en">{g(en, "#fff")}</g></svg>')


JS = """
const ease=(t)=>{t=Math.min(1,Math.max(0,t));return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
const seg=(t,a,b)=>Math.min(1,Math.max(0,(t-a)/(b-a)));
const sym=document.getElementById('sym'), cx=+sym.dataset.cx, cy=+sym.dataset.cy;
window.setT=(t)=>{
  const s=.72+.28*ease(seg(t,0,.7));
  const rise=ease(seg(t,1.45,2.35));
  const startShift=(+sym.dataset.shift)*(1-rise);  // symbol starts centred on the frame, rises into the lockup
  document.getElementById('tile').style.opacity=ease(seg(t,0,.45));
  sym.setAttribute('transform',`translate(0 ${startShift}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
  const a=ease(seg(t,.35,1.35))*359.999, r=80, rad=(a-90)*Math.PI/180;
  const x=cx+r*Math.cos(rad), y=cy+r*Math.sin(rad), large=a>180?1:0;
  document.getElementById('sw').setAttribute('d', a<=0?'':`M${cx} ${cy} L${cx} ${cy-r} A${r} ${r} 0 ${large} 1 ${x} ${y} Z`);
  document.getElementById('reg').style.opacity=ease(seg(t,1.3,1.6));
  const ar=ease(seg(t,1.6,2.3)), en=ease(seg(t,1.8,2.5));
  const A=document.getElementById('ar'), E=document.getElementById('en');
  A.style.opacity=ar; A.setAttribute('transform',`translate(0 ${18*(1-ar)})`);
  E.style.opacity=en; E.setAttribute('transform',`translate(0 ${18*(1-en)})`);
  document.getElementById('pat').style.opacity=.9*ease(seg(t,2.2,3.4));
};
"""


def build():
    d = OUT / "09_Motion_Assets"
    (d / "source").mkdir(parents=True, exist_ok=True)
    body = (f'<div style="position:relative;width:{W}px;height:{H}px;background:{C["green-600"]};overflow:hidden;display:grid;place-items:center">'
            f'<div id="pat" style="position:absolute;left:0;right:0;bottom:0;height:210px;opacity:0">{pattern_layer("rgba(255,255,255,.9)", 1, "down", 90)}</div>'
            f'<div style="position:relative">{lockup_svg()}</div></div><script>{JS}</script>')
    src = d / "source" / "logo_reveal_seal.html"
    src.write_text(page_html(body, "Damanati - Seal logo reveal", f"html,body{{width:{W}px;height:{H}px;overflow:hidden}}"))
    frames = BUILD / "frames"
    if frames.exists():
        shutil.rmtree(frames)
    frames.mkdir(parents=True)
    n = int(FPS * DUR)
    script = f"""
const {{ chromium }} = require('playwright');
(async () => {{
  const b = await chromium.launch(); const p = await b.newPage({{viewport:{{width:{W},height:{H}}}}});
  await p.goto('{src.as_uri()}'); await p.evaluate(() => document.fonts.ready);
  for (let i = 0; i < {n}; i++) {{
    await p.evaluate((t) => window.setT(t), i / {FPS});
    await p.screenshot({{ path: '{frames}/f' + String(i).padStart(4, '0') + '.png' }});
  }}
  await b.close();
}})();"""
    js = BUILD / "frames.cjs"
    js.write_text(script)
    subprocess.run(["node", str(js)], check=True)
    mp4 = d / "damanati_logo_reveal_seal_1920x1080.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames / "f%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", str(mp4)], check=True)
    gif = d / "damanati_logo_reveal_seal_640.gif"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(frames / "f%04d.png"),
                    "-vf", "fps=20,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse",
                    str(gif)], check=True)
    # keyframes for the storyboard page
    kf = d / "keyframes"
    kf.mkdir(exist_ok=True)
    for t in (0.2, 0.7, 1.1, 1.6, 2.2, 3.5):
        i = min(n - 1, int(t * FPS))
        shutil.copy(frames / f"f{i:04d}.png", kf / f"seal_t{t:.1f}s.png")
    print("motion ok", mp4.name, gif.name)


if __name__ == "__main__":
    build()
