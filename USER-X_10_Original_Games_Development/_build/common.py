"""Shared constants for the USER-X 10-games production package.

Single source of truth: every document, spreadsheet, deck and 3D file is
generated from common.py + games_a.py + games_b.py.

PRICE POLICY
- Prices are in SAR, VAT-inclusive estimates for Jeddah unless a row cites a
  verified reference (see VERIFIED_REFS). Verified = a public listing seen on
  2026-11-26; listings change, so re-check before purchase.
"""

ACCESS_DATE = "2026-11-26"

BRAND = {
    "name": "USER-X",
    "status": "هوية مؤقتة مقترحة — لم نجد ملفات شعار أو ألوان USER-X في المشروع؛ تُستبدل بالهوية الرسمية فور توفرها",
    "ink": "#0B0B0F",
    "panel": "#16161C",
    "panel2": "#22222B",
    "bone": "#F3EFE6",
    "signal": "#FF4D00",
    "sand": "#C9A66B",
    "muted": "#8A8A96",
    "font_head": "Cairo",
    "font_body": "Tajawal",
}

# BOM categories (Arabic label)
CATS = {
    "fab": "تصنيع وهياكل",
    "mat": "مواد خام",
    "props": "أدوات ومكونات اللعب",
    "print": "طباعة",
    "elec": "إلكترونيات",
    "light": "إضاءة",
    "audio": "صوت",
    "store": "تخزين ونقل",
    "tools": "عدد وأدوات صيانة",
    "safety": "سلامة",
    "install": "تركيب واختبار",
    "spare": "قطع غيار",
}

CONTINGENCY = 0.10  # 10% contingency on every recommended build
BUDGET_MAX = 7000
BUDGET_MIN = 3000

# BOM row: (cat, ar, en, qty, unit_price, mvp_unit_price, material, dims,
#           function, method, supplier, life_months, alternative, ref)
# mvp_unit_price = price used in the minimum-viable prototype (0 = not in MVP)


def common_rows(timer=True, boxes=3, box_ref="samla65", rules=2, install=300,
                tools=100):
    """Rows that almost every game needs (kept per-game so each game ships as a
    self-contained kit)."""
    rows = []
    if timer:
        rows.append(("elec", "مؤقت عد تنازلي LED كبير (أرقام 10 سم) بريموت", "Large LED countdown timer with remote", 1, 350, 0,
                     "هيكل ألمنيوم + LED", "≈ 60×20×5 سم", "توقيت الأدوار والجولات بشكل مرئي للجميع",
                     "شراء جاهز", "أمازون السعودية / نون / محلات إلكترونيات", 36,
                     "بديل MVP: تطبيق مؤقت على تابلت/شاشة مشتركة", ""))
    if boxes:
        price = 74.95 if box_ref == "samla65" else 34.95
        name = "صندوق تخزين شفاف بغطاء 65 لتر" if box_ref == "samla65" else "صندوق تخزين شفاف بغطاء 22 لتر"
        dims = "57×39×42 سم" if box_ref == "samla65" else "39×28×28 سم"
        rows.append(("store", name, "Clear storage box with lid", boxes, price, price,
                     "بلاستيك PP", dims, "حقيبة الطقم المرمّزة بالألوان والأرقام",
                     "شراء جاهز", "IKEA جدة (SAMLA)", 48, "صناديق ساكو / هوم سنتر", box_ref))
    if rules:
        rows.append(("print", "لوحة قواعد مطبوعة A1 على فوم بورد 5 مم", "A1 rules board, 5mm foam board", rules, 80, 25,
                     "فوم بورد + طباعة UV", "59×84 سم", "شرح مرئي للقواعد قبل اللعب وأثناءه",
                     "طباعة رقمية", "مطبعة / دعاية وإعلان بجدة", 12, "MVP: طباعة A3 ورقية مغلفة", ""))
    if install:
        rows.append(("install", "تركيب أولي + جولتا اختبار تشغيلي (عمالة ومواد استهلاكية)", "Installation and 2 test runs", 1, install, 150,
                     "—", "—", "تجميع، معايرة، اختبار إعادة الضبط", "داخلي", "فريق USER-X", 0, "—", ""))
    if tools:
        rows.append(("tools", "عدة إعادة ضبط وصيانة (مفكات، شريط لاصق، قاطع، قماش تنظيف، معقم)", "Reset & maintenance kit", 1, tools, 60,
                     "متنوع", "حقيبة صغيرة", "إصلاح سريع وتنظيف بين الجولات", "شراء جاهز", "ساكو / محلات عدد", 24, "—", ""))
    return rows


