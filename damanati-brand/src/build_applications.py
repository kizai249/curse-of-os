"""Standalone, reusable application artwork (digital, corporate, marketing).

Each artwork is written as an HTML source file next to its PNG export so it can
be edited and re-rendered. Print pieces also get a vector PDF.
"""
import json
import subprocess

from common import OUT, SRC, BUILD, page_html, C
from components import *  # noqa: F401,F403
from build_foundation import icon_svg

JOBS = []


def art(folder, name, w, h, body, css="", scale=2, pdf_mm=None, transparent=False, bg="#fff"):
    d = OUT / folder
    (d / "source").mkdir(parents=True, exist_ok=True)
    html = page_html(body, f"Damanati - {name}",
                     f"html,body{{width:{w}px;height:{h}px;overflow:hidden;background:{bg}}}{UI_CSS}{css}")
    src = d / "source" / f"{name}.html"
    src.write_text(html)
    JOBS.append({"src": str(src), "out": str(d / f"{name}.png"), "width": w, "height": h, "scale": scale,
                 "transparent": transparent})
    if pdf_mm:
        JOBS.append({"src": str(src), "out": str(d / f"{name}.pdf"), "width": w, "height": h, "pdf": True,
                     "pdfWidth": f"{pdf_mm[0]}mm", "pdfHeight": f"{pdf_mm[1]}mm"})
    return d / f"{name}.png"


DA = "10_Digital_Applications"
CO = "11_Corporate_Identity"
SM = "12_Social_Media"
MK = "13_Mockups"
TP = "14_Templates"


