"""Brand book pages: cover, intro, reference audit, brand strategy."""
from book_kit import *  # noqa: F401,F403
from components import passport, chip, ring
from common import SRC

REF = SRC / "reference"


def ref(n, style=""):
    return f'<img src="{(REF / f"ref-{n:02d}.jpg").as_uri()}" style="display:block;width:100%;border-radius:8px;border:1px solid {C["sand"]};{style}">'


def build_a(b: Book):
    # ------------------------------------------------------------ cover
    b.add("00", f'''
{pattern_layer("rgba(255,255,255,.95)", 1, "down", 80, "top:56%")}
<div style="position:absolute;left:-60px;top:-40px;opacity:.09">{mark_svg("#fff", "560px")}</div>
<div style="position:relative;display:flex;flex-direction:column;height:100%">
  {logo("bilingual_reversed-on-green", height="46px")}
  <div style="margin-top:120px">
    <div style="font:500 15px Tajawal;opacity:.85">الإصدار 2.0 · أكتوبر 2026</div>
    <h1 style="font:800 66px/1.15 Tajawal;margin-top:10px">دليل الهوية<br>البصرية</h1>
    <div class="en" style="font:400 24px Tajawal;opacity:.85;margin-top:8px;text-align:right">Brand Identity Book</div>
  </div>
</div>''', dark=True, bg=C["green-600"], chrome=False, guide=True)

    # ------------------------------------------------------------ contents
    def contents(toc):
        rows = ""
        for k, ar, en in CHAPTERS[1:]:
            rows += (f'<div style="display:flex;align-items:baseline;gap:14px;padding:9px 0;border-bottom:1px solid {C["sand"]}">'
                     f'<span class="num" style="font:800 20px Tajawal;color:{C["green-600"]};width:38px">{k}</span>'
                     f'<span style="font:700 16px Tajawal;flex:1">{ar} <span class="en mu" style="font-weight:400;font-size:12px">· {en}</span></span>'
                     f'<span class="num" style="font:700 13px Tajawal">{toc.get(k, ""):02}</span></div>' if k in toc else "")
        return f'''{title("المحتويات", "Contents")}
<div class="g" style="grid-template-columns:1.6fr 1fr;gap:48px">
  <div>{rows}</div>
  <div class="soft" style="align-self:start">
    <span class="lbl">كيف تقرأ هذا الدليل</span>
    <p class="small">كل قاعدة في هذا الدليل تحمل وسمًا يوضح مصدرها، عشان يكون واضح وش المعتمد من الهوية الأصلية وش المقترح كتطوير:</p>
    <div style="display:flex;flex-direction:column;gap:9px;margin:12px 0">
      <div>{STATUS_TAG["a"]} <span class="small">منصوص عليه في دليل الهوية المرجعي (الإصدار 1.0).</span></div>
      <div>{STATUS_TAG["m"]} <span class="small">مستخرج بالقياس من ملفات الهوية الأصلية، وغير مذكور كقيمة صريحة.</span></div>
      <div>{STATUS_TAG["p"]} <span class="small">إضافة من هذا الإصدار، تحتاج اعتماد صاحب العلامة قبل التعميم.</span></div>
    </div>
    <p class="enp">Every rule is tagged by source: Approved (stated in the v1.0 guide), Measured (read from the original artwork), Proposed (new in v2.0, pending owner approval).</p>
  </div>
</div>'''
    b.add("00", contents, guide=True)

    # ------------------------------------------------------------ intro
    b.add("00", f'''{title("عن هذا الإصدار", "About this edition")}
<div class="g g2" style="gap:44px">
  <div>
    <p class="lead">الإصدار 2.0 ما يغيّر هوية ضماناتي، بل يكمّلها. الشعار والأخضر وخط تجوال والنمط كلها باقية كما اعتُمدت في الإصدار 1.0؛ واللي أضفناه هو النظام اللي حولها: استراتيجية مكتوبة، ألوان وظيفية، سلم طباعي، لغة بصرية، حركة، وتطبيقات جاهزة للتنفيذ.</p>
    <p class="enp">Edition 2.0 does not replace the Damanati identity; it completes it. The logo, green, Tajawal and the pattern stay exactly as approved in v1.0. What is new is the system around them: written strategy, functional colour, a type scale, visual language, motion, and production-ready applications.</p>
  </div>
  <div class="g g2" style="gap:14px">
    <div class="card"><div class="kpi num">5</div><div class="small">صيغ شعار معتمدة × 5 مخططات لونية، مستخرجة متجهيًا من الملف الأصلي</div></div>
    <div class="card"><div class="kpi num">3</div><div class="small">عائلات تكوين بصري مشتقة من هندسة الرمز</div></div>
    <div class="card"><div class="kpi num">24</div><div class="small">أيقونة خاصة بعالم الضمانات بشبكة 24px</div></div>
    <div class="card"><div class="kpi num en" style="text-align:right">45+</div><div class="small">ملف تطبيق قابل للتعديل: تطبيق، موقع، مطبوعات، تواصل اجتماعي</div></div>
  </div>
</div>
<div class="soft" style="margin-top:30px;display:flex;gap:26px;align-items:center">
  <div style="flex:none">{logo("symbol_primary", height="64px")}</div>
  <div><h3>لمن هذا الدليل؟</h3><p class="small" style="margin:0">للمصممين والمطورين وفرق التسويق والوكالات والموظفين الجدد. كل صفحة تجاوب على سؤال عملي: وش أستخدم، ومتى، وكيف. الملفات المذكورة موجودة فعليًا في مكتبة الأصول المرفقة <span class="en">(Damanati_Brand_System/)</span>.</p></div>
</div>''', guide=True)

    # ============================================================ 01 AUDIT
    b.add("01", divider("01", "التدقيق المرجعي", "Reference Audit",
                        "قبل أي تصميم، راجعنا ملف الهوية الأصلي صفحة صفحة: وش فيه، وش ناقص، ووين التعارضات.",
                        "Before designing anything we reviewed the original identity file page by page: what it contains, what is missing, and where it conflicts."),
          dark=True, bg=C["green-600"], chrome=False)

    thumbs = "".join(f'<div>{ref(n)}<div class="cap num" style="text-align:center">p.{n:02d}</div></div>' for n in range(1, 22))
    b.add("01", f'''{title("الملف المرجعي", "Source file reviewed: Damanati_Brand_Identity_Final.pdf · v1.0 · 21 pages")}
<div class="g" style="grid-template-columns:repeat(7,1fr);gap:10px 12px">{thumbs}</div>
<p class="small mu" style="margin-top:12px">المحتوى: الغلاف، نبذة/رؤية/رسالة، القيم، مكونات الشعار، الأيقونة، المفهوم وشبكة البناء، مساحة الحماية، الحد الأدنى للحجم، الألوان، التطبيق الصحيح، الخطوط، الاستخدام الخاطئ، النمط، الأيقونات، حسابات التواصل، وتطبيقات ونماذج عرض.</p>''')

    b.add("01", f'''{title("ما وجدناه: نقاط القوة", "Audit findings: strengths to keep")}
<div class="g g3">
  <div class="card"><span class="lbl">01 · الرمز</span><h3>دمج «ض» و«D» فكرة قوية وقابلة للامتلاك</h3><p class="small">الرمز يقرأ بالعربي واللاتيني معًا، ويشتغل منفردًا كأيقونة تطبيق. الشكل المغلق يوحي بالحماية والاحتواء (كما ورد في شرح المفهوم، ص6).</p></div>
  <div class="card"><span class="lbl">02 · اللون</span><h3>أخضر واحد مميز في سوق تغلب عليه الألوان الزرقاء</h3><p class="small">الأخضر <span class="en num">#2F7D6B</span> هادئ وموثوق، ومرتبط بالمكان دون أن يكون أخضر علم صريح. نسبة 60/30/5/5 واضحة.</p></div>
  <div class="card"><span class="lbl">03 · الخط</span><h3>تجوال اختيار موفق للعربية</h3><p class="small">خط هندسي معاصر بسبعة أوزان، مرخّص برخصة <span class="en">SIL OFL 1.1</span> المفتوحة، ويقرأ بوضوح على الشاشات الصغيرة.</p></div>
  <div class="card"><span class="lbl">04 · النمط</span><h3>نمط مشتق من الرمز نفسه</h3><p class="small">تكرار الرمز بإزاحة متناوبة يعطي خلفية تعرف العلامة حتى بدون الشعار (ص14).</p></div>
  <div class="card"><span class="lbl">05 · القواعد</span><h3>مساحة حماية وحد أدنى للحجم مختبران</h3><p class="small">10 ملم للطباعة و48 بكسل للشاشات (ص8)، مع مثال مرئي لفقدان التفاصيل تحت الحد.</p></div>
  <div class="card"><span class="lbl">06 · الأيقونات</span><h3>أسلوب خطي موحّد وزوايا مستديرة</h3><p class="small">مكتبة أيقونات بسماكة خط واحدة تنسجم مع بساطة الشعار (ص15).</p></div>
</div>
<div class="soft" style="margin-top:20px;display:flex;align-items:center;gap:26px;padding:16px 24px">
  <span class="lbl" style="margin:0;width:90px">ما نحتفظ به كما هو</span>
  {logo("symbol_primary", height="56px")}
  <div style="display:flex;gap:6px">{"".join(f'<i style="width:44px;height:56px;border-radius:10px;background:{c};border:1px solid {C["sand"]}"></i>' for c in ["#2F7D6B", "#FFFFFF", "#6B675F", "#231F20"])}</div>
  <div style="font:800 34px Tajawal;color:{C["green-600"]}">تجوال <span class="en" style="font-weight:400">Aa</span></div>
  <div style="flex:1;height:56px;border-radius:10px;overflow:hidden;position:relative;background:{C["green-600"]}">{pattern_layer("rgba(255,255,255,.9)", 1, None, 46)}</div>
</div>''')

    rows = [
        ("قيمة الأخضر", "الدليل يذكر <span class='en num'>#2F7D6B</span>؛ متجهات الشعار <span class='en num'>#2E7D6B</span>؛ عناوين الصفحات <span class='en num'>#2C7D6B</span>؛ نموذج اللوحة الإعلانية (ص17) أخضر أغمق مشبع مع ذهبي؛ القبعة والأعلام (ص19) تركوازي أفتح.", "اعتماد <span class='en num'>#2F7D6B</span> قيمة وحيدة، وتوحيد ملفات الشعار عليها (تم في هذا الإصدار). الذهبي ليس من الهوية."),
        ("المصطلح الإنجليزي", "«All your guarantees in one place» (ص17).", "استخدام <span class='en'>warranty / warranties</span> للضمانات على المنتجات؛ <span class='en'>guarantee</span> تعني غالبًا ضمانًا ماليًا أو كفالة."),
        ("الخطوط اللاتينية", "ثلاثة: <span class='en'>Myriad Pro Bold</span> في الشعار، <span class='en'>Tajawal</span> في الدليل، <span class='en'>Montserrat</span> في نموذج المتصفح (ص13).", "الكلمة الإنجليزية تبقى عملًا فنيًا محوّلًا لمسارات داخل الشعار فقط، وكل النصوص اللاتينية بتجوال. إيقاف <span class='en'>Montserrat</span>."),
        ("اسم التطبيق", "نموذج الشاشة الرئيسية يعرض اسم التطبيق «<span class='en'>D-Data</span>» (ص18).", "اسم التطبيق تحت الأيقونة: «ضماناتي» بالعربي و«<span class='en'>Damanati</span>» بالإنجليزي."),
        ("مساحة الحماية", "النص: «تعادل عرض الجزء الداخلي من الرمز» والرسم يقيس سماكة قوس الحرف.", "تعريف <b>x</b> = سماكة قوس الـ<span class='en'>D</span> ≈ 1/6 عرض المربع (قيس: 16.2%)."),
        ("التحرير اللغوي", "«الأدني»، «التزاحممع»، «علي»، «الاساسي»، «الايقونة».", "تصحيح: الأدنى، التزاحم مع، على، الأساسي، الأيقونة."),
    ]
    trs = "".join(f"<tr><td style='font-weight:800;width:16%'>{a}</td><td style='width:44%'>{c}</td><td>{r}</td></tr>" for a, c, r in rows)
    b.add("01", f'''{title("التعارضات وطريقة حلها", "Inconsistencies found and how v2.0 resolves them")}
<div style="display:flex;gap:10px;margin-bottom:16px;align-items:stretch">
{"".join(f'<div style="flex:1;border-radius:12px;overflow:hidden;border:1px solid {C["sand"]}"><div style="height:46px;background:{c}"></div><div style="padding:6px 10px;font:500 11.5px/1.4 Tajawal"><b class="en num">{c}</b><br>{t}</div></div>' for c, t in [("#2F7D6B", "قيمة الدليل (ص9) · المعتمدة"), ("#2E7D6B", "متجهات الشعار (ص4)"), ("#2C7D6B", "عناوين الصفحات"), ("#0F6B45", "اللوحة الإعلانية ص17 (تقريبي)"), ("#C9A227", "ذهبي اللوحة ص17 (تقريبي)")])}
</div>
<table class="tb"><tr><th>البند</th><th>ما وجدناه في الملف المرجعي</th><th>الحل المعتمد في الإصدار 2.0 {STATUS_TAG["p"]}</th></tr>{trs}</table>''')

    gaps = [("قيم CMYK وPantone", "غير موجودة. أضفنا تحويلًا مبدئيًا، ويلزم اختبار طباعة قبل الاعتماد."),
            ("ألوان وظيفية", "لا توجد ألوان لحالات الضمان (ساري/قريب/منتهي) ولا للأخطاء. أضفناها مع اختبار التباين."),
            ("سلم طباعي", "الأوزان مذكورة بدون أحجام أو تباعد أسطر. أضفنا سلمًا كاملًا."),
            ("الوضع الداكن", "شاشة داكنة واحدة (ص21) بدون قواعد. أضفنا ثيمًا داكنًا."),
            ("نبرة الصوت والرسائل", "غير موجودة. أضفنا الاستراتيجية والنبرة."),
            ("الحركة والتصوير والشبكة", "غير موجودة. أضفنا مبادئ ومواصفات."),
            ("حد أدنى للشعار الكامل", "محدد للرمز فقط. اقترحنا حدودًا لكل صيغة."),
            ("ملفات المصدر", "ملف PDF فقط. استخرجنا الشعار متجهيًا (SVG) من الملف نفسه دون إعادة رسم.")]
    gl = "".join(f'<div class="card" style="padding:14px 16px"><h3 style="font-size:13.5px">{a}</h3><p class="small" style="margin:0">{c}</p></div>' for a, c in gaps)
    b.add("01", f'''{title("ما كان ناقصًا وافتراضات العمل", "Gaps and working assumptions")}
<div class="g g4" style="gap:14px">{gl}</div>
<div class="soft" style="margin-top:22px"><span class="lbl">افتراضات موثقة</span>
<ul class="bul small"><li>الجمهور والشخصيات في الفصل 02 فرضيات مبنية على طبيعة المنتج، وتحتاج تحقق ببحث مستخدمين.</li>
<li>كل البيانات في نماذج الشاشات (منتجات، متاجر، تواريخ، أسماء) توضيحية، ولا تمثل شراكات أو متاجر حقيقية.</li>
<li>ما نضيف ميزات للمنتج: الشاشات توضح تطبيق الهوية، وليست مواصفات وظيفية.</li></ul></div>''')

    # ============================================================ 02 STRATEGY
    b.add("02", divider("02", "استراتيجية العلامة", "Brand Strategy",
                        "ليش ضماناتي موجود، لمن، وكيف يتكلم. هذا الفصل هو المرجع لكل قرار بصري ولغوي بعده.",
                        "Why Damanati exists, who it is for, and how it speaks. Every visual and verbal decision after this chapter refers back here."),
          dark=True, bg=C["green-600"], chrome=False)

    b.add("02", f'''{title("نظرة عامة على العلامة", "Brand overview")}
<div class="g" style="grid-template-columns:1.25fr 1fr;gap:44px">
  <div>
    <span class="lbl">عن التطبيق {STATUS_TAG["a"]}</span>
    <p class="lead">ضماناتي تطبيق رقمي يهدف إلى حفظ الضمانات والفواتير والمستندات المرتبطة بالمنتجات في مكان واحد، وتحويلها من مستندات ورقية معرّضة للفقد إلى ملفات رقمية منظمة يمكن الوصول إليها بسهولة في أي وقت. ويساعد المستخدم على إدارة ضماناته واستقبال التنبيهات قبل انتهاء فترة الضمان.</p>
    <p class="enp">Damanati is a digital app that keeps warranties, invoices and product documents in one place, turning paper that is easily lost into organised digital records available any time. It helps users manage their warranties and get alerts before a warranty expires.</p>
  </div>
  <div class="gr" style="position:relative;overflow:hidden">
    <span class="lbl" style="color:#fff;opacity:.8">الغاية {STATUS_TAG["p"]}</span>
    <div style="font:800 26px/1.4 Tajawal;margin:6px 0 10px">ما يضيع حق أحد<br>لأن ورقة ضاعت.</div>
    <p class="en" style="font:400 13px/1.6 Tajawal;opacity:.85;text-align:right">No one should lose a right because a piece of paper got lost.</p>
    <div style="position:absolute;left:-30px;bottom:-40px;opacity:.12">{mark_svg("#fff", "170px")}</div>
  </div>
</div>
<div class="g g3" style="margin-top:28px">
  <div class="soft"><span class="lbl">الفئة</span><p class="small" style="margin:0">تقنية استهلاكية رقمية · إدارة الضمانات وإثبات الشراء ودورة حياة المنتج.</p></div>
  <div class="soft"><span class="lbl">السوق</span><p class="small" style="margin:0">المملكة العربية السعودية أولًا، بهوية جاهزة للتوسع إقليميًا (وفق شرح مفهوم الشعار، ص6).</p></div>
  <div class="soft"><span class="lbl">الجوهر في كلمتين</span><p class="small" style="margin:0"><b>حفظ</b> و<b>تذكير</b>. كل ما يقوله ضماناتي يرجع لهاتين الكلمتين.</p></div>
</div>''', guide=True)

    b.add("02", f'''{title("الرؤية والرسالة", "Vision and mission", "a")}
<div class="g g2" style="gap:30px">
  <div class="card" style="padding:28px">
    <span class="lbl">الرؤية · Vision</span>
    <p style="font:700 20px/1.7 Tajawal">أن يصبح ضماناتي المنصة الرقمية الأولى في المملكة العربية السعودية لإدارة الضمانات الرقمية وحفظ حقوق المستهلك بطريقة ذكية وآمنة.</p>
    <p class="enp" style="margin-top:14px">To become the leading digital platform in Saudi Arabia for managing digital warranties and protecting consumer rights in a smart, secure way. <i>(English translation: proposed)</i></p>
  </div>
  <div class="card" style="padding:28px">
    <span class="lbl">الرسالة · Mission</span>
    <p style="font:700 20px/1.7 Tajawal">توفير تجربة رقمية موثوقة تسهّل على المستخدم حفظ الضمانات وإدارتها والوصول إليها في أي وقت، من خلال واجهة بسيطة وتقنيات حديثة تعزز الأمان والتنظيم.</p>
    <p class="enp" style="margin-top:14px">To provide a trusted digital experience that makes it easy to keep, manage and access warranties at any time, through a simple interface and modern technology that strengthen security and organisation. <i>(English translation: proposed)</i></p>
  </div>
</div>
<div class="soft" style="margin-top:24px;display:flex;justify-content:space-between;align-items:center;gap:30px">
  <div><span class="lbl">الوعد {STATUS_TAG["p"]}</span><div style="font:800 30px Tajawal">نحفظ ضمانك، ونذكّرك بحقك.</div></div>
  <div class="en" style="font:400 17px Tajawal;color:{C["stone"]};text-align:left">We keep your warranty,<br>and remind you of your rights.</div>
</div>''', guide=True)

    vals = [("الثقة", "Trust", "نقول بالضبط وش نسوي ببيانات المستخدم، وما نبالغ في الوعود.", "تواريخ وأرقام دقيقة دائمًا؛ لا عبارات مطاطة."),
            ("الأمان", "Security", "حماية المستندات جزء من المنتج، مو ميزة إضافية.", "رسائل الأمان هادئة؛ بدون تخويف."),
            ("الابتكار", "Innovation", "التقنية تختصر الخطوات: صورة واحدة بدل إدخال يدوي.", "نُظهر النتيجة لا التقنية."),
            ("البساطة", "Simplicity", "إجراء واحد واضح في كل شاشة.", "جمل قصيرة، أيقونة واحدة لكل فكرة."),
            ("الاعتمادية", "Reliability", "التنبيه يوصل في وقته، والملف موجود متى احتجته.", "اتساق صارم في الألوان والمكونات."),
            ("الخصوصية", "Privacy", "المستخدم يقرر مع من يشارك مستنداته.", "إذن صريح قبل أي مشاركة."),
            ("التنظيم", "Organisation", "كل منتج له سجل واحد مرتب.", "شبكة ومسافات ثابتة؛ لا فوضى بصرية.")]
    vh = "".join(f'<div class="card" style="padding:16px"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3 style="font-size:17px">{a}</h3><span class="en mu small">{e}</span></div>'
                 f'<p class="small" style="margin:6px 0 8px">{d}</p><p class="small" style="margin:0;color:{C["green-700"]}"><b>في التصميم:</b> {x}</p></div>' for a, e, d, x in vals)
    b.add("02", f'''{title("قيم العلامة", "Core values: names approved (p.3), definitions proposed", "a")}
<div class="g g4" style="gap:14px">{vh}
<div class="gr" style="display:flex;flex-direction:column;justify-content:center"><div style="font:800 18px/1.5 Tajawal">سبع قيم،<br>وفكرة وحدة:<br>حقك محفوظ.</div></div></div>''', guide=True)

    b.add("02", f'''{title("التموضع", "Positioning", "p")}
<div class="gr" style="padding:30px 34px;margin-bottom:24px">
  <p style="font:500 18px/1.9 Tajawal;margin:0">للمستهلكين في السعودية اللي يشترون منتجات عليها ضمان، <b>ضماناتي</b> هو المكان الرقمي اللي يحفظ إثبات الشراء مرتبًا ويذكّرهم قبل انتهاء الضمان. بخلاف الفاتورة الورقية أو صورة ضايعة في الجوال أو بحث في البريد، يحوّل ضماناتي كل عملية شراء إلى <b>سجل ملكية</b> واضح وقابل للمتابعة.</p>
  <p class="en" style="font:400 12.5px/1.6 Tajawal;opacity:.85;margin-top:12px;text-align:left">For consumers in Saudi Arabia who buy products under warranty, Damanati is the digital place that keeps proof of purchase organised and reminds them before a warranty ends. Unlike a paper receipt, a lost photo or an inbox search, it turns every purchase into a clear, trackable ownership record.</p>
</div>
<div class="g g4" style="gap:14px">
  <div class="soft"><span class="lbl">الإطار المرجعي</span><p class="small" style="margin:0">أدوات التنظيم الشخصي والمحافظ الرقمية، لا تطبيقات التأمين.</p></div>
  <div class="soft"><span class="lbl">نقطة الاختلاف</span><p class="small" style="margin:0">عربي أولًا، وحالة كل ضمان مفهومة بنظرة.</p></div>
  <div class="soft"><span class="lbl">سبب التصديق</span><p class="small" style="margin:0">تنبيه قبل الانتهاء + أرشيف منظم لكل منتج (من وصف التطبيق المعتمد).</p></div>
  <div class="soft"><span class="lbl">ما لسنا عليه</span><p class="small" style="margin:0">لسنا شركة تأمين، ولا نبيع ضمانات ممتدة، ولا نقدم استشارات قانونية.</p></div>
</div>''')

    personas = [
        ("نورة، 34", "مديرة البيت المنظمة", "الرياض · موظفة وأم", "تدير مشتريات بيت فيه أكثر من 15 جهاز: مطبخ، تكييف، أجهزة أطفال.",
         "الفواتير الحرارية تبهت، والصناديق انرمت، وما تتذكر متى اشترت المكيف.", "تذكير قبل الانتهاء، وأرشيف تقدر تشاركه مع زوجها."),
        ("فيصل، 26", "المشتري التقني", "جدة · مطور برمجيات", "يشتري إلكترونيات ويبدّلها بسرعة، ويبيع القديم.",
         "يدوّر الفاتورة في الإيميل والواتساب كل مرة يبي صيانة أو يبيع جهاز.", "إدخال سريع بالكاميرا، وإثبات شراء جاهز للمشاركة."),
        ("أبو خالد، 47", "صاحب نشاط صغير", "الدمام · صاحب مكتب", "عنده أجهزة مكتبية وطابعات وكاميرات مراقبة.",
         "ما يعرف أي جهاز لسه بالضمان قبل ما يدفع على الصيانة.", "قائمة واضحة بالحالة، ومستندات مرتبة حسب المورد. <i>(شريحة مستقبلية: ليست خدمة حالية)</i>"),
    ]
    ph = "".join(f'''<div class="card" style="padding:0;overflow:hidden">
<div style="background:{C["green-600"] if i == 0 else (C["green-700"] if i == 1 else C["green-800"])};color:#fff;padding:16px 18px;position:relative;overflow:hidden">
<div style="font:800 20px Tajawal">{n}</div><div style="font:500 13px Tajawal;opacity:.85">{t} · {c}</div>
<div style="position:absolute;left:-10px;bottom:-24px;opacity:.15">{mark_svg("#fff", "80px")}</div></div>
<div style="padding:14px 18px" class="small"><p><b>السياق:</b> {ctx}</p><p><b>الألم:</b> {pain}</p><p style="margin:0"><b>يحتاج:</b> {need}</p></div></div>'''
                 for i, (n, t, c, ctx, pain, need) in enumerate(personas))
    b.add("02", f'''{title("الجمهور المستهدف", "Audience profiles: hypotheses to validate with user research", "p")}
<div class="g g3">{ph}</div>
<p class="small mu" style="margin-top:14px">الشخصيات أعلاه أدوات تصميم مبنية على طبيعة المنتج، وليست نتائج بحث. يُنصح بتحقق ميداني (مقابلات واختبار استخدام) قبل بناء حملات عليها.</p>''')

    pains = [("الفاتورة تبهت", "فواتير الورق الحراري تفقد وضوحها مع الوقت والحرارة.", "receipt"),
             ("الموعد ينسى", "تاريخ انتهاء الضمان ما يتذكره أحد إلا بعد العطل.", "expiry"),
             ("المستندات مبعثرة", "بين الإيميل والواتساب وصور الجوال والدرج.", "folder"),
             ("الشروط غامضة", "وش يغطي الضمان؟ ومع مين أتواصل؟", "document"),
             ("الإثبات صعب", "إثبات تاريخ الشراء عند طلب الصيانة أو إعادة البيع.", "shield-check")]
    from build_foundation import icon_svg
    pl = "".join(f'<div class="card" style="text-align:center;padding:20px 14px"><div style="width:52px;height:52px;margin:0 auto 12px;border-radius:16px;background:{C["green-50"]};color:{C["green-600"]};display:grid;place-items:center">{icon_svg(i, 28)}</div><h3>{a}</h3><p class="small" style="margin:0">{d}</p></div>' for a, d, i in pains)
    b.add("02", f'''{title("احتياجات العميل ونقاط الألم", "Customer needs and pain points", "p")}
<div class="g g5" style="gap:14px">{pl}</div>
<div class="g g3" style="margin-top:24px">
  <div class="soft"><span class="lbl">حاجة وظيفية</span><p class="small" style="margin:0">ألقى إثبات الشراء خلال ثوانٍ، وأعرف وش باقي على الضمان.</p></div>
  <div class="soft"><span class="lbl">حاجة عاطفية</span><p class="small" style="margin:0">أحس إن أموري مرتبة، وإن حقي ما بيضيع.</p></div>
  <div class="soft"><span class="lbl">حاجة اجتماعية</span><p class="small" style="margin:0">أكون الشخص اللي «عنده الفاتورة» لما العائلة تحتاجها.</p></div>
</div>''')

    traits = [("موثوق", "لا مستعجل", 82), ("هادئ", "لا جاف", 70), ("قريب", "لا عامّي مبتذل", 64), ("مرتب", "لا متكلف", 88), ("ذكي", "لا متعالٍ", 60)]
    th = "".join(f'<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;font:700 13px Tajawal"><span>{a}</span><span class="mu" style="font-weight:400">{n}</span></div>'
                 f'<div style="height:8px;border-radius:8px;background:{C["sand"]};margin-top:6px;position:relative"><i style="position:absolute;right:0;top:0;bottom:0;width:{v}%;border-radius:8px;background:{C["green-600"]}"></i></div></div>' for a, n, v in traits)
    b.add("02", f'''{title("شخصية العلامة ونموذجها", "Personality and archetype", "p")}
<div class="g" style="grid-template-columns:1fr 1.2fr;gap:44px">
  <div><span class="lbl">لو كان ضماناتي شخصًا</span><p class="lead">هو الأخ الكبير المرتب في العائلة: يحفظ الأوراق المهمة، يذكّرك بالموعد قبل لا يفوت، ويشرح لك بهدوء وش حقك. ما يتفاخر ولا يخوّف.</p>
  <div style="margin-top:18px">{th}</div><p class="small mu">كل سمة لها حد ما نتجاوزه (يسار).</p></div>
  <div>
    <div class="gr" style="padding:24px 26px;margin-bottom:16px"><span class="lbl" style="color:#fff;opacity:.8">النموذج الأساسي</span><div style="font:800 28px Tajawal">الراعي <span class="en" style="font-weight:400;font-size:18px;opacity:.85">The Caregiver</span></div>
    <p class="small" style="margin:8px 0 0;opacity:.92">جوهر ضماناتي حماية حق المستخدم بعد الشراء. الراعي يحمي ويطمّن ويخدم بدون ما يطلب البطولة. هذا يفسّر الأخضر الهادئ، والشكل المغلق في الرمز، والنبرة المطمئنة.</p></div>
    <div class="card" style="padding:20px 24px"><span class="lbl">النموذج الداعم</span><div style="font:800 22px Tajawal">الحكيم <span class="en mu" style="font-weight:400;font-size:15px">The Sage</span></div>
    <p class="small" style="margin:6px 0 0">الوضوح والمعرفة: نشرح الشروط والتواريخ بلغة بسيطة. نستعير من الحكيم الدقة، لا التعالي.</p></div>
    <p class="small mu" style="margin-top:12px">استبعدنا «البطل» و«المتمرد»: لغة المعارك والتحدي تخلق قلقًا لا يناسب منتجًا مهمته الطمأنينة.</p>
  </div>
</div>''')

    b.add("02", f'''{title("التميّز ومبادئ التموضع البصري", "Differentiation and competitive visual principles", "p")}
<div class="g g2" style="gap:34px">
  <div>
    <span class="lbl">ما يميزنا في التواصل</span>
    <ul class="bul"><li><b>عربي أولًا:</b> التصميم يبدأ من اليمين، والإنجليزي مرافق لا أصل.</li>
    <li><b>حالة بنظرة:</b> كل ضمان له حالة لونية ونصية واضحة (ساري / قريب / منتهي).</li>
    <li><b>سجل ملكية لا صورة فاتورة:</b> نتكلم عن المنتج ورحلته، مو عن الورقة.</li>
    <li><b>تذكير هادئ:</b> نذكّر قبل الموعد بوقت كافٍ، بدون إنذارات مزعجة.</li></ul>
    <p class="small mu">هذه مبادئ تواصل؛ أي ميزة تُذكر في الإعلانات يجب أن تكون متوفرة فعلًا في المنتج.</p>
  </div>
  <div>
    <span class="lbl">خريطة الانطباع البصري</span>
    <div style="position:relative;height:300px;border:1px solid {C["sand"]};border-radius:16px;background:#fff">
      <i style="position:absolute;left:50%;top:14px;bottom:14px;width:1px;background:{C["sand"]}"></i><i style="position:absolute;top:50%;left:14px;right:14px;height:1px;background:{C["sand"]}"></i>
      <span class="small mu" style="position:absolute;top:2px;left:50%;transform:translateX(-50%)">دافئ وإنساني</span><span class="small mu" style="position:absolute;bottom:0;left:50%;transform:translateX(-50%)">بارد ومؤسسي</span>
      <span class="small mu" style="position:absolute;right:10px;top:50%;transform:translateY(-130%)">هادئ</span><span class="small mu" style="position:absolute;left:10px;top:50%;transform:translateY(-130%)">صاخب</span>
      <div style="position:absolute;left:62%;top:66%;text-align:center" class="small"><i style="display:block;width:16px;height:16px;border-radius:50%;background:#2D5BD8;margin:0 auto 4px;opacity:.7"></i>تطبيقات مالية زرقاء</div>
      <div style="position:absolute;left:18%;top:60%;text-align:center" class="small"><i style="display:block;width:16px;height:16px;border-radius:50%;background:#7A3FE0;margin:0 auto 4px;opacity:.7"></i>محافظ بنفسجية متدرجة</div>
      <div style="position:absolute;left:20%;top:20%;text-align:center" class="small"><i style="display:block;width:16px;height:16px;border-radius:50%;background:#E8452C;margin:0 auto 4px;opacity:.7"></i>تطبيقات تسوق</div>
      <div style="position:absolute;left:66%;top:17%;text-align:center;font-weight:800" class="small"><span style="display:block;margin:0 auto 4px;width:30px">{logo("symbol_primary", height="30px")}</span>ضماناتي</div>
    </div>
    <p class="cap">خريطة نوعية توضيحية لاتجاهات بصرية شائعة، لا تمثل علامات بعينها ولا بيانات سوق.</p>
  </div>
</div>''')

    b.add("02", f'''{title("قصة العلامة", "Brand story", "p")}
<div class="g" style="grid-template-columns:1.3fr 1fr;gap:44px;align-items:center">
  <div>
    <p style="font:500 18px/2 Tajawal">كل بيت فيه درج. وفي الدرج فواتير باهتة، وكتيبات بلغات ما نقراها، وكرتون جهاز احتفظنا فيه «احتياط». ويوم يتعطل الجهاز، نكتشف إن الفاتورة ضاعت، أو إن الضمان انتهى قبل أسبوع.</p>
    <p style="font:500 18px/2 Tajawal">ضماناتي جاء عشان يقفل هذا الدرج للأبد. صورة وحدة للفاتورة، والباقي علينا: نحفظها، نرتبها، ونذكّرك قبل لا يفوت الموعد. لأن حقك ما ينتهي عند الكاشير.</p>
    <p class="enp" style="margin-top:10px">Every home has a drawer of faded receipts and manuals. The day something breaks, the receipt is gone or the warranty ended last week. Damanati closes that drawer for good: one photo of the receipt, and we keep it, organise it and remind you in time. Because your rights don't end at the checkout.</p>
  </div>
  <div style="position:relative;height:380px">
    <div style="position:absolute;top:10px;right:20px;transform:rotate(-6deg)">{passport("مكيف سبليت 24000", [("تاريخ الشراء", "15/08/2025"), ("ينتهي", "15/08/2027")], width=280, badge=chip("ok"), stamp=False)}</div>
    <div style="position:absolute;top:150px;right:70px;transform:rotate(4deg)">{passport("غسالة أمامية 9 كجم", [("المتبقي", "29 يومًا")], width=290, badge=chip("warn"))}</div>
  </div>
</div>''')

    msg = [("الشعار اللفظي الرئيسي", "كل ضماناتك في مكان واحد", "All your warranties in one place", "مأخوذ من نموذج اللوحة الإعلانية (ص17) مع تصحيح المصطلح الإنجليزي."),
           ("الوعد", "نحفظ ضمانك، ونذكّرك بحقك.", "We keep your warranty, and remind you of your rights.", "للهوية المؤسسية والملف التعريفي."),
           ("رسالة الحفظ", "صوّر الفاتورة، وخلّ الباقي علينا.", "Snap the receipt. We'll handle the rest.", "للإعلانات وصفحات المتاجر."),
           ("رسالة التذكير", "تذكير قبل ما يفوتك الضمان.", "A reminder before your warranty runs out.", "لإشعارات التسويق ومزايا التطبيق."),
           ("رسالة الثقة", "مستنداتك لك، وأنت تقرر مع من تشاركها.", "Your documents are yours. You decide who sees them.", "لصفحات الخصوصية والتسجيل.")]
    mh = "".join(f'<tr><td style="font-weight:800;width:16%">{a}</td><td style="font:800 15px Tajawal;width:30%">{ar}</td><td class="en" style="width:28%;text-align:left">{en}</td><td class="mu">{u}</td></tr>' for a, ar, en, u in msg)
    b.add("02", f'''{title("استراتيجية الرسائل", "Arabic and English messaging", "p")}
<table class="tb"><tr><th>المستوى</th><th>العربية</th><th style="text-align:left">English</th><th>الاستخدام</th></tr>{mh}</table>
<div class="g g2" style="margin-top:22px">
  <div class="soft"><span class="lbl">قاعدة اللغتين</span><p class="small" style="margin:0">العربية تُكتب أولًا ثم تُكيّف الإنجليزية، لا العكس. لا ترجمة حرفية للعبارات العامية؛ نختار المعنى.</p></div>
  <div class="soft"><span class="lbl">المصطلحات الثابتة</span><p class="small" style="margin:0">ضمان = <span class="en">warranty</span> · فاتورة = <span class="en">receipt / invoice</span> · ساري = <span class="en">Active</span> · ينتهي قريبًا = <span class="en">Expiring soon</span> · منتهي = <span class="en">Expired</span>.</p></div>
</div>''', guide=True)

    b.add("02", f'''{title("نبرة الصوت", "Tone of voice", "p")}
<div class="g g4" style="gap:14px;margin-bottom:22px">
  <div class="gr"><h3>واضح</h3><p class="small" style="margin:0;opacity:.9">جملة وحدة، فكرة وحدة. الأرقام والتواريخ قبل الصفات.</p></div>
  <div class="gr" style="background:{C["green-700"]}"><h3>مطمئن</h3><p class="small" style="margin:0;opacity:.9">نخبر بالحقيقة بهدوء، حتى لو الضمان انتهى.</p></div>
  <div class="gr" style="background:{C["green-800"]}"><h3>قريب</h3><p class="small" style="margin:0;opacity:.9">لهجة سعودية بيضاء في التسويق؛ فصحى مبسطة في المنتج والقانوني.</p></div>
  <div class="gr" style="background:{C["ink"]}"><h3>مختصر</h3><p class="small" style="margin:0;opacity:.9">الإشعار يُفهم من السطر الأول.</p></div>
</div>
<table class="tb"><tr><th>الموقف</th><th>✓ نقول</th><th>✕ ما نقول</th></tr>
<tr><td style="font-weight:800">تذكير بالانتهاء</td><td>ضمان «الغسالة» ينتهي بعد 7 أيام. تبي تراجع شروط الصيانة؟</td><td class="mu">تحذير!! ضمانك على وشك الضياع، تصرّف الآن!</td></tr>
<tr><td style="font-weight:800">ضمان منتهي</td><td>انتهى ضمان «السماعات». فاتورتك محفوظة في الأرشيف متى احتجتها.</td><td class="mu">للأسف فاتك الضمان.</td></tr>
<tr><td style="font-weight:800">خطأ في الرفع</td><td>ما قدرنا نقرأ الصورة. جرّب تصورها في مكان أوضح.</td><td class="mu">حدث خطأ غير معروف (Error 500).</td></tr>
<tr><td style="font-weight:800">إعلان</td><td>صوّر الفاتورة، وخلّ الباقي علينا.</td><td class="mu">الحل الثوري الأذكى لإدارة ضماناتك بالذكاء الاصطناعي.</td></tr></table>''', guide=True)

    b.add("02", f'''{title("مبادئ التواصل وفرص التطوير", "Communication principles and development opportunities", "p")}
<div class="g g2" style="gap:34px">
  <div><span class="lbl">مبادئ التواصل</span>
  <ol style="padding-right:18px" class="small"><li style="margin-bottom:8px"><b>الفائدة أولًا:</b> نبدأ بما يكسبه المستخدم، ثم كيف.</li>
  <li style="margin-bottom:8px"><b>أرقام حقيقية:</b> «7 أيام» أوضح من «قريبًا جدًا».</li>
  <li style="margin-bottom:8px"><b>بدون تخويف:</b> الخسارة تُذكر كمعلومة، لا كتهديد.</li>
  <li style="margin-bottom:8px"><b>لا ادعاءات غير مثبتة:</b> ما نقول «الأول» أو «الوحيد» أو نذكر شراكات قبل ما تكون موثقة.</li>
  <li style="margin-bottom:8px"><b>ثنائية متوازنة:</b> العربية تقود، والإنجليزية ترافق بنفس المعنى.</li>
  <li><b>المستخدم بطل القصة:</b> ضماناتي أداة تحفظ حقه، مو محور الحكاية.</li></ol></div>
  <div><span class="lbl">على المدى القريب (0–6 أشهر)</span>
  <ul class="bul small"><li>اعتماد الأخضر الموحد وتحديث كل الملفات القديمة.</li><li>تطبيق مكتبة الأيقونات والثيم الداكن في التطبيق.</li><li>اختبار طباعة لقيم CMYK وتحديد مطابقة Pantone.</li><li>تصحيح المصطلح الإنجليزي في كل المواد.</li></ul>
  <span class="lbl" style="margin-top:14px">على المدى البعيد (6–24 شهرًا)</span>
  <ul class="bul small"><li>نظام فرعي للشركاء (متاجر/وكلاء) إذا قُرر تقديم هذه الخدمة.</li><li>صيغة ثلاثية الأبعاد معتمدة للرمز للحملات الكبرى.</li><li>هوية صوتية قصيرة (نغمة إشعار) مشتقة من حركة «الختم».</li><li>توسع إقليمي: اختبار النبرة لكل سوق.</li></ul></div>
</div>''')
