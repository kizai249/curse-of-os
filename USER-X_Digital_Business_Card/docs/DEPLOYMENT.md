# النشر

البطاقة **موقع ثابت**: ملفات HTML وCSS وJS بس. ما تحتاج سيرفر، ولا قاعدة بيانات، ولا خطوة بناء في الاستضافة. انشر **المجلد كامل**. مجلدات `node_modules` و`tests` و`tools` ما تضر، بس ما لها لزوم على الاستضافة.

## الخيارات (كلها فيها HTTPS مجاني)
| المنصة | الطريقة |
|---|---|
| **Netlify** | اسحب المجلد على app.netlify.com/drop، أو اربط المستودع وخلّ Publish directory على `USER-X_Digital_Business_Card` |
| **Cloudflare Pages** | Create project ← Direct upload ← ارفع المجلد. أو اربط المستودع: Build command فاضي، وOutput directory `USER-X_Digital_Business_Card` |
| **Vercel** | `npx vercel` من داخل المجلد. Framework: Other |
| **GitHub Pages** | انقل المجلد لفرع أو مستودع منشور، ثم Settings ← Pages |

**دومين خاص:** مثلاً `card.user-x.sa`. أضف سجل CNAME من لوحة الدومين حسب تعليمات المنصة.

**الرابط اللي ينحط في QR:** خلّه قصير وثابت، مثل `https://card.user-x.sa/khalid/`. وتقدر تضيف `?src=qr` عشان تعرف الزيارات اللي جت من البطاقة المطبوعة.

## بعد النشر (إلزامي قبل الطباعة)
1. في `config/card.config.js` حط `cardUrl: 'https://…'`.
2. شغّل `npm run build` عشان ملف جهة الاتصال يحمل رابط البطاقة.
3. شغّل `npm run qr` (أو `npm run qr -- "<الرابط>?src=qr"`) وخذ الملفات من مجلد `qr/`.
4. انشر مرة ثانية.
5. افتح الرابط من آيفون (سفاري) وأندرويد (كروم)، وتأكد من:
   - «احفظ جهة الاتصال»: لازم تنفتح بطاقة الاتصال في الجوال.
   - الواتساب.
   - المشاركة.
   - مسح رمز QR.

## الإعدادات المهمة في الاستضافة
- **نوع ملف ‎.vcf:** أغلب المنصات ترسله `text/vcard` تلقائياً. إذا ما فتحت جهة الاتصال في آيفون، أضف قاعدة header لـ`/contact/*.vcf`: ‏`Content-Type: text/vcard; charset=utf-8`.
- **سياسة الأمان (CSP):** موجودة داخل `index.html`. ما فيه سكربتات من برا، ولا خطوط من برا، ولا أي طلب خارجي، إلا رابط التحليلات إذا فعّلته.
- **الكاش:** الخطوط والصور ما تتغير، فتقدر تعطيها كاش طويل. وخلّ `index.html` و`config/` بكاش قصير عشان تعديلاتك توصل بسرعة.

## التحليلات (اختيارية ومجهولة)
- **الوضع الافتراضي:** `analytics.endpoint` فاضي، فما يطلع أي شي من جوال الزائر. الأحداث تنحفظ في الصفحة بس (`window.__card.events`)، عشان الاختبار.
- **التشغيل:** حط رابط HTTPS يستقبل `POST` بصيغة JSON، مثلاً Cloudflare Worker أو Google Apps Script أو أي خدمة تجمع الأعداد. كل حدث شكله كذا:
  ```json
  { "event": "save_contact_clicked", "props": {}, "lang": "ar", "ts": 1767000000000 }
  ```
- **الأحداث:**
  - `landing` (مع `src: qr` أو `src: direct`)
  - `card_opened`
  - `card_flipped`
  - `game_started` و`game_completed` (مع النتيجة والمستوى) و`game_quit`
  - `contact_opened`
  - `save_contact_clicked`
  - `whatsapp_clicked` و`call_clicked` و`email_clicked` و`linkedin_clicked`
  - `share_clicked`
  - `qr_opened`
  - `language_changed`
  - `sound_toggled`
  - `secret_found`
- **الخصوصية:**
  - ما فيه كوكيز.
  - ما فيه معرّف للزائر، ولا بصمة جهاز، ولا IP يجمعه الكود.
  - ما فيه أي بيانات شخصية. والاختبار يتأكد إن الأحداث ما فيها أرقام ولا أسماء.
  - إذا الخدمة اللي تستقبل الأحداث تسجّل IP، فهذا من إعداداتها. اختر خدمة ما تسجّله، أو اقفل التسجيل فيها، عشان تلتزم بنظام حماية البيانات الشخصية في السعودية (PDPL).

## الأصوات المسجّلة (اختياري)
المؤثرات الحالية تتولّد في المتصفح وأصلية. إذا عندك أصوات مرخّصة:
1. حطها في `assets/audio/`.
2. اربطها في `src/js/audio.js` بهالشكل:
   ```js
   CardAudio.files = { boot: 'assets/audio/boot.mp3', hit: 'assets/audio/hit.mp3' }
   ```
   الأسماء المتاحة: `boot` و`ui` و`flip` و`count` و`go` و`hit` و`bonus` و`miss` و`bad` و`end` و`win` و`secret`.
3. أي ملف ناقص أو خربان يتعوّض تلقائياً بالصوت المولّد.