# ============================================================ DIGITAL: APP
def app_screens():
    # 1 Launch / splash (approved look, ref. p.1)
    art(DA, "app_01_launch", 390, 844, f'''
<div class="scr" style="background:{C['green-600']};color:#fff">
  {statusbar()}
  <div style="position:absolute;top:300px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:14px">
    <span style="font:400 14px Tajawal;opacity:.9" class="en">Welcome To</span>
    {logo('bilingual_reversed-on-green', height='44px')}
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:300px">{pattern_layer('rgba(255,255,255,.95)', 1, 'down', 64)}</div>
  <div class="home-ind" style="background:#fff"></div>
</div>''')

    # 2 Onboarding
    stack = (f'<div style="position:relative;height:330px">'
             f'<div style="position:absolute;top:60px;right:60px;transform:rotate(-7deg)">{passport("تلفزيون 55 بوصة", [("تاريخ الشراء","01/10/2026"),("ينتهي","01/10/2028")], width=230, badge=chip("ok"), stamp=False)}</div>'
             f'<div style="position:absolute;top:120px;right:95px;transform:rotate(4deg)">{passport("جوال ذكي 256GB", [("المتجر","متجر إلكترونيات"),("المتبقي","7 أيام")], width=240, badge=chip("warn"))}</div>'
             f'</div>')
    art(DA, "app_02_onboarding", 390, 844, f'''
<div class="scr" style="background:{C['paper']}">
  {statusbar()}
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 24px">
    <span style="font:500 14px Tajawal;color:{C['stone']}">تخطي</span>
    <div style="display:flex;gap:6px"><i style="width:22px;height:6px;border-radius:6px;background:{C['green-600']}"></i><i style="width:6px;height:6px;border-radius:6px;background:{C['green-200']}"></i><i style="width:6px;height:6px;border-radius:6px;background:{C['green-200']}"></i></div>
  </div>
  {stack}
  <div style="padding:0 28px">
    <h1 class="h-title" style="margin-bottom:12px">كل ضماناتك<br>في مكان واحد</h1>
    <p style="font:400 16px/1.7 Tajawal;color:{C['stone']}">صوّر الفاتورة مرة وحدة، وضماناتي يحفظها ويرتبها ويذكّرك قبل ما ينتهي الضمان.</p>
  </div>
  <div style="position:absolute;bottom:48px;left:24px;right:24px" class="btn">ابدأ الآن</div>
  <div class="home-ind"></div>
</div>''')

    # 3 Login
    art(DA, "app_03_login", 390, 844, f'''
<div class="scr">
  {statusbar()}
  <div style="padding:28px 24px 0">
    {logo('symbol_primary', height='56px')}
    <h1 class="h-title" style="margin:28px 0 8px">أهلًا بك</h1>
    <p class="muted" style="font:400 16px/1.6 Tajawal;margin-bottom:28px">سجّل دخولك برقم جوالك، وبنرسل لك رمز تحقق.</p>
    <label style="font:500 14px Tajawal;display:block;margin-bottom:8px">رقم الجوال</label>
    <div class="input focus"><span class="en num" style="color:{C['stone']}">+966</span><span style="width:1px;height:24px;background:{C['sand']}"></span><span class="en num" style="direction:ltr">5X XXX XXXX</span></div>
    <p class="muted" style="font:400 12px/1.5 Tajawal;margin-top:10px">{icon_svg('lock', 14, C['stone'])} <span style="vertical-align:3px">بياناتك مشفرة ولا نشاركها مع أي جهة.</span></p>
  </div>
  <div style="position:absolute;bottom:110px;left:24px;right:24px" class="btn">إرسال رمز التحقق</div>
  <div style="position:absolute;bottom:56px;left:0;right:0;text-align:center;font:400 13px Tajawal" class="muted">بالمتابعة توافق على <span style="color:{C['green-600']};font-weight:700">الشروط وسياسة الخصوصية</span></div>
  <div class="home-ind"></div>
</div>''')

    # 4 Dashboard (light)
    def dash(dark=False):
        okc = C["green-300"] if dark else C["green-600"]
        wc = C["warning-on-dark"] if dark else C["warning"]
        ec = C["danger-on-dark"] if dark else C["danger"]
        trk = "#2C3330" if dark else C["sand"]
        legend = "".join(
            f'<div style="display:flex;align-items:center;gap:8px;font:500 13px Tajawal"><i style="width:10px;height:10px;border-radius:3px;background:{c}"></i>{t}<b class="num" style="margin-inline-start:auto;font-weight:800">{n}</b></div>'
            for t, n, c in [("ساري", 9, okc), ("ينتهي قريبًا", 2, wc), ("منتهي", 1, ec)])
        cards = "".join(warranty_card(w, dark) for w in WARRANTIES[:4])
        cls = "scr dark" if dark else "scr"
        return f'''
<div class="{cls}" style="background:{C['night'] if dark else C['paper']}">
  {statusbar()}
  <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 20px 14px">
    <div><p class="muted" style="font:400 13px Tajawal">مساء الخير، نورة</p><h1 style="font:800 26px Tajawal">ضماناتي</h1></div>
    <div class="fab" style="width:46px;height:46px;border-radius:15px">{icon_svg('plus', 24)}</div>
  </div>
  <div style="margin:0 20px 16px;padding:16px;border-radius:22px;background:{C['night-raised'] if dark else '#fff'};border:1px solid {trk};display:flex;gap:16px;align-items:center">
    {ring([(9, okc), (2, wc), (1, ec)], 118, 12, 8, None, "12", "ضمان", dark)}
    <div style="flex:1;display:flex;flex-direction:column;gap:10px">{legend}</div>
  </div>
  <div style="display:flex;justify-content:space-between;padding:0 20px 10px;font:700 15px Tajawal"><span>يحتاج انتباهك</span><span style="color:{C['mint'] if dark else C['green-600']};font-weight:500;font-size:13px">عرض الكل</span></div>
  <div style="display:flex;flex-direction:column;gap:10px;padding:0 20px">{cards}</div>
  {tabbar(0)}
</div>'''
    art(DA, "app_04_dashboard_light", 390, 844, dash(False))
    art(DA, "app_05_dashboard_dark", 390, 844, dash(True), bg=C["night"])

    # 6 Warranty detail with product passport + timeline
    w = WARRANTIES[1]
    steps = [("تاريخ الشراء", "24/11/2024", "done"), ("تسجيل الضمان في ضماناتي", "24/11/2024", "done"),
             ("تذكير قبل 30 يومًا", "25/10/2026", "now"), ("انتهاء الضمان", "24/11/2026", "next")]
    tl = ""
    for i, (t, d, st) in enumerate(steps):
        col = {"done": C["green-600"], "now": C["warning"], "next": C["sand"]}[st]
        line = "" if i == len(steps) - 1 else f'<i style="position:absolute;right:7px;top:20px;bottom:-6px;width:2px;background:{C["green-200"] if st == "done" else C["sand"]}"></i>'
        dot = (f'<i style="position:absolute;right:0;top:4px;width:16px;height:16px;border-radius:50%;background:{col};'
               f'{"box-shadow:0 0 0 5px #FBF3E4;" if st == "now" else ""}"></i>')
        tl += (f'<div style="position:relative;padding:0 30px 18px 0">{dot}{line}<div style="font:700 14px Tajawal">{t}</div>'
               f'<div class="muted num" style="font:400 12px Tajawal">{d}</div></div>')
    art(DA, "app_06_warranty_detail", 390, 844, f'''
<div class="scr" style="background:{C['paper']}">
  <div style="background:{C['green-600']};color:#fff;height:300px;position:relative;overflow:hidden">
    {pattern_layer('rgba(255,255,255,.10)', 1, None, 64)}
    {statusbar()}
    <div style="position:relative;display:flex;justify-content:space-between;padding:4px 20px;align-items:center">
      <span style="width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.14);display:grid;place-items:center;font:700 22px Tajawal">›</span>
      <span style="font:700 16px Tajawal">تفاصيل الضمان</span>
      <span style="width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.14);display:grid;place-items:center">{icon_svg('share', 20, '#fff')}</span>
    </div>
  </div>
  <div style="position:absolute;top:120px;left:20px;right:20px">
    {passport(w['p'], [('المتجر', w['s']), ('تاريخ الشراء', w['d']), ('مدة الضمان', 'سنتان'), ('ينتهي في', w['e']), ('رقم الفاتورة', 'INV-48213')], width=350, badge=chip('warn', 'ينتهي خلال 29 يومًا'))}
    <div style="margin-top:18px;background:#fff;border-radius:22px;padding:18px 20px;border:1px solid {C['sand']}">
      <div style="font:800 15px Tajawal;margin-bottom:14px">رحلة الضمان</div>{tl}
    </div>
  </div>
  <div style="position:absolute;bottom:34px;left:20px;right:20px;display:flex;gap:10px"><div class="btn" style="flex:1">طلب صيانة</div><div class="btn ghost" style="flex:1">عرض الفاتورة</div></div>
  <div class="home-ind"></div>
</div>''')

    # 7 Empty state
    art(DA, "app_07_empty_state", 390, 844, f'''
<div class="scr" style="background:{C['paper']}">
  {statusbar()}
  <div style="padding:6px 20px"><h1 style="font:800 26px Tajawal">ضماناتي</h1></div>
  <div style="position:absolute;top:210px;left:0;right:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 40px">
    <div style="position:relative;width:180px;height:150px;margin-bottom:26px">
      <div style="position:absolute;inset:18px 26px;border:2px dashed {C['green-300']};border-radius:28px"></div>
      <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:78px;height:78px;border-radius:24px;background:#fff;box-shadow:0 14px 30px rgba(47,125,107,.18);display:grid;place-items:center;color:{C['green-600']}">{icon_svg('scan', 38)}</div>
    </div>
    <h2 style="font:800 22px Tajawal;margin-bottom:10px">لا توجد ضمانات بعد</h2>
    <p class="muted" style="font:400 15px/1.7 Tajawal">أضف أول فاتورة، وخلّ ضماناتي يتابع عنك مواعيد الانتهاء.</p>
    <div class="btn" style="margin-top:26px;width:100%">{icon_svg('camera', 20, '#fff')} تصوير فاتورة</div>
    <div style="margin-top:14px;font:500 14px Tajawal;color:{C['green-600']}">أو أدخل البيانات يدويًا</div>
  </div>
  {tabbar(0)}
</div>''')

    # 8 Notifications (lock screen)
    def notif(title, body, t, k):
        _, fg, _, _ = STATUS[k]
        return (f'<div style="background:rgba(255,255,255,.82);backdrop-filter:blur(20px);border-radius:22px;padding:14px;display:flex;gap:12px;color:{C["ink"]}">'
                f'<div style="width:38px;height:38px;flex:none">{logo("symbol_primary", height="38px")}</div>'
                f'<div style="flex:1"><div style="display:flex;justify-content:space-between;font:700 14px Tajawal"><span>{title}</span><span class="muted" style="font-weight:400;font-size:12px">{t}</span></div>'
                f'<div style="font:400 13.5px/1.5 Tajawal;margin-top:2px">{body}</div></div></div>')
    art(DA, "app_08_notifications", 390, 844, f'''
<div class="scr" style="background:linear-gradient(160deg,{C['green-800']},{C['night']} 70%);color:#fff">
  {statusbar()}
  <div style="text-align:center;margin-top:40px"><div style="font:500 17px Tajawal;opacity:.85">الاثنين، 26 أكتوبر</div><div class="num en" style="font:300 86px/1 Tajawal;margin-top:4px">9:41</div></div>
  <div style="position:absolute;top:330px;left:14px;right:14px;display:flex;flex-direction:column;gap:10px">
    {notif('ضمانك ينتهي قريبًا', 'ضمان «جوال ذكي 256GB» ينتهي بعد 7 أيام. تبي تراجع شروط الصيانة؟', 'الآن', 'warn')}
    {notif('تم حفظ الفاتورة', 'أضفنا «تلفزيون 55 بوصة» لضماناتك. الضمان ساري حتى 01/10/2028.', 'قبل ساعة', 'ok')}
    {notif('انتهى ضمان', 'انتهى ضمان «سماعات لاسلكية». نحتفظ بالفاتورة في أرشيفك.', 'أمس', 'exp')}
  </div>
  <div class="home-ind" style="background:#fff"></div>
</div>''', bg=C["night"])

    # 9 Scan receipt
    corners = "".join(
        f'<i style="position:absolute;{v}:0;{h}:0;width:36px;height:36px;border-{v}:4px solid #fff;border-{h}:4px solid #fff;border-{v}-{h}-radius:16px"></i>'
        for v in ("top", "bottom") for h in ("left", "right"))
    art(DA, "app_09_scan_receipt", 390, 844, f'''
<div class="scr" style="background:#0E1110;color:#fff">
  {statusbar()}
  <div style="text-align:center;font:700 17px Tajawal;margin-top:6px">تصوير الفاتورة</div>
  <div style="position:absolute;top:130px;left:44px;right:44px;height:430px">
    <div style="position:absolute;inset:26px 30px;background:#F4F1EA;border-radius:6px;color:{C['ink']};padding:22px 18px;font:400 11px/1.9 Tajawal;transform:rotate(-1.5deg)">
      <div style="font:800 14px Tajawal;text-align:center;margin-bottom:8px">فاتورة ضريبية مبسطة</div>
      <div style="display:flex;justify-content:space-between"><span>غسالة أمامية 9 كجم</span><span class="num">1,899.00</span></div>
      <div style="display:flex;justify-content:space-between"><span>ضمان الوكيل</span><span>سنتان</span></div>
      <div style="display:flex;justify-content:space-between"><span>التاريخ</span><span class="num">24/11/2024</span></div>
      <div style="border-top:1px dashed #bbb;margin:8px 0"></div>
      <div style="display:flex;justify-content:space-between;font-weight:800"><span>الإجمالي</span><span class="num">1,899.00 ر.س</span></div>
      <div style="height:46px;margin-top:14px;background:repeating-linear-gradient(90deg,#231F20 0 2px,transparent 2px 4px,#231F20 4px 5px,transparent 5px 8px)"></div>
    </div>
    {corners}
    <div style="position:absolute;left:12px;right:12px;top:46%;height:2px;background:{C['mint']};box-shadow:0 0 18px 4px rgba(127,209,185,.6)"></div>
  </div>
  <div style="position:absolute;top:590px;left:0;right:0;text-align:center">{chip('ok', 'تم التعرف على تاريخ الشراء ومدة الضمان', True)}</div>
  <div style="position:absolute;bottom:60px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:56px">
    <span style="width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.12);display:grid;place-items:center">{icon_svg('folder', 22, '#fff')}</span>
    <span style="width:76px;height:76px;border-radius:50%;border:4px solid #fff;display:grid;place-items:center"><i style="width:60px;height:60px;border-radius:50%;background:#fff"></i></span>
    <span style="width:46px;height:46px;border-radius:14px;background:rgba(255,255,255,.12);display:grid;place-items:center">{icon_svg('document', 22, '#fff')}</span>
  </div>
  <div class="home-ind" style="background:#fff"></div>
</div>''', bg="#0E1110")


