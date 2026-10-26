"""Reusable Damanati UI / graphic components (HTML strings)."""
import math

from build_foundation import icon_svg
from common import C, logo, mark_path

# Sample data. Generic products and stores on purpose: no third-party brands,
# no implied partnerships.
WARRANTIES = [
    {"p": "جوال ذكي 256GB", "s": "متجر إلكترونيات", "k": "warn", "r": "ينتهي خلال 7 أيام", "pct": 0.97, "i": "product", "d": "12/03/2025", "e": "02/11/2026"},
    {"p": "غسالة أمامية 9 كجم", "s": "معرض أجهزة منزلية", "k": "warn", "r": "ينتهي خلال 29 يومًا", "pct": 0.92, "i": "service", "d": "24/11/2024", "e": "24/11/2026"},
    {"p": "تلفزيون 55 بوصة", "s": "متجر إلكترونيات", "k": "ok", "r": "ساري · 23 شهرًا متبقية", "pct": 0.04, "i": "document", "d": "01/10/2026", "e": "01/10/2028"},
    {"p": "مكيف سبليت 24000", "s": "مؤسسة تكييف", "k": "ok", "r": "ساري · 10 أشهر متبقية", "pct": 0.58, "i": "renew", "d": "15/08/2025", "e": "15/08/2027"},
    {"p": "سماعات لاسلكية", "s": "متجر إلكترونيات", "k": "exp", "r": "انتهى قبل 3 أيام", "pct": 1.0, "i": "receipt", "d": "23/10/2025", "e": "23/10/2026"},
]

STATUS = {
    "ok": ("ساري", C["green-600"], C["green-50"], "check-circle"),
    "warn": ("ينتهي قريبًا", C["warning"], "#FBF3E4", "alert"),
    "exp": ("منتهي", C["danger"], "#FBEBE9", "x-circle"),
}
STATUS_DARK = {
    "ok": (C["green-300"], "rgba(127,209,185,.12)"),
    "warn": (C["warning-on-dark"], "rgba(224,165,38,.14)"),
    "exp": (C["danger-on-dark"], "rgba(224,122,112,.14)"),
}

UI_CSS = f"""
.scr{{position:relative;width:390px;height:844px;overflow:hidden;background:#fff;direction:rtl}}
.scr.dark{{background:{C['night']};color:#F2F1EE}}
.sb{{height:47px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;font:600 15px 'Tajawal';direction:ltr}}
.sb .r{{display:flex;gap:6px;align-items:center}}
.sb i{{display:inline-block;width:17px;height:10px;border-radius:2px;background:currentColor;opacity:.9}}
.sb b{{display:inline-block;width:24px;height:11px;border:1.5px solid currentColor;border-radius:3px;position:relative}}
.sb b:after{{content:'';position:absolute;inset:1.5px;right:5px;background:currentColor;border-radius:1px}}
.chip{{display:inline-flex;align-items:center;gap:5px;font:500 12px/1 'Tajawal';padding:6px 9px 5px;border-radius:999px;white-space:nowrap}}
.chip svg{{width:14px;height:14px}}
.wcard{{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid {C['sand']};border-radius:18px;padding:14px;position:relative;overflow:hidden}}
.dark .wcard{{background:{C['night-raised']};border-color:#2C3330}}
.wcard .th{{width:52px;height:52px;flex:none;border-radius:14px;display:grid;place-items:center;background:{C['green-50']};color:{C['green-600']}}}
.dark .wcard .th{{background:#26302C;color:{C['mint']}}}
.wcard .th svg{{width:26px;height:26px}}
.wcard h4{{font:700 15px/1.3 'Tajawal';margin-bottom:2px}}
.wcard p{{font:400 12px/1.4 'Tajawal';color:{C['stone']}}}
.dark .wcard p{{color:#A8A39A}}
.wcard .bar{{height:4px;border-radius:4px;background:{C['sand']};margin-top:9px;overflow:hidden}}
.dark .wcard .bar{{background:#2C3330}}
.wcard .bar span{{display:block;height:100%;border-radius:4px}}
.wcard .edge{{position:absolute;right:0;top:14px;bottom:14px;width:3px;border-radius:3px 0 0 3px}}
.tabbar{{position:absolute;bottom:0;left:0;right:0;height:84px;background:#fff;border-top:1px solid {C['sand']};display:flex;justify-content:space-around;padding-top:10px}}
.dark .tabbar{{background:{C['night-raised']};border-color:#2C3330}}
.tab{{display:flex;flex-direction:column;align-items:center;gap:4px;font:500 11px 'Tajawal';color:{C['stone']};width:70px}}
.dark .tab{{color:#8C877E}}
.tab svg{{width:24px;height:24px}}
.tab.on{{color:{C['green-600']}}}
.dark .tab.on{{color:{C['mint']}}}
.fab{{width:56px;height:56px;border-radius:18px;background:{C['green-600']};color:#fff;display:grid;place-items:center;box-shadow:0 10px 24px rgba(47,125,107,.35)}}
.fab svg{{width:26px;height:26px}}
.btn{{display:flex;align-items:center;justify-content:center;gap:8px;height:54px;border-radius:16px;font:700 16px 'Tajawal';background:{C['green-600']};color:#fff}}
.btn.ghost{{background:transparent;color:{C['green-600']};border:1.5px solid {C['green-200']}}}
.input{{height:56px;border-radius:16px;border:1.5px solid {C['sand']};display:flex;align-items:center;padding:0 16px;gap:10px;font:500 16px 'Tajawal';color:{C['ink']};background:{C['paper']}}}
.input.focus{{border-color:{C['green-600']};background:#fff;box-shadow:0 0 0 4px {C['green-100']}}}
.h-title{{font:800 28px/1.2 'Tajawal'}}
.muted{{color:{C['stone']}}}
.dark .muted{{color:#A8A39A}}
.home-ind{{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;border-radius:5px;background:{C['ink']};opacity:.9}}
.dark .home-ind{{background:#fff}}
"""


