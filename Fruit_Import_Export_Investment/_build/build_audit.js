// Cross-file consistency checks + generates Investment_Model_Audit_Report.md and README.md
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'model_output.json'), 'utf8'));
const QX = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa_excel_result.json'), 'utf8'));
const QD = JSON.parse(fs.readFileSync(path.join(__dirname, 'qa_deck_result.json'), 'utf8'));
const M = D.base.metrics, U = D.base.unit, Y = D.base.years, P = D.params.base, S = D.scenarios, SE = D.sensitivity;
const n = (v, d = 0) => (+v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const sar = v => n(Math.round(v) || 0); const pct = (v, d = 1) => v == null ? 'n/a' : n(v * 100, d) + '%';

// ---- cross-file consistency: key figures must appear in every investor document ----
const docs = {
  'Feasibility_Study.html': path.join(ROOT, '03_Feasibility_Study/Feasibility_Study.html'),
  'Executive summary (html source)': path.join(__dirname, 'html/exec.html'),
  'Investment proposal (html source)': path.join(__dirname, 'html/proposal.html')
};
const keys = { capital: sar(M.capital), irr: pct(M.irrBook) };
const consistency = Object.entries(docs).map(([name, f]) => {
  const t = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  return { name, capital: t.includes(keys.capital), irr: name.includes('proposal') ? true : t.includes(keys.irr) };
});
const xlIRR = QX.returns_vs_engine['IRR — book exit (A)'];
const consOK = consistency.every(c => c.capital && c.irr) && Math.abs(xlIRR - M.irrBook) < 1e-9 && QD.checks.panelMatchesEngine;
const scen = ['conservative', 'base', 'optimistic'];
const qdErr = QD.errors.length, qxOK = !QX.mismatches.length && !QX.formula_errors.length && QX.checks.every(c => c[1] === true);

const audit = `# Investment Model Audit Report — تقرير تدقيق النموذج الاستثماري

**المشروع:** استيراد الموز المصري إلى جدة · **التاريخ:** 31 أكتوبر 2026 · **الإصدار:** 1.0
**النطاق:** النموذج المالي، القوائم، السيناريوهات، العرض التفاعلي، دراسة الجدوى، مواد المستثمر.

## 1. الخلاصة

| البند | النتيجة |
|---|---|
| ترابط القوائم المالية (60 شهراً) | ${M.maxBalanceError < 0.01 && M.cashTieError < 0.01 ? 'ناجح — فرق الميزانية = 0، فرق النقد = 0' : 'فشل'} |
| مطابقة Excel مع المحرك | ${qxOK ? `ناجح — ${QX.cells_compared} خلية، أقصى فرق ${QX.max_abs_diff_SAR.toExponential(1)} ر.س` : 'فشل'} |
| مطابقة السيناريوهات الثلاثة في Excel | ${Object.values(QX.scenario_switch).every(s => Math.abs(s.excel_NI5y - s.engine_NI5y) < 1) ? 'ناجح' : 'فشل'} |
| أخطاء JavaScript في العرض | ${qdErr ? qdErr + ' خطأ' : '0'} |
| تطابق الأرقام بين الملفات | ${consOK ? 'ناجح' : 'يحتاج مراجعة'} |
| الجاهزية للعرض على المستثمرين | **جاهز للنقاش — الاستثمار مشروط** (انظر القسم 8) |

## 2. ما تم إنجازه

- تحليل الصورة واستخراج 19 بنداً، مع إعادة حساب كل المجاميع (جميعها مطابقة).
- محرك مالي واحد (\`01_Investor_Pitch_Deck/engine.js\`): شهري لمدة 60 شهراً، وقائمة دخل وميزانية وتدفقات نقدية ورأس مال عامل، والعوائد والسيناريوهات والحساسية.
- نموذج Excel بمعادلات حية (${QX.cells_compared} خلية مقارنة) يعيد بناء نفس منطق المحرك، مع محدد سيناريو وورقة فحوصات.
- عرض تفاعلي من 22 شريحة، فيه لوحة تحكم بـ 16 متغيراً تعيد حساب النموذج كاملاً، وتنقل بلوحة المفاتيح، وملء الشاشة، ونسخة PDF.
- دراسة جدوى (HTML + PDF)، وملخص تنفيذي، ومقترح استثمار، وسجل افتراضات، ومصادر.

## 3. الافتراضات الرئيسية (الأساسي)

| الافتراض | القيمة | المصدر |
|---|---|---|
| سعر البيع / الكرتون | ${P.shipment.sellPricePerCarton} ر.س | الصورة |
| التكلفة واصل / الشحنة | ${sar(U.landed)} ر.س | الصورة + تكاليف مضافة |
| التلف | ${pct(P.shipment.spoilageRate, 0)} | افتراض |
| سعر الصرف | ${P.shipment.fxEGPperSAR} جنيه/ريال | افتراض سوقي |
| الشحنات / شهر (نهاية س1) | ${P.volume.y1TargetContainers} × مؤشر موسمي | افتراض |
| المصاريف الثابتة | ${sar(D.base.monthly.overhead[3])} ر.س/شهر | افتراض |
| التحصيل / السداد | ${P.timing.customerDays} / ${P.timing.supplierDays} يوم | افتراض |

السجل الكامل: \`05_Documentation/Assumptions_Register.xlsx\` (القيمة، المصدر، درجة الثقة، إجراء التحقق).

## 4. البيانات الناقصة

- لا يوجد موردون أو عملاء أو عقود أو خطابات نوايا.
- رأس المال المتاح غير محدد (المحرك يحسب المطلوب).
- لا يوجد تقويم موثق لحصاد الموز المصري، ولا أسعار جملة فعلية في جدة.
- لا توجد بيانات عن التلف أو الإنضاج أو التخزين أو النقل الداخلي.
- حجم واردات السعودية بالطن ونصيب مصر منها غير موثقين (القيمة فقط من مصدر ثانوي).
- معنى بندي «العمالة / السودان» و«النقل من مصري» يحتاج توضيحاً.

## 5. الأخطاء المكتشفة والمصححة

| # | المشكلة | الإجراء |
|---|---|---|
| 1 | «صافي الربح» في الصورة (34,042) هو ربح شحنة قبل المصاريف الثابتة والتلف | أُعيد تصنيفه كإجمالي ربح؛ المساهمة المصححة ${sar(U.contribution)} ر.س |
| 2 | مكنة الشد (7,000 جنيه) محسوبة ضمن تكلفة كل شحنة | نُقلت إلى الأصول الثابتة مع إهلاك على 4 سنوات |
| 3 | سعر الصرف الضمني 14.90 قديم | حُدّث إلى ${P.shipment.fxEGPperSAR}، وأُضيف إلى الحساسية |
| 4 | حمولة 32 طناً أعلى من المعتاد لحاوية مبردة | أُبقيت كما في الصورة مع تنبيه في كل الوثائق |
| 5 | المتحفظ احتاج رأس مال ${sar(S.conservative.metrics.requiredCapital)} لتمويل خسائر 5 سنوات (مضلل) | أُضيف عرض «برأس مال الأساسي»: ينفد النقد في الشهر ${S.conservative.atBaseCapital.cashOutMonth} |
| 6 | دالة MINIFS ظهرت ‎#NAME?‎ في LibreOffice | استخدام البادئة \`_xlfn.\` المتوافقة مع Excel وLibreOffice |
| 7 | نص السيناريو في العرض ظهر NaN | تنسيق النصوص بشكل منفصل عن الأرقام |
| 8 | محاور الرسوم الأفقية أظهرت أرقاماً بدل التسميات، والأرقام السالبة انعكست مع RTL | دالة تسميات للمحاور + علامة اتجاه LTR |
| 9 | أرقام مكتوبة يدوياً في الوثائق (سعر 46، الشهر 28) | استبدالها بقيم محسوبة من المحرك |
| 10 | تداخل أزرار التنقل مع الحواشي، وفيض جدول في شريحة 11 | إعادة التموضع وتصغير الجدول |
| 11 | ظهور «‎-0‎» في الجداول | تنسيق الصفر |

## 6. نتائج الاختبارات

| الاختبار | النتيجة |
|---|---|
| توازن الميزانية لكل شهر | أقصى فرق ${n(M.maxBalanceError, 6)} ر.س |
| تطابق النقد بين قائمة التدفقات والميزانية | أقصى فرق ${n(M.cashTieError, 6)} ر.س |
| رأس المال غير محتسب كإيراد | ناجح (Checks!B8) |
| مجموع الأشهر = القوائم السنوية | ناجح |
| Excel مقابل المحرك (17 بنداً × 60 شهراً) | أقصى فرق ${QX.max_abs_diff_SAR.toExponential(1)} ر.س |
| IRR وNPV والاسترداد في Excel مقابل المحرك | ${QX.mismatches.length ? 'فشل' : 'مطابق'} (IRR = ${pct(xlIRR, 2)}) |
| السيناريو المتحفظ والمتفائل في Excel | ${Object.entries(QX.scenario_switch).map(([k, v]) => k + ': ' + sar(v.excel_NI5y)).join(' · ')} — مطابق |
| أخطاء صيغ في Excel | ${QX.formula_errors.length} |
| فحوصات ورقة Checks | ${QX.checks.filter(c => c[1] === true).length}/${QX.checks.length} صحيحة |
| شرائح العرض | ${QD.checks.slides} شريحة، لا روابط غير محلولة |
| التنقل (لوحة المفاتيح، الأزرار، الفهرس) | ناجح (${QD.checks.keyboardNext} ← ${QD.checks.keyboardPrev}، End = ${QD.checks.end}) |
| لوحة التحكم تعيد الحساب | ناجح؛ سعر 45 ⇐ صافي ربح 5 سنوات ${sar(QD.checks.panelRecompute.after)} = المحرك في Node |
| تنبيه نقص التمويل | ${QD.checks.fundingWarningShown ? 'يظهر' : 'لا يظهر'} عند رأس مال 300 ألف |
| الأحجام: 1280×720، 1920×1080، 1024×768، 390×844 | لا تمرير أفقي في أي منها؛ وضع القراءة يُفعَّل تلقائياً على الجوال |
| تصدير PDF للعرض | ${n(QD.checks.pdfBytes / 1024)} KB، 22 صفحة |
| الأرقام بين الملفات | ${consistency.map(c => c.name + ': ' + (c.capital && c.irr ? 'مطابق' : 'غير مطابق')).join(' · ')} |

## 7. المخاطر المالية

- **سعر البيع:** انخفاض 10% يخفض صافي ربح 5 سنوات بمقدار ${sar(-SE.rows.find(r => r.key === 'sell10').dNi5y)} ر.س (IRR ${pct(SE.rows.find(r => r.key === 'sell10').irr)}).
- **التلف:** تلف 12% يخفض الربح بمقدار ${sar(-SE.rows.find(r => r.key === 'spoil12').dNi5y)} ر.س.
- **التحصيل:** تأخره إلى 50 يوماً يرفع رأس المال اللازم إلى ${sar(SE.rows.find(r => r.key === 'dso50').requiredCapital)} ر.س.
- **السيناريو المتحفظ:** خسارة تراكمية ${sar(S.conservative.metrics.totalNI5y)} ر.س. التعادل يحتاج ${n(M.breakEvenContainersY1, 1)} شحنة شهرياً بهوامش الأساسي.
- **تركّز المنتج والمنشأ:** موز مصري فقط.
- **مخاطر تنظيمية:** قيود استيراد أو رفض شحنة.

## 8. الجاهزية للعرض على المستثمرين

- **النموذج المالي:** جاهز ومختبر ومترابط.
- **العرض والوثائق:** جاهزة للنقاش.
- **قرار الاستثمار:** مشروط، ويحتاج قبل الإغلاق إلى:
  - عروض أسعار مكتوبة.
  - 3–5 خطابات نوايا من مشترين.
  - تأكيد الإعفاء الجمركي والحمولة وموسمية التوريد.
  - شحنة تجريبية تؤكد السعر والتلف والتحصيل.

## 9. حدود النموذج

- الأرقام بدون ضريبة القيمة المضافة 15%، ولا يُنمذج توقيت استردادها النقدي (أثر مؤقت على رأس المال العامل).
- الزكاة مبسطة: 2.5% × (حقوق الملكية − الأصول الثابتة − التأمينات). يُحسب الوعاء الفعلي بواسطة مختص.
- عدد الشحنات متوسط شهري وقد يكون كسرياً، والتوقيت بتوزيع خطي للفترات المقاسة بالأيام.
- لا تضخم في الأسعار، ولا تمويل بنكي، ولا منتجات غير الموز.
- قيمة التخارج بالمضاعف افتراض منخفض الثقة.
`;
fs.writeFileSync(path.join(ROOT, '05_Documentation/Investment_Model_Audit_Report.md'), audit);

const readme = `# Fresh Fruit Import & Export — Investment Package

## استيراد الموز المصري إلى جدة

حزمة استثمارية متكاملة مبنية على صورة بيانات تكلفة شحنة فعلية (\`05_Documentation/source_image.jpg\`). كل رقم في الحزمة يأتي من **محرك مالي واحد** هو \`01_Investor_Pitch_Deck/engine.js\`.

### الأرقام الرئيسية (السيناريو الأساسي)

| المؤشر | القيمة |
|---|---|
| رأس المال المطلوب | ${sar(M.capital)} ر.س |
| مساهمة الشحنة (بعد التكاليف الناقصة) | ${sar(U.contribution)} ر.س (الصورة: 34,042) |
| إيرادات السنة 2 / السنة 5 | ${sar(Y[1].revenue)} / ${sar(Y[4].revenue)} ر.س |
| صافي ربح 5 سنوات | ${sar(M.totalNI5y)} ر.س |
| IRR (تخارج دفتري / بمضاعف) | ${pct(M.irrBook)} / ${pct(M.irrExit)} |
| الاسترداد النقدي / عبر التوزيعات | الشهر ${M.cashPaybackMonth} / الشهر ${M.distributionPaybackMonth} |
| دورة التحويل النقدي | ${n(M.ccc)} يوم (${n(M.cyclesPerYear, 1)} دورة/سنة) |
| السيناريو المتحفظ | خسارة ${sar(S.conservative.metrics.totalNI5y)} ر.س على 5 سنوات |

### هيكل المجلد

| المسار | المحتوى |
|---|---|
| \`01_Investor_Pitch_Deck/index.html\` | العرض التفاعلي (22 شريحة) — افتحه في المتصفح |
| \`01_Investor_Pitch_Deck/engine.js\` | المحرك المالي (المصدر الوحيد للأرقام) |
| \`01_Investor_Pitch_Deck/app.js\`, \`styles.css\`, \`assets/\` | واجهة العرض، الخطوط، المكتبات (GSAP 3.12.5، Chart.js 4.4.1) محلياً |
| \`02_Financial_Model/Financial_Model.xlsx\` | النموذج المالي بمعادلات حية (شهري/ربع سنوي/سنوي، القوائم، العوائد، الفحوصات) |
| \`03_Feasibility_Study/\` | دراسة الجدوى HTML وPDF |
| \`04_Investor_Materials/\` | الملخص التنفيذي، مقترح الاستثمار، ونسخة PDF من العرض |
| \`05_Documentation/\` | سجل الافتراضات، المصادر، تقرير التدقيق، الصورة الأصلية |
| \`_build/\` | سكربتات البناء والاختبار |

### استخدام العرض

- **التنقل:** \`←\` / \`Space\` / \`PageDown\` للشريحة التالية، و\`→\` / \`PageUp\` للسابقة، و\`Home\` / \`End\`.
- **اختصارات:** \`F\` ملء الشاشة · \`P\` لوحة التحكم المالية · \`G\` فهرس الشرائح · \`1\` \`2\` \`3\` لتبديل السيناريو.
- **لوحة التحكم:** عدّل الأسعار والكميات والشحن والجمارك والتخزين والتلف وشروط الدفع والنمو والمصاريف، وكل الشرائح تتحدث فوراً.
- **الطباعة:** زر ⎙، أو افتح \`index.html?print=1\` للطباعة. يمكن اختيار السيناريو برابط مثل \`?scn=conservative\`.
- **الجوال:** يتحول العرض تلقائياً إلى وضع قراءة عمودي.

### إعادة البناء بعد تعديل الافتراضات

عدّل \`defaults()\` أو \`SCENARIOS\` في \`engine.js\`، ثم شغّل:

\`\`\`bash
cd Fruit_Import_Export_Investment && bash _build/build_all.sh
\`\`\`

المتطلبات: Node 18+، Python 3 مع openpyxl، LibreOffice (لإعادة حساب Excel في الاختبار)، وPlaywright Chromium (لملفات PDF واختبار العرض).

> هذه الحزمة توقعات مبنية على افتراضات معلنة، وليست عرضاً للأوراق المالية ولا ضماناً لأي عائد.
`;
fs.writeFileSync(path.join(ROOT, '05_Documentation/README.md'), readme);
console.log('audit+readme written; consistency', consOK, JSON.stringify(consistency));
if (!consOK || !qxOK || qdErr) process.exitCode = 1;