# ============================================================ DIGITAL: WEB
def website():
    nav = (f'<header style="display:flex;align-items:center;justify-content:space-between;padding:26px 96px">'
           f'{logo("bilingual_primary", height="40px")}'
           f'<nav style="display:flex;gap:36px;font:500 16px Tajawal;color:{C["ink"]}"><span>كيف يعمل</span><span>المزايا</span><span>الأسئلة الشائعة</span><span>تواصل معنا</span></nav>'
           f'<div class="btn" style="height:46px;padding:0 22px;font-size:15px">حمّل التطبيق</div></header>')
    feats = [("scan", "صوّر وانسى", "التقط صورة للفاتورة، ونستخرج تاريخ الشراء ومدة الضمان تلقائيًا."),
             ("bell", "تذكير في وقته", "تنبيه قبل انتهاء الضمان بوقت كافٍ، عشان تلحق تستفيد منه."),
             ("folder", "أرشيف مرتب", "كل الفواتير والمستندات مرتبة حسب المنتج والمتجر والتاريخ."),
             ("lock", "خصوصيتك أولًا", "بياناتك محمية، وأنت وحدك تقرر مع من تشاركها.")]
    fhtml = "".join(f'<div style="background:#fff;border:1px solid {C["sand"]};border-radius:24px;padding:28px">'
                    f'<div style="width:52px;height:52px;border-radius:16px;background:{C["green-50"]};color:{C["green-600"]};display:grid;place-items:center;margin-bottom:18px">{icon_svg(i, 28)}</div>'
                    f'<h3 style="font:800 20px Tajawal;margin-bottom:8px">{t}</h3><p class="muted" style="font:400 15px/1.7 Tajawal">{b}</p></div>'
                    for i, t, b in feats)
    steps = [("1", "صوّر الفاتورة", "من الكاميرا أو من ملف PDF"), ("2", "نرتّب الضمان", "المنتج، المتجر، المدة وتاريخ الانتهاء"),
             ("3", "نذكّرك قبلها", "تنبيه قبل الانتهاء ورابط مباشر للصيانة")]
    shtml = "".join(f'<div style="flex:1;text-align:center"><div class="num" style="width:64px;height:64px;margin:0 auto 16px;border-radius:50%;border:2px solid {C["green-300"]};display:grid;place-items:center;font:800 24px Tajawal;color:{C["green-600"]};background:#fff;position:relative;z-index:1">{n}</div>'
                    f'<h4 style="font:800 18px Tajawal;margin-bottom:6px">{t}</h4><p class="muted" style="font:400 14px Tajawal">{b}</p></div>' for n, t, b in steps)
    footer = (f'<footer style="background:{C["ink"]};color:#fff;padding:56px 96px 32px;position:relative;overflow:hidden">'
              f'{pattern_layer("rgba(255,255,255,.04)", 1, None, 80)}'
              f'<div style="position:relative;display:flex;justify-content:space-between;align-items:start">'
              f'<div>{logo("bilingual_reversed-on-dark", height="40px")}<p style="font:400 14px/1.7 Tajawal;opacity:.7;margin-top:16px;max-width:320px">منصة رقمية لحفظ الضمانات والفواتير وإدارتها، وتنبيهك قبل انتهاء الضمان.</p></div>'
              f'<div style="display:flex;gap:72px;font:400 14px/2.2 Tajawal"><div><b style="display:block;font-weight:800;margin-bottom:6px">المنتج</b>المزايا<br>كيف يعمل<br>الأسعار</div><div><b style="display:block;font-weight:800;margin-bottom:6px">الشركة</b>من نحن<br>الوظائف<br>تواصل معنا</div><div><b style="display:block;font-weight:800;margin-bottom:6px">قانوني</b>الخصوصية<br>الشروط</div></div></div>'
              f'<div style="position:relative;border-top:1px solid rgba(255,255,255,.12);margin-top:40px;padding-top:20px;display:flex;justify-content:space-between;font:400 13px Tajawal;opacity:.6"><span>© 2026 ضماناتي. جميع الحقوق محفوظة.</span><span class="en">damanati</span></div></footer>')
    dash_png = (OUT / DA / "app_04_dashboard_light.png").as_uri()
    det_png = (OUT / DA / "app_06_warranty_detail.png").as_uri()
    body = f'''
<div style="width:1440px;background:{C['paper']}">
  {nav}
  <section style="position:relative;margin:8px 48px 0;border-radius:40px;background:{C['green-600']};color:#fff;height:640px;overflow:hidden;display:flex;align-items:center;padding:0 72px">
    {pattern_layer('rgba(255,255,255,.16)', 1, 'left', 80, 'right:auto;width:60%')}
    <div style="position:relative;width:560px">
      <span class="chip" style="background:rgba(255,255,255,.14);color:#fff;font-size:14px;padding:8px 14px">{icon_svg('shield-check', 16, '#fff', 2)} تطبيق سعودي لإدارة الضمانات</span>
      <h1 style="font:800 64px/1.15 Tajawal;margin:22px 0 18px">كل ضماناتك<br>في مكان واحد</h1>
      <p style="font:400 20px/1.7 Tajawal;opacity:.9;margin-bottom:34px">احفظ الفواتير، تابع مدة الضمان، ووصلك تنبيه قبل ما ينتهي. بدون ورق، وبدون ما يضيع حقك.</p>
      <div style="display:flex;gap:14px"><div class="btn" style="background:#fff;color:{C['green-700']};padding:0 28px">حمّل التطبيق</div><div class="btn" style="background:transparent;border:1.5px solid rgba(255,255,255,.5);padding:0 28px">شاهد كيف يعمل</div></div>
    </div>
    <div style="position:absolute;left:150px;bottom:-70px;transform:rotate(-6deg)">{phone(dash_png, 290)}</div>
    <div style="position:absolute;left:40px;bottom:-150px;transform:rotate(8deg);opacity:.95">{phone(det_png, 250)}</div>
  </section>
  <section style="padding:96px">
    <h2 style="font:800 40px Tajawal;text-align:center;margin-bottom:12px">ضمانك محفوظ، وحقك واضح</h2>
    <p class="muted" style="text-align:center;font:400 18px Tajawal;margin-bottom:48px">أربع أشياء يسويها ضماناتي عنك</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px">{fhtml}</div>
  </section>
  <section style="padding:0 96px 96px">
    <div style="background:#fff;border-radius:32px;padding:56px;border:1px solid {C['sand']}">
      <h2 style="font:800 34px Tajawal;text-align:center;margin-bottom:44px">ثلاث خطوات وبس</h2>
      <div style="position:relative;display:flex;gap:24px"><i style="position:absolute;top:32px;left:16%;right:16%;height:2px;background:repeating-linear-gradient(90deg,{C['green-300']} 0 8px,transparent 8px 14px)"></i>{shtml}</div>
    </div>
  </section>
  {footer}
</div>'''
    art(DA, "web_01_landing_page", 1440, 1966, body, scale=1, bg=C["paper"])