VERIFIED_REFS = {
    "samla65": ("IKEA السعودية — SAMLA صندوق بغطاء 57×39×42 سم/65 لتر", "74.95",
                "https://www.ikea.com/sa/en/p/samla-box-with-lid-transparent-s99440774"),
    "samla22": ("IKEA السعودية — SAMLA صندوق بغطاء 39×28×28 سم/22 لتر", "34.95",
                "https://www.ikea.com/sa/en/p/samla-box-with-lid-transparent-s39440814"),
    "foldtable": ("Desertcart السعودية — طاولة قابلة للطي (إحدى القوائم)", "185",
                  "https://www.desertcart.com.sa/products/482504151-folding-table.md"),
    "linnmon": ("IKEA السعودية — LINNMON/ADILS طاولة 100×45 (سعر عرض سابق 203، الأصلي 239)", "239",
                "https://www.ikea.com/sa/en/p/linnmon-adils-table-white-s49590153/"),
    "button60": ("Fruugo السعودية — زر أركيد LED 60 مم 12V", "74",
                 "https://www.fruugosaudiarabia.com/60mm-led-arcade-push-button-white-12v-large-round-game-button-with-50mm-plunger/p-460140038"),
}

MARKET_REFS = [
    ("أسعار غرف الهروب في جدة — Mazebox من 91 إلى 157 ريال للشخص", "https://tickets.jarir.com/sa-en/experiences/jeddah/adventures-and-activities/explore-the-exciting-mazebox-escape-rooms"),
    ("قائمة غرف هروب في السعودية (أسعار 115–175 ريال، قديمة وغير مؤرخة)", "https://lovin.co/jeddah/en/feature/escape-rooms-in-saudi-a-new-form-of-exciting-entertainment-for-your-boring-weekends-1-1/"),
    ("إيجارات مستودعات جدة — قوائم عقار (150 ريال/م²/سنة، أم حبلين)", "https://sa.aqar.fm/en/warehouse-for-rent/jeddah/north-of-jeddah/um-hableen"),
    ("إيجارات مستودعات جدة — الوادي (160–170 ريال/م²/سنة)", "https://sa.aqar.fm/en/warehouse-for-rent/jeddah/5"),
]

# Shared operational infrastructure (category B) — bought once, used by all games
SHARED_INFRA = [
    ("نظام صوت محمول (سماعتان 12 بوصة + ميكسر + مايك لاسلكي)", "Portable PA system", 1, 2800, "تعليق المشغل والموسيقى والمؤثرات"),
    ("شاشة 55 بوصة على حامل متحرك", "55in display on stand", 2, 1900, "عرض المؤقت، النقاط، الهوية"),
    ("تابلت تسجيل ودخول", "Check-in tablet", 2, 1200, "التسجيل، الإقرار، الدفع"),
    ("إضاءة LED PAR بطارية (8 قطع) + وحدة تحكم", "Battery LED PAR x8 + controller", 1, 3200, "أجواء ولحظات الإقصاء"),
    ("أعمدة تنظيم حشود بحزام (8)", "Queue stanchions x8", 8, 180, "حدود اللعب ومنطقة الجمهور"),
    ("خلفية تصوير بهوية USER-X (3×2.4 م)", "Branded photo wall", 1, 2500, "صور الفائزين ومحتوى السوشال"),
    ("طقم تصوير محتوى (جيمبال جوال + مايكين لاسلكي + إضاءة صغيرة)", "Content capture kit", 1, 2500, "إنتاج المحتوى اليومي"),
    ("مقاعد جمهور/مقصيين (مقاعد قابلة للتكديس)", "Stackable spectator stools", 20, 60, "مدرج المقصيين بكرامة"),
    ("حقيبة إسعافات أولية + طفايتا حريق 2 كجم", "First aid + 2 extinguishers", 1, 650, "السلامة الأساسية (إضافة لتجهيزات المكان)"),
    ("زي الطاقم (تيشيرت + جاكيت)", "Staff uniforms", 10, 120, "هوية الطاقم"),
    ("عربة نقل + صناديق نقل بعجلات", "Trolley + rolling cases", 1, 1500, "نقل الأطقم والتخزين"),
    ("طقم عدد عامة (دريل، شنطة عدد، شريط قياس ليزر)", "General tool kit", 1, 900, "صيانة وتركيب"),
    ("لافتات إرشادية ولوحات دخول/خروج", "Wayfinding signage", 1, 1500, "توجيه اللاعبين والإخلاء"),
    ("راوتر 4G/5G + نقطة بيع (POS)", "Router + POS terminal", 1, 1200, "الدفع والإنترنت"),
]

# Pre-opening one-time (category F/D) — estimates to be confirmed
PREOPENING = [
    ("ترخيص نشاط ترفيهي/تصاريح فعالية واستشارة نظامية (تقدير — يجب التحقق من الهيئة العامة للترفيه والبلدية)", 8000),
    ("تأمين مسؤولية تجاه الغير — دفعة أولى (تقدير)", 3000),
    ("نماذج أولية واختبارات لعب (3 ألعاب)", 6000),
    ("تدريب المشغلين (3 أيام × 6 أشخاص)", 3000),
    ("تجهيز موقع مؤقت/بوب أب (أرضيات، تقسيم، كهرباء مؤقتة)", 10000),
    ("تصوير محتوى ما قبل الإطلاق", 4000),
    ("هوية بصرية رسمية وملفات طباعة", 3500),
]