def statusbar(time="9:41"):
    return f'<div class="sb"><span>{time}</span><span class="r"><i></i><i style="width:15px"></i><b></b></span></div>'


def chip(kind, text=None, dark=False):
    label, fg, bg, ic = STATUS[kind]
    if dark:
        fg, bg = STATUS_DARK[kind]
    return f'<span class="chip" style="color:{fg};background:{bg}">{icon_svg(ic, 14, fg, 2)}{text or label}</span>'


def warranty_card(w, dark=False):
    label, fg, bg, ic = STATUS[w["k"]]
    if dark:
        fg, _ = STATUS_DARK[w["k"]]
    pct = int(w["pct"] * 100)
    return (f'<div class="wcard"><span class="edge" style="background:{fg}"></span>'
            f'<div class="th">{icon_svg(w["i"], 26)}</div>'
            f'<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:start;gap:8px">'
            f'<div><h4>{w["p"]}</h4><p>من {w["s"]}</p></div>{chip(w["k"], dark=dark)}</div>'
            f'<div class="bar"><span style="width:{pct}%;background:{fg}"></span></div>'
            f'<p style="margin-top:6px">{w["r"]}</p></div></div>')


def tabbar(active=0):
    items = [("home", "الرئيسية"), ("bell", "الإشعارات"), ("store", "المتاجر"), ("user", "حسابي")]
    out = "".join(f'<div class="tab{" on" if i == active else ""}">{icon_svg(ic, 24)}<span>{t}</span></div>'
                  for i, (ic, t) in enumerate(items))
    return f'<div class="tabbar">{out}</div><div class="home-ind"></div>'


def ring(parts, size=150, stroke=14, gap_deg=6, track=None, center="", sub="", dark=False):
    """Lifecycle Arc - segmented ring. parts = [(value, colour), ...]."""
    total = sum(v for v, _ in parts)
    r = (size - stroke) / 2
    cx = cy = size / 2
    segs = []
    a = -90.0
    for v, col in parts:
        sweep = 360 * v / total - gap_deg
        if sweep >= 359.5:  # single full segment: an arc with equal ends would collapse to a point
            segs.append(f'<circle cx="{cx}" cy="{cy}" r="{r:.2f}" stroke="{col}" stroke-width="{stroke}" fill="none"/>')
            a += 360
            continue
        if sweep <= 0:
            a += 360 * v / total
            continue
        a0, a1 = math.radians(a + gap_deg / 2), math.radians(a + gap_deg / 2 + sweep)
        x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
        x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
        large = 1 if sweep > 180 else 0
        segs.append(f'<path d="M{x0:.2f} {y0:.2f}A{r:.2f} {r:.2f} 0 {large} 1 {x1:.2f} {y1:.2f}" stroke="{col}" '
                    f'stroke-width="{stroke}" fill="none" stroke-linecap="round"/>')
        a += 360 * v / total
    trk = f'<circle cx="{cx}" cy="{cy}" r="{r}" stroke="{track}" stroke-width="{stroke}" fill="none"/>' if track else ""
    col = "#F2F1EE" if dark else C["ink"]
    return (f'<div style="position:relative;width:{size}px;height:{size}px;flex:none">'
            f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">{trk}{"".join(segs)}</svg>'
            f'<div style="position:absolute;inset:0;display:grid;place-content:center;text-align:center">'
            f'<div class="num" style="font:800 {size * 0.26:.0f}px/1 Tajawal;color:{col}">{center}</div>'
            f'<div style="font:500 {max(11, size * 0.085):.0f}px/1.4 Tajawal;opacity:.7">{sub}</div></div></div>')