# ============================================================ DIGITAL: OTHER
def digital_misc():
    # Email header + signature
    art(DA, "email_01_header", 600, 200, f'''
<div style="position:relative;width:600px;height:200px;background:{C['green-600']};overflow:hidden;display:flex;align-items:center;justify-content:space-between;padding:0 36px;color:#fff">
  {pattern_layer('rgba(255,255,255,.12)', 1, 'right', 56)}
  <div style="position:relative">{logo('bilingual_reversed-on-green', height='34px')}</div>
  <div style="position:relative;font:700 18px/1.4 Tajawal;text-align:left">تحديث شهري<br><span style="font-weight:400;font-size:14px;opacity:.85">أكتوبر 2026</span></div>
</div>''')
    art(DA, "email_02_signature", 600, 170, f'''
<div style="width:600px;height:170px;background:#fff;display:flex;align-items:center;gap:22px;padding:0 28px;border-top:4px solid {C['green-600']}">
  {logo('symbol_primary', height='68px')}
  <div style="border-right:1px solid {C['sand']};padding-right:22px;font:400 13px/1.7 Tajawal;color:{C['stone']}">
    <div style="font:800 17px Tajawal;color:{C['ink']}">نورة العتيبي</div>
    <div style="color:{C['green-600']};font-weight:700">مديرة تجربة العملاء</div>
    <div class="en num">+966 5X XXX XXXX · name@damanati.sa</div>
    <div>الرياض، المملكة العربية السعودية</div>
  </div>
</div>''')
    # Banners
    for name, w, h, head, sz in [("banner_728x90", 728, 90, "كل ضماناتك في مكان واحد", 24),
                                 ("banner_300x250", 300, 250, "لا تضيّع ضمانك", 28),
                                 ("banner_1200x628", 1200, 628, "صوّر الفاتورة، وخلّ الباقي علينا", 56),
                                 ("banner_160x600", 160, 600, "ضمانك محفوظ", 26)]:
        vertical = h > w * 1.5
        square = not vertical and h > w * 0.5
        lay = "flex-direction:column;justify-content:space-between;align-items:center;text-align:center;padding:28px 16px" if vertical else (
            "flex-direction:column;justify-content:space-between;align-items:flex-start;padding:22px" if square else "align-items:center;justify-content:space-between;padding:0 22px")
        lg = logo('symbol_reversed-on-green', height=f"{min(h, w) * (0.5 if not (square or vertical) else 0.16):.0f}px")
        cta = f'<span class="btn" style="background:#fff;color:{C["green-700"]};height:{max(34, h * 0.07 if square else 40):.0f}px;padding:0 18px;font-size:{max(13, sz * 0.4):.0f}px;flex:none">حمّل التطبيق</span>'
        art(DA, name, w, h, f'''
<div style="position:relative;width:{w}px;height:{h}px;background:{C['green-600']};color:#fff;display:flex;{lay};overflow:hidden">
  {pattern_layer('rgba(255,255,255,.13)', 1, 'up' if vertical else 'right', 48 if w < 800 else 96)}
  <div style="position:relative">{lg}</div>
  <div style="position:relative;font:800 {sz}px/1.2 Tajawal">{head}</div>
  <div style="position:relative">{cta}</div>
</div>''', scale=2)

    # App store: Google Play feature graphic
    art(DA, "store_google_play_feature_1024x500", 1024, 500, f'''
<div style="position:relative;width:1024px;height:500px;background:{C['green-600']};color:#fff;overflow:hidden;display:flex;align-items:center;padding:0 64px">
  {pattern_layer('rgba(255,255,255,.9)', 1, 'left', 72, 'right:auto;width:60%')}
  <div style="position:relative;width:520px">{logo('bilingual_reversed-on-green', height='54px')}<h1 style="font:800 46px/1.2 Tajawal;margin-top:28px">كل ضماناتك<br>في مكان واحد</h1></div>
</div>''', scale=2)
    # App Store screenshots (6.7" portrait 1290x2796 @ scale 2 from 645x1398)
    for i, (scr, head, sub) in enumerate([
            ("app_04_dashboard_light", "كل ضماناتك في مكان واحد", "تابع حالة كل منتج بنظرة"),
            ("app_09_scan_receipt", "صوّر الفاتورة وبس", "نستخرج مدة الضمان تلقائيًا"),
            ("app_06_warranty_detail", "رحلة الضمان واضحة", "من الشراء إلى الانتهاء"),
            ("app_08_notifications", "تذكير قبل الانتهاء", "ما يفوتك حقك في الصيانة")], 1):
        png = (OUT / DA / f"{scr}.png").as_uri()
        dark = i % 2 == 0
        bg = C["green-600"] if not dark else C["green-800"]
        art(DA, f"store_app_store_screenshot_{i}", 645, 1398, f'''
<div style="position:relative;width:645px;height:1398px;background:{bg};color:#fff;overflow:hidden;text-align:center">
  {pattern_layer('rgba(255,255,255,.08)', 1, 'down', 72)}
  <div style="position:relative;padding:86px 40px 0"><h1 style="font:800 46px/1.2 Tajawal">{head}</h1><p style="font:400 22px Tajawal;opacity:.85;margin-top:12px">{sub}</p></div>
  <div style="position:absolute;left:50%;top:330px;transform:translateX(-50%)">{phone(png, 440, shadow=True)}</div>
</div>''', scale=2)
    # Social profile assets
    art(SM, "profile_avatar_1080", 1080, 1080, f'''
<div style="width:1080px;height:1080px;background:{C['green-600']};display:grid;place-items:center">{mark_svg('#fff', '520px')}</div>''', scale=1)
    art(SM, "profile_x_header_1500x500", 1500, 500, f'''
<div style="position:relative;width:1500px;height:500px;background:{C['green-600']};overflow:hidden;display:flex;align-items:center;justify-content:center">
  {pattern_layer('rgba(255,255,255,.9)', 1, 'down', 88, 'top:45%')}
  <div style="position:relative;margin-top:-90px">{logo('bilingual_reversed-on-green', height='76px')}</div>
</div>''', scale=1)
    art(SM, "profile_linkedin_cover_1584x396", 1584, 396, f'''
<div style="position:relative;width:1584px;height:396px;background:{C['green-600']};color:#fff;overflow:hidden;display:flex;align-items:center;justify-content:space-between;padding:0 96px 0 120px">
  {pattern_layer('rgba(255,255,255,.12)', 1, None, 84)}
  <div style="position:relative;font:800 44px/1.3 Tajawal">نحفظ ضمانك،<br>ونذكّرك بحقك.</div>
  <div style="position:relative">{logo('bilingual_reversed-on-green', height='58px')}</div>
</div>''', scale=1)
    # App icon & favicon set
    icons = OUT / "02_Logos" / "app_icon" / "source"
    icons.mkdir(parents=True, exist_ok=True)


