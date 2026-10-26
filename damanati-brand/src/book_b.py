"""Brand book pages: logo, colour, type, visual language, motion, applications, governance."""
import tokens as T
from book_kit import *  # noqa: F401,F403
from build_foundation import icon_svg, ICONS, ICON_AR
from components import passport, chip, ring, warranty_card, WARRANTIES, phone, UI_CSS
from common import OUT, C

DA, CO, SM, MK, TP = ("10_Digital_Applications", "11_Corporate_Identity", "12_Social_Media", "13_Mockups", "14_Templates")


def png(folder, name):
    return (OUT / folder / f"{name}.png").as_uri()


def build_b(b: Book):
    # ============================================================ 03 LOGO
    b.add("03", divider("03", "نظام الشعار", "Logo System",
                        "الشعار المعتمد كما هو، بدون أي إعادة رسم. هنا كل صيغه وألوانه وقواعد استخدامه.",
                        "The approved logo, untouched and never redrawn: every lockup, colourway and usage rule."),
          dark=True, bg=C["green-600"], chrome=False, guide=True)

    b.add("03", f'''{title("مفهوم الشعار", "Logo concept", "a")}
<div class="g" style="grid-template-columns:1fr 1.1fr;gap:50px;align-items:center">
  <div style="display:flex;justify-content:center">{logo("symbol_primary", height="300px")}</div>
  <div>
    <p class="lead">تم تصميم الشعار من خلال دمج الحرف العربي (ض) مع الحرف اللاتيني (D) داخل رمز واحد متوازن هندسيًا. يعكس هذا الدمج هوية التطبيق العربية مع جاهزيته للتوسع عالميًا، كما يرمز الشكل المغلق إلى الحماية والاحتواء، بينما تشير المساحات الداخلية إلى التنظيم والتحول الرقمي.</p>
    <p class="enp">The logo fuses the Arabic letter ض (Dad) with the Latin D in one geometrically balanced symbol: Arabic identity, ready for global growth. The closed form stands for protection and containment; the inner spaces for organisation and digital transformation.</p>
    <div class="g g3" style="gap:10px;margin-top:18px">
      <div class="soft" style="padding:12px 14px"><b>ض</b><div class="small">الخطوة البارزة يسار الرمز تحاكي سنّ الضاد ونقطتها.</div></div>
      <div class="soft" style="padding:12px 14px"><b class="en">D</b><div class="small">القوس المغلق يكوّن حرف <span class="en">D</span> اللاتيني.</div></div>
      <div class="soft" style="padding:12px 14px"><b>المربع</b><div class="small">حاوية مستديرة الزوايا تجعل الرمز أيقونة تطبيق جاهزة.</div></div>
    </div>
  </div>
</div>''', guide=True)

    b.add("03", f'''{title("مكونات الشعار وصيغه", "Logo components and lockups", "a")}
<div class="g g2" style="gap:18px">
  <div class="card" style="height:200px;display:flex;flex-direction:column;justify-content:space-between"><span class="lbl">الصيغة الثنائية · الأساسية</span><div style="display:flex;justify-content:center">{logo("bilingual_primary", height="62px")}</div><span class="cap">الصيغة الافتراضية لكل الاستخدامات العامة.</span></div>
  <div class="card" style="height:200px;display:flex;flex-direction:column;justify-content:space-between"><span class="lbl">الاسم العربي</span><div style="display:flex;justify-content:center">{logo("arabic_primary", height="74px")}</div><span class="cap">للمواد الموجهة للسوق المحلي بالعربية فقط.</span></div>
  <div class="card" style="height:200px;display:flex;flex-direction:column;justify-content:space-between"><span class="lbl">الاسم الإنجليزي</span><div style="display:flex;justify-content:center">{logo("english_primary", height="74px")}</div><span class="cap">للمواد الإنجليزية فقط (متاجر التطبيقات الدولية، العروض الخارجية).</span></div>
  <div class="card" style="height:200px;display:flex;justify-content:space-around;align-items:center">
    <div style="text-align:center"><span class="lbl">الأيقونة</span>{logo("symbol_primary", height="96px")}</div>
    <div style="text-align:center"><span class="lbl">الصيغة العمودية {STATUS_TAG["p"]}</span>{logo("vertical_primary", height="130px")}</div>
  </div>
</div>
<p class="small mu" style="margin-top:12px">الصيغة العمودية مُرتّبة من المكونات المعتمدة نفسها (المربع والاسمين)، كما ظهرت في تطبيقات اللوحة الإعلانية والساعة (ص17–18).</p>''', guide=True)

    # construction grid (overlay on actual symbol artwork)
    b.add("03", f'''{title("شبكة البناء", "Construction grid", "a")}
<div class="g" style="grid-template-columns:1.1fr 1fr;gap:40px;align-items:center">
  <div style="position:relative;width:440px;height:440px;margin:auto">
    {logo("symbol_primary", height="440px")}
    <svg viewBox="0 0 2048 2048" style="position:absolute;inset:0;width:440px;height:440px" fill="none" stroke="{C["danger"]}" stroke-width="5">
      <line x1="419" y1="0" x2="419" y2="2048" stroke-dasharray="18 14"/><line x1="1638" y1="0" x2="1638" y2="2048" stroke-dasharray="18 14"/>
      <line x1="0" y1="479" x2="2048" y2="479" stroke-dasharray="18 14"/><line x1="0" y1="1569" x2="2048" y2="1569" stroke-dasharray="18 14"/>
      <line x1="735" y1="0" x2="735" y2="2048" stroke-dasharray="6 10"/><line x1="1306" y1="0" x2="1306" y2="2048" stroke-dasharray="6 10"/>
      <circle cx="1021" cy="1024" r="617" stroke-dasharray="6 10"/><circle cx="1021" cy="1024" r="285"/>
      <line x1="1306" y1="1124" x2="1638" y2="1124" stroke-width="8"/><text x="1400" y="1210" fill="{C["danger"]}" stroke="none" font-size="90" font-family="Tajawal" font-weight="800">x</text>
    </svg>
  </div>
  <div>
    <p>شبكة البناء الأصلية (ص6) تبني الرمز من دائرة خارجية للقوس، ودائرة داخلية للفراغ، وخطوط أفقية تضبط الخطوة البارزة. أعدنا رسم الشبكة فوق الملف المتجهي الأصلي للتحقق من القياسات:</p>
    <table class="tb"><tr><th>القياس {STATUS_TAG["m"]}</th><th>نسبة من عرض المربع</th></tr>
    <tr><td>هامش الرمز داخل المربع (أفقي)</td><td class="num">20.5%</td></tr>
    <tr><td>سماكة الساق العمودية</td><td class="num">15.4%</td></tr>
    <tr><td>سماكة القوس الجانبي = <b>x</b></td><td class="num">16.2%</td></tr>
    <tr><td>عرض الفراغ الداخلي</td><td class="num">27.9%</td></tr>
    <tr><td>عرض الرمز / عرض المربع</td><td class="num">60%</td></tr></table>
    <p class="small mu" style="margin-top:8px">القياسات بالبكسل من تصدير 2048×2048 للأيقونة الأساسية. لا يُعاد بناء الرمز من هذه النسب؛ استخدم الملفات الأصلية دائمًا.</p>
  </div>
</div>''')

    cs = lambda name, h: f'<div style="position:relative;display:inline-block;padding:{h * 0.162:.1f}px;background:repeating-linear-gradient(45deg,{C["green-50"]} 0 6px,#fff 6px 12px);outline:1px dashed {C["green-300"]}">{logo(name, height=f"{h}px")}</div>'
    b.add("03", f'''{title("مساحة الحماية", "Clear space", "a")}
<div class="g" style="grid-template-columns:1fr 1.5fr;gap:40px;align-items:center">
  <div>
    <p class="lead">يجب ترك مساحة فارغة حول الشعار تعادل <b>x</b> من كل الجهات، لضمان الوضوح وعدم التزاحم مع أي عناصر أخرى.</p>
    <div class="soft"><span class="lbl">تعريف x {STATUS_TAG["p"]}</span><p class="small" style="margin:0"><b>x</b> = سماكة قوس الـ<span class="en">D</span> = تقريبًا <b>سدس</b> عرض مربع الأيقونة (16%). في الصيغ الأفقية والعمودية تُقاس <b>x</b> من مربع الأيقونة داخل الصيغة نفسها.</p></div>
    <p class="enp" style="margin-top:10px">Keep clear space equal to x on every side. x = the stroke of the D bowl ≈ one sixth of the icon tile width. In lockups, measure x from the tile inside that lockup.</p>
  </div>
  <div style="display:flex;flex-direction:column;gap:26px;align-items:center">
    <div style="display:flex;gap:30px;align-items:center">{cs("symbol_primary", 150)}{cs("vertical_primary", 190)}</div>
    {cs("bilingual_primary", 70)}
  </div>
</div>''', guide=True)

    sizes = [("symbol_primary", "الأيقونة", "10 ملم", "48 px", "a"), ("bilingual_primary", "الصيغة الثنائية", "35 ملم عرضًا", "160 px عرضًا", "p"),
             ("arabic_primary", "الاسم العربي", "25 ملم عرضًا", "120 px عرضًا", "p"), ("english_primary", "الاسم الإنجليزي", "25 ملم عرضًا", "120 px عرضًا", "p"),
             ("vertical_primary", "الصيغة العمودية", "18 ملم ارتفاعًا", "90 px ارتفاعًا", "p")]
    sh = "".join(f'<div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:space-between;height:250px;text-align:center;padding:18px 12px"><div style="height:96px;display:flex;align-items:center">{logo(n, height="56px" if "vertical" not in n else "92px") if n not in ("bilingual_primary", "arabic_primary", "english_primary") else logo(n, width="150px" if "bilingual" in n else "130px")}</div>'
                 f'<div><h3>{t}</h3><div class="small"><b>طباعة:</b> {p}<br><b>شاشة:</b> <span class="en num">{d}</span></div><div style="margin-top:6px">{STATUS_TAG[s]}</div></div></div>' for n, t, p, d, s in sizes)
    b.add("03", f'''{title("الحد الأدنى للحجم", "Minimum size")}
<div class="g g5" style="gap:12px">{sh}</div>
<div class="g g2" style="margin-top:20px;gap:20px;align-items:center">
  <div class="soft small">الحد المعتمد للأيقونة مع رمز <span class="en">®</span> مبني على اختبار دقة الطباعة وكثافة الشاشات (ص8). تحت <span class="en num">48px</span> يُحذف رمز <span class="en">®</span> وتُستخدم ملفات <span class="en">favicon</span> و<span class="en">app icon</span> المخصصة (بدون <span class="en">®</span>) حتى <span class="en num">16px</span>.</div>
  <div style="display:flex;gap:18px;align-items:end;justify-content:center">
    {"".join(f'<div style="text-align:center"><img src="{(OUT / "02_Logos/app_icon" / f).as_uri()}" style="width:{s}px;height:{s}px;display:block;margin:auto;image-rendering:auto"><div class="cap en num">{s}px</div></div>' for f, s in [("favicon_16.png", 16), ("favicon_32.png", 32), ("favicon_48.png", 48), ("ios_120.png", 60), ("ios_180.png", 90)])}
  </div>
</div>''', guide=True)

    schemes = [("primary", "#fff", "الأساسي", "على الأبيض والخلفيات الفاتحة"), ("reversed-on-green", C["green-600"], "معكوس على الأخضر", "على الأخضر الرئيسي"),
               ("reversed-on-dark", C["ink"], "على الداكن", "على الأسود والصور الداكنة"), ("mono-black", "#fff", "أحادي أسود", "طباعة بلون واحد، فاكس، ختم"),
               ("mono-white", C["ink"], "أحادي أبيض", "حفر، طباعة بيضاء على ألوان داكنة")]
    vh = "".join(f'<div style="border-radius:14px;overflow:hidden;border:1px solid {C["sand"]}"><div style="background:{bg};height:150px;display:grid;place-items:center">{logo("bilingual_" + s, width="150px")}</div>'
                 f'<div style="padding:10px 12px"><h3 style="font-size:13px">{t}</h3><div class="cap" style="margin:0">{u}</div></div></div>' for s, bg, t, u in schemes)
    b.add("03", f'''{title("الصيغ اللونية للشعار", "Logo colourways")}
<div class="g g5" style="gap:12px">{vh}</div>
<div class="g g3" style="margin-top:22px;gap:16px">
  <div class="soft small">الأساسي والمعكوس على الأخضر والمعكوس على الداكن مأخوذة مباشرة من تطبيقات الدليل المرجعي (ص1، ص10، ص13). {STATUS_TAG["a"]}</div>
  <div class="soft small">الأحادي الأسود والأبيض {STATUS_TAG["p"]}: الأبيض يُفرّغ الرمز من المربع ليظهر لون الخلفية.</div>
  <div class="soft small">كل صيغة متوفرة بخمس تراكيب (أيقونة، عربي، إنجليزي، ثنائي، عمودي) = <b class="num">25</b> ملف <span class="en">SVG</span> + <span class="en">PNG</span>.</div>
</div>''', guide=True)

    bgs = [(C["white"], "primary", "✓"), (C["paper"], "primary", "✓"), (C["green-50"], "primary", "✓"), (C["green-600"], "reversed-on-green", "✓"),
           (C["green-800"], "reversed-on-dark", "✓"), (C["ink"], "reversed-on-dark", "✓"), (C["green-400"], "primary", "✕"), (C["stone"], "reversed-on-dark", "✕")]
    bh = "".join(f'<div style="background:{bg};border-radius:14px;height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;border:1px solid {C["sand"]};position:relative">{logo("symbol_" + s, height="62px")}'
                 f'<span style="position:absolute;top:10px;left:12px;font:800 15px Tajawal;color:{C["green-600"] if k == "✓" else C["danger"]};background:#fff;border-radius:50%;width:24px;height:24px;display:grid;place-items:center">{k}</span>'
                 f'<span class="en num" style="font:500 10px Tajawal;color:{"#fff" if T.luminance(bg) < .4 else C["stone"]}">{bg}</span></div>' for bg, s, k in bgs)
    photo_ok = (f'<div style="border-radius:14px;height:150px;background:linear-gradient(135deg,#3b4a45,#1d2321);display:grid;place-items:center;position:relative">{logo("symbol_reversed-on-dark", height="62px")}'
                f'<span style="position:absolute;top:10px;left:12px;font:800 15px Tajawal;color:{C["green-600"]};background:#fff;border-radius:50%;width:24px;height:24px;display:grid;place-items:center">✓</span><span class="cap" style="position:absolute;bottom:4px;color:#ddd">صورة داكنة هادئة</span></div>')
    photo_bad = (f'<div style="border-radius:14px;height:150px;background:repeating-linear-gradient(60deg,#c9b38a 0 14px,#8aa18f 14px 30px,#e9e1cf 30px 40px);display:grid;place-items:center;position:relative">{logo("symbol_primary", height="62px")}'
                 f'<span style="position:absolute;top:10px;left:12px;font:800 15px Tajawal;color:{C["danger"]};background:#fff;border-radius:50%;width:24px;height:24px;display:grid;place-items:center">✕</span><span class="cap" style="position:absolute;bottom:4px;color:{C["ink"]}">خلفية مزدحمة</span></div>')
    b.add("03", f'''{title("توافق الخلفيات", "Background compatibility")}
<div class="g g5" style="gap:12px">{bh}{photo_ok}{photo_bad}</div>
<p class="small mu" style="margin-top:14px">القاعدة: الأيقونة تحتاج تباينًا لا يقل عن <span class="en num">3:1</span> بين المربع والخلفية. الأخضر الفاتح (<span class="en num">green-400</span>) والرمادي الداكن يقللان التمييز. على الصور: منطقة هادئة فقط، ومع النمط: شفافية النمط تحت الشعار لا تتجاوز 15%.</p>''')

    # App icon & favicon
    b.add("03", f'''{title("أيقونة التطبيق والأيقونة المصغرة", "App icon and favicon")}
<div class="g" style="grid-template-columns:1.2fr 1fr;gap:40px">
  <div>
    <div style="display:flex;gap:26px;align-items:end;margin-bottom:22px">
      {"".join(f'<div style="text-align:center"><img src="{(OUT / "02_Logos/app_icon" / f).as_uri()}" style="width:{s}px;height:{s}px;border-radius:{s * .2237}px;display:block;box-shadow:0 8px 20px rgba(0,0,0,.12)"><div class="cap">{t}</div></div>' for f, s, t in [("ios_appstore_1024.png", 170, "iOS 1024"), ("android_play_512.png", 110, "Play 512"), ("ios_180.png", 72, "180"), ("ios_120.png", 48, "120")])}
    </div>
    <table class="tb"><tr><th>الملف</th><th>المقاس</th><th>ملاحظة</th></tr>
    <tr><td class="en">ios_appstore_1024.png</td><td class="num">1024×1024</td><td>مربع كامل بدون شفافية؛ النظام يطبق الزوايا</td></tr>
    <tr><td class="en">android_adaptive_*_432.png</td><td class="num">432×432</td><td>طبقة أمامية (الرمز داخل منطقة الأمان 66dp) + خلفية خضراء</td></tr>
    <tr><td class="en">pwa_192 / pwa_512</td><td class="num">192 / 512</td><td>بزوايا مستديرة 22.4%</td></tr>
    <tr><td class="en">favicon.ico / .svg</td><td class="num">16 / 32 / 48</td><td>الرمز مكبر إلى 64% من المربع ليبقى مقروءًا</td></tr></table>
  </div>
  <div>
    <span class="lbl">في المتصفح</span>
    <div style="background:#DEE3E1;border-radius:14px 14px 0 0;padding:10px 12px 0;display:flex;gap:8px">
      <div style="background:#fff;border-radius:10px 10px 0 0;padding:8px 14px;display:flex;align-items:center;gap:8px;font:500 12px Tajawal;width:230px"><img src="{(OUT / "02_Logos/app_icon/favicon_32.png").as_uri()}" style="width:16px;height:16px"><span class="en">Damanati · ضماناتي</span></div>
      <div style="padding:8px 14px;font:500 12px Tajawal;color:{C["stone"]}" class="en">New tab</div></div>
    <div style="background:#fff;border:1px solid #DEE3E1;border-top:none;height:70px;border-radius:0 0 14px 14px;display:flex;align-items:center;padding:0 16px"><div style="background:{C["paper"]};border-radius:999px;padding:8px 16px;font:400 13px Tajawal;width:100%" class="en">https://damanati</div></div>
    <p class="small mu" style="margin-top:14px">أيقونة التطبيق ما تحمل رمز <span class="en">®</span> لأنه غير مقروء تحت <span class="en num">48px</span>، ولأن متاجر التطبيقات تعرض اسم التطبيق بجانبها. اسم التطبيق تحت الأيقونة: «ضماناتي».</p>
  </div>
</div>''', guide=True)

    # Misuse
    mis = [("rotate(90deg)", "", "عدم تدويره", "a"), ("scaleX(1.4)", "", "عدم تمديد الشعار", "a"), ("", "outline:10px solid #231F20;outline-offset:-2px;border-radius:24px", "عدم إضافة حدود", "a"),
           ("", "filter:hue-rotate(160deg) saturate(1.5)", "عدم تغيير الألوان", "a"), ("", "filter:drop-shadow(8px 10px 6px rgba(0,0,0,.55))", "عدم إضافة ظلال أو مؤثرات", "a"),
           ("skewX(-14deg)", "", "عدم إمالة الشعار", "p"), ("", "opacity:.35", "عدم تقليل الشفافية", "p"), ("", "filter:blur(1.6px)", "عدم استخدام ملفات منخفضة الدقة", "p")]
    mh = "".join(f'<div class="card" style="text-align:center;padding:14px"><div style="height:110px;display:grid;place-items:center"><div style="transform:{t};{s}">{logo("symbol_primary", height="84px")}</div></div>'
                 f'<div style="font:800 12.5px Tajawal;color:{C["danger"]}">✕ {a}</div><div style="margin-top:4px">{STATUS_TAG[st]}</div></div>' for t, s, a, st in mis)
    wrong_text = (f'<div class="card" style="text-align:center;padding:14px"><div style="height:110px;display:grid;place-items:center"><div style="display:flex;align-items:center;gap:10px;direction:ltr">{logo("symbol_primary", height="54px")}<span style="font:300 26px Georgia,serif">Damanaty</span></div></div>'
                  f'<div style="font:800 12.5px Tajawal;color:{C["danger"]}">✕ عدم إعادة كتابة الاسم بخط آخر أو بتهجئة خاطئة</div><div style="margin-top:4px">{STATUS_TAG["p"]}</div></div>')
    wrong_bg = (f'<div class="card" style="text-align:center;padding:14px"><div style="height:110px;display:grid;place-items:center;background:{C["green-500"]};border-radius:10px">{logo("symbol_primary", height="70px")}</div>'
                f'<div style="font:800 12.5px Tajawal;color:{C["danger"]}">✕ عدم وضعه على خلفية بتباين ضعيف</div><div style="margin-top:4px">{STATUS_TAG["p"]}</div></div>')
    b.add("03", f'''{title("الاستخدام الخاطئ", "Incorrect usage")}
<div class="g g5" style="gap:12px">{mh}{wrong_text}{wrong_bg}</div>
<p class="small mu" style="margin-top:12px">التهجئة الإنجليزية المعتمدة: <b class="en">Damanati</b> (تنتهي بـ <span class="en">i</span>) — لا <span class="en">Damanaty</span> ولا <span class="en">Damanati App</span> داخل الشعار.</p>''', guide=True)

    b.add("03", f'''{title("مواصفات تصدير الشعار", "Logo export specifications", "p")}
<table class="tb"><tr><th>الاستخدام</th><th>الصيغة</th><th>الملف في المكتبة</th><th>ملاحظات</th></tr>
<tr><td style="font-weight:800">الويب والتطبيقات</td><td class="en">SVG</td><td class="en">02_Logos/SVG/damanati_[lockup]_[scheme].svg</td><td>متجهي، بدون اعتماد على خطوط، الأفضل دائمًا.</td></tr>
<tr><td style="font-weight:800">العروض والمستندات</td><td class="en">PNG</td><td class="en">02_Logos/PNG/*_512h.png · *_2048h.png</td><td>خلفية شفافة. 2048 للصيغ الأساسية.</td></tr>
<tr><td style="font-weight:800">الطباعة</td><td class="en">PDF</td><td class="en">02_Logos/PDF/*.pdf</td><td>متجهي، ألوان <span class="en">RGB</span>؛ يُحوّل إلى <span class="en">CMYK</span> في المطبعة بعد اختبار.</td></tr>
<tr><td style="font-weight:800">أيقونات التطبيق</td><td class="en">PNG / ICO / SVG</td><td class="en">02_Logos/app_icon/</td><td><span class="en">iOS</span>، <span class="en">Android adaptive</span>، <span class="en">PWA</span>، <span class="en">favicon</span>.</td></tr>
<tr><td style="font-weight:800">الرمز بدون مربع</td><td class="en">SVG</td><td class="en">02_Logos/SVG/damanati_mark_[green|white|black].svg</td><td>للنمط والعناصر الزخرفية فقط، لا يحل محل الأيقونة.</td></tr></table>
<div class="soft" style="margin-top:20px"><span class="lbl">التسمية</span><p class="small" style="margin:0"><span class="en">damanati_{{lockup}}_{{scheme}}_{{size}}.{{ext}}</span> — <span class="en">lockup</span>: <span class="en">symbol | arabic | english | bilingual | vertical | mark</span> · <span class="en">scheme</span>: <span class="en">primary | reversed-on-green | reversed-on-dark | mono-black | mono-white</span>.</p></div>
<p class="small mu" style="margin-top:12px">ملاحظة فنية: ملفات <span class="en">EPS/AI</span> غير متوفرة في هذه الحزمة؛ ملفات <span class="en">SVG</span> و<span class="en">PDF</span> المتجهية تُفتح مباشرة في <span class="en">Illustrator</span> وتُحفظ بأي صيغة.</p>''', guide=True)

    # ============================================================ 04 COLOUR
    b.add("04", divider("04", "نظام الألوان", "Colour System",
                        "أخضر واحد يقود، وأبيض يمنح المساحة، ومحايدان للنص. ثم ألوان وظيفية للحالات فقط.",
                        "One green leads, white gives space, two neutrals carry text. Functional colours appear only for states."),
          dark=True, bg=C["green-600"], chrome=False, guide=True)

    def big(k, w):
        v = T.COLORS[k]
        fg = "#fff" if T.luminance(v["hex"]) < .4 else C["ink"]
        bd = f"border:1px solid {C['sand']};" if k == "white" else ""
        r, g, bb = v["rgb"]
        cm = "/".join(str(x) for x in v["cmyk"])
        return (f'<div style="flex:{w};min-width:135px;background:{v["hex"]};color:{fg};border-radius:18px;padding:18px;display:flex;flex-direction:column;justify-content:space-between;{bd}">'
                f'<div><div style="font:800 18px Tajawal">{v["ar"]}</div><div class="en" style="font:400 12px Tajawal;opacity:.8;text-align:right">{v["name"]}</div></div>'
                f'<div class="en num" style="font:500 11px/1.7 Tajawal;text-align:left"><b style="font-size:15px">{v["hex"]}</b><br>RGB {r} {g} {bb}<br>CMYK* {cm}<br><b>{w}%</b></div></div>')
    b.add("04", f'''{title("الألوان الأساسية ونسب الاستخدام", "Primary palette and usage ratio", "a")}
<div style="display:flex;gap:12px;height:330px">{big("green-600", 60)}{big("white", 30)}{big("stone", 5)}{big("ink", 5)}</div>
<div class="g g3" style="margin-top:18px;gap:16px">
  <div class="soft small"><b>الأخضر الرئيسي:</b> الشعار، الأزرار الأساسية، الترويسات، المساحات الكبيرة للعلامة.</div>
  <div class="soft small"><b>الأبيض:</b> المساحة والتنفس والبطاقات. لا تخف من الفراغ.</div>
  <div class="soft small"><b>الرمادي والأسود:</b> النصوص الثانوية والأساسية. الأسود <span class="en num">#231F20</span> هو لون الكلمة في الشعار.</div>
</div>
<p class="cap" style="margin-top:8px">* قيم <span class="en">CMYK</span> تحويل رياضي مبدئي ({STATUS_TAG["p"]}). يلزم اختبار طباعة على الورق المستهدف ومطابقة <span class="en">Pantone</span> معتمدة من المطبعة قبل الإنتاج.</p>''', guide=True)

    gsw = "".join(f'<div style="flex:1">{swatch(T.COLORS[k]["hex"], k.split("-")[1], T.COLORS[k]["hex"], h=120)}<div class="cap num" style="text-align:center">'
                  f'{T.contrast(T.COLORS[k]["hex"], "#FFFFFF"):.1f}:1 / {T.contrast(T.COLORS[k]["hex"], C["ink"]):.1f}:1</div></div>' for k in T.ORDER_GREEN)
    b.add("04", f'''{title("سلم الأخضر", "Green scale: 600 is the approved brand green; all other steps are proposed")}
<div style="display:flex;gap:8px">{gsw}</div>
<p class="cap">الأرقام تحت كل درجة: التباين مع الأبيض / مع الأسود.</p>
<div class="g g4" style="margin-top:22px;gap:14px">
  <div class="card"><span class="lbl">50–100</span><p class="small" style="margin:0">خلفيات البطاقات، حالة التحديد، شرائح الحالة «ساري».</p></div>
  <div class="card"><span class="lbl">200–400</span><p class="small" style="margin:0">رسوم بيانية، حدود، النمط على الخلفيات الفاتحة. <b>ليست للنص.</b></p></div>
  <div class="card"><span class="lbl">600 · العلامة</span><p class="small" style="margin:0">الأزرار، الروابط، الشعار. نص أبيض عليه = <span class="en num">4.9:1</span> (يجتاز AA).</p></div>
  <div class="card"><span class="lbl">700–900</span><p class="small" style="margin:0">حالة الضغط، العمق في الوضع الداكن، نص أخضر صغير.</p></div>
</div>''')

    func = ["paper", "sand", "night", "night-raised", "mint", "warning", "danger", "info", "warning-on-dark", "danger-on-dark"]
    fh = "".join(f'<div>{swatch(T.COLORS[k]["hex"], T.COLORS[k]["ar"], T.COLORS[k]["hex"], h=96, border=k in ("paper", "sand"))}<div class="cap" style="margin-top:4px">{T.COLORS[k]["use"]}</div><div>{STATUS_TAG[T.COLORS[k]["status"][0]]}</div></div>' for k in func)
    b.add("04", f'''{title("المحايدات والألوان الوظيفية", "Neutrals and functional colours")}
<div class="g g5" style="gap:14px">{fh}</div>
<div class="g g2" style="margin-top:20px;gap:16px">
  <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="lbl" style="margin:0 0 0 8px">في السياق · فاتح</span>{chip("ok")}{chip("warn")}{chip("exp")}<span class="chip" style="color:{C["info"]};background:#EAF1F6">{icon_svg("alert", 14, C["info"], 2)}معلومة</span></div>
  <div class="card" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:{C["night"]};border-color:{C["night"]}"><span class="lbl" style="margin:0 0 0 8px;color:{C["mint"]}">في السياق · داكن</span>{chip("ok", dark=True)}{chip("warn", dark=True)}{chip("exp", dark=True)}</div>
</div>''')

    pairs = [("ink", "white"), ("stone", "white"), ("green-600", "white"), ("white", "green-600"), ("green-700", "white"), ("white", "green-700"),
             ("ink", "paper"), ("stone", "paper"), ("warning", "white"), ("danger", "white"), ("info", "white"), ("white", "ink"),
             ("mint", "night"), ("warning-on-dark", "night"), ("danger-on-dark", "night"), ("green-500", "white")]
    def pc(f, bg):
        r = T.contrast(C[f], C[bg])
        res = "AAA" if r >= 7 else ("AA" if r >= 4.5 else ("AA كبير" if r >= 3 else "فشل"))
        col = C["green-600"] if r >= 4.5 else (C["warning"] if r >= 3 else C["danger"])
        return (f'<div style="border-radius:12px;overflow:hidden;border:1px solid {C["sand"]}"><div style="background:{C[bg]};color:{C[f]};height:64px;display:grid;place-items:center;font:800 20px Tajawal">ضمان Aa</div>'
                f'<div style="padding:6px 10px;display:flex;justify-content:space-between;font:500 10px Tajawal"><span class="en">{f} / {bg}</span><b class="num" style="color:{col}">{r:.2f} · {res}</b></div></div>')
    b.add("04", f'''{title("اختبار التباين وإمكانية الوصول", "Contrast checks (WCAG 2.x ratio, calculated)")}
<div class="g" style="grid-template-columns:repeat(4,1fr);gap:10px">{"".join(pc(f, bg) for f, bg in pairs)}</div>
<p class="small mu" style="margin-top:12px">النسب محسوبة بمعادلة <span class="en">WCAG 2.x</span> للإضاءة النسبية (التقرير الكامل: <span class="en">03_Color_System/damanati_contrast_report.csv</span>). هذا اختبار لأزواج ألوان، وليس شهادة توافق للمنتج؛ التوافق الكامل يحتاج تدقيقًا على الواجهات الفعلية. <b>تنبيه:</b> <span class="en">green-500</span> على الأبيض (<span class="en num">3.2:1</span>) للعناصر الكبيرة والرسومات فقط.</p>''', guide=True)

    lt = (OUT / DA / "app_04_dashboard_light.png").as_uri()
    dk = (OUT / DA / "app_05_dashboard_dark.png").as_uri()
    b.add("04", f'''{title("الثيم الفاتح والداكن", "Light and dark themes", "p")}
<div class="g" style="grid-template-columns:auto auto 1fr;gap:34px;align-items:center">
  {phone(lt, 200)}{phone(dk, 200)}
  <div>
    <table class="tb"><tr><th>الدور</th><th>فاتح</th><th>داكن</th></tr>
    <tr><td>الخلفية</td><td class="en num">paper #F7F5F0</td><td class="en num">night #141716</td></tr>
    <tr><td>البطاقة</td><td class="en num">white</td><td class="en num">night-raised #1F2422</td></tr>
    <tr><td>النص</td><td class="en num">ink #231F20</td><td class="en num">#F2F1EE</td></tr>
    <tr><td>نص ثانوي</td><td class="en num">stone #6B675F</td><td class="en num">#A8A39A</td></tr>
    <tr><td>العلامة / الإجراء</td><td class="en num">green-600</td><td class="en num">green-500 + mint</td></tr>
    <tr><td>ساري / قريب / منتهي</td><td class="en num">600 / warning / danger</td><td class="en num">300 / on-dark / on-dark</td></tr></table>
    <p class="small mu" style="margin-top:10px">الثيم الداكن مستوحى من شاشة التطبيق الداكنة في الدليل المرجعي (ص21) مع ضبط ألوان الحالة لتجتاز التباين على الخلفية الداكنة.</p>
  </div>
</div>''')

    b.add("04", f'''{title("التدرجات والتركيبات الممنوعة", "Gradients and combinations to avoid", "p")}
<div class="g g2" style="gap:30px">
  <div><span class="lbl">التدرجات المسموحة (نادرًا)</span>
    <div class="g g2" style="gap:12px">
      <div><div style="height:110px;border-radius:14px;background:linear-gradient(160deg,{C["green-600"]},{C["green-800"]})"></div><div class="cap en">green-600 → green-800 · 160°</div></div>
      <div><div style="height:110px;border-radius:14px;background:linear-gradient(160deg,{C["green-800"]},{C["night"]} 75%)"></div><div class="cap en">green-800 → night · 160°</div></div>
    </div>
    <p class="small" style="margin-top:10px">تدرج داخل عائلة الأخضر فقط، لإضفاء عمق على الخلفيات الكبيرة (شاشة القفل، الحملات). <b>لا تدرج على الشعار نفسه أبدًا</b> (ص12).</p></div>
  <div><span class="lbl" style="color:{C["danger"]}">تركيبات ممنوعة</span>
    <div class="g g3" style="gap:10px">
      <div><div style="height:80px;border-radius:12px;background:{C["green-600"]};color:{C["danger"]};display:grid;place-items:center;font:800 18px Tajawal">منتهي</div><div class="cap">أحمر على أخضر</div></div>
      <div><div style="height:80px;border-radius:12px;background:#C9A227;color:#fff;display:grid;place-items:center;font:800 18px Tajawal">ضماناتي</div><div class="cap">الذهبي ليس من الهوية</div></div>
      <div><div style="height:80px;border-radius:12px;background:linear-gradient(90deg,#2D5BD8,#7A3FE0);color:#fff;display:grid;place-items:center;font:800 18px Tajawal">ضماناتي</div><div class="cap">تدرجات تقنية عامة</div></div>
      <div><div style="height:80px;border-radius:12px;background:{C["green-400"]};color:#fff;display:grid;place-items:center;font:800 18px Tajawal">ضماناتي</div><div class="cap">أبيض على أخضر فاتح</div></div>
      <div><div style="height:80px;border-radius:12px;background:{C["stone"]};color:{C["ink"]};display:grid;place-items:center;font:800 18px Tajawal">ضماناتي</div><div class="cap">أسود على رمادي</div></div>
      <div><div style="height:80px;border-radius:12px;background:{C["warning"]};color:{C["green-600"]};display:grid;place-items:center;font:800 18px Tajawal">ضماناتي</div><div class="cap">لونا حالة معًا</div></div>
    </div></div>
</div>''')

    # ============================================================ 05 TYPE
    b.add("05", divider("05", "الخطوط", "Typography",
                        "خط واحد للعربية واللاتينية: تجوال. سبعة أوزان، وسلم واضح، وقواعد للنص الثنائي.",
                        "One family for Arabic and Latin: Tajawal. Seven weights, a clear scale and rules for bilingual text."),
          dark=True, bg=C["green-600"], chrome=False, guide=True)

    weights = "".join(f'<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid {C["sand"]};padding:5px 0"><span style="font:{w} 26px Tajawal">ضمانك محفوظ</span><span class="en" style="font:{w} 15px Tajawal">{n} {w}</span></div>'
                      for n, w in [("ExtraLight", 200), ("Light", 300), ("Regular", 400), ("Medium", 500), ("Bold", 700), ("ExtraBold", 800), ("Black", 900)])
    b.add("05", f'''{title("الخط الأساسي: تجوال", "Primary typeface: Tajawal", "a")}
<div class="g" style="grid-template-columns:1fr 1.15fr;gap:40px">
  <div>
    <div style="font:800 150px/1 Tajawal;color:{C["green-600"]}">ض <span class="en">Aa</span></div>
    <p style="font:400 22px/1.8 Tajawal;margin-top:12px">ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي</p>
    <p class="en" style="font:400 18px/1.7 Tajawal;text-align:left">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz · 0123456789 · ٠١٢٣٤٥٦٧٨٩</p>
    <div class="soft small" style="margin-top:12px"><b>الترخيص:</b> <span class="en">SIL Open Font License 1.1</span> (حقوق 2018 <span class="en">Boutros International</span>). مجاني للاستخدام التجاري والتضمين في التطبيقات. ملفات الخط ونص الرخصة في <span class="en">04_Typography/</span>.</div>
  </div>
  <div>{weights}</div>
</div>''', guide=True)

    rows = "".join(f'<tr><td class="en" style="font-weight:800">{t}</td><td><span style="font:{w} {min(s, 40)}px/{lh} Tajawal">{"كل ضماناتك" if s >= 22 else "تذكير قبل انتهاء الضمان بـ 30 يومًا"}</span></td>'
                   f'<td class="en num">{s}px / {s * 0.75:.0f}pt</td><td class="num">{lh}</td><td class="num">{w}</td><td>{u}</td></tr>' for t, s, lh, w, tr, u in T.TYPE_SCALE)
    b.add("05", f'''{title("السلم الطباعي", "Type scale (digital, base 16px)", "p")}
<table class="tb"><tr><th>الرمز</th><th>مثال</th><th>الحجم</th><th>تباعد الأسطر</th><th>الوزن</th><th>الاستخدام</th></tr>{rows}</table>
<p class="small mu" style="margin-top:8px">النص العربي يحتاج تباعد أسطر أكبر من اللاتيني (1.6–1.8 للفقرات) بسبب الحركات والنقاط. لا تُستخدم مسافات بين الحروف (<span class="en">letter-spacing</span>) مع العربية؛ تكسر الاتصال.</p>''', guide=True)

    b.add("05", f'''{title("النص الثنائي والأرقام", "Bilingual typesetting and numerals", "p")}
<div class="g g2" style="gap:30px">
  <div class="card">
    <span class="lbl">العربي أولًا</span>
    <div style="font:800 30px/1.3 Tajawal">كل ضماناتك في مكان واحد</div>
    <div class="en" style="font:400 17px Tajawal;color:{C["stone"]};text-align:right;margin-top:4px">All your warranties in one place</div>
    <ul class="bul small" style="margin-top:16px"><li>الإنجليزي بنفس المحاذاة (يمين) في التخطيطات العربية، وبحجم ≈ 55–60% من العربي.</li><li>الإنجليزي بوزن أخف بدرجة أو درجتين ولون <span class="en">stone</span>.</li><li>الكلمات اللاتينية داخل جملة عربية تُعزل اتجاهيًا (<span class="en">unicode-bidi: isolate</span>).</li></ul>
  </div>
  <div class="card">
    <span class="lbl">الأرقام</span>
    <div style="display:flex;gap:26px;align-items:baseline"><div><div class="num" style="font:800 56px/1 Tajawal;color:{C["green-600"]}">29</div><div class="small">يومًا متبقية</div></div><div><div class="num en" style="font:800 30px/1 Tajawal">1,899.00 <span style="font-size:16px">ر.س</span></div><div class="small">قيمة الفاتورة</div></div></div>
    <ul class="bul small" style="margin-top:16px"><li>الأرقام الغربية (0–9) افتراضية في التطبيق لتوافقها مع الفواتير السعودية؛ الأرقام الهندية (٠–٩) مسموحة في المواد التحريرية العربية بشرط عدم الخلط في نفس المادة.</li><li>أرقام جدولية (<span class="en">tabular-nums</span>) في القوائم والتواريخ.</li><li>التاريخ: <span class="en num">DD/MM/YYYY</span> ميلادي، مع إمكانية عرض الهجري بجانبه.</li><li>العملة: «ر.س» بعد الرقم بالعربي؛ <span class="en">SAR</span> قبل الرقم بالإنجليزي.</li></ul>
  </div>
</div>''', guide=True)

    hier = f'''<div style="background:{C["paper"]};border-radius:18px;padding:30px;position:relative;overflow:hidden">
<div style="font:500 13px Tajawal;color:{C["green-600"]}">دليل المستخدم · 03</div>
<div style="font:800 40px/1.2 Tajawal;margin:6px 0">كيف تضيف ضمانًا جديدًا</div>
<div class="en" style="font:400 16px Tajawal;color:{C["stone"]};text-align:right">How to add a new warranty</div>
<div style="font:700 22px Tajawal;margin:18px 0 6px">1. صوّر الفاتورة</div>
<p style="font:400 16px/1.7 Tajawal;max-width:560px">افتح التطبيق واضغط «إضافة». وجّه الكاميرا على الفاتورة كاملة، وتأكد إن التاريخ واضح. نستخرج تاريخ الشراء ومدة الضمان، وتقدر تعدلها قبل الحفظ.</p>
<div class="small mu">آخر تحديث: 26/10/2026</div></div>'''
    b.add("05", f'''{title("أمثلة على التسلسل الهرمي", "Hierarchy in use", "p")}
<div class="g" style="grid-template-columns:1.4fr 1fr;gap:30px;align-items:start">{hier}
<div class="small"><table class="tb"><tr><th>العنصر</th><th>الرمز</th></tr><tr><td>عنوان القسم الصغير</td><td class="en">label · green-600</td></tr><tr><td>العنوان الرئيسي</td><td class="en">h1 · 800</td></tr><tr><td>الترجمة الإنجليزية</td><td class="en">body-lg · 400 · stone</td></tr><tr><td>عنوان فرعي</td><td class="en">h3 · 700</td></tr><tr><td>الفقرة</td><td class="en">body · 400 · 1.7</td></tr><tr><td>معلومة ثانوية</td><td class="en">caption · stone</td></tr></table>
<div class="soft" style="margin-top:14px"><span class="lbl">طباعة</span>العناوين 18–36pt، النص 9.5–11pt بتباعد 150–170%. أقل حجم للنص المطبوع: 7pt.</div></div></div>''')

    # ============================================================ 06 VISUAL LANGUAGE
    b.add("06", divider("06", "اللغة البصرية", "Visual Language",
                        "كل عنصر هنا مشتق من هندسة الرمز: المربع المستدير، القوس، والخطوة. لذلك تُعرف العلامة حتى بدون شعار.",
                        "Every element is derived from the symbol's geometry: the rounded tile, the bowl and the step. The brand stays recognisable without the logo."),
          dark=True, bg=C["green-600"], chrome=False, guide=True)

    b.add("06", f'''{title("العناصر الأساسية المشتقة من الرمز", "Core elements derived from the symbol", "p")}
<div class="g g3" style="gap:20px">
  <div class="card" style="text-align:center"><div style="height:150px;display:grid;place-items:center"><div style="width:120px;height:120px;border-radius:22.4%;border:3px solid {C["green-600"]};position:relative"><span style="position:absolute;top:-4px;right:-4px;width:30px;height:30px;border-top:3px solid {C["danger"]};border-right:3px solid {C["danger"]};border-top-right-radius:27px"></span></div></div>
  <h3>المربع المستدير</h3><p class="small">زوايا بنصف قطر <b>22.4%</b> من الضلع، مأخوذة من مربع الأيقونة. أساس البطاقات والأزرار الكبيرة وإطارات الصور.</p></div>
  <div class="card" style="text-align:center"><div style="height:150px;display:grid;place-items:center">{ring([(1, C["green-600"])], 120, 14, 0)}</div>
  <h3>القوس</h3><p class="small">قوس الـ<span class="en">D</span> يتحول إلى حلقة دورة الحياة: مؤشر تقدم، رسم بياني للحالات، وحركة الكشف.</p></div>
  <div class="card" style="text-align:center"><div style="height:150px;display:grid;place-items:center">{mark_svg(C["green-600"], "110px")}</div>
  <h3>الرمز المجرد</h3><p class="small">الرمز بدون مربع يُستخدم للنمط والعلامة المائية (الختم) فقط، بشفافية 6–12% كعنصر خلفية.</p></div>
</div>
<div class="soft" style="margin-top:20px;display:flex;gap:30px;align-items:center"><span class="lbl" style="margin:0">مقاسات الزوايا</span>
{"".join(f'<div style="text-align:center"><div style="width:56px;height:56px;border:2px solid {C["green-600"]};border-radius:{v}px;margin:auto"></div><div class="cap en num">{k} · {v}px</div></div>' for k, v in [("xs", 4), ("sm", 8), ("md", 12), ("lg", 16), ("xl", 24)])}
<div style="text-align:center"><div style="width:56px;height:56px;border:2px solid {C["green-600"]};border-radius:22.4%;margin:auto"></div><div class="cap en">tile · 22.4%</div></div></div>''', guide=True)

    pt = lambda n: f'<img src="{(OUT / "05_Graphic_Elements/patterns" / f"damanati_pattern_{n}.svg").as_uri()}" style="width:100%;height:150px;object-fit:cover;border-radius:14px;display:block;border:1px solid {C["sand"]}">'
    b.add("06", f'''{title("النمط", "Pattern system", "a")}
<p style="max-width:760px">يعتمد النمط البصري على تكرار رمز الشعار بطريقة خفيفة لإنشاء خلفيات وعناصر زخرفية تحافظ على الاتساق دون تشتيت الانتباه (ص14). أضفنا قياسات ثابتة وقواعد للتلاشي {STATUS_TAG["p"]}:</p>
<div class="g g3" style="gap:14px">
  <div>{pt("green-on-white")}<div class="cap">أخضر على أبيض · للمساحات الصغيرة</div></div>
  <div>{pt("white-on-green")}<div class="cap">أبيض على أخضر · الصيغة الأيقونية</div></div>
  <div>{pt("fade-white-on-green")}<div class="cap">تلاشٍ نحو الأسفل · شاشة البداية والأغلفة</div></div>
  <div>{pt("tint-on-green")}<div class="cap">درجة على درجة · خلفية خلف المحتوى</div></div>
  <div>{pt("green-on-paper")}<div class="cap">على الورقي · مطبوعات ومستندات</div></div>
  <div class="soft small"><b>القياسات:</b> المسافة الأفقية = 2.7 × عرض الرمز، الصفوف المتناوبة مزاحة بنصف المسافة، وخطوة الصف = 0.36 × المسافة الأفقية.<br><b>القاعدة:</b> النمط تحت الشعار أو النص لا يتجاوز 15% شفافية؛ النمط الكامل في الحواف فقط مع تلاشٍ.</div>
</div>''', guide=True)

    # Composition families
    fam1 = f'''<div style="position:relative;height:430px;background:{C["green-600"]};border-radius:18px;overflow:hidden">
{pattern_layer("rgba(255,255,255,.08)", 1, None, 60)}
<div style="position:absolute;right:30px;top:50px;transform:rotate(-6deg)">{passport("تلفزيون 55 بوصة", [("تاريخ الشراء", "01/10/2026"), ("مدة الضمان", "سنتان"), ("ينتهي", "01/10/2028")], width=270, badge=chip("ok"), stamp=False)}</div>
<div style="position:absolute;right:120px;top:200px;transform:rotate(5deg)">{passport("جوال ذكي 256GB", [("المتجر", "متجر إلكترونيات"), ("المتبقي", "7 أيام")], width=270, badge=chip("warn"))}</div>
<div style="position:absolute;left:30px;top:50px;color:#fff;font:800 30px/1.3 Tajawal">لكل منتج<br>جواز ضمان</div></div>'''
    b.add("06", f'''{title("عائلة التكوين 1: جواز المنتج", "Composition family 1: Product Passport", "p")}
<div class="g" style="grid-template-columns:1.3fr 1fr;gap:34px;align-items:center">{fam1}
<div><p><b>الفكرة:</b> كل منتج له «جواز» رقمي: بطاقة بزوايا المربع المستدير، صفوف بيانات مفصولة بخط منقط (كأنها قسيمة قابلة للقص)، وختم مائي من الرمز.</p>
<ul class="bul small"><li><b>البنية:</b> عنوان + 2–5 صفوف بيانات + شريحة حالة.</li><li><b>التكديس:</b> 2–3 بطاقات بدوران بين −8° و+6°؛ لا أكثر.</li><li><b>الاستخدام:</b> الحملات، صفحات المتاجر، شاشات التعريف، الملف التعريفي.</li><li><b>ممنوع:</b> بيانات حقيقية لعملاء، أو شعارات متاجر وعلامات أخرى.</li></ul></div></div>''', guide=True)

    fam2 = f'''<div style="position:relative;height:430px;background:{C["paper"]};border-radius:18px;overflow:hidden;display:flex;align-items:center;justify-content:space-around;padding:0 30px">
{ring([(9, C["green-600"]), (2, C["warning"]), (1, C["danger"])], 240, 22, 8, None, "12", "ضمان")}
<div style="width:300px">{"".join(f'<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid {C["sand"]};font:500 14px Tajawal"><i style="width:12px;height:12px;border-radius:3px;background:{c}"></i>{t}<b class="num" style="margin-inline-start:auto">{n}</b></div>' for t, n, c in [("ساري", 9, C["green-600"]), ("ينتهي قريبًا", 2, C["warning"]), ("منتهي", 1, C["danger"])])}
<div style="margin-top:14px;display:flex;gap:6px;align-items:center">{"".join(f'<i style="flex:1;height:6px;border-radius:6px;background:{c}"></i>' for c in [C["green-600"]] * 5 + [C["green-200"]] * 2)}</div><div class="cap">رحلة الضمان: 5 من 7 مراحل</div></div></div>'''
    b.add("06", f'''{title("عائلة التكوين 2: قوس دورة الحياة", "Composition family 2: Lifecycle Arc", "p")}
<div class="g" style="grid-template-columns:1.3fr 1fr;gap:34px;align-items:center">{fam2}
<div><p><b>الفكرة:</b> قوس الـ<span class="en">D</span> يكتمل مثل عمر الضمان: من الشراء إلى الانتهاء. الحلقة المقسمة تعرض الحالات، والقطاعات المستقيمة تعرض المراحل.</p>
<ul class="bul small"><li><b>الحلقة:</b> سماكة 8–10% من القطر، أطراف مستديرة، فجوة 6–8° بين القطاعات.</li><li><b>اللون + النص:</b> لا يُعتمد على اللون وحده؛ كل قطاع له تسمية ورقم.</li><li><b>الاستخدام:</b> لوحة التطبيق، الرسوم البيانية، الإنفوجرافيك، حركة الكشف.</li></ul></div></div>''', guide=True)

    fam3 = f'''<div style="position:relative;height:430px;background:{C["green-600"]};border-radius:18px;overflow:hidden;color:#fff">
{pattern_layer("rgba(255,255,255,.95)", 1, "down", 64, "top:45%")}
<div style="position:absolute;left:-60px;top:-40px;opacity:.1">{mark_svg("#fff", "380px")}</div>
<div style="position:absolute;right:40px;top:56px"><div style="font:800 40px/1.25 Tajawal">الفاتورة تضيع،<br>الضمان ما يضيع.</div><div style="margin-top:18px">{logo("bilingual_reversed-on-green", height="30px")}</div></div></div>'''
    b.add("06", f'''{title("عائلة التكوين 3: النمط المختوم", "Composition family 3: Sealed Pattern", "p")}
<div class="g" style="grid-template-columns:1.3fr 1fr;gap:34px;align-items:center">{fam3}
<div><p><b>الفكرة:</b> النمط المعتمد يتلاشى من حافة واحدة، ويقابله «ختم» كبير مقصوص من الرمز بشفافية منخفضة. مساحة هادئة للرسالة والشعار.</p>
<ul class="bul small"><li><b>التلاشي:</b> من حافة واحدة فقط (أسفل أو جانب)، ويغطي 35–50% من المساحة.</li><li><b>الختم:</b> مقصوص من طرف الإطار، شفافية 8–12%.</li><li><b>الاستخدام:</b> الأغلفة، شاشة البداية، الإعلانات الخارجية، البطاقات الشخصية.</li></ul>
<p class="small mu">العائلات الثلاث تشترك في الأخضر ونصف قطر الزوايا والخط، فتتنوع المواد بدون ما تتكرر أو تتفكك.</p></div></div>''', guide=True)

    ic = "".join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:6px;color:{C["green-600"]}">{icon_svg(n, 34)}<span class="cap" style="margin:0">{ICON_AR[n]}</span></div>' for n in ICONS)
    b.add("06", f'''{title("الأيقونات", "Iconography")}
<div class="g" style="grid-template-columns:1.6fr 1fr;gap:34px">
  <div class="card"><div class="g" style="grid-template-columns:repeat(8,1fr);gap:18px 8px">{ic}</div></div>
  <div>
    <p>تعتمد جميع الأيقونات على زوايا مستديرة وسماكة خطوط موحدة بما ينسجم مع بساطة الشعار (ص15) {STATUS_TAG["a"]}. أضفنا 24 أيقونة خاصة بعالم الضمانات بالمواصفات التالية {STATUS_TAG["p"]}:</p>
    <table class="tb"><tr><td>الشبكة</td><td class="en num">24×24, 2px padding</td></tr><tr><td>سماكة الخط</td><td class="en num">1.75px @24 (2px @20)</td></tr><tr><td>الأطراف والزوايا</td><td class="en">round / round</td></tr><tr><td>نصف قطر الزوايا</td><td class="en num">2–3px</td></tr><tr><td>المقاسات</td><td class="en num">16 · 20 · 24 · 32 · 48</td></tr><tr><td>اللون</td><td class="en">currentColor</td></tr></table>
    <p class="small mu" style="margin-top:8px">الملفات: <span class="en">06_Icons/svg/</span> + <span class="en">damanati-icons-sprite.svg</span>. الأيقونات الاتجاهية (أسهم، رجوع) تنعكس في الواجهات العربية.</p>
  </div>
</div>''', guide=True)

    b.add("06", f'''{title("التصوير والرسوم التوضيحية", "Photography and illustration direction", "p")}
<div class="g g2" style="gap:30px">
  <div><span class="lbl">التصوير</span>
  <div class="g g3" style="gap:10px;margin-bottom:12px">
    <div style="height:120px;border-radius:14px;background:linear-gradient(160deg,#d8d2c4,#a69d8b);position:relative"><span class="cap" style="position:absolute;bottom:4px;right:8px;color:#2a2622">ضوء طبيعي دافئ</span></div>
    <div style="height:120px;border-radius:14px;background:linear-gradient(200deg,#4f5d57,#232a27);position:relative"><span class="cap" style="position:absolute;bottom:4px;right:8px;color:#eee">ظلال هادئة</span></div>
    <div style="height:120px;border-radius:14px;background:linear-gradient(160deg,#eef0ec,#c9d4cf);position:relative"><span class="cap" style="position:absolute;bottom:4px;right:8px;color:#2a2622">مساحة للنص</span></div>
  </div>
  <ul class="bul small"><li><b>الموضوع:</b> لحظات ملكية حقيقية في بيوت ومكاتب سعودية: تركيب جهاز، فتح كرتون، تسليم فاتورة.</li><li><b>الأشخاص:</b> طبيعيون وغير متصنعين، بلباس محلي معاصر، وموافقات تصوير موثقة.</li><li><b>الضوء:</b> نهاري ناعم أو إضاءة منخفضة درامية مثل غلاف الدليل الأصلي (ص1).</li><li><b>المعالجة:</b> درجات دافئة محايدة؛ الأخضر يأتي من العلامة لا من فلتر.</li><li><b>ممنوع:</b> صور مخزون مبتذلة (ابتسامات أمام لابتوب)، شعارات علامات أخرى ظاهرة، دروع وأقفال ثلاثية الأبعاد.</li></ul></div>
  <div><span class="lbl">الرسوم التوضيحية</span>
  <div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;background:{C["paper"]};border-radius:14px;padding:16px">
    <div style="position:relative;width:150px;height:120px"><div style="position:absolute;inset:14px 20px;border:2px dashed {C["green-300"]};border-radius:24px"></div><div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:20px;background:#fff;box-shadow:0 10px 24px rgba(47,125,107,.2);display:grid;place-items:center;color:{C["green-600"]}">{icon_svg("scan", 32)}</div></div>
    <div style="position:relative;width:150px;height:120px"><div style="position:absolute;top:10px;right:10px;width:110px;height:76px;border-radius:16px;background:#fff;border:1.5px solid {C["sand"]};transform:rotate(-6deg)"></div><div style="position:absolute;top:34px;right:30px;width:110px;height:76px;border-radius:16px;background:{C["green-600"]};transform:rotate(5deg);display:grid;place-items:center">{mark_svg("#fff", "28px")}</div></div>
  </div>
  <ul class="bul small"><li><b>الأسلوب:</b> هندسي مسطح، مبني من المربع المستدير والقوس والأيقونات الخطية، مع ظل ناعم واحد.</li><li><b>الألوان:</b> أخضر 600 + 50–300 + أبيض؛ لون حالة واحد كحد أقصى.</li><li><b>الاستخدام:</b> الحالات الفارغة، شاشات التعريف، الإيميلات، المقالات التعليمية.</li><li><b>ممنوع:</b> شخصيات كرتونية مفصلة، أو أسلوب يختلف بين شاشة وأخرى.</li></ul></div>
</div>''')

    b.add("06", f'''{title("تصميم البيانات وبطاقات الضمان", "Data visualisation and warranty card language", "p")}
<div class="g" style="grid-template-columns:1fr 1fr;gap:30px">
  <div>
    <span class="lbl">بطاقة الضمان: التشريح</span>
    <div style="max-width:420px;direction:rtl"><style>{UI_CSS}</style>{warranty_card(WARRANTIES[1])}</div>
    <ol style="padding-right:18px;margin-top:12px" class="small"><li>حافة لون الحالة (3px) على جهة البداية.</li><li>صورة/أيقونة المنتج داخل مربع مستدير 52px.</li><li>اسم المنتج (h4 · 700) والمتجر (caption).</li><li>شريحة الحالة: أيقونة + نص + لون (لا لون فقط).</li><li>شريط الزمن المنقضي من مدة الضمان.</li><li>جملة الوقت المتبقي بصيغة بشرية.</li></ol>
  </div>
  <div>
    <span class="lbl">قواعد الرسوم البيانية</span>
    <div class="card" style="padding:16px">
      <div style="display:flex;align-items:end;gap:14px;height:150px;border-bottom:1px solid {C["sand"]};padding:0 8px">
        {"".join(f'<div style="flex:1;text-align:center"><div class="num" style="font:700 11px Tajawal;margin-bottom:4px">{v}</div><div style="height:{v * 9}px;background:{C["green-600"] if i == 4 else C["green-200"]};border-radius:6px 6px 0 0"></div></div>' for i, v in enumerate([4, 7, 5, 9, 14, 11]))}
      </div>
      <div style="display:flex;gap:14px;padding:6px 8px 0">{"".join(f'<div class="cap" style="flex:1;text-align:center;margin:0">{m}</div>' for m in ["مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر"])}</div>
      <div class="cap" style="margin-top:8px">ضمانات أُضيفت شهريًا (بيانات توضيحية). القيمة المهمة بالأخضر 600، الباقي 200.</div>
    </div>
    <ul class="bul small" style="margin-top:12px"><li>لون واحد للتأكيد، والباقي درجات فاتحة من نفس العائلة.</li><li>ألوان الحالة محجوزة لمعناها فقط (ساري/قريب/منتهي).</li><li>القيم مكتوبة على الرسم؛ لا محاور مزدحمة.</li><li>الرسوم الزمنية تُقرأ من اليمين لليسار في الواجهات العربية.</li></ul>
  </div>
</div>''')

    b.add("06", f'''{title("مبادئ الحركة", "Motion principles", "p")}
<div class="g g4" style="gap:14px">
  <div class="gr"><h3>يحفظ</h3><p class="small" style="margin:0;opacity:.9">العناصر تدخل وتستقر مثل ورقة توضع في ملف: حركة قصيرة ثم ثبات.</p></div>
  <div class="gr" style="background:{C["green-700"]}"><h3>يكتمل</h3><p class="small" style="margin:0;opacity:.9">التقدم يُرسم كقوس يكتمل باتجاه عقارب الساعة.</p></div>
  <div class="gr" style="background:{C["green-800"]}"><h3>يطمئن</h3><p class="small" style="margin:0;opacity:.9">لا ارتداد مبالغ ولا اهتزاز؛ حتى التنبيهات تدخل بهدوء.</p></div>
  <div class="gr" style="background:{C["ink"]}"><h3>يحترم</h3><p class="small" style="margin:0;opacity:.9">يُحترم إعداد تقليل الحركة: تلاشٍ بسيط بدل الانتقال.</p></div>
</div>
<table class="tb" style="margin-top:22px"><tr><th>الرمز</th><th>المدة</th><th>منحنى التسارع</th><th>الاستخدام</th></tr>
<tr><td class="en">fast</td><td class="num">120ms</td><td class="en">standard (.2,0,0,1)</td><td>الضغط، تغيّر الحالة، التبديل</td></tr>
<tr><td class="en">base</td><td class="num">220ms</td><td class="en">enter (0,0,.2,1) / exit (.4,0,1,1)</td><td>البطاقات، القوائم، النوافذ</td></tr>
<tr><td class="en">slow</td><td class="num">420ms</td><td class="en">standard</td><td>انتقال الشاشات، الحلقة</td></tr>
<tr><td class="en">reveal</td><td class="num">900ms</td><td class="en">seal (.7,0,.2,1)</td><td>كشف الشعار، شاشة البداية</td></tr></table>
<div class="g g4" style="gap:14px;margin-top:18px">{"".join(f'<div class="soft" style="display:flex;gap:12px;align-items:center;padding:12px 16px"><svg viewBox="-4 -4 108 108" width="70" height="70" style="flex:none;transform:scaleY(-1)"><rect x="0" y="0" width="100" height="100" fill="none" stroke="{C["sand"]}"/><path d="M0 0 C{x1 * 100} {y1 * 100} {x2 * 100} {y2 * 100} 100 100" fill="none" stroke="{C["green-600"]}" stroke-width="4" stroke-linecap="round"/></svg><div><b class="en">{n}</b><div class="cap en" style="margin:0">cubic-bezier({x1},{y1},{x2},{y2})</div></div></div>' for n, x1, y1, x2, y2 in [("standard", .2, 0, 0, 1), ("enter", 0, 0, .2, 1), ("exit", .4, 0, 1, 1), ("seal", .7, 0, .2, 1)])}</div>''', guide=True)

    # ============================================================ 07 3D & MOTION
    b.add("07", divider("07", "الهوية الحركية وثلاثية الأبعاد", "3D & Motion Identity",
                        "حركة «الختم» منفذة فعليًا كفيديو. والاتجاه ثلاثي الأبعاد موثق كمواصفات إنتاج لفريق التحريك.",
                        "The Seal reveal is rendered as a real video. The 3D direction is documented as production specs for the motion team."),
          dark=True, bg=C["green-600"], chrome=False)

    kf = OUT / "09_Motion_Assets/keyframes"
    frames = "".join(f'<div><img src="{(kf / f"seal_t{t}s.png").as_uri()}" style="width:100%;border-radius:10px;display:block"><div class="cap"><b class="en num">{t}s</b> · {d}</div></div>'
                     for t, d in [("0.2", "المربع يظهر ويكبر"), ("0.7", "القوس يكشف الرمز"), ("1.1", "اكتمال الكشف"), ("1.6", "ظهور ®"), ("2.2", "الاسمان يصعدان"), ("3.5", "ثبات + النمط")])
    b.add("07", f'''{title("كشف الشعار «الختم»", "Logo reveal 'The Seal' (rendered)", "p")}
<div class="g g3" style="gap:12px">{frames}</div>
<table class="tb" style="margin-top:16px"><tr><td style="font-weight:800;width:14%">الهدف</td><td>افتتاح الفيديوهات والعروض وشاشة البداية؛ يجسد «الحفظ» بقوس يكتمل ثم يُختم.</td><td style="font-weight:800;width:12%">المدة</td><td class="num">3.6 ث · 30 إطار/ث</td></tr>
<tr><td style="font-weight:800">السلوك</td><td>تكبير 72%→100% بمنحنى <span class="en">seal</span>؛ كشف دائري باتجاه عقارب الساعة؛ صعود الاسمين 18px مع تلاشٍ.</td><td style="font-weight:800">المخرجات</td><td class="en">MP4 1920×1080 · GIF 640</td></tr>
<tr><td style="font-weight:800">الصوت</td><td>نقرة ناعمة عند اكتمال القوس + نغمة قصيرة صاعدة (اقتراح؛ غير منفذ).</td><td style="font-weight:800">الملفات</td><td class="en small">09_Motion_Assets/</td></tr></table>''')

    concepts = [
        ("الجواز يُحفظ", "Passport Filed", "منشور اجتماعي / إعلان 6 ث", "6 ث", "بطاقة جواز تنزلق من الأعلى وتستقر فوق كومة بطاقات؛ شريحة الحالة تتحول من رمادي إلى «ساري».", "ثابتة، لقطة علوية بزاوية 20°", "4:5 · 9:16 · MP4"),
        ("القوس يكتمل", "Lifecycle Arc", "شرح ميزة التذكير", "8 ث", "حلقة دورة الحياة تُرسم؛ عند 90% تتحول للون «ينتهي قريبًا» ويظهر إشعار التذكير.", "اقتراب بطيء (dolly-in 10%)", "16:9 · 1:1 · MP4"),
        ("انتقال الشرائح", "Deck Transition", "غلاف العروض", "1.2 ث", "النمط يمسح الشاشة من اليمين لليسار، ثم يتلاشى ليكشف عنوان القسم.", "—", "PPTX / Keynote morph"),
    ]
    ch = "".join(f'<tr><td style="font-weight:800">{a}<div class="en mu small">{e}</div></td><td>{u}</td><td class="num">{d}</td><td>{m}</td><td>{cam}</td><td class="en">{o}</td></tr>' for a, e, u, d, m, cam, o in concepts)
    b.add("07", f'''{title("مفاهيم حركية إضافية", "Additional motion concepts: storyboard specs (not rendered)", "p")}
<table class="tb"><tr><th>المفهوم</th><th>الهدف</th><th>المدة</th><th>السلوك</th><th>الكاميرا</th><th>المخرجات</th></tr>{ch}</table>
<div class="g g3" style="margin-top:20px;gap:14px">
  <div class="soft small"><b>الخلفية:</b> أخضر 600 مسطح أو تدرج 600→800؛ النمط بتلاشٍ من حافة واحدة.</div>
  <div class="soft small"><b>الصوت:</b> أصوات واجهة قصيرة وخفيفة؛ لا موسيقى ملحمية. مستوى منخفض تحت التعليق الصوتي.</div>
  <div class="soft small"><b>تقليل الحركة:</b> كل مفهوم له نسخة تلاشٍ فقط بنفس التوقيت.</div>
</div>
<p class="small mu" style="margin-top:12px">هذه المفاهيم مواصفات إنتاج جاهزة لفريق التحريك، ولم تُنتج كفيديو في هذه الحزمة. المنفذ فعليًا: كشف الشعار «الختم».</p>''')

    obj3d = f'''<div style="position:relative;height:330px;border-radius:18px;background:radial-gradient(120% 90% at 70% 20%,{C["green-700"]},{C["night"]} 70%);overflow:hidden;display:grid;place-items:center">
<div style="position:absolute;bottom:56px;width:300px;height:40px;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(16px)"></div>
<div style="transform:perspective(900px) rotateX(18deg) rotateY(-24deg);filter:drop-shadow(0 30px 30px rgba(0,0,0,.45))">
<div style="width:200px;height:200px;border-radius:22.4%;background:linear-gradient(150deg,{C["green-400"]},{C["green-600"]} 45%,{C["green-800"]});display:grid;place-items:center;box-shadow:inset 0 2px 0 rgba(255,255,255,.35),inset 0 -14px 24px rgba(0,0,0,.25),12px 14px 0 {C["green-900"]}">{mark_svg("#F6F4EF", "120px")}</div></div>
<span class="cap" style="position:absolute;bottom:10px;right:16px;color:#ccc">معاينة اتجاه بصري (CSS)، ليست تصييرًا ثلاثي الأبعاد</span></div>'''
    b.add("07", f'''{title("الاتجاه الفني ثلاثي الأبعاد", "3D art direction", "p")}
<div class="g" style="grid-template-columns:1.1fr 1fr;gap:30px">{obj3d}
<div><table class="tb"><tr><td style="font-weight:800;width:28%">الشكل</td><td>الأيقونة كقطعة صلبة سماكتها 12% من الضلع، حواف مشطوفة 2%. الرمز بارز 3% أو محفور. <b>الهندسة من الملف المتجهي الأصلي فقط.</b></td></tr>
<tr><td style="font-weight:800">الخامات</td><td>مينا خضراء لامعة (كما في نموذج الشارة الجلدية ص10)، أو زجاج مصنفر أخضر، أو سيراميك مطفي. الرمز أبيض عاجي <span class="en num">#F6F4EF</span>.</td></tr>
<tr><td style="font-weight:800">الإضاءة</td><td>مفتاح ناعم من أعلى اليمين 45°، إضاءة حافة باردة خفيفة، ظل تلامس ناعم. لا انعكاسات نيون.</td></tr>
<tr><td style="font-weight:800">الخلفية</td><td>أخضر 800 → ليلي، أو ورقي مطفي للمواد الفاتحة.</td></tr>
<tr><td style="font-weight:800">عناصر مصاحبة</td><td>بطاقات جواز عائمة، حلقة دورة حياة كحلقة معدنية رفيعة، فواتير ورقية ناعمة.</td></tr>
<tr><td style="font-weight:800">ممنوع</td><td>تشويه الرمز، دروع معدنية، أقفال ذهبية، تدرجات قوس قزح.</td></tr></table>
<p class="small mu" style="margin-top:8px">التصيير ثلاثي الأبعاد غير متوفر في بيئة الإنتاج هذه؛ المرفق مواصفات + معاينة اتجاه.</p></div></div>''')

    # ============================================================ 08 DIGITAL
    b.add("08", divider("08", "التطبيقات الرقمية", "Digital Applications",
                        "كيف تبدو الهوية داخل منتج حقيقي: التطبيق، الموقع، البريد، المتاجر والحسابات. كل الشاشات ملفات مصدر قابلة للتعديل.",
                        "How the identity lives inside a real product. Every screen ships as an editable source file."),
          dark=True, bg=C["green-600"], chrome=False, guide=True)

    def screens(names, w=180):
        return "".join(f'<div style="text-align:center">{phone(png(DA, n), w)}<div class="cap" style="margin-top:10px">{t}</div></div>' for n, t in names)
    b.add("08", f'''{title("البداية، التعريف، الدخول", "Launch, onboarding and login")}
<div style="display:flex;justify-content:space-around;align-items:start">{screens([("app_01_launch", "شاشة البداية · مطابقة لغلاف الدليل الأصلي"), ("app_02_onboarding", "التعريف · عائلة جواز المنتج"), ("app_03_login", "الدخول برقم الجوال")], 200)}</div>
<p class="small mu" style="margin-top:6px">ملاحظة: الشاشات تطبيقات توضيحية للهوية، وليست مواصفات وظيفية للمنتج. البيانات فيها افتراضية.</p>''', guide=True)

    b.add("08", f'''{title("اللوحة الرئيسية وبطاقات الضمان", "Dashboard and warranty cards")}
<div style="display:flex;gap:30px;align-items:start">
  {screens([("app_04_dashboard_light", "اللوحة · فاتح"), ("app_05_dashboard_dark", "اللوحة · داكن")], 200)}
  <div style="flex:1"><span class="lbl">مؤشرات حالة الضمان</span>
  <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">{chip("ok")}{chip("warn")}{chip("exp")}</div>
  <table class="tb"><tr><th>الحالة</th><th>القاعدة</th><th>اللون</th></tr><tr><td>ساري</td><td>أكثر من 30 يومًا</td><td class="en">green-600</td></tr><tr><td>ينتهي قريبًا</td><td>30 يومًا أو أقل</td><td class="en">warning #94600F</td></tr><tr><td>منتهي</td><td>تاريخ الانتهاء مضى</td><td class="en">danger #B4382F</td></tr></table>
  <p class="small mu" style="margin-top:8px">حد الـ30 يومًا اقتراح تصميمي يتطابق مع تذكير «30 يومًا» في الشاشات؛ يُضبط حسب قرار المنتج.</p></div>
</div>''', guide=True)

    b.add("08", f'''{title("رحلة الضمان، الحالة الفارغة، الإشعارات، الإضافة", "Product timeline, empty state, notifications, capture")}
<div style="display:flex;justify-content:space-between">{screens([("app_06_warranty_detail", "تفاصيل المنتج + رحلة الضمان"), ("app_07_empty_state", "الحالة الفارغة"), ("app_08_notifications", "الإشعارات"), ("app_09_scan_receipt", "تصوير الفاتورة")], 175)}</div>''', guide=True)

    b.add("08", f'''{title("الموقع الإلكتروني", "Website landing page, header and footer")}
<div class="g" style="grid-template-columns:auto 1fr;gap:30px">
  <div class="frame" style="width:400px;height:540px;overflow:hidden"><img src="{png(DA, "web_01_landing_page")}" style="width:400px;display:block"></div>
  <div><ul class="bul small"><li><b>الترويسة:</b> الشعار الثنائي يمين، روابط بوزن 500، زر أساسي واحد.</li><li><b>الواجهة:</b> كتلة خضراء بزوايا 40px، نمط بتلاشٍ ≤ 16%، شاشات التطبيق داخل إطارات.</li><li><b>المزايا:</b> 4 بطاقات بأيقونات الهوية داخل مربعات <span class="en">green-50</span>.</li><li><b>الخطوات:</b> عائلة قوس دورة الحياة: دوائر مرقمة وخط منقط.</li><li><b>التذييل:</b> أسود الهوية مع نمط 4%، الشعار المعكوس على الداكن.</li><li><b>الشبكة:</b> 12 عمودًا، هوامش 96px على 1440، فجوة 20–24px.</li></ul>
  <p class="small mu">الملف: <span class="en">10_Digital_Applications/web_01_landing_page.png</span> + المصدر <span class="en">HTML</span>.</p></div>
</div>''', guide=True)

    b.add("08", f'''{title("البريد الإلكتروني والإعلانات الرقمية", "Email and digital banners")}
<div class="g" style="grid-template-columns:1fr 1fr;gap:24px">
  <div><span class="lbl">ترويسة البريد 600×200</span>{img(f"{DA}/email_01_header.png", "width:100%;border-radius:10px")}
  <span class="lbl" style="margin-top:16px">التوقيع 600×170</span>{img(f"{DA}/email_02_signature.png", "width:100%;border-radius:10px;border:1px solid " + C["sand"])}</div>
  <div><span class="lbl">بانرات قياسية</span>
  {img(f"{DA}/banner_728x90.png", "width:100%;border-radius:6px")}
  <div style="display:flex;gap:14px;margin-top:14px;align-items:start">{img(f"{DA}/banner_300x250.png", "width:220px;border-radius:6px")}{img(f"{DA}/banner_160x600.png", "width:80px;border-radius:6px")}<div style="flex:1">{img(f"{DA}/banner_1200x628.png", "width:100%;border-radius:6px")}<div class="cap">1200×628 · 300×250 · 160×600 · 728×90</div></div></div></div>
</div>''', guide=True)

    shots = "".join(f'<div>{img(f"{DA}/store_app_store_screenshot_{i}.png", "width:100%;border-radius:12px")}</div>' for i in range(1, 5))
    b.add("08", f'''{title("متاجر التطبيقات وحسابات التواصل", "App Store, Google Play and social profiles")}
<div class="g" style="grid-template-columns:1.25fr 1fr;gap:26px">
  <div><span class="lbl">لقطات <span class="en">App Store</span> (1290×2796)</span><div class="g g4" style="gap:10px">{shots}</div>
  <span class="lbl" style="margin-top:12px">صورة <span class="en">Google Play</span> المميزة 1024×500</span>{img(f"{DA}/store_google_play_feature_1024x500.png", "width:100%;border-radius:10px")}</div>
  <div><span class="lbl">ملف الحسابات</span>
  <div style="display:flex;gap:14px;align-items:center;margin-bottom:12px">{img(f"{SM}/profile_avatar_1080.png", "width:110px;border-radius:50%")}<p class="small" style="margin:0">الصورة الشخصية: الرمز الأبيض على الأخضر بدون مربع وبدون <span class="en">®</span>، لأن المنصات تقص الصورة دائريًا.</p></div>
  {img(f"{SM}/profile_x_header_1500x500.png", "width:100%;border-radius:10px")}<div class="cap">غلاف X · 1500×500</div>
  {img(f"{SM}/profile_linkedin_cover_1584x396.png", "width:100%;border-radius:10px;margin-top:8px")}<div class="cap">غلاف LinkedIn · 1584×396</div></div>
</div>''', guide=True)

    # ============================================================ 09 CORPORATE
    b.add("09", divider("09", "الهوية المؤسسية", "Corporate Identity",
                        "المطبوعات والقوالب المؤسسية: نسخة مسطحة قابلة للطباعة لكل قطعة، مع مواصفاتها.",
                        "Stationery and corporate templates: a flat, print-ready version of every piece, with specs."),
          dark=True, bg=C["green-600"], chrome=False, guide=True)

    b.add("09", f'''{title("بطاقة العمل والورق الرسمي", "Business card and letterhead")}
<div class="g" style="grid-template-columns:1fr 1fr;gap:30px;align-items:start">
  <div>
    <div style="position:relative;height:330px;background:{C["paper"]};border-radius:18px">
      <div style="position:absolute;top:40px;right:60px;transform:rotate(-5deg);box-shadow:0 18px 36px rgba(0,0,0,.18)">{img(f"{CO}/business_card_front.png", "width:300px")}</div>
      <div style="position:absolute;top:150px;right:150px;transform:rotate(4deg);box-shadow:0 18px 36px rgba(0,0,0,.18)">{img(f"{CO}/business_card_back.png", "width:300px")}</div>
    </div>
    <table class="tb" style="margin-top:12px"><tr><td>المقاس</td><td class="num">85×55 ملم + 3 ملم نزف</td></tr><tr><td>الورق</td><td>350–400 جم مطفي، اختياري: طباعة بارزة للرمز على الوجه الأخضر</td></tr><tr><td>الخط</td><td>الاسم Tajawal 800 · 10pt، البيانات 400 · 7pt</td></tr></table>
  </div>
  <div style="display:flex;gap:20px;align-items:start">
    {img(f"{CO}/letterhead_a4.png", "width:270px;box-shadow:0 12px 30px rgba(0,0,0,.14);border-radius:4px")}
    <div class="small"><span class="lbl">الورق الرسمي A4</span><ul class="bul"><li>هوامش 17 ملم يمين ويسار.</li><li>ترويسة: الشعار الثنائي + خط أخضر 2pt.</li><li>تذييل: شريط أخضر 12 ملم + نمط <span class="en">green-100</span> بتلاشٍ.</li><li>النص: Tajawal 400، 11–12pt، تباعد 1.8.</li><li>ملفات <span class="en">PDF</span> للطباعة و<span class="en">PNG</span> للمعاينة.</li></ul></div>
  </div>
</div>''', guide=True)

    b.add("09", f'''{title("الأغلفة والعروض التقديمية", "Document cover, company profile and presentation templates")}
<div class="g" style="grid-template-columns:auto 1fr;gap:26px;align-items:start">
  {img(f"{CO}/document_cover_a4.png", "width:250px;border-radius:6px;box-shadow:0 12px 30px rgba(0,0,0,.16)")}
  <div class="g g2" style="gap:14px">
    <div>{img(f"{CO}/presentation_cover_16x9.png", "width:100%;border-radius:8px")}<div class="cap">غلاف العرض</div></div>
    <div>{img(f"{CO}/presentation_divider_16x9.png", "width:100%;border-radius:8px;border:1px solid " + C["sand"])}<div class="cap">فاصل الأقسام · عائلة النمط المختوم</div></div>
    <div>{img(f"{CO}/presentation_content_16x9.png", "width:100%;border-radius:8px;border:1px solid " + C["sand"])}<div class="cap">صفحة محتوى · 3 أعمدة</div></div>
    <div class="soft small"><b>قالب العرض:</b> 16:9، هوامش 140px، عنوان 68px، نص 24px. نسخة قابلة للتعديل في <span class="en">Damanati_Brand_Presentation.pptx</span> وملفات <span class="en">HTML</span> المصدرية.</div>
  </div>
</div>''', guide=True)

    b.add("09", f'''{title("بطاقة الموظف والمجلد", "Staff ID card and corporate folder")}
<div class="g" style="grid-template-columns:auto 1fr;gap:34px;align-items:center">
  <div style="text-align:center">{img(f"{CO}/staff_id_card.png", "width:200px;border-radius:12px;box-shadow:0 14px 30px rgba(0,0,0,.18)")}<div class="cap">54×86 ملم</div></div>
  <div>{img(f"{CO}/folder_flat.png", "width:600px;border-radius:6px;box-shadow:0 12px 30px rgba(0,0,0,.12)")}<div class="cap">المجلد مفرودًا: الخلف (يمين في الطباعة) · الكعب · الوجه. A4 + كعب 14 ملم.</div>
  <p class="small mu" style="margin-top:10px">نماذج الصور الواقعية للبطاقة والقبعة والأعلام والملابس موجودة في الدليل المرجعي (ص18–20) وتبقى صالحة؛ هنا نوفر الملفات المسطحة القابلة للإنتاج.</p></div>
</div>''')

    # ============================================================ 10 MARKETING
    b.add("10", divider("10", "التسويق والتواصل الاجتماعي", "Marketing & Social",
                        "قوالب جاهزة للمنشورات والقصص والحملات والإعلانات الخارجية، كلها مبنية على عائلات التكوين الثلاث.",
                        "Ready templates for posts, stories, campaigns and outdoor, all built on the three composition families."),
          dark=True, bg=C["green-600"], chrome=False, guide=True)

    b.add("10", f'''{title("قوالب إنستغرام", "Instagram posts and stories")}
<div style="display:flex;gap:16px;align-items:start">
  {"".join(f'<div style="flex:1">{img(f"{SM}/{n}.png", "width:100%;border-radius:10px;border:1px solid " + C["sand"])}<div class="cap">{t}</div></div>' for n, t in [("instagram_post_01_launch", "إعلان · النمط المختوم"), ("instagram_post_02_tip", "تعليمي · رقم كبير"), ("instagram_post_03_feature", "ميزة · قوس دورة الحياة")])}
  {"".join(f'<div style="width:150px">{img(f"{SM}/{n}.png", "width:150px;border-radius:10px;border:1px solid " + C["sand"])}<div class="cap">{t}</div></div>' for n, t in [("instagram_story_01_download", "قصة · تحميل"), ("instagram_story_02_quiz", "قصة · تفاعل")])}
</div>
<div class="g g3" style="margin-top:14px;gap:14px"><div class="soft small"><b>هامش آمن:</b> 80px في المنشور (1080) و250px أعلى/أسفل القصة.</div><div class="soft small"><b>النص:</b> عنوان ≤ 6 كلمات، نص داعم ≤ سطرين.</div><div class="soft small"><b>الشعار:</b> الأيقونة في الزاوية العليا، أو الصيغة الثنائية في القصص.</div></div>''', guide=True)

    b.add("10", f'''{title("لينكدإن وإكس والحملة الرئيسية", "LinkedIn, X and campaign key visual")}
<div class="g" style="grid-template-columns:1fr 1.3fr;gap:20px">
  <div>{img(f"{SM}/linkedin_post_1200x627.png", "width:100%;border-radius:10px;border:1px solid " + C["sand"])}<div class="cap">لينكدإن 1200×627 · نبرة مؤسسية</div>
  {img(f"{SM}/x_post_1600x900.png", "width:100%;border-radius:10px;margin-top:10px")}<div class="cap">إكس 1600×900</div></div>
  <div>{img(f"{MK}/campaign_key_visual_16x9.png", "width:100%;border-radius:10px")}<div class="cap">الصورة الرئيسية لحملة الإطلاق «لكل منتج جواز ضمان» · عائلة جواز المنتج</div>
  <div class="soft small" style="margin-top:10px"><b>منطق الحملة:</b> فكرة «الجواز» تحوّل الضمان من ورقة منسية إلى وثيقة ملكية. تتوسع إلى سلسلة: «جواز الغسالة»، «جواز الجوال»، إلخ — دائمًا بمنتجات عامة بلا علامات تجارية.</div></div>
</div>''', guide=True)

    b.add("10", f'''{title("الإعلانات الخارجية والفعاليات", "Outdoor, events and merchandise")}
<div class="g" style="grid-template-columns:1.5fr 1fr;gap:20px">
  <div>{img(f"{MK}/outdoor_billboard_2x1.png", "width:100%;border-radius:10px")}<div class="cap">لوحة طرق 2:1 · الشعار العمودي + عنوان ≤ 4 كلمات تُقرأ في 3 ثوانٍ</div>
  <div style="display:flex;gap:14px;align-items:end;margin-top:10px">{img(f"{MK}/event_backdrop_3x2.png", "width:290px;border-radius:10px")}<div class="cap">خلفية فعالية 3×2 م · نمط تكراري للتصوير يظهر الشعار في كل لقطة.</div></div></div>
  <div style="display:flex;gap:12px;align-items:start">
    <div style="flex:1">{img(f"{MK}/rollup_banner_85x200.png", "width:100%;border-radius:8px")}<div class="cap">رول أب 85×200 سم</div></div>
    <div style="flex:1.3">{img(f"{MK}/merch_tote_bag_flat.png", "width:100%;border-radius:8px")}<div class="cap">حقيبة قماشية · طباعة شاشة لونين</div>
    <p class="small mu" style="margin-top:8px">القبعة والقمصان والشارات: انظر نماذج الدليل المرجعي (ص18–20). القاعدة: الأيقونة مطرزة أو مطبوعة بلون واحد على قماش أخضر أو رمادي أو أبيض.</p></div>
  </div>
</div>''', guide=True)

    # ============================================================ 11 IMPLEMENTATION
    b.add("11", divider("11", "التنفيذ والحوكمة", "Implementation & Governance",
                        "الشبكة، قواعد العربي والإنجليزي، إمكانية الوصول، رموز التصميم، إدارة الأصول، وفهرس الملفات.",
                        "Grid, Arabic/English rules, accessibility, design tokens, asset governance and the file index."),
          dark=True, bg=C["green-600"], chrome=False, guide=True)

    grid = "".join(f'<i style="flex:1;background:rgba(47,125,107,.12);border-inline:1px solid rgba(47,125,107,.25)"></i>' for _ in range(12))
    b.add("11", f'''{title("الشبكة والتكوين", "Layout, grid and composition", "p")}
<div class="g g2" style="gap:30px">
  <div><div style="position:relative;height:250px;border:1px solid {C["sand"]};border-radius:12px;padding:16px;display:flex;gap:14px">{grid}
  <div style="position:absolute;inset:16px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:0 8px"><div style="font:800 26px Tajawal">عنوان على 7 أعمدة</div><div class="small mu">نص على 5 أعمدة · محاذاة يمين</div></div></div>
  <table class="tb" style="margin-top:12px"><tr><th>الوسيط</th><th>الأعمدة</th><th>الهامش</th><th>الفجوة</th></tr><tr><td>جوال 360–430</td><td class="num">4</td><td class="num">20px</td><td class="num">12px</td></tr><tr><td>تابلت 768</td><td class="num">8</td><td class="num">32px</td><td class="num">16px</td></tr><tr><td>ويب 1440</td><td class="num">12</td><td class="num">96px</td><td class="num">24px</td></tr><tr><td>A4 / عرض 16:9</td><td class="num">12</td><td class="num">17mm / 140px</td><td class="num">5mm / 40px</td></tr></table></div>
  <div><span class="lbl">مقياس المسافات (أساس 4)</span>
  <div style="display:flex;align-items:end;gap:8px;height:120px">{"".join(f'<div style="text-align:center"><div style="width:{max(s, 2)}px;height:{max(s, 2)}px;background:{C["green-600"]};border-radius:3px;margin:auto"></div><div class="cap num">{s}</div></div>' for s in T.SPACING[1:11])}</div>
  <ul class="bul small" style="margin-top:12px"><li>كل المسافات من المقياس فقط: 4، 8، 12، 16، 20، 24، 32، 40، 48، 64، 80، 96.</li><li>عنصر واحد بارز في كل تكوين؛ الباقي يخدمه.</li><li>الفراغ جزء من الهوية: نسبة 30% أبيض ليست اختيارية.</li><li>الظلال 4 مستويات فقط (<span class="en">shadow-1..4</span>).</li></ul></div>
</div>''')

    b.add("11", f'''{title("مبادئ التصميم بالعربية والإنجليزية", "Arabic and English design principles", "p")}
<div class="g g2" style="gap:30px">
  <div class="card"><span class="lbl">RTL · العربية</span>
  <ul class="bul small"><li>اتجاه الصفحة <span class="en">dir="rtl"</span>؛ استخدم الخصائص المنطقية (<span class="en">margin-inline-start</span>) لا <span class="en">left/right</span>.</li><li>الأيقونات الاتجاهية (رجوع، تقدم، أسهم) تنعكس؛ الأيقونات الموضوعية (كاميرا، جرس) لا تنعكس.</li><li>الأرقام وأرقام الجوالات والروابط تبقى <span class="en">LTR</span> معزولة.</li><li>شريط التقدم والرسوم الزمنية تبدأ من اليمين.</li><li>لا تقطيع للكلمات العربية بين الأسطر، ولا تبرير كامل يمدّ الكشيدة.</li></ul></div>
  <div class="card"><span class="lbl">LTR · English</span>
  <ul class="bul small" dir="ltr"><li>Mirror the layout; keep the logo lockup unchanged (the bilingual lockup is never mirrored).</li><li>Sentence case for headings and buttons. No ALL CAPS paragraphs.</li><li>Use “warranty”, never “guarantee”, for product coverage.</li><li>Dates: 24 Nov 2026 in prose; DD/MM/YYYY in tables.</li><li>Latin text is set in Tajawal; Myriad Pro exists only inside the outlined logo.</li></ul></div>
</div>
<div class="soft small" style="margin-top:18px"><b>الشعار في التخطيطات الإنجليزية:</b> الصيغة الثنائية تبقى كما هي (العربي يمين، الإنجليزي يسار) في كل الاتجاهات. في المواد الإنجليزية فقط يمكن استخدام صيغة الاسم الإنجليزي.</div>''', guide=True)

    b.add("11", f'''{title("إمكانية الوصول والتنفيذ الرقمي", "Accessibility and digital implementation", "p")}
<div class="g g2" style="gap:30px">
  <div><span class="lbl">متطلبات دنيا</span>
  <ul class="bul small"><li>تباين النص ≥ 4.5:1 (النص الكبير ≥ 3:1)، والعناصر غير النصية ≥ 3:1.</li><li>الحالة لا تُنقل باللون وحده: أيقونة + نص دائمًا.</li><li>أهداف اللمس ≥ 44×44pt (<span class="en">iOS</span>) / 48dp (<span class="en">Android</span>).</li><li>إطار تركيز مرئي: حلقة 2px <span class="en">green-700</span> (فاتح) / <span class="en">mint</span> (داكن) مع إزاحة 2px.</li><li>دعم تكبير النص حتى 200% بدون قص.</li><li>بدائل نصية للصور؛ وصف عربي أولًا.</li><li>احترام <span class="en">prefers-reduced-motion</span>.</li></ul>
  <p class="small mu">هذه متطلبات تصميم؛ إعلان التوافق مع <span class="en">WCAG</span> يحتاج تدقيق المنتج الفعلي.</p></div>
  <div><span class="lbl">مقتطف من رموز التصميم (CSS)</span>
  <pre class="en" style="background:{C["night"]};color:#E9F3EF;border-radius:14px;padding:16px;font:500 11px/1.6 monospace;direction:ltr;text-align:left;white-space:pre-wrap">:root {{
  --dm-color-green-600: #2F7D6B;
  --dm-color-ink: #231F20;
  --dm-color-stone: #6B675F;
  --dm-type-body-size: 1rem;  /* 16px */
  --dm-type-body-line: 1.7;
  --dm-radius-lg: 16px;
  --dm-motion-ease-seal: cubic-bezier(.7,0,.2,1);
}}
[data-theme="dark"] {{ --dm-bg: var(--dm-color-night); }}</pre>
  <p class="small">الملفات: <span class="en">15_Technical_Documentation/design-tokens/damanati.tokens.json</span> (صيغة <span class="en">W3C DTCG</span>) و <span class="en">damanati.tokens.css</span>.</p></div>
</div>''', guide=True)

    b.add("11", f'''{title("حوكمة العلامة وإدارة الأصول", "Brand governance and asset management", "p")}
<div class="g g3" style="gap:16px">
  <div class="card"><span class="lbl">المسؤوليات</span><ul class="bul small"><li><b>مالك العلامة:</b> يعتمد أي إضافة «مقترحة» ويقرر الاستثناءات.</li><li><b>فريق التصميم:</b> يحدّث المكتبة والدليل، ويرقّم الإصدارات.</li><li><b>الوكالات:</b> تستخدم الملفات الرسمية فقط، وترسل المواد للمراجعة قبل النشر.</li></ul></div>
  <div class="card"><span class="lbl">دورة المراجعة</span><ol style="padding-right:18px" class="small"><li>طلب مادة جديدة مع الغرض والجمهور.</li><li>تصميم من القوالب الرسمية.</li><li>مراجعة الهوية مقابل قائمة التحقق.</li><li>اعتماد ونشر، وأرشفة المصدر.</li></ol></div>
  <div class="card"><span class="lbl">قائمة تحقق سريعة</span><ul class="small" style="list-style:none">{"".join(f"<li style='margin-bottom:4px'>☐ {x}</li>" for x in ["ملف الشعار الرسمي بدون تعديل", "مساحة الحماية x محترمة", "الأخضر #2F7D6B فقط", "تجوال لكل النصوص", "الحالة: لون + نص + أيقونة", "التباين مُختبر", "لا شعارات أو بيانات لأطراف أخرى", "التهجئة: Damanati / warranty"])}</ul></div>
</div>
<div class="soft small" style="margin-top:16px"><b>الإصدارات:</b> <span class="en">MAJOR.MINOR</span> — يتغير الرقم الأول عند تعديل الشعار أو اللون الأساسي (يتطلب اعتمادًا)، والثاني عند إضافة قوالب أو قواعد. هذا الإصدار 2.0 لأنه يعيد تنظيم النظام كاملًا مع الحفاظ على الشعار.</div>''', guide=True)

    tree = [("01_Brand_Book", "الدليل الكامل وملخص الإرشادات (PDF)"), ("02_Logos", "SVG · PNG · PDF · أيقونات التطبيق"), ("03_Color_System", "JSON · GPL · تقرير التباين"),
            ("04_Typography", "خطوط تجوال + الرخصة + السلم"), ("05_Graphic_Elements", "النمط بست صيغ"), ("06_Icons", "24 أيقونة SVG + sprite"),
            ("07_Illustrations", "مكونات الرسوم (HTML)"), ("08_3D_Assets", "مواصفات الاتجاه ثلاثي الأبعاد"), ("09_Motion_Assets", "MP4 · GIF · إطارات · المصدر"),
            ("10_Digital_Applications", "شاشات · موقع · بريد · بانرات · متاجر"), ("11_Corporate_Identity", "بطاقات · ورق رسمي · أغلفة · عروض (PNG/PDF)"),
            ("12_Social_Media", "منشورات · قصص · أغلفة الحسابات"), ("13_Mockups", "حملة · لوحات · فعاليات · منتجات"), ("14_Templates", "قوالب فارغة + PPTX"), ("15_Technical_Documentation", "رموز التصميم · المواصفات")]
    th = "".join(f'<div style="display:flex;gap:10px;padding:3px 0;border-bottom:1px solid {C["sand"]};font-size:12.5px;line-height:1.6"><span class="en" style="font-weight:800;width:230px;text-align:left">{a}/</span><span>{d}</span></div>' for a, d in tree)
    b.add("11", f'''{title("فهرس الأصول والمواصفات الفنية", "Final asset index and technical specifications")}
<div class="g" style="grid-template-columns:1.3fr 1fr;gap:30px">
  <div>{th}</div>
  <div><table class="tb"><tr><th>البند</th><th>القيمة</th></tr><tr><td>الأخضر</td><td class="en num">#2F7D6B · RGB 47 125 107</td></tr><tr><td>الأسود</td><td class="en num">#231F20</td></tr><tr><td>الرمادي</td><td class="en num">#6B675F</td></tr><tr><td>الخط</td><td class="en">Tajawal 200–900 (OFL)</td></tr><tr><td>زوايا الأيقونة</td><td class="num">22.4%</td></tr><tr><td>مساحة الحماية</td><td>x = ⅙ عرض المربع</td></tr><tr><td>أقل حجم</td><td class="en num">10mm / 48px</td></tr><tr><td>الشبكة</td><td class="num">4 / 8 / 12 أعمدة</td></tr></table>
  <div class="soft small" style="margin-top:12px"><b>اقرأ أيضًا:</b> <span class="en">README.md</span> في جذر المكتبة لشرح كل مجلد وطريقة إعادة توليد الملفات من المصدر.</div></div>
</div>''', guide=True)

    # back cover
    b.add("11", f'''
{pattern_layer("rgba(255,255,255,.95)", 1, "up", 80, "bottom:50%")}
<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding-top:180px">
  {logo("vertical_reversed-on-green", height="200px")}
  <div style="font:500 16px Tajawal;opacity:.85">نحفظ ضمانك، ونذكّرك بحقك.</div>
  <div class="en" style="font:400 12px Tajawal;opacity:.7">Damanati Brand Book · v2.0 · October 2026</div>
</div>''', dark=True, bg=C["green-600"], chrome=False, guide=True)