def mark_svg(color, height, opacity=1.0, extra_style=""):
    d, (x0, y0, w, h) = mark_path()
    return (f'<svg viewBox="{x0} {y0} {w} {h}" style="height:{height};display:block;opacity:{opacity};{extra_style}">'
            f'<path d="{d}" fill="{color}"/></svg>')


def pattern_bg(fg, bg, opacity=1.0, fade=False, cell=96):
    """CSS background using the pattern artwork."""
    from build_foundation import pattern_svg
    import base64
    svg = pattern_svg(fg, None, cell=cell, fade=False)
    b64 = base64.b64encode(svg.encode()).decode()
    mask = ("-webkit-mask-image:linear-gradient(to bottom,transparent 0%,rgba(0,0,0,.35) 35%,#000 100%);"
            if fade else "")
    return (f'background-color:{bg}', f'background-image:url(data:image/svg+xml;base64,{b64});'
            f'background-size:{cell * 8}px auto;opacity:{opacity};{mask}')


def pattern_layer(fg, opacity=1.0, fade=None, cell=96, style=""):
    """Absolutely-positioned pattern layer. fade: None | 'up' | 'down' | 'left' | 'right'."""
    _, img = pattern_bg(fg, "transparent", opacity, cell=cell)
    m = ""
    if fade:
        to = {"up": "top", "down": "bottom", "left": "left", "right": "right"}[fade]
        m = f"-webkit-mask-image:linear-gradient(to {to},transparent 0%,rgba(0,0,0,.35) 40%,#000 100%);"
    return f'<div style="position:absolute;inset:0;{img}{m}{style}"></div>'


def passport(title, rows, accent=C["green-600"], width=300, dark=False, badge=None, stamp=True):
    """Product Passport card - composition family 1."""
    bg = C["night-raised"] if dark else "#fff"
    fg = "#F2F1EE" if dark else C["ink"]
    mu = "#A8A39A" if dark else C["stone"]
    line = "#2C3330" if dark else C["sand"]
    rws = "".join(f'<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dashed {line}">'
                  f'<span style="color:{mu}">{k}</span><span class="num" style="font-weight:700">{v}</span></div>'
                  for k, v in rows)
    st = (f'<div style="position:absolute;left:-18px;bottom:-22px;opacity:.07">{mark_svg(accent, "120px")}</div>'
          if stamp else "")
    bd = f'<div style="margin-top:12px">{badge}</div>' if badge else ""
    return (f'<div style="position:relative;overflow:hidden;width:{width}px;background:{bg};color:{fg};border-radius:22px;'
            f'padding:18px 20px;box-shadow:0 18px 40px rgba(20,23,22,.16);font:400 13px/1.4 Tajawal">'
            f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
            f'<span style="font:800 16px Tajawal">{title}</span>'
            f'<span style="width:28px;height:28px;border-radius:8px;background:{accent};display:grid;place-items:center">'
            f'{mark_svg("#fff", "13px")}</span></div>{rws}{bd}{st}</div>')


def phone(inner_png, width=260, radius=None, dark_frame=True, shadow=True):
    """CSS device frame around a rendered screen image (for book layouts only)."""
    h = width * 844 / 390
    r = radius or width * 0.155
    sh = "box-shadow:0 30px 60px rgba(20,23,22,.28),0 8px 18px rgba(20,23,22,.18);" if shadow else ""
    frame = "#1b1d1c" if dark_frame else "#d9d7d2"
    pad = width * 0.035
    return (f'<div style="width:{width + 2 * pad}px;height:{h + 2 * pad}px;border-radius:{r + pad}px;background:{frame};padding:{pad}px;{sh}flex:none">'
            f'<img src="{inner_png}" style="width:{width}px;height:{h}px;border-radius:{r}px;display:block"></div>')


__all__ = ["WARRANTIES", "STATUS", "UI_CSS", "statusbar", "chip", "warranty_card", "tabbar", "ring",
           "mark_svg", "pattern_layer", "passport", "phone", "logo", "icon_svg", "C"]