# ============================================================ CORPORATE
def corporate():
    # Business card 85x55mm -> 340x220 css px (4px/mm)
    art(CO, "business_card_front", 340, 220, f'''
<div style="position:relative;width:340px;height:220px;background:{C['green-600']};overflow:hidden;display:grid;place-items:center">
  {pattern_layer('rgba(255,255,255,.9)', 1, 'down', 34, 'top:58%')}
  <div style="position:relative;margin-top:-24px">{logo('bilingual_reversed-on-green', height='30px')}</div>
</div>''', scale=4, pdf_mm=(85, 55))
    art(CO, "business_card_back", 340, 220, f'''
<div style="width:340px;height:220px;background:#fff;padding:22px 24px;display:flex;flex-direction:column;justify-content:space-between;border-right:6px solid {C['green-600']}">
  <div style="display:flex;justify-content:space-between;align-items:start">
    <div><div style="font:800 16px Tajawal">نورة العتيبي</div><div class="en" style="font:500 10px Tajawal;color:{C['stone']};text-align:right">Noura Alotaibi</div>
    <div style="font:700 11px Tajawal;color:{C['green-600']};margin-top:4px">مديرة تجربة العملاء</div></div>
    {logo('symbol_primary', height='34px')}
  </div>
  <div style="font:400 10px/1.8 Tajawal;color:{C['ink']}">
    <div class="en num" style="text-align:right">+966 5X XXX XXXX</div><div class="en" style="text-align:right">name@damanati.sa</div>
    <div>الرياض، المملكة العربية السعودية</div>
  </div>
</div>''', scale=4, pdf_mm=(85, 55))

    # Letterhead A4 794x1123
    art(CO, "letterhead_a4", 794, 1123, f'''
<div style="position:relative;width:794px;height:1123px;background:#fff;padding:56px 64px">
  <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:22px;border-bottom:2px solid {C['green-600']}">
    {logo('bilingual_primary', height='38px')}
    <div style="font:400 11px/1.7 Tajawal;color:{C['stone']};text-align:left" class="en">Ref: DM-2026-001<br>26 / 10 / 2026</div>
  </div>
  <div style="margin-top:48px;font:400 13.5px/2 Tajawal;color:{C['ink']}">
    <p style="font-weight:800;margin-bottom:16px">السادة / ...................... المحترمين</p>
    <p>السلام عليكم ورحمة الله وبركاته،</p>
    <p style="margin-top:12px;color:{C['stone']}">[مساحة نص الخطاب: خط تجوال Regular بحجم 11–12 نقطة، تباعد أسطر 1.8–2.0. يبدأ النص بعد ترويسة الخطاب بمسافة 48 بكسل، ويحترم الهامشين الأيمن والأيسر 64 بكسل (17 ملم).]</p>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:150px;overflow:hidden">
    {pattern_layer(C['green-100'], 1, 'down', 40)}
    <div style="position:absolute;bottom:0;left:0;right:0;height:46px;background:{C['green-600']};color:#fff;display:flex;justify-content:space-between;align-items:center;padding:0 64px;font:400 10.5px Tajawal">
      <span>الرياض، المملكة العربية السعودية</span><span class="en">damanati.sa</span><span class="en num">+966 XX XXX XXXX</span>
    </div>
  </div>
</div>''', scale=2, pdf_mm=(210, 297))

    # Official document / company profile cover A4
    art(CO, "document_cover_a4", 794, 1123, f'''
<div style="position:relative;width:794px;height:1123px;background:{C['green-600']};color:#fff;overflow:hidden;padding:72px 64px">
  {pattern_layer('rgba(255,255,255,.95)', 1, 'down', 64, 'top:52%')}
  <div style="position:relative">{logo('bilingual_reversed-on-green', height='42px')}</div>
  <div style="position:relative;margin-top:220px">
    <div style="font:500 16px Tajawal;opacity:.8;letter-spacing:.02em">ملف تعريفي · 2026</div>
    <h1 style="font:800 60px/1.15 Tajawal;margin-top:12px">ضماناتي<br>نحفظ حقك بعد الشراء</h1>
    <div style="width:64px;height:4px;background:#fff;border-radius:4px;margin-top:28px"></div>
    <p class="en" style="font:400 17px Tajawal;opacity:.85;margin-top:20px;text-align:right">Company Profile · Damanati</p>
  </div>
</div>''', scale=2, pdf_mm=(210, 297))

    # Presentation cover + divider 1920x1080
    art(CO, "presentation_cover_16x9", 1920, 1080, f'''
<div style="position:relative;width:1920px;height:1080px;background:{C['green-600']};color:#fff;overflow:hidden;display:flex;align-items:center;padding:0 140px">
  {pattern_layer('rgba(255,255,255,.95)', 1, 'left', 110, 'right:auto;width:52%')}
  <div style="position:relative;width:900px">
    {logo('bilingual_reversed-on-green', height='64px')}
    <h1 style="font:800 96px/1.15 Tajawal;margin:70px 0 24px">عرض المستثمرين</h1>
    <p style="font:400 34px Tajawal;opacity:.85">الربع الرابع · 2026</p>
  </div>
</div>''', scale=1)
    art(CO, "presentation_divider_16x9", 1920, 1080, f'''
<div style="position:relative;width:1920px;height:1080px;background:{C['paper']};color:{C['ink']};overflow:hidden;display:flex;align-items:center;padding:0 160px">
  <div style="position:absolute;left:-120px;top:50%;transform:translateY(-50%);opacity:.08">{mark_svg(C['green-600'], '860px')}</div>
  <div style="position:relative">
    <div class="num" style="font:800 200px/1 Tajawal;color:{C['green-600']}">02</div>
    <h1 style="font:800 88px/1.2 Tajawal;margin-top:20px">نموذج العمل</h1>
    <p class="en" style="font:400 34px Tajawal;color:{C['stone']};margin-top:12px;text-align:right">Business Model</p>
  </div>
</div>''', scale=1)
    art(CO, "presentation_content_16x9", 1920, 1080, f'''
<div style="position:relative;width:1920px;height:1080px;background:#fff;color:{C['ink']};padding:96px 140px">
  <div style="display:flex;justify-content:space-between;align-items:center"><span style="font:500 24px Tajawal;color:{C['green-600']}">02 · نموذج العمل</span>{logo('symbol_primary', height='54px')}</div>
  <h1 style="font:800 68px/1.2 Tajawal;margin:56px 0 56px;max-width:1300px">ثلاث طرق تخلق بها ضماناتي قيمة للمستخدم</h1>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:40px">
    {''.join(f'<div style="border-top:4px solid {C["green-600"]};padding-top:28px"><div class="num" style="font:800 64px Tajawal;color:{C["green-600"]}">0{i}</div><h3 style="font:800 34px Tajawal;margin:12px 0">{t}</h3><p style="font:400 24px/1.7 Tajawal;color:{C["stone"]}">{b}</p></div>' for i, (t, b) in enumerate([("الحفظ", "فواتير وضمانات في أرشيف واحد يسهل الرجوع له."), ("التنبيه", "تذكير قبل الانتهاء يحمي حق المستخدم في الصيانة."), ("الوضوح", "حالة كل ضمان مفهومة بنظرة واحدة.")], 1))}
  </div>
  <div style="position:absolute;bottom:56px;left:140px;right:140px;display:flex;justify-content:space-between;font:400 18px Tajawal;color:{C['stone']}"><span>ضماناتي · عرض المستثمرين</span><span class="num">07</span></div>
</div>''', scale=1)

    # Staff ID card 54x86mm portrait -> 216x344
    art(CO, "staff_id_card", 216, 344, f'''
<div style="position:relative;width:216px;height:344px;background:#fff;overflow:hidden;text-align:center;border-radius:12px">
  <div style="height:118px;background:{C['green-600']};position:relative;overflow:hidden">{pattern_layer('rgba(255,255,255,.14)', 1, None, 30)}<div style="position:relative;padding-top:18px;display:flex;justify-content:center">{logo('bilingual_reversed-on-green', height='20px')}</div></div>
  <div style="width:86px;height:86px;border-radius:24px;background:{C['sand']};margin:-44px auto 0;position:relative;border:4px solid #fff;display:grid;place-items:center;color:{C['stone']}">{icon_svg('user', 40)}</div>
  <div style="font:800 16px Tajawal;margin-top:12px">نورة العتيبي</div>
  <div style="font:500 11px Tajawal;color:{C['green-600']}">تجربة العملاء</div>
  <div class="en num" style="font:400 10px Tajawal;color:{C['stone']};margin-top:6px">ID 000214</div>
  <div style="position:absolute;bottom:16px;left:28px;right:28px;height:30px;background:repeating-linear-gradient(90deg,#231F20 0 2px,transparent 2px 4px,#231F20 4px 5px,transparent 5px 7px)"></div>
</div>''', scale=4, pdf_mm=(54, 86), transparent=True)

    # Folder flat (two panels A4 + spine)
    art(CO, "folder_flat", 1640, 1123, f'''
<div style="display:flex;width:1640px;height:1123px">
  <div style="width:794px;height:1123px;background:#fff;position:relative;padding:64px">
    <div style="position:absolute;bottom:64px;right:64px;left:64px;font:400 13px/1.9 Tajawal;color:{C['stone']}">
      {logo('symbol_primary', height='48px')}<div style="margin-top:16px">الرياض، المملكة العربية السعودية<br><span class="en">damanati.sa</span></div></div>
  </div>
  <div style="width:52px;background:{C['green-700']}"></div>
  <div style="width:794px;height:1123px;background:{C['green-600']};position:relative;overflow:hidden;display:grid;place-items:center">
    {pattern_layer('rgba(255,255,255,.95)', 1, 'down', 64, 'top:50%')}
    <div style="position:relative;margin-top:-160px">{logo('vertical_reversed-on-green', height='190px')}</div>
  </div>
</div>''', scale=1)


# ============================================================ MARKETING
def marketing():
    # Instagram posts 1080x1080 (rendered 540 @2x)
    art(SM, "instagram_post_01_launch", 540, 540, f'''
<div style="position:relative;width:540px;height:540px;background:{C['green-600']};color:#fff;overflow:hidden;padding:44px">
  {pattern_layer('rgba(255,255,255,.95)', 1, 'down', 52, 'top:55%')}
  <div style="position:relative">{logo('arabic_reversed-on-green', height='34px')}</div>
  <h1 style="position:relative;font:800 52px/1.15 Tajawal;margin-top:64px">وصل<br>ضماناتي</h1>
  <p style="position:relative;font:400 19px/1.6 Tajawal;opacity:.9;margin-top:14px">كل ضماناتك في مكان واحد.<br>حمّله الحين.</p>
</div>''')
    art(SM, "instagram_post_02_tip", 540, 540, f'''
<div style="position:relative;width:540px;height:540px;background:{C['paper']};color:{C['ink']};overflow:hidden;padding:44px">
  <div style="display:flex;justify-content:space-between;align-items:center"><span class="chip" style="background:{C['green-50']};color:{C['green-700']};font-size:14px;padding:8px 14px">نصيحة الأسبوع</span>{logo('symbol_primary', height='36px')}</div>
  <div class="num" style="font:800 120px/1 Tajawal;color:{C['green-600']};margin-top:36px">30</div>
  <h2 style="font:800 34px/1.3 Tajawal;margin-top:6px">يوم قبل الانتهاء<br>هو أفضل وقت للفحص</h2>
  <p class="muted" style="font:400 17px/1.7 Tajawal;margin-top:14px">إذا فيه عطل بسيط، اطلب الصيانة وأنت داخل فترة الضمان.</p>
  <div style="position:absolute;left:-30px;bottom:-40px;opacity:.07">{mark_svg(C['green-600'], '220px')}</div>
</div>''')
    art(SM, "instagram_post_03_feature", 540, 540, f'''
<div style="position:relative;width:540px;height:540px;background:{C['green-800']};color:#fff;overflow:hidden;padding:44px">
  <h2 style="font:800 34px/1.3 Tajawal">حالة ضماناتك<br>بنظرة وحدة</h2>
  <div style="position:absolute;left:44px;right:44px;bottom:44px;display:flex;gap:22px;align-items:center;background:{C['night-raised']};border-radius:24px;padding:22px">
    {ring([(9, C['green-300']), (2, C['warning-on-dark']), (1, C['danger-on-dark'])], 140, 13, 8, None, "12", "ضمان", True)}
    <div style="flex:1;display:flex;flex-direction:column;gap:12px;font:500 16px Tajawal">
      {''.join(f'<div style="display:flex;align-items:center;gap:10px"><i style="width:12px;height:12px;border-radius:3px;background:{c}"></i>{t}<b class="num" style="margin-inline-start:auto">{n}</b></div>' for t, n, c in [("ساري", 9, C['green-300']), ("ينتهي قريبًا", 2, C['warning-on-dark']), ("منتهي", 1, C['danger-on-dark'])])}
    </div>
  </div>
  <div style="position:absolute;top:44px;left:44px">{logo('symbol_reversed-on-dark', height='36px')}</div>
</div>''')
    # Stories 1080x1920 (540x960 @2x)
    dash = (OUT / DA / "app_04_dashboard_light.png").as_uri()
    art(SM, "instagram_story_01_download", 540, 960, f'''
<div style="position:relative;width:540px;height:960px;background:{C['green-600']};color:#fff;overflow:hidden;text-align:center">
  {pattern_layer('rgba(255,255,255,.12)', 1, None, 56)}
  <div style="position:relative;padding-top:86px;display:flex;justify-content:center">{logo('bilingual_reversed-on-green', height='38px')}</div>
  <h1 style="position:relative;font:800 46px/1.2 Tajawal;margin-top:40px">لا تضيّع<br>حقك في الضمان</h1>
  <div style="position:absolute;left:50%;top:400px;transform:translateX(-50%)">{phone(dash, 300)}</div>
  <div style="position:absolute;bottom:56px;left:60px;right:60px" class="btn" ><span style="color:{C['green-700']}">اسحب للأعلى وحمّل التطبيق</span></div>
</div>''', css=f".btn{{background:#fff}}")
    art(SM, "instagram_story_02_quiz", 540, 960, f'''
<div style="position:relative;width:540px;height:960px;background:{C['paper']};color:{C['ink']};overflow:hidden;padding:80px 44px">
  {logo('symbol_primary', height='44px')}
  <h1 style="font:800 44px/1.25 Tajawal;margin-top:56px">وين تحط فواتيرك<br>عادةً؟</h1>
  <div style="display:flex;flex-direction:column;gap:14px;margin-top:44px">
    {''.join(f'<div style="height:66px;border-radius:20px;background:#fff;border:1.5px solid {C["sand"]};display:flex;align-items:center;padding:0 22px;font:700 19px Tajawal;gap:12px"><span class="num" style="width:34px;height:34px;border-radius:10px;background:{C["green-50"]};color:{C["green-700"]};display:grid;place-items:center">{l}</span>{t}</div>' for l, t in [("أ", "في درج المطبخ"), ("ب", "في صندوق الجهاز"), ("ج", "صورة في الجوال… في مكان ما"), ("د", "في ضماناتي طبعًا")])}
  </div>
  <div style="position:absolute;right:-60px;bottom:-60px;opacity:.08">{mark_svg(C['green-600'], '300px')}</div>
</div>''')
    # LinkedIn 1200x627, X 1600x900
    art(SM, "linkedin_post_1200x627", 1200, 627, f'''
<div style="position:relative;width:1200px;height:627px;background:#fff;color:{C['ink']};overflow:hidden;display:flex">
  <div style="flex:1;padding:64px">
    {logo('bilingual_primary', height='40px')}
    <h1 style="font:800 50px/1.25 Tajawal;margin-top:64px">ثقة المستهلك تبدأ<br>بعد عملية الشراء</h1>
    <p class="muted" style="font:400 21px/1.7 Tajawal;margin-top:18px">كيف يساعد التنظيم الرقمي للضمانات المستهلك على الاستفادة من حقوقه؟</p>
  </div>
  <div style="width:430px;background:{C['green-600']};position:relative;overflow:hidden;display:grid;place-items:center">
    {pattern_layer('rgba(255,255,255,.14)', 1, None, 64)}
    <div style="position:relative">{passport('ملخص الضمانات', [('ساري', '9'), ('ينتهي قريبًا', '2'), ('منتهي', '1')], width=300)}</div>
  </div>
</div>''', scale=1)
    art(SM, "x_post_1600x900", 1600, 900, f'''
<div style="position:relative;width:1600px;height:900px;background:{C['green-600']};color:#fff;overflow:hidden;display:flex;align-items:center;padding:0 110px">
  {pattern_layer('rgba(255,255,255,.9)', 1, 'left', 100, 'right:auto;width:50%')}
  <div style="position:relative">
    <h1 style="font:800 84px/1.2 Tajawal">الفاتورة تضيع،<br>الضمان ما يضيع.</h1>
    <div style="margin-top:44px">{logo('bilingual_reversed-on-green', height='54px')}</div>
  </div>
</div>''', scale=1)

    # Campaign key visual 1920x1080 ("Passport" family hero)
    cards = (f'<div style="position:absolute;left:180px;top:170px;transform:rotate(-8deg)">{passport("تلفزيون 55 بوصة", [("تاريخ الشراء","01/10/2026"),("مدة الضمان","سنتان"),("ينتهي","01/10/2028")], width=380, badge=chip("ok"))}</div>'
             f'<div style="position:absolute;left:330px;top:420px;transform:rotate(5deg)">{passport("مكيف سبليت 24000", [("المتجر","مؤسسة تكييف"),("المتبقي","10 أشهر")], width=380, badge=chip("ok"))}</div>'
             f'<div style="position:absolute;left:120px;top:600px;transform:rotate(-3deg)">{passport("غسالة أمامية 9 كجم", [("المتبقي","29 يومًا")], width=360, badge=chip("warn"))}</div>')
    art(MK, "campaign_key_visual_16x9", 1920, 1080, f'''
<div style="position:relative;width:1920px;height:1080px;background:{C['green-600']};color:#fff;overflow:hidden">
  {pattern_layer('rgba(255,255,255,.08)', 1, None, 120)}
  <div style="position:absolute;right:140px;top:50%;transform:translateY(-50%);width:820px">
    <span class="chip" style="background:rgba(255,255,255,.14);color:#fff;font-size:22px;padding:12px 20px">حملة الإطلاق</span>
    <h1 style="font:800 110px/1.1 Tajawal;margin:30px 0 26px">لكل منتج<br>جواز ضمان</h1>
    <p style="font:400 32px/1.6 Tajawal;opacity:.9">صوّر الفاتورة، وضماناتي يحفظ تفاصيل الضمان ويذكّرك قبل الانتهاء.</p>
    <div style="margin-top:50px">{logo('bilingual_reversed-on-green', height='64px')}</div>
  </div>
  {cards}
</div>''', scale=1)
    # Outdoor billboard 2:1 (48-sheet ratio)
    art(MK, "outdoor_billboard_2x1", 2400, 1200, f'''
<div style="position:relative;width:2400px;height:1200px;background:{C['green-600']};color:#fff;overflow:hidden;display:flex;align-items:center;justify-content:space-between;padding:0 180px">
  {pattern_layer('rgba(255,255,255,.9)', 1, 'down', 150, 'top:70%')}
  <h1 style="position:relative;font:800 190px/1.1 Tajawal;margin-top:-120px">ضمانك<br>في جيبك</h1>
  <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:40px;margin-top:-120px">{logo('vertical_reversed-on-green', height='520px')}</div>
</div>''', scale=1)
    # Event backdrop 3x2m ratio 3:2
    art(MK, "event_backdrop_3x2", 2400, 1600, f'''
<div style="position:relative;width:2400px;height:1600px;background:{C['green-600']};overflow:hidden;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr)">
  {''.join(f'<div style="display:grid;place-items:center;background:{C["green-600"] if (r + c) % 2 == 0 else C["green-700"]}">{logo("bilingual_reversed-on-green" if (r + c) % 2 == 0 else "symbol_reversed-on-green", height="70px" if (r + c) % 2 == 0 else "150px")}</div>' for r in range(4) for c in range(4))}
</div>''', scale=1)
    # Roll-up banner 85x200cm
    art(MK, "rollup_banner_85x200", 850, 2000, f'''
<div style="position:relative;width:850px;height:2000px;background:{C['green-600']};color:#fff;overflow:hidden;text-align:center;padding-top:150px">
  {pattern_layer('rgba(255,255,255,.95)', 1, 'down', 90, 'top:58%')}
  <div style="position:relative;display:flex;justify-content:center">{logo('vertical_reversed-on-green', height='330px')}</div>
  <h1 style="position:relative;font:800 92px/1.2 Tajawal;margin-top:110px">كل ضماناتك<br>في مكان واحد</h1>
  <p style="position:relative;font:400 38px Tajawal;opacity:.9;margin-top:30px">حمّل التطبيق مجانًا</p>
</div>''', scale=1)
    # Merchandise artwork: tote + tee chest print (flat)
    art(MK, "merch_tote_bag_flat", 800, 900, f'''
<div style="position:relative;width:800px;height:900px;background:{C['paper']};display:grid;place-items:center">
  <div style="position:relative;width:520px;height:600px;background:{C['green-600']};border-radius:6px;overflow:hidden;display:grid;place-items:center">
    {pattern_layer('rgba(255,255,255,.9)', 1, 'down', 56, 'top:55%')}
    <div style="position:relative;margin-top:-140px">{logo('vertical_reversed-on-green', height='220px')}</div>
  </div>
  <div style="position:absolute;top:70px;left:50%;transform:translateX(-50%);width:300px;height:120px;border:22px solid {C['green-700']};border-bottom:none;border-radius:150px 150px 0 0"></div>
</div>''', scale=1)


# ============================================================ TEMPLATES (reusable)
def templates():
    art(TP, "template_instagram_post_blank", 540, 540, f'''
<div style="position:relative;width:540px;height:540px;background:{C['green-600']};color:#fff;overflow:hidden;padding:44px">
  {pattern_layer('rgba(255,255,255,.95)', 1, 'down', 52, 'top:62%')}
  <div style="position:relative">{logo('symbol_reversed-on-green', height='40px')}</div>
  <div style="position:relative;margin-top:70px;border:2px dashed rgba(255,255,255,.5);border-radius:18px;padding:22px;font:800 34px/1.3 Tajawal">العنوان هنا<br><span style="font:400 18px Tajawal;opacity:.85">نص داعم لا يتجاوز سطرين.</span></div>
</div>''')


# ============================================================ ILLUSTRATION + 3D DIRECTION
def illustrations():
    IL = "07_Illustrations"
    art(IL, "illustration_empty_scan", 400, 320, f'''
<div style="position:relative;width:400px;height:320px">
  <div style="position:absolute;inset:40px 70px;border:3px dashed {C['green-300']};border-radius:44px"></div>
  <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:150px;height:150px;border-radius:46px;background:#fff;box-shadow:0 22px 44px rgba(47,125,107,.22);display:grid;place-items:center;color:{C['green-600']}">{icon_svg('scan', 72)}</div>
</div>''', transparent=True)
    art(IL, "illustration_passport_stack", 520, 420, f'''
<div style="position:relative;width:520px;height:420px">
  <div style="position:absolute;top:40px;right:40px;transform:rotate(-7deg)">{passport("تلفزيون 55 بوصة", [("تاريخ الشراء","01/10/2026"),("ينتهي","01/10/2028")], width=300, badge=chip("ok"), stamp=False)}</div>
  <div style="position:absolute;top:150px;right:130px;transform:rotate(5deg)">{passport("جوال ذكي 256GB", [("المتجر","متجر إلكترونيات"),("المتبقي","7 أيام")], width=300, badge=chip("warn"))}</div>
</div>''', transparent=True)
    art(IL, "illustration_lifecycle_ring", 420, 420, f'''
<div style="width:420px;height:420px;display:grid;place-items:center">{ring([(9, C['green-600']), (2, C['warning']), (1, C['danger'])], 340, 30, 8, None, "12", "ضمان")}</div>''', transparent=True)
    art("08_3D_Assets", "3d_direction_preview_css", 960, 640, f'''
<div style="position:relative;width:960px;height:640px;background:radial-gradient(120% 90% at 70% 20%,{C['green-700']},{C['night']} 70%);overflow:hidden;display:grid;place-items:center">
  <div style="position:absolute;bottom:110px;width:420px;height:60px;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(22px)"></div>
  <div style="transform:perspective(1200px) rotateX(18deg) rotateY(-24deg);filter:drop-shadow(0 40px 40px rgba(0,0,0,.45))">
    <div style="width:300px;height:300px;border-radius:22.4%;background:linear-gradient(150deg,{C['green-400']},{C['green-600']} 45%,{C['green-800']});display:grid;place-items:center;box-shadow:inset 0 3px 0 rgba(255,255,255,.35),inset 0 -20px 34px rgba(0,0,0,.25),18px 20px 0 {C['green-900']}">{mark_svg('#F6F4EF', '180px')}</div>
  </div>
</div>''', scale=2, bg=C["night"])


def build():
    BUILD.mkdir(exist_ok=True)
    illustrations()
    app_screens()
    website()
    digital_misc()
    corporate()
    marketing()
    templates()
    # screens must exist before pages that embed them -> render in two passes
    first = [j for j in JOBS if "/app_" in j["out"]]
    rest = [j for j in JOBS if j not in first]
    for batch, name in ((first, "jobs_a.json"), (rest, "jobs_b.json")):
        p = BUILD / name
        p.write_text(json.dumps(batch))
        subprocess.run(["node", str(SRC / "render.mjs"), str(p)], check=True)


if __name__ == "__main__":
    build()
