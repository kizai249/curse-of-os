// Generates Feasibility_Study.html/.pdf, Investor_Executive_Summary.pdf, Investment_Proposal.pdf,
// Sources_And_References.pdf and the audit report PDF — all numbers from the same engine run.
const fs = require('fs'); const path = require('path');
const E = require('../01_Investor_Pitch_Deck/engine.js');
const ROOT = path.resolve(__dirname, '..');
const SCRIPT = 'build_docs';
function fail(msg) { console.error(`${SCRIPT}: ${msg}`); process.exit(1); }
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (err) { fail(`could not read ${file}: ${err.message}`); }
}
function writeOut(file, text) {
  try { fs.writeFileSync(file, text); }
  catch (err) { fail(`could not write ${file}: ${err.message}`); }
}
const D = readJSON(path.join(__dirname, 'model_output.json'));
const B = D.base, M = B.metrics, U = B.unit, Y = B.years, Qt = B.quarters, R = B.monthly, P = D.params.base, S = D.scenarios, SE = D.sensitivity, INV = B.investor;
const TODAY = '31 أكتوبر 2026';
const avgSeason = P.volume.seasonality.reduce((a, b) => a + b, 0) / 12;
// selling price at which the company covers landed cost, commission AND Y1 overheads at the planned run-rate
const PRICE_GATE = Math.ceil((U.landed + R.overhead[3] / (P.volume.y1TargetContainers * avgSeason)) / U.cartonsSold / (1 - P.shipment.salesCommissionRate));
const FIRST_DIV_MONTH = R.dividends.findIndex(v => v > 0) + 1;
const PC = D.params.conservative;

// ---------- formatting ----------
const n = (v, d = 0) => (+v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const sar = v => n(Math.round(v) || 0);
const k = v => n(Math.round(v / 1000));
const pct = (v, d = 1) => v == null ? 'غير متاح' : n(v * 100, d) + '%';
const mo = v => v == null ? 'أكثر من 60' : String(v);
const MON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const yl = ['السنة 1', 'السنة 2', 'السنة 3', 'السنة 4', 'السنة 5'];
const num = s => `<span class="num">${s}</span>`;

function table(head, rows, opts = {}) {
  return `<table class="${opts.cls || ''}"><thead><tr>${head.map((h, i) => `<th class="${i && opts.numCols !== false ? 'n' : ''}">${h}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => {
      const tot = r.__tot; const cells = r.cells || r;
      return `<tr class="${tot ? 'tot' : ''}">${cells.map((c, i) => `<td class="${i && opts.numCols !== false ? 'n' : ''}">${c}</td>`).join('')}</tr>`;
    }).join('') + '</tbody></table>';
}
const T = (cells) => ({ cells, __tot: true });

// simple SVG bar/line chart (LTR inside)
function barChart(labels, series, opts = {}) {
  const W = opts.w || 640, H = opts.h || 230, pad = { l: 56, r: 12, t: 26, b: 30 };
  const all = series.flatMap(s => s.data); const max = Math.max(0, ...all), min = Math.min(0, ...all);
  const span = (max - min) || 1, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const y = v => pad.t + (max - v) / span * ih; const gw = iw / labels.length;
  const bars = series.filter(s => s.type !== 'line'), lines = series.filter(s => s.type === 'line');
  const bw = Math.min(34, gw * 0.75 / Math.max(1, bars.length));
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = min + span * i / 4; g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#e6dfd0"/><text x="${pad.l - 6}" y="${y(v) + 4}" font-size="10" text-anchor="end" fill="#6C675C">${Math.abs(v) >= 1e6 ? n(v / 1e6, 1) + 'M' : Math.abs(v) >= 1000 ? n(v / 1000) + 'K' : n(v, 1)}</text>`; }
  labels.forEach((l, i) => {
    const x0 = pad.l + gw * i + (gw - bw * bars.length) / 2;
    bars.forEach((s, j) => { const v = s.data[i]; g += `<rect x="${x0 + j * bw}" y="${Math.min(y(v), y(0))}" width="${bw - 2}" height="${Math.abs(y(v) - y(0))}" fill="${s.color}" rx="2"/>`; });
    if (labels.length <= 24 || i % Math.ceil(labels.length / 12) === 0) g += `<text x="${pad.l + gw * i + gw / 2}" y="${H - 10}" font-size="10" text-anchor="middle" fill="#6C675C">${l}</text>`;
  });
  lines.forEach(s => { g += `<polyline fill="none" stroke="${s.color}" stroke-width="2.2" ${s.dash ? 'stroke-dasharray="5 4"' : ''} points="${s.data.map((v, i) => `${pad.l + gw * i + gw / 2},${y(v)}`).join(' ')}"/>`; });
  const leg = series.map((s, i) => `<g transform="translate(${W - pad.r - 130 * (i + 1)},8)"><rect width="10" height="10" fill="${s.color}" rx="2"/><text x="14" y="9" font-size="11" fill="#1E2326">${s.label}</text></g>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" direction="ltr">${g}${leg}</svg>`;
}

function css(fontRel) {
  return `@font-face{font-family:'Plex Arabic';src:url('${fontRel}/IBMPlexSansArabic-Regular.ttf');font-weight:400}
@font-face{font-family:'Plex Arabic';src:url('${fontRel}/IBMPlexSansArabic-Medium.ttf');font-weight:500}
@font-face{font-family:'Plex Arabic';src:url('${fontRel}/IBMPlexSansArabic-Bold.ttf');font-weight:700}
:root{--forest:#0E3A2C;--emerald:#1F7A5A;--gold:#C59A3E;--gold2:#E3C27A;--beige:#F1E8D8;--white:#FBF8F2;--char:#1E2326;--muted:#6C675C;--line:#E2D9C6;--red:#B4483C}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){}}
*{box-sizing:border-box}html{background:#fff}body{font-family:'Plex Arabic',Tahoma,sans-serif;color:var(--char);background:#fff;margin:0;line-height:1.75;font-size:13.5px}
.page{max-width:900px;margin:0 auto;padding:36px 44px}
h1{font-size:30px;color:var(--forest);margin:.2em 0;line-height:1.3}h2{font-size:21px;color:var(--forest);border-bottom:2px solid var(--gold);padding-bottom:6px;margin:34px 0 12px;break-after:avoid}
h3{font-size:16px;color:var(--emerald);margin:20px 0 6px;break-after:avoid}p{margin:6px 0 10px}
.kicker{color:var(--gold);letter-spacing:.18em;font-size:11px;direction:ltr;text-align:right;text-transform:uppercase}
.cover{background:linear-gradient(160deg,#145441,#0E3A2C 55%,#0A2C21);color:var(--white);padding:70px 54px;min-height:96vh;display:flex;flex-direction:column;justify-content:space-between;break-after:page}
.cover h1{color:var(--white);font-size:40px}.cover h1 span{color:var(--gold2)}.cover .meta{color:rgba(251,248,242,.7);font-size:13px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0}.kpi{border:1px solid var(--line);border-right:4px solid var(--gold);border-radius:8px;padding:10px 12px;background:#fff;break-inside:avoid}
.cover .kpi{background:rgba(255,255,255,.06);border-color:rgba(227,194,122,.3)}.cover .kpi b{color:var(--white)}
.kpi span{display:block;font-size:11px;color:var(--muted)}.cover .kpi span{color:rgba(251,248,242,.65)}.kpi b{font-size:19px;color:var(--forest);direction:ltr;display:block;text-align:right}
table{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:12px;break-inside:auto}tr{break-inside:avoid}
th{background:var(--forest);color:#fff;font-weight:500;padding:6px 8px;text-align:right}td{padding:5px 8px;border-bottom:1px solid var(--line)}
td.n,th.n{text-align:left;direction:ltr;font-feature-settings:'tnum' 1}tr.tot td{font-weight:700;background:var(--beige);color:var(--forest)}tbody tr:nth-child(even) td{background:#FBF8F2}tbody tr.tot td{background:var(--beige)}
.num{direction:ltr;unicode-bidi:isolate;font-feature-settings:'tnum' 1}
.note{background:#FBF5E8;border-right:4px solid var(--gold);padding:10px 14px;border-radius:6px;margin:10px 0;font-size:12.5px;break-inside:avoid}
.warn{background:#FBE9E5;border-right:4px solid var(--red);padding:10px 14px;border-radius:6px;margin:10px 0;font-size:12.5px;break-inside:avoid}
.good{background:#E8F4EE;border-right:4px solid var(--emerald);padding:10px 14px;border-radius:6px;margin:10px 0;font-size:12.5px;break-inside:avoid}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.box{border:1px solid var(--line);border-radius:8px;padding:10px 14px;break-inside:avoid}
.box h4{margin:0 0 6px;color:var(--forest)}ul{margin:6px 0 10px;padding-right:20px}li{margin:3px 0}
svg.chart{width:100%;height:auto;margin:6px 0 14px;font-family:'Plex Arabic',Tahoma,sans-serif;break-inside:avoid}
.toc a{color:var(--forest);text-decoration:none}.toc li{margin:2px 0}
.small{font-size:11.5px;color:var(--muted)}.tag{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;background:#DCEFE4;color:#155C42}.tag.a{background:#F7E5C4;color:#7A5414}.tag.r{background:#F4D5CF;color:#8A2E23}
footer{margin-top:40px;font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:8px}
@page{size:A4;margin:16mm 14mm}@media print{.page{padding:0;max-width:none}.cover{margin:-16mm -14mm 0;min-height:297mm;padding:30mm 22mm}h2{break-before:auto}}
@media (max-width:640px){.page{padding:20px 16px}.kpis{grid-template-columns:1fr 1fr}.grid2{grid-template-columns:1fr}table{display:block;overflow-x:auto}}`;
}
function doc(title, fontRel, body) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css(fontRel)}</style></head><body>${body}</body></html>`;
}

// ---------- reusable sections ----------
const extractedRows = [
  ['الكرتون', '1,700 × 44', '74,800 جنيه', 'الصورة', 'مصحح', 'صحّحه العميل: الكمية الصحيحة 1,260 كرتون = 55,440 جنيه'],
  ['الكيس / كيلو', '45 × 110', '4,950 جنيه', 'الصورة', 'عالية', 'أكياس بالكيلو'],
  ['الفوم / كيلو', '15 × 430', '6,450 جنيه', 'الصورة', 'عالية', '—'],
  ['ورق تثبيت / كيلو', '250 × 24', '6,000 جنيه', 'الصورة', 'عالية', '—'],
  ['شريط', '20 × 27', '540 جنيه', 'الصورة', 'عالية', '—'],
  ['كلبس / كيلو', '1.5 × 68', '102 جنيه', 'الصورة', 'عالية', 'حدّثه العميل: 45 جنيه/كجم و≈1 كجم للبراد = 45 جنيه'],
  ['مكنة شد', '1 × 7,000', '7,000 جنيه', 'الصورة', 'عالية', 'أصل ثابت يُستخدم لعدة شحنات ⇐ نُقل للأصول'],
  ['النقل من مصري / وأخرى', '—', '15,000 جنيه', 'الصورة + توضيح العميل', 'عالية', 'نقل مواد التعبئة من مصر إلى السودان'],
  ['إجمالي مواد التعبئة', '—', '114,842 جنيه', 'الصورة (تحقق: المجموع مطابق)', 'عالية', '—'],
  ['إجمالي التعبئة بالريال', '—', '7,707.52 ر.س', 'الصورة', 'عالية', 'سعر صرف ضمني 14.90 جنيه/ريال'],
  ['32 طن موز', '32 طن', '20,400 ر.س', 'الصورة', 'عالية', 'موز سوداني؛ 637.5 ر.س/طن؛ وزن حقل — المعبأ ≈ 17 طن (1,260 × 13.5 كجم)'],
  ['مواد المعالجة', '2 لتر', '350 ر.س', 'الصورة', 'عالية', '—'],
  ['العمالة / السودان', '—', '500 ر.س', 'الصورة', 'عالية', 'عمالة التعبئة في السودان'],
  ['شحن البراد', '1', '16,000 ر.س', 'الصورة', 'عالية', '—'],
  ['تصديق استيراد/تخليص/ترحيل', '1', '6,000 ر.س', 'الصورة', 'عالية', '—'],
  ['تكلفة البراد واصل جدة', '—', '50,957.52 ر.س', 'الصورة (تحقق: المجموع مطابق)', 'عالية', '—'],
  ['سعر الكرتون واصل', '—', '29.98 ر.س', 'الصورة', 'عالية', '50,957.52 ÷ 1,700 = 29.975 (بعدد الصورة الخاطئ)'],
  ['سعر بيع الكرتون', '—', '50 ر.س', 'الصورة', 'متوسطة', 'غير مدعوم بعقود بيع'],
  ['صافي الربح', '—', '34,042.48 ر.س', 'الصورة (تحقق: 85,000 − 50,957.52)', 'عالية', 'ربح شحنة قبل المصاريف الثابتة والتلف — ليس صافي ربح']
];
const missingRows = [
  ['رأس المال المتاح', 'حدده العميل: 100,000 ر.س', 'ثابت؛ الشحن حسب الكاش'], ['أسماء الموردين والعقود', 'غير موجود', 'لم نخترع موردين'],
  ['العملاء والأسعار المتعاقد عليها', 'غير موجود', 'افتراض حجم مبيعات'], ['المصاريف الثابتة والفريق', 'غير موجود', `افتراض ${sar(B.monthly.overhead[3])} ر.س/شهر`],
  ['نسبة التلف', 'غير موجود (الصورة = 0%)', pct(P.shipment.spoilageRate, 0)], ['الإنضاج والتخزين والنقل الداخلي', 'غير موجود', `${sar(P.shipment.ripeningStorage + P.shipment.localTransport)} ر.س/شحنة`],
  ['الرسوم الجمركية', 'غير موجود', '0% (اتفاقية التجارة الحرة العربية) — يتحقق منه'], ['شروط الدفع ومدد الدورة', 'غير موجود', `${P.timing.customerDays} يوم تحصيل، دفع المورد عند التحميل`],
  ['الحرب في السودان (توريد وبنوك وموانئ)؛ التحصيل البطيء يوقف الشحن مع 100 ألف؛ موسمية الموز السوداني', 'غير موجود', 'مؤشر موسمي: شح نوفمبر–فبراير (FAO/AGRIS)'], ['سعر الصرف الحالي', 'الصورة 14.90', `${P.shipment.fxEGPperSAR} (≈ 52.4 جنيه/دولار ÷ 3.75، أكتوبر 2026)`],
  ['التأمين وعمولة البيع', 'غير موجود', `${pct(P.shipment.cargoInsuranceRate)} و ${pct(P.shipment.salesCommissionRate, 0)}`]
];
const assumptionsRows = [
  ['سعر شراء الموز', `${n(P.shipment.buyPricePerTon, 1)} ر.س/طن`, 'الصورة'], ['سعر بيع الكرتون', `${P.shipment.sellPricePerCarton} ر.س`, 'الصورة'],
  ['الكراتين/الشحنة', sar(P.shipment.cartonsPerContainer) + ' × ' + P.shipment.cartonKg + ' كجم', 'الصورة + العميل'], ['مواد التعبئة (بدون مكنة الشد)', `${sar(U.bom.totalEGP)} جنيه = ${sar(U.bom.totalSAR)} ر.س`, 'العميل (تفصيل)'], ['تنسيق/وكيل السودان', `${sar(P.shipment.coordination)} ر.س/شحنة`, 'افتراض'],
  ['سعر الصرف', `${P.shipment.fxEGPperSAR} جنيه/ريال`, 'افتراض سوقي'], ['الشحن / التخليص', `${sar(P.shipment.freight)} / ${sar(P.shipment.clearance)} ر.س`, 'الصورة'],
  ['الإنضاج والتخزين', `${sar(P.shipment.ripeningStorage)} ر.س/شحنة`, 'افتراض'], ['النقل الداخلي', `${sar(P.shipment.localTransport)} ر.س/شحنة`, 'افتراض'],
  ['التلف', pct(P.shipment.spoilageRate, 0), 'افتراض'], ['عمولة البيع', pct(P.shipment.salesCommissionRate, 0), 'افتراض'], ['التأمين', pct(P.shipment.cargoInsuranceRate), 'افتراض'],
  ['الرسوم الجمركية', pct(P.shipment.dutyRate, 0), 'افتراض (GAFTA)'], ['أول شحنة', `الشهر ${P.volume.launchMonth}`, 'افتراض'],
  ['الشحنات/شهر نهاية س1', P.volume.y1TargetContainers, 'افتراض'], ['النمو الشهري بعد س1', pct(P.volume.monthlyGrowth), 'افتراض'],
  ['مدة التحصيل / السداد', `${P.timing.customerDays} / ${P.timing.supplierDays} يوم`, 'افتراض'], ['من الشراء حتى البيع', `${M.inventoryDays} يوم`, 'افتراض'],
  ['المصاريف الثابتة الشهرية (س1)', `${sar(R.overhead[3])} ر.س`, 'افتراض'], ['نمو المصاريف السنوي', pct(P.overhead.annualGrowth, 0), 'افتراض'],
  ['الزكاة', pct(P.finance.zakatRate), 'نظامي (مبسط)'], ['معدل الخصم', pct(P.finance.discountRate, 0), 'افتراض'], ['نسبة التوزيع', pct(P.finance.payoutRatio, 0), 'سياسة']
];
function ueTable() {
  const c = U.components;
  return table(['البند', 'الصورة (ر.س)', 'النموذج (ر.س)', 'للكرتون (ر.س)'], [
    ['الموز', '20,400', sar(c.fruit), n(c.fruit / P.shipment.cartonsPerContainer, 2)], ['مواد التعبئة', '7,707.52', sar(c.packaging), n(c.packaging / P.shipment.cartonsPerContainer, 2)], ['المعالجة', '350', sar(c.treatment), n(c.treatment / P.shipment.cartonsPerContainer, 2)],
    ['العمالة', '500', sar(c.labor), n(c.labor / P.shipment.cartonsPerContainer, 2)], ['الشحن', '16,000', sar(c.freight), n(c.freight / P.shipment.cartonsPerContainer, 2)], ['تأمين البضاعة', '0', sar(c.insurance), n(c.insurance / P.shipment.cartonsPerContainer, 2)],
    ['التخليص والتصديق', '6,000', sar(c.clearance), n(c.clearance / P.shipment.cartonsPerContainer, 2)], ['الرسوم الجمركية', '0', sar(c.duty), n(c.duty / P.shipment.cartonsPerContainer, 2)], ['نقل داخلي', '0', sar(c.localTransport), n(c.localTransport / P.shipment.cartonsPerContainer, 2)],
    ['إنضاج وتخزين', '0', sar(c.ripening), n(c.ripening / P.shipment.cartonsPerContainer, 2)], T(['التكلفة واصل', '50,958', sar(U.landed), n(U.landedPerCarton, 2)]),
    ['الكراتين المباعة (بعد التلف)', '1,700', sar(U.cartonsSold), '—'], T(['الإيراد', '85,000', sar(U.revenue), n(U.price, 2)]),
    ['إجمالي الربح', '34,042', sar(U.grossProfit), '—'], ['عمولة البيع', '0', sar(U.commission), '—'], T(['المساهمة لكل شحنة', '34,042', sar(U.contribution), n(U.contribution / P.shipment.cartonsPerContainer, 2)]),
    ['هامش المساهمة', '40.0%', pct(U.contributionMargin), '—']]);
}
function usesTable() {
  const tp = { fixed: 'ثابت', working: 'عامل', reserve: 'احتياطي' };
  return table(['الاستخدام', 'النوع', 'المبلغ (ر.س)', 'النسبة'], B.uses.items.map(i => [i.ar, tp[i.type], sar(i.v), pct(i.v / B.uses.total)]).concat([T(['الإجمالي = رأس المال المطلوب', '', sar(B.uses.total), '100%'])]));
}
function isTable(per, labels) {
  const rows = [['عدد الشحنات', 'shipments', v => n(v, 1)], ['الإيرادات', 'revenue', sar], ['تكلفة البضاعة المباعة', 'cogs', sar], ['إجمالي الربح', 'grossProfit', sar, 1],
    ['عمولات البيع', 'commission', sar], ['المصاريف الثابتة', 'overhead', sar], ['مصاريف التأسيس', 'oneTime', sar], ['EBITDA', 'ebitda', sar, 1], ['الإهلاك', 'depreciation', sar],
    ['الزكاة', 'zakat', sar], ['صافي الربح', 'netIncome', sar, 1], ['هامش إجمالي', 'grossMargin', v => pct(v)], ['هامش صافي', 'netMargin', v => pct(v)]];
  return table(['ر.س'].concat(labels), rows.map(r => { const c = [r[0]].concat(per.map(p => r[2](p[r[1]]))); return r[3] ? T(c) : c; }));
}
function bsTable(per, labels) {
  const rows = [['النقدية', 'cash'], ['ذمم مدينة', 'ar'], ['مخزون وبضاعة بالطريق', 'inventory'], ['تأمينات لدى الموردين', 'depositsBal'], ['صافي الأصول الثابتة', 'netFA'], ['إجمالي الأصول', 'totalAssets', 1],
    ['ذمم دائنة ومستحقات', 'ap'], ['عمولات مستحقة', 'commPayable'], ['زكاة مستحقة', 'zakatPayable'], ['رأس المال المدفوع', 'paidIn'], ['أرباح مبقاة', 'retained'], ['إجمالي الخصوم وحقوق الملكية', 'totalLE', 1], ['فرق التوازن', 'balanceCheck']];
  return table(['ر.س (آخر الفترة)'].concat(labels), rows.map(r => { const c = [r[0]].concat(per.map(p => r[1] === 'balanceCheck' ? n(Math.abs(p[r[1]]) < 0.005 ? 0 : p[r[1]], 2) : sar(p[r[1]]))); return r[2] ? T(c) : c; }));
}
function cfTable(per, labels) {
  const rows = [['صافي الربح', 'netIncome'], ['الإهلاك', 'depreciation'], ['التغير في رأس المال العامل والزكاة المستحقة', null], ['التدفق النقدي التشغيلي', 'cfo', 1], ['الأصول الثابتة', 'capex', 0, -1], ['التأمينات', 'deposits', 0, -1],
    ['التدفق الاستثماري', 'cfi', 1], ['رأس المال المدفوع', 'equityIn'], ['التوزيعات', 'dividends', 0, -1], ['التدفق التمويلي', 'cff', 1], ['صافي التغير في النقد', 'netCash', 1], ['نقد أول المدة', 'openingCash'], ['نقد آخر المدة', 'cash', 1]];
  return table(['ر.س'].concat(labels), rows.map(r => { const c = [r[0]].concat(per.map(p => sar(r[1] ? p[r[1]] * (r[3] || 1) : p.cfo - p.netIncome - p.depreciation))); return r[2] ? T(c) : c; }));
}
function wcTable(per, labels) {
  return table(['ر.س'].concat(labels), [['ذمم مدينة'].concat(per.map(p => sar(p.ar))), ['مخزون وبضاعة بالطريق'].concat(per.map(p => sar(p.inventory))), ['ناقص: ذمم دائنة ومستحقات'].concat(per.map(p => sar(-p.ap))),
    ['ناقص: عمولات مستحقة'].concat(per.map(p => sar(-p.commPayable))), T(['صافي رأس المال العامل'].concat(per.map(p => sar(p.nwc)))), ['التغير'].concat(per.map((p, i) => sar(p.nwc - (i ? per[i - 1].nwc : 0))))]);
}
function monthlyTable() {
  const rows = []; for (let i = 0; i < 12; i++) rows.push([MON[i], n(R.shipments[i], 2), sar(R.revenue[i]), sar(R.grossProfit[i]), sar(R.overhead[i] + R.oneTime[i]), sar(R.ebitda[i]), sar(R.netIncome[i]), sar(R.cfo[i]), sar(R.cash[i])]);
  const s = (a) => a.slice(0, 12).reduce((x, y) => x + y, 0);
  rows.push(T(['السنة 1', n(s(R.shipments), 1), sar(s(R.revenue)), sar(s(R.grossProfit)), sar(s(R.overhead) + s(R.oneTime)), sar(s(R.ebitda)), sar(s(R.netIncome)), sar(s(R.cfo)), sar(R.cash[11])]));
  return table(['الشهر (2027)', 'شحنات', 'الإيرادات', 'إجمالي الربح', 'مصاريف ثابتة وتأسيس', 'EBITDA', 'صافي الربح', 'تدفق تشغيلي', 'النقد'], rows, { cls: 'm' });
}
function quarterTable() {
  const q = Qt.slice(4);
  return table(['الربع', 'شحنات', 'الإيرادات', 'إجمالي الربح', 'EBITDA', 'صافي الربح', 'تدفق تشغيلي', 'توزيعات', 'النقد'], q.map(x => [x.label.replace('Y', 'س').replace('-Q', ' / ر'), n(x.shipments, 1), sar(x.revenue), sar(x.grossProfit), sar(x.ebitda), sar(x.netIncome), sar(x.cfo), sar(x.dividends), sar(x.cash)]));
}
function scenTable() {
  const ks = ['conservative', 'base', 'optimistic'], g = (f) => ks.map(s => f(S[s]));
  return table(['المؤشر', 'متحفظ', 'أساسي', 'متفائل'], [
    ['رأس المال المطلوب (لتبقى النقدية ≥ الاحتياطي)'].concat(g(s => sar(s.metrics.requiredCapital))), ['مساهمة الشحنة'].concat(g(s => sar(s.unit.contribution))), ['هامش المساهمة'].concat(g(s => pct(s.unit.contributionMargin))),
    ['إيرادات السنة 1'].concat(g(s => sar(s.years[0].revenue))), ['إيرادات السنة 5'].concat(g(s => sar(s.years[4].revenue))), ['إجمالي الربح 5 سنوات'].concat(g(s => sar(s.years.reduce((a, y) => a + y.grossProfit, 0)))),
    ['صافي الربح السنة 1'].concat(g(s => sar(s.years[0].netIncome))), ['صافي الربح 5 سنوات'].concat(g(s => sar(s.metrics.totalNI5y))), ['التدفق التشغيلي 5 سنوات'].concat(g(s => sar(s.years.reduce((a, y) => a + y.cfo, 0)))),
    ['ROI (5 سنوات)'].concat(g(s => pct(s.metrics.roi5y, 0))), ['IRR (تخارج دفتري)'].concat(g(s => pct(s.metrics.irrBook))), ['شهر الاسترداد النقدي'].concat(g(s => mo(s.metrics.cashPaybackMonth))),
    T(['برأس مال الأساسي فقط (' + sar(S.base.atBaseCapital.capital) + '): النقد يصبح سالباً في الشهر'].concat(g(s => s.atBaseCapital.cashOutMonth ? String(s.atBaseCapital.cashOutMonth) : 'لا يحدث'))),
    ['برأس مال الأساسي فقط: IRR'].concat(g(s => pct(s.atBaseCapital.irrBook)))]);
}
function sensTable() {
  return table(['الصدمة', 'مساهمة الشحنة', 'صافي ربح 5 سنوات', 'التغير', 'IRR', 'أدنى نقد', 'رأس المال اللازم'], SE.rows.map(r => [r.ar, sar(r.contribution), sar(r.ni5y), sar(r.dNi5y), pct(r.irr), sar(r.minCash), sar(r.requiredCapital)]));
}
function gridTable() {
  return table(['سعر الشراء ↓ / سعر البيع ←'].concat(SE.grid.sell.map(s => (s > 0 ? '+' : '') + pct(s, 0))), SE.grid.buy.map((b, i) => [(b > 0 ? '+' : '') + pct(b, 0)].concat(SE.grid.v[i].map(sar))));
}
function eqTables() {
  return '<h3>أ) استثمار بحصة ملكية</h3>' + table(['حصة المستثمر', 'IRR (تخارج دفتري)', 'IRR (مضاعف ربح)', 'مضاعف المال (دفتري)', 'مضاعف المال (مضاعف ربح)'], INV.equityTable.map(e => [pct(e.share, 0), pct(e.irrBook), pct(e.irrExit), n(e.moicBook, 2) + '×', n(e.moicExit, 2) + '×'])) +
    '<h3>ب) مشاركة في الأرباح مع استرداد رأس المال عند التخارج</h3>' + table(['نسبة المستثمر من الأرباح الموزعة', 'IRR', 'مضاعف المال', 'التدفقات (س0…س5)'], INV.profitShareTable.map(e => [pct(e.share, 0), pct(e.irr), n(e.moic, 2) + '×', e.flows.map(k).join(' | ') + ' ألف']));
}
const seasonRows = [
  ['موز سوداني (داخل النموذج)', ...P.volume.seasonality.map(v => n(v, 1))],
  ['طلب مرتفع في جدة', '—', 'رمضان*', 'رمضان*', '—', 'حج**', '—', '—', '—', '—', '—', '—', '—']
];
const risks = [
  ['الحرب في السودان: توقف التوريد أو الطرق أو الميناء', 'متوسط-عالٍ', 'عالٍ', 'موردان في منطقتين، شحنة واحدة في الطريق كحد أقصى في البداية، بديل موز مصري/هندي، تأمين بضاعة يشمل المخاطر'],
  ['التحويلات المالية والبنوك في السودان', 'عالٍ', 'عالٍ', 'الدفع عبر قنوات مصرفية نظامية وموثقة فقط، فواتير رسمية، فحص العقوبات على الأطراف، استشارة بنك سعودي قبل أول تحويل'],
  ['متطلبات استيراد المنتجات السودانية', 'متوسط', 'عالٍ', 'تأكيد عدم وجود حظر حالي من وزارة البيئة/الهيئة قبل الشراء، شهادة صحة نباتية سودانية معتمدة'],
  ['انخفاض سعر البيع عن 50 ر.س', 'متوسط', 'عالٍ', 'خطابات نوايا وعقود توريد لسلاسل؛ تنويع 5+ عملاء؛ بيع جزئي قبل الوصول'],
  ['التلف وانقطاع التبريد', 'متوسط', 'عالٍ', 'مسجلات حرارة، شروط قبول عند التحميل، تأمين بضاعة، إنضاج متحكم به'],
  ['انقطاع/موسمية التوريد', 'متوسط', 'متوسط', 'موردان على الأقل؛ مصدر صيفي بديل؛ عقد موسمي'],
  ['قيود استيراد أو رفض شحنة (متبقيات مبيدات)', 'منخفض-متوسط', 'عالٍ', 'فحص مختبري قبل الشحن، شهادة مطابقة، متابعة تعاميم الهيئة والوزارة'],
  ['تأخر التحصيل', 'متوسط', 'متوسط', 'سقف ائتمان، بيع نقدي في السوق المركزي، تأمين ائتمان للعملاء الكبار'],
  ['تأخر الشحن/التخليص', 'متوسط', 'متوسط', 'مخلّص مرخص، مستندات مسبقة، احتياطي نقدي'],
  ['تقلب سعر الجنيه', 'متوسط', 'منخفض', 'التسعير بالريال/الدولار؛ التعبئة فقط بالجنيه'],
  ['مخاطر التنفيذ وفريق جديد', 'متوسط', 'متوسط', 'بدء تدريجي، شحنة تجريبية، حوكمة وتقارير شهرية، قاعدة إيقاف خسارة'],
  ['تركّز المنتج (موز فقط)', 'عالٍ', 'متوسط', 'تنويع بعد إثبات الهامش (برتقال، مانجو)'],
  ['تغير الأنظمة والرسوم', 'منخفض', 'متوسط', 'متابعة دورية مع مخلّص ومستشار نظامي']
];
const sources = [
  ['World\'s Top Exports — Bananas Imports by Country (2024)', 'https://www.worldstopexports.com/bananas-imports-by-country', 'قيمة واردات السعودية من الموز ≈ 307 مليون $ في 2024 ونمو 18.6%', 'ثانوي — يحتاج تأكيد من UN Comtrade'],
  ['OEC — Bananas, Saudi Arabia', 'https://oec.world/profile/bilateral-product/bananas/reporter/sau', '2023: 232 مليون $', 'ثانوي'],
  ['TrendEconomy — HS 0803 Saudi Arabia', 'https://trendeconomy.com/data/h2/SaudiArabia/0803', '2023: 259 مليون $ (تعريف مختلف)', 'ثانوي'],
  ['IndexBox — Saudi Arabia Bananas', 'https://indexbox.co.uk/store/saudi-arabia-bananas-market-analysis-forecast-size-trends-and-insights/', 'الموردون الرئيسيون: الإكوادور، الفلبين، الهند (بدون أرقام موثقة)', 'منخفض'],
  ['FAO AGRIS — Production and marketing efficiency of banana in the Sudan', 'https://agris.fao.org/search/en/records/64724f60e17b74d2224fca1f', 'شح إنتاج الموز السوداني من نوفمبر إلى فبراير وارتفاع سعره مع بداية موسم الأمطار', 'أكاديمي — قديم نسبياً'],
  ['FAO — Technical Guide for Export Banana Production in Sudan', 'https://fao.org/fileadmin/templates/banana/documents/Docs_Resources_2015/TR4/Technical_Guide_for_Export_Banana_Production_in_Sudan.pdf', 'سنار وكسلا مناطق الإنتاج الرئيسية؛ متطلبات موز التصدير', 'رسمي (FAO)'],
  ['Trading Economics / OEC — Sudan banana exports to Saudi Arabia', 'https://tradingeconomics.com/sudan/exports/saudi-arabia/bananas-plantains-fresh-dried', 'صادرات الموز السوداني للسعودية صغيرة جداً (≈ 53.7 ألف $ في 2018)', 'ثانوي'],
  ['Arab News — Saudi Arabia launches shipping service linking Jeddah to Port Sudan (2025)', 'https://www.arabnews.pk/node/2616264', 'خط ملاحي مباشر جدة–بورتسودان منذ سبتمبر 2025؛ عبور الخطوط الصغيرة ≈ يوم', 'إعلامي'],
  ['India Seatrade News — Folk Maritime feeder Sudan–Saudi Arabia (2026)', 'https://indiaseatradenews.com/folk-maritime-introduces-new-feeder-service-between-sudan-and-saudi-arabia/', 'خط فيدر جديد بورتسودان–جدة 2026؛ استئناف المسافنة في بورتسودان يونيو 2026', 'إعلامي'],
  ['Arab News / AFP — Sudan lost all sources of revenue in the war', 'https://www.arabnews.pk/node/2629206', 'ضغط على الإيرادات والعملة والبنوك في السودان', 'إعلامي'],
  ['L’Orient Today — Sudan’s exports grind to a halt', 'https://today.lorientlejour.com/article/1337253/sudans-exports-grind-to-a-halt-deepening-humanitarian-crisis.html', 'تعطل الصادرات والموانئ في فترات من الحرب', 'إعلامي'],
  ['Lebanese Ministry of Economy — GAFTA', 'https://economy.gov.lb/en/services/trade/international-agreements/gafta', 'إعفاء المنتجات الزراعية العربية المنشأ من الرسوم منذ 1/1/2005', 'رسمي (دولة عضو)'],
  ['Intertek — SFDA Exporter & Importer Guidelines', 'https://intertek.com/siteassets/gts/saudi-arabia/sfa-eig-sfda-exporter-and-importer-guidelines-r08.pdf', 'حساب المستورد لدى الهيئة، شهادة المطابقة للخضار والفواكه', 'متوسط-عالٍ'],
  ['FAOLEX — Conditions and requirements for importing food into KSA', 'https://leap.unep.org/en/countries/sa/national-legislation/conditions-and-requirements-importing-food-kingdom-saudi-arabia', 'ترخيص استيراد من وزارة البيئة، سجل تجاري مناسب', 'رسمي (نسخة 2020)'],
  ['Gulf News — Saudi Arabia sets new rules for fruit and vegetable imports', 'https://gulfnews.com/world/gulf/saudi/saudi-arabia-sets-new-rules-for-fruit-and-vegetable-imports-1.500697728', 'شهادة صحة نباتية إلكترونية بـ QR، صلاحية إذن الاستيراد 15 يوماً', 'إعلامي — تاريخ غير مؤكد'],
  ['Amwal Al Ghad / moneyexchangerate.org — EGP/USD', 'https://en.amwalalghad.com/?p=230243', '≈ 50 جنيه/دولار (أغسطس 2026)؛ ≈ 52.4 (أكتوبر 2026، مجمّع)', 'متوسط — يُعتمد سعر البنك المركزي المصري'],
  ['صورة بيانات التكلفة المقدمة من العميل', '05_Documentation/source_image.jpg', 'جميع تكاليف الشحنة وسعر البيع', 'أساسي — بيانات العميل']
];

// ---------- FEASIBILITY STUDY ----------
function feasibility(fontRel) {
  const kp = (l, v) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`;
  const yrs = Y;
  return doc('دراسة الجدوى — استيراد الموز السوداني إلى جدة', fontRel, `
<section class="cover"><div><div class="kicker" style="color:#E3C27A">Feasibility Study · Fresh Fruit Import</div><h1>دراسة جدوى استيراد<br><span>الموز السوداني إلى جدة</span></h1>
<p style="color:rgba(251,248,242,.8);max-width:560px">دراسة تشغيلية ومالية مبنية على بيانات تكلفة فعلية لشحنة واحدة، ونموذج مالي شهري لخمس سنوات بثلاثة سيناريوهات. جميع الأرقام من المحرك المالي نفسه المستخدم في العرض التفاعلي وملف Excel.</p></div>
<div class="kpis">${kp('رأس المال', sar(M.capital) + ' ر.س')}${kp('IRR (أساسي، دفتري)', pct(M.irrBook))}${kp('صافي ربح 5 سنوات', n(M.totalNI5y / 1e6, 2) + ' مليون')}${kp('الاسترداد النقدي', 'الشهر ' + mo(M.cashPaybackMonth))}</div>
<div class="meta">الإصدار 1.0 · ${TODAY} · مسودة للمستثمرين · سرّي<br>هذه الدراسة توقعات مبنية على افتراضات معلنة وليست ضماناً لأي عائد.</div></section>
<div class="page">
<h2>المحتويات</h2><ol class="toc"><li>الملخص التنفيذي</li><li>تقرير استخراج البيانات من الصورة</li><li>نموذج العمل والعمليات</li><li>الأسواق والمنتجات والموسمية</li><li>الموردون والعملاء والتوزيع</li><li>اللوجستيات وسلسلة التبريد والتخزين</li><li>المتطلبات الجمركية والتنظيمية وشروط الدفع</li><li>المنافسة والفرص وتحليل SWOT</li><li>تقييم المخاطر</li><li>الافتراضات المالية</li><li>رأس المال المطلوب (المصادر والاستخدامات)</li><li>نموذج الإيرادات واقتصاديات الشحنة</li><li>القوائم المالية</li><li>دورة دوران رأس المال</li><li>العوائد واسترداد رأس المال</li><li>السيناريوهات وتحليل الحساسية</li><li>هيكل الاستثمار</li><li>الخلاصة والتوصية</li></ol>

<h2>1. الملخص التنفيذي</h2>
<p>المشروع منشأة سعودية برأس مال ${num(sar(M.capital))} ر.س تستورد الموز من السودان (مزارع سنار وكسلا) عبر بورتسودان إلى جدة. مواد التعبئة تُشترى من مصر وتُنقل إلى السودان. الشحنة ${sar(P.shipment.cartonsPerContainer)} كرتون × 13–14 كجم من ${P.shipment.tonsPerContainer} طن موز مشترى (وزن حقل)، تُنضج في جدة وتُباع بالجملة. التكلفة الفعلية للشحنة واصل جدة حسب الصورة ${num('50,957.52')} ر.س، وسعر البيع ${num('50')} ر.س للكرتون.</p>
${M.totalNI5y > 0 ? '' : `<div class="warn"><b>تنبيه بعد تصحيح عدد الكراتين (${sar(P.shipment.cartonsPerContainer)}):</b> بسعر ${P.shipment.sellPricePerCarton} ر.س للكرتون لا يغطي المشروع مصاريفه — صافي ربح 5 سنوات ${num(sar(M.totalNI5y))} ر.س${M.cashOutMonth ? ' والنقد ينفد في الشهر ' + M.cashOutMonth : ''}. يحتاج سعر ≈ ${PRICE_GATE} ر.س للكرتون ليغطي التكلفة والمصاريف الثابتة بالحجم المخطط.</div>`}<div class="warn"><b>تصحيح جوهري:</b> الصورة تعرض «صافي ربح» ${num('34,042')} ر.س للشحنة. هذا الرقم يستبعد التلف والإنضاج والتخزين والنقل الداخلي والتأمين وعمولة البيع والمصاريف الثابتة والزكاة. بعد إضافتها تصبح <b>مساهمة الشحنة ${num(sar(U.contribution))} ر.س</b> (هامش ${pct(U.contributionMargin)})، ثم تُغطّى منها المصاريف الثابتة.</div>
<div class="kpis">${kp('إيرادات السنة 2', sar(yrs[1].revenue))}${kp('صافي ربح السنة 2', sar(yrs[1].netIncome))}${kp('نقطة التعادل', n(M.breakEvenContainersY1, 1) + ' شحنة/شهر')}${kp('دورة التحويل النقدي', n(M.ccc) + ' يوم')}</div>
<ul><li><b>رأس المال: ${num(sar(M.capital))} ر.س</b> (ثابت). يمول التأسيس وأول شحنة واحتياطي ${num(sar(M.reserve))} ر.س؛ بعدها لا يُشحن إلا ما يسمح به الكاش. لتنفيذ الخطة دون أي قيد يلزم ≈ ${num(sar(M.requiredCapital))} ر.س.</li>
<li>أول شهر EBITDA موجب: الشهر ${M.ebitdaBreakEvenMonth}؛ تعادل الربح التراكمي: الشهر ${mo(M.cumulativeBreakEvenMonth)}.</li>
<li>الاسترداد النقدي من التشغيل (التدفق الحر التراكمي ≥ رأس المال): الشهر ${mo(M.cashPaybackMonth)}؛ استرداد المستثمر عبر التوزيعات فعلياً: الشهر ${mo(M.distributionPaybackMonth)}.</li>
<li>IRR للمساهمين ${pct(M.irrBook)} (تخارج بالقيمة الدفترية) و ${pct(M.irrExit)} (تخارج بمضاعف ${P.finance.exitMultipleNI}× صافي الربح)؛ NPV @ ${pct(P.finance.discountRate, 0)} = ${num(sar(M.npvBook))} ر.س.</li>
<li><b>نقطة الضعف:</b> السيناريو المتحفظ (سعر ${S.conservative.unit.price} ر.س، تلف ${pct(PC.shipment.spoilageRate, 0)}، ${PC.volume.y1TargetContainers} شحنات/شهر) يحقق خسارة تراكمية ${num(sar(S.conservative.metrics.totalNI5y))} ر.س. المشروع حساس جداً لسعر البيع وحجم المبيعات.</li><li><b>مخاطر السودان:</b> الحرب أضعفت الاقتصاد والبنوك والعملة، وتعطلت الموانئ والتجارة لفترات (استؤنفت عمليات بورتسودان في يونيو 2026). هذا أكبر خطر غير مالي في المشروع.</li><li><b>التحصيل:</b> مع 100 ألف فقط، لو تأخر التحصيل إلى 40 يوماً يتوقف الشحن تقريباً ويخسر المشروع — البيع النقدي في السوق المركزي شرط أساسي.</li></ul>
<div class="good"><b>التوصية:</b> المضي بشحنة تجريبية واحدة وتمويل على دفعات مرتبطة بمؤشرات (سعر بيع فعلي ≥ ${num(PRICE_GATE)} ر.س — السعر الذي يغطي التكلفة والعمولة والمصاريف الثابتة عند الحجم المخطط، تلف ≤ 7%، تحصيل ≤ 30 يوم) قبل ضخ كامل رأس المال.</div>

<h2>2. تقرير استخراج البيانات من الصورة (Extracted Project Information)</h2>
<p>تم فحص الصورة كاملة: جدول مواد التعبئة (بالجنيه المصري — تُشترى من مصر) وجدول تكلفة البراد (بالريال — موز سوداني). أعدنا حساب كل مجموع للتحقق — جميع المجاميع مطابقة. ثم أضفنا تفاصيل مواد التعبئة التي أرسلها العميل (الجدول التالي).</p>
${table(['البيان', 'الكمية × السعر', 'القيمة', 'المصدر', 'الثقة', 'ملاحظات'], extractedRows, { numCols: false })}
<h3>تفصيل مواد التعبئة لكل شحنة (بيانات العميل، أرض مصنع في مصر)</h3>${table(['البند', 'الأساس', 'الكمية', 'سعر الوحدة (جنيه)', 'الإجمالي (جنيه)', 'الإجمالي (ر.س)'], U.bom.lines.map(l => [l.ar, l.basis, n(l.qty, l.qty % 1 ? 2 : 0) + ' ' + l.unit, n(l.priceEGP, 2), sar(l.totalEGP), sar(l.totalSAR)]).concat([T(['الإجمالي', '', '', '', sar(U.bom.totalEGP), sar(U.bom.totalSAR)])]))}
<p class="small">الكرتون 13–14 كجم بسعر 44 جنيه. الأكياس 110 جنيه/كجم وفي الكيلو ≈40 كيس (≈ ${n(U.bom.bagsPerCarton, 2)} كيس/كرتون شامل احتياط). لفة الفوم 100 سم × 100 م بسمك 2 مم تعطي 666 قطعة 50×30 سم؛ عدد القطع لكل كرتون لم يُحدد، ومن 15 لفة في الصورة نستنتج ≈ ${n(U.bom.foamPiecesPerCarton, 1)} قطعة/كرتون (يحتاج تأكيد). الزوايا 24 جنيه/متر × 250 متر. الشريط 27,000 جنيه/طن × ≈20 كجم. الكلبسات 45 جنيه/كجم × ≈1 كجم (الصورة كانت 1.5 كجم × 68). مكنة الشد 7,000 جنيه أصل ثابت. سعر الصرف ${P.shipment.fxEGPperSAR} جنيه/ريال.</p>
<div class="warn">بعد تصحيح العميل: ${sar(P.shipment.cartonsPerContainer)} كرتون × 13–14 كجم ≈ ${n(U.packedTons, 1)} طن معبأ فقط، مقابل ${P.shipment.tonsPerContainer} طن مشترى — نسبة تعبئة ≈ ${pct(U.packOut, 0)}. هذه نسبة منخفضة: إما أن الـ32 طن تشمل فاقداً كبيراً، أو أن الوزن المشترى أقل، أو أن سعر البيع 50 ر.س كان محسوباً على عدد كراتين مختلف. يجب تأكيدها لأنها تحدد ربحية المشروع.</div>
<h3>تعديلات تحليلية على بيانات الصورة</h3><ul><li>نقل <b>مكنة الشد</b> (7,000 جنيه) من تكلفة الشحنة إلى الأصول الثابتة لأنها تُستخدم لعدة شحنات.</li><li>تحديث سعر الصرف من 14.90 (ضمني في الصورة) إلى ${P.shipment.fxEGPperSAR} جنيه/ريال بناءً على سعر السوق في أكتوبر 2026 (≈ 52.4 جنيه/دولار) ⇐ ترتفع تكلفة التعبئة بالريال.</li><li>إضافة التكاليف غير الموجودة في الصورة كافتراضات معلنة (الجدول التالي).</li></ul>
<h3>البيانات غير الموجودة في الصورة وكيف عالجناها</h3>${table(['البيان', 'في الصورة', 'المعالجة في النموذج'], missingRows, { numCols: false })}
<div class="note">لا توجد في الصورة بيانات موردين أو عملاء أو دول تصدير أخرى أو رأس مال. لم نخترع أي منها؛ وكل افتراض موثق في Assumptions_Register.xlsx مع درجة الثقة وإجراء التحقق.</div>

<h2>3. نموذج العمل والعمليات</h2>
<h3>نظرة عامة</h3><p>تجارة فواكه طازجة (B2B) بنموذج «خفيف الأصول»: لا مزارع ولا مستودعات مملوكة في البداية. القيمة المضافة: التوريد المنتظم، إدارة سلسلة التبريد، الإنضاج، والتوزيع في جدة.</p>
<h3>دورة العملية (الاستيراد)</h3>${table(['المرحلة', 'المدة (يوم)', 'الحدث النقدي'], [['شراء الموز والدفع للمورد', P.timing.supplierDays, 'خروج نقد: موز + تعبئة'], ['التعبئة والتحميل', P.timing.prepDays, 'عمالة ومعالجة'], ['الشحن الدولي', P.timing.transitDays, 'الشحن والتأمين'], ['التخليص الجمركي', P.timing.clearanceDays, 'رسوم تخليص وتصديق'], ['الإنضاج والتخزين', P.timing.ripeningDays, 'إنضاج ونقل داخلي'], ['البيع', P.timing.sellingDays, 'إثبات الإيراد'], ['التحصيل', P.timing.customerDays, 'دخول النقد (بعد العمولة)']], { numCols: false })}
<h3>التصدير</h3><p>النشاط استيراد إلى السعودية؛ جهة «التصدير» هي المزارع/المصدر السوداني، ومواد التعبئة تُصدَّر من مصر إلى السودان. إعادة التصدير من جدة لدول الخليج المجاورة خيار مستقبلي غير محسوب.</p>

<h2>4. الأسواق والمنتجات والموسمية</h2>
<p>سوق البيع الأول جدة (أقرب ميناء ومركز توزيع لمكة والطائف). قُدّرت واردات السعودية من الموز في 2024 بنحو 307 مليون دولار (مصدر ثانوي). إيرادات خطتنا في السنة 5 تعادل ≈ ${pct(Y[4].revenue / 3.75 / 307e6, 2)} من هذه القيمة.</p>
<h3>لماذا السودان؟</h3><ul><li>القرب: بورتسودان مقابل جدة مباشرة؛ الخطوط الملاحية الصغيرة تعبر في ≈ يوم، وأُطلقت خطوط مباشرة جديدة منذ 2025.</li><li>سعر شراء منخفض (637.5 ر.س/طن حسب الصورة).</li><li>إعفاء جمركي محتمل للمنتجات العربية المنشأ (السودان عضو في منطقة التجارة الحرة العربية الكبرى) — يتحقق منه.</li><li>إنتاج الموز يتركز في سنار وكسلا، ويشح من نوفمبر إلى فبراير.</li><li><b>عيوب جوهرية:</b> صادرات الموز السوداني للسعودية تاريخياً صغيرة جداً (عشرات آلاف الدولارات)، والحرب أضعفت الإنتاج والبنوك والعملة والموانئ.</li></ul>
<h3>تقويم المواسم (Seasonal Sourcing Calendar)</h3>${table(['المنتج'].concat(MON), seasonRows, { numCols: false })}
<p class="small">مؤشر الموز = نسبة من الكمية المخطط لها. الشح من نوفمبر إلى فبراير من دراسة كفاءة إنتاج وتسويق الموز في السودان (FAO AGRIS)؛ النسب نفسها افتراض. * رمضان 2027 ≈ فبراير–مارس. ** الحج 2027 ≈ مايو. التنويع (مانجو سوداني، أو موز مصري بديل) غير مدرج في الأرقام.</p>

<h2>5. الموردون والعملاء والتوزيع</h2>
<div class="grid2"><div class="box"><h4>استراتيجية التوريد</h4><ul><li>موردان على الأقل في سنار وكسلا بعقد موسمي مكتوب، ووكيل/منسق في السودان بأجر لكل شحنة (${num(sar(P.shipment.coordination))} ر.س).</li><li>مواد التعبئة تُشترى من مصر بكميات وتُنقل إلى السودان (${num(sar(P.packaging.transportEGP))} جنيه/شحنة).</li><li>معايير جودة: درجة النضج، الطول، العيوب، حرارة التحميل.</li><li>الدفع عند التحميل (افتراض) وعبر قنوات مصرفية نظامية فقط؛ هدف لاحق: 15–30 يوم آجل.</li><li>فحص متبقيات مبيدات قبل الشحن.</li></ul></div>
<div class="box"><h4>العملاء وقنوات التوزيع</h4><ul><li>تجار الجملة في السوق المركزي بجدة (نقدي/قصير).</li><li>سلاسل التجزئة (آجل 30–60 يوم، أحجام ثابتة).</li><li>الفنادق والمطاعم والتموين خاصة في مواسم العمرة والحج.</li><li>موزعون لمكة والطائف.</li></ul></div></div>

<h2>6. اللوجستيات وسلسلة التبريد والتخزين</h2><ul><li>الموز يُشحن أخضر في حرارة تبريد مضبوطة (عادة 13–14°م) ويُنضج بالإيثيلين في غرف متحكم بها.</li><li>كل شحنة بمسجل حرارة؛ شروط قبول موثقة عند التحميل والاستلام.</li><li>غرف الإنضاج والتخزين مؤجرة (${num(sar(P.shipment.ripeningStorage))} ر.س/شحنة افتراضاً) — بناء غرف مملوكة يحتاج دراسة منفصلة.</li><li>كل يوم تأخير يضيف ${num(sar(P.shipment.delayStorageCostPerDay))} ر.س تكلفة و ${pct(P.shipment.spoilagePerDelayDay)} تلف (افتراض).</li></ul>
<div class="note">المسار: مزارع سنار/كسلا ← تعبئة في السودان ← نقل بري مبرّد إلى بورتسودان (مدرج في ${P.timing.prepDays} أيام تجهيز) ← خط ملاحي إلى جدة (${P.timing.transitDays} يوم شامل الميناء). الحمولة المعبأة ≈ ${n(U.packedTons, 1)} طن تناسب حاوية مبردة 40 قدم. خدمات ملاحية مباشرة بين جدة وبورتسودان أُطلقت في 2025–2026، واستؤنفت عمليات المسافنة في بورتسودان في يونيو 2026 بعد توقف.</div>

<h2>7. المتطلبات الجمركية والتنظيمية وشروط الدفع</h2>${table(['المتطلب', 'الجهة', 'ملاحظات'], [['سجل تجاري يتضمن تجارة المواد الغذائية', 'وزارة التجارة', 'قبل أول شحنة'], ['حساب مستورد', 'هيئة الغذاء والدواء', 'تسجيل المنتج حسب الاشتراطات الحالية'], ['ترخيص استيراد خضار وفواكه', 'وزارة البيئة والمياه والزراعة', 'صلاحية الإذن محدودة'], ['شهادة صحة نباتية', 'الحجر الزراعي السوداني', 'نسخة إلكترونية برمز تحقق'], ['شهادة مطابقة', 'جهة معتمدة من الهيئة', 'لكل إرسالية خضار وفواكه'], ['شهادة منشأ عربية', 'الغرف التجارية السودانية', 'شرط الإعفاء الجمركي'], ['التأكد من عدم وجود حظر على المنتج', 'وزارة البيئة / الهيئة', 'قبل أول شراء'], ['التخليص', 'هيئة الزكاة والضريبة والجمارك (منصة فسح)', 'عبر مخلّص مرخص'], ['ضريبة القيمة المضافة 15%', 'هيئة الزكاة والضريبة والجمارك', 'تُدفع عند الاستيراد وتُسترد/تُقاص — غير مدرجة في النموذج (الأرقام بدون ضريبة)']], { numCols: false })}
<h3>شروط الدفع</h3><ul><li><b>للمورد السوداني:</b> نقداً عند التحميل في البداية وعبر قنوات مصرفية نظامية فقط (القطاع المصرفي السوداني تحت ضغط والعملة متقلبة)؛ لاحقاً تحصيل مستندي أو آجل 15–30 يوم بعد بناء الثقة (كل 10 أيام آجل تقلل رأس المال العامل).</li><li><b>من العملاء:</b> نقدي في السوق المركزي، آجل للسلاسل؛ متوسط مرجح ${P.timing.customerDays} يوماً في الأساسي.</li></ul>

<h2>8. المنافسة والفرص وتحليل SWOT</h2>${table(['المنافس', 'الموقع', 'أثره علينا'], [['العلامات العالمية (موز فلبيني/إكوادوري)', 'جودة ثابتة، سعر أعلى', 'نتجنب المنافسة المباشرة — شريحة مختلفة'], ['مستوردو الموز الهندي', 'سعر منخفض', 'منافس مباشر على السعر'], ['تجار الموز المصري واليمني والسوداني', 'شريحة سعرية مشابهة', 'المنافسة على العلاقات والسعر والجودة'], ['السلاسل الكبرى (استيراد مباشر)', 'قوة شرائية', 'عميل محتمل أكثر من كونه منافساً']], { numCols: false })}
<div class="grid2"><div class="box"><h4>نقاط القوة</h4><ul><li>تكلفة شحنة فعلية ومفصلة</li><li>دورة نقدية قصيرة (${n(M.ccc)} يوم)</li><li>أصول ثابتة قليلة</li><li>قرب بورتسودان من جدة وإعفاء جمركي محتمل</li><li>تكلفة شراء منخفضة</li></ul></div><div class="box"><h4>نقاط الضعف</h4><ul><li>لا عملاء متعاقدين بعد</li><li>منتج واحد ومنشأ واحد</li><li>رأس مال صغير (100 ألف) لا يتحمل أخطاء التحصيل</li><li>الاعتماد على بلد في حالة حرب</li><li>فريق وسجل أداء جديد</li></ul></div>
<div class="box"><h4>الفرص</h4><ul><li>نمو استهلاك الفواكه ومواسم العمرة والحج</li><li>تنويع بالمانجو السوداني</li><li>التوسع للرياض والشرقية</li><li>خدمات إنضاج للغير</li></ul></div><div class="box"><h4>التهديدات</h4><ul><li>حرب أسعار مع الموز الهندي</li><li>قيود استيراد مفاجئة</li><li>تصعيد الحرب أو تعطل الموانئ والبنوك في السودان</li><li>ارتفاع الشحن أو الجنيه المصري (التعبئة)</li><li>تركّز التحصيل لدى عملاء كبار</li></ul></div></div>

<h2>9. تقييم المخاطر</h2>${table(['الخطر', 'الاحتمال', 'الأثر', 'المعالجة'], risks, { numCols: false })}

<h2>10. الافتراضات المالية (الأساسي)</h2>${table(['الافتراض', 'القيمة', 'المصدر'], assumptionsRows, { numCols: false })}
<p class="small">السجل الكامل لكل السيناريوهات ودرجة الثقة وإجراء التحقق في 05_Documentation/Assumptions_Register.xlsx. بداية النموذج: يناير 2027.</p>

<h2>11. رأس المال المطلوب — المصادر والاستخدامات</h2>
<p>رأس المال حدده العميل: <b>${num(sar(M.capital))} ر.س</b>. الجدول يوضح كيف يُستخدم حتى أول شحنة؛ بعدها يموّل المشروع نفسه من تدفقات الشحنات. كل شهر يحسب النموذج أقصى عدد شحنات يسمح به الكاش بعد المصاريف والاحتياطي (${num(sar(M.reserve))} ر.س)، فلا ينزل النقد تحت الاحتياطي. أدنى رصيد نقدي في الأساسي: ${num(sar(M.minCash))} ر.س (الشهر ${M.minCashMonth}). لتنفيذ الخطة دون أي قيد من البداية يلزم ≈ ${num(sar(M.requiredCapital))} ر.س.</p>${usesTable()}
<div class="kpis">${kp('رأس مال ثابت', sar(B.uses.items.filter(i => i.type === 'fixed').reduce((a, i) => a + i.v, 0)))}${kp('رأس مال عامل', sar(B.uses.items.filter(i => i.type === 'working').reduce((a, i) => a + i.v, 0)))}${kp('احتياطي', sar(B.uses.items.filter(i => i.type === 'reserve').reduce((a, i) => a + i.v, 0)))}${kp('المصادر', '100% حقوق ملكية')}</div>
<p class="small">المصاريف الثابتة خفيفة لتناسب 100 ألف: المؤسس ومساعد عمليات/مبيعات، محاسب خارجي، مكتب افتراضي — ${num(sar(R.overhead[3]))} ر.س/شهر في السنة الأولى، تزيد ${pct(P.overhead.annualGrowth, 0)} سنوياً. الأرقام بدون رواتب سوقية كاملة للمؤسس؛ إذا ارتفعت يرتفع التعادل.</p>

<h2>12. نموذج الإيرادات واقتصاديات الشحنة</h2>${table(['الفاكهة', 'بلد المنشأ', 'بلد البيع', 'كمية/شحنة', 'سعر الشراء', 'شحن/وحدة', 'تكاليف إضافية/وحدة', 'سعر البيع', 'إجمالي الربح/شحنة', 'الهامش'], [['موز', 'السودان (مواد التعبئة من مصر)', 'السعودية (جدة)', `${P.shipment.tonsPerContainer} طن / ${sar(P.shipment.cartonsPerContainer)} كرتون`, n(P.shipment.buyPricePerTon, 1) + ' ر.س/طن', n(U.components.freight / P.shipment.cartonsPerContainer, 2) + ' ر.س/كرتون', n((U.landed - U.components.fruit - U.components.freight) / P.shipment.cartonsPerContainer, 2) + ' ر.س/كرتون', P.shipment.sellPricePerCarton + ' ر.س/كرتون', sar(U.grossProfit), pct(U.grossMargin)], ['مانجو / موز بديل', 'السودان / مصر', 'السعودية', '—', '—', '—', '—', '—', 'خارج النموذج', 'بانتظار عروض أسعار']], { numCols: false })}
${ueTable()}
${barChart(yl, [{ label: 'الإيرادات', data: Y.map(y => y.revenue), color: '#0E3A2C' }, { label: 'إجمالي الربح', data: Y.map(y => y.grossProfit), color: '#2E9E74' }, { label: 'صافي الربح', data: Y.map(y => y.netIncome), color: '#C59A3E' }])}

<h2>13. القوائم المالية</h2>
<h3>السنة الأولى — شهرياً</h3>${monthlyTable()}
${barChart(MON.map(m => m.slice(0, 3)), [{ label: 'الإيرادات', data: R.revenue.slice(0, 12), color: '#1F7A5A' }, { label: 'صافي الربح', data: R.netIncome.slice(0, 12), color: '#C59A3E', type: 'line' }])}
<h3>السنوات 2–5 — ربع سنوي</h3>${quarterTable()}
<h3>قائمة الدخل السنوية (Income Statement)</h3>${isTable(Y, yl)}
<h3>الميزانية العمومية (Balance Sheet)</h3>${bsTable(Y, yl)}
<h3>قائمة التدفقات النقدية (Cash Flow Statement)</h3>${cfTable(Y, yl)}
<h3>قائمة رأس المال العامل (Working Capital)</h3>${wcTable(Y, yl)}
<h3>المصادر والاستخدامات (Sources &amp; Uses) — 5 سنوات</h3>${table(['ر.س', 'المبلغ'], [['المصادر: رأس المال المدفوع', sar(M.capital)], ['المصادر: التدفق التشغيلي التراكمي', sar(Y.reduce((a, y) => a + y.cfo, 0))], T(['إجمالي المصادر', sar(M.capital + Y.reduce((a, y) => a + y.cfo, 0))]), ['الاستخدامات: أصول ثابتة وتأمينات', sar(-Y.reduce((a, y) => a + y.cfi, 0))], ['الاستخدامات: توزيعات', sar(M.totalDividends5y)], ['الاستخدامات: الرصيد النقدي نهاية س5', sar(M.endCash)], T(['إجمالي الاستخدامات', sar(-Y.reduce((a, y) => a + y.cfi, 0) + M.totalDividends5y + M.endCash)])])}
<div class="good"><b>اختبارات الترابط:</b> الميزانية متوازنة في كل الأشهر الستين (أقصى فرق ${n(M.maxBalanceError, 6)} ر.س)، وتغير النقد في قائمة التدفقات يساوي تغيره في الميزانية لكل شهر (أقصى فرق ${n(M.cashTieError, 6)} ر.س). رأس المال يظهر في التدفق التمويلي فقط ولا يُحتسب إيراداً. الأصول الثابتة مفصولة عن المصروفات التشغيلية.</div>

<h2>14. دورة دوران رأس المال</h2>${table(['المؤشر', 'القيمة'], [['أيام المخزون (من الشراء حتى البيع)', n(M.inventoryDays)], ['أيام الشحن والتخليص', n(M.transitDays)], ['أيام التحصيل (DSO)', n(M.dso)], ['أيام السداد (DPO مرجحة)', n(M.dpo, 1)], T(['دورة التحويل النقدي (CCC)', n(M.ccc) + ' يوم']), ['عدد دورات رأس المال سنوياً', n(M.cyclesPerYear, 1)], ['رأس المال المحبوس لكل شحنة', sar(M.capitalPerContainer) + ' ر.س'], ['المبيعات السنوية الممكنة لكل 100,000 ر.س رأس مال عامل (تشغيل مستمر)', sar(M.salesPer100k) + ' ر.س'], ['معدل دوران رأس المال المستثمر (إيرادات س2 ÷ رأس المال)', n(M.revenueToCapitalY2, 2) + '×'], ['دوران رأس المال العامل س2 (إيرادات ÷ متوسط رأس المال العامل)', n(M.capitalTurnoverY2, 1) + '×']], { numCols: false })}
<p><b>الشرح:</b> يخرج النقد للمورد عند التحميل (يوم 0)، ثم تُدفع تكاليف الشحن والتأمين عند التحميل والتخليص عند الوصول والإنضاج بعد التخليص. يُثبت الإيراد بعد ≈ ${M.inventoryDays} يوماً ويُحصّل بعد ${M.dso} يوماً إضافية. أي أن الريال يعود بعد ≈ ${n(M.ccc)} يوماً، فيمكن تدويره ≈ ${n(M.cyclesPerYear, 1)} مرات سنوياً نظرياً. عملياً العدد أقل بسبب الموسمية وفترات الانتظار بين الشحنات.</p>
<div class="note">بتحسين شروط المورد إلى 15 يوماً آجل تنخفض دورة التحويل النقدي بنحو ${n(15 * (U.components.fruit + U.components.packaging) / U.landed, 0)} يوماً ويقل رأس المال العامل المطلوب.</div>

<h2>15. العوائد واسترداد رأس المال</h2>${table(['المؤشر', yl[0], yl[1], yl[2], yl[3], yl[4]], [['صافي الربح'].concat(Y.map(y => sar(y.netIncome))), ['صافي الربح الشهري (متوسط)'].concat(Y.map(y => sar(y.netIncome / 12))), ['EBITDA'].concat(Y.map(y => sar(y.ebitda))), ['هامش إجمالي'].concat(Y.map(y => pct(y.grossMargin))), ['هامش صافي'].concat(Y.map(y => pct(y.netMargin))), ['ROE'].concat(M.roe.map(r => pct(r))), ['التوزيعات المدفوعة'].concat(Y.map(y => sar(y.dividends))), ['النقد آخر السنة'].concat(Y.map(y => sar(y.cash)))])}
${table(['مؤشر العائد', 'القيمة'], [['IRR — تخارج بالقيمة الدفترية', pct(M.irrBook)], ['IRR — تخارج بمضاعف ' + P.finance.exitMultipleNI + '× صافي ربح س5', pct(M.irrExit)], ['NPV @ ' + pct(P.finance.discountRate, 0) + ' (دفتري)', sar(M.npvBook)], ['ROI (5 سنوات)', pct(M.roi5y, 0)], ['ROI سنوي مركب', pct(M.roiAnnualized)], ['نقطة التعادل (شحنة/شهر)', n(M.breakEvenContainersY1, 2)], ['سعر بيع التعادل المتغير للكرتون', n(M.breakEvenSellPrice, 2) + ' ر.س'], ['أول شهر EBITDA موجب', 'الشهر ' + M.ebitdaBreakEvenMonth], ['تعادل الربح التراكمي', 'الشهر ' + mo(M.cumulativeBreakEvenMonth)], ['الاسترداد النقدي من التشغيل', 'الشهر ' + mo(M.cashPaybackMonth)], ['الاسترداد عبر التوزيعات', 'الشهر ' + mo(M.distributionPaybackMonth)]], { numCols: false })}
<h3>إجابات أسئلة المستثمر</h3><ol>
<li><b>متى يسترد المستثمر رأس ماله؟</b> التدفق النقدي الحر التراكمي يغطي رأس المال في الشهر ${mo(M.cashPaybackMonth)}، لكن المستثمر يستلم فعلياً ما يعادل رأس ماله عبر التوزيعات في الشهر ${mo(M.distributionPaybackMonth)} حسب سياسة توزيع ${pct(P.finance.payoutRatio, 0)}. الفرق يبقى داخل الشركة كنقد ورأس مال عامل مملوك للمساهمين.</li>
<li><b>متى يصل المشروع لنقطة التعادل؟</b> EBITDA موجب من الشهر ${M.ebitdaBreakEvenMonth}، والربح التراكمي يتعادل في الشهر ${mo(M.cumulativeBreakEvenMonth)}. يلزم ${n(M.breakEvenContainersY1, 1)} شحنة شهرياً لتغطية المصاريف الثابتة.</li>
<li><b>العائد السنوي؟</b> ROI سنوي مركب ${pct(M.roiAnnualized)} و IRR ${pct(M.irrBook)} في الأساسي — وسالب في المتحفظ.</li>
<li><b>الأرباح القابلة للتوزيع؟</b> مجموع التوزيعات في 5 سنوات ${num(sar(M.totalDividends5y))} ر.س (أول توزيع في الشهر ${FIRST_DIV_MONTH}؛ لا توزيع عن السنة 1 الخاسرة).</li>
<li><b>نسبة إعادة الاستثمار المناسبة؟</b> ${pct(1 - P.finance.payoutRatio, 0)} من صافي الربح على الأقل في السنوات 2–3 لتمويل نمو رأس المال العامل (يرتفع من ${num(sar(Y[0].nwc))} إلى ${num(sar(Y[4].nwc))} ر.س).</li>
<li><b>السيولة الواجب الاحتفاظ بها؟</b> احتياطي لا يقل عن ${num(sar(M.reserve))} ر.س (مصاريف شهرين + تكلفة شحنة)، ويُمنع التوزيع إن نزل النقد تحته.</li></ol>

<h2>16. السيناريوهات وتحليل الحساسية</h2>${scenTable()}
<p class="small">المتحفظ: سعر ${PC.shipment.sellPricePerCarton} ر.س، تلف ${pct(PC.shipment.spoilageRate, 0)}، شراء ${n(PC.shipment.buyPricePerTon, 1)} ر.س/طن، شحن ${sar(PC.shipment.freight)}، ${PC.volume.y1TargetContainers} شحنات/شهر، تحصيل ${PC.timing.customerDays} يوماً. المتفائل: سعر 52، تلف 3%، 5 شحنات/شهر، تحصيل 15 يوماً.</p>
${barChart(yl, ['conservative', 'base', 'optimistic'].map((s, i) => ({ label: S[s].labelAr, data: S[s].years.map(y => y.netIncome), color: ['#B4483C', '#1F7A5A', '#C59A3E'][i] })))}
<h3>تحليل الحساسية (رأس المال ثابت عند ${sar(SE.capitalHeld)} ر.س)</h3>${sensTable()}
<h3>مصفوفة مساهمة الشحنة: سعر الشراء × سعر البيع</h3>${gridTable()}
<div class="warn">أخطر المتغيرات: <b>انخفاض سعر البيع 10%</b> يخفض صافي ربح 5 سنوات بنحو ${num(sar(-SE.rows.find(r => r.key === 'sell10').dNi5y))} ر.س، و<b>تأخر التحصيل إلى 40 يوماً</b> مع رأس مال 100 ألف يحبس الكاش ويوقف الشحن تقريباً: صافي ربح 5 سنوات ${num(sar(SE.rows.find(r => r.key === 'dso40').ni5y))} ر.س. هذا أخطر سيناريو في المشروع.</div>

<h2>17. هيكل الاستثمار</h2>${table(['البند', 'المقترح'], [['إجمالي الاستثمار المطلوب', sar(M.capital) + ' ر.س'], ['الحد الأدنى للتذكرة', sar(INV.minimumTicket) + ' ر.س'], ['الأداة', 'حقوق ملكية في شركة ذات مسؤولية محدودة سعودية، أو اتفاقية مشاركة في الأرباح'], ['الضخ', 'على دفعتين: 40% للتأسيس والشحنة التجريبية، 60% بعد تحقق المؤشرات'], ['توزيع الأرباح', pct(P.finance.payoutRatio, 0) + ' من صافي ربح السنة السابقة، بشرط بقاء الاحتياطي'], ['إعادة الاستثمار', pct(1 - P.finance.payoutRatio, 0) + ' من الأرباح لتمويل النمو'], ['الحوكمة', 'تقارير شهرية (شحنات، تلف، أسعار، تحصيل، نقد)، مراجعة سنوية، موافقة المستثمر على الاقتراض والتوسع'], ['التخارج', 'إعادة شراء من المؤسس بعد س3، مشاركة متناقصة، بيع استراتيجي، أو الاستمرار بالتوزيعات']], { numCols: false })}
${eqTables()}
<div class="note">نسبة الملكية التي تحقق للمستثمر IRR ${pct(INV.targetIRR, 0)} (تخارج دفتري) في الأساسي: ≈ ${pct(INV.equityShareForTarget, 0)}. لا نقترح نسبة نهائية: تعتمد على مساهمة المؤسس (نقداً أو جهداً) وتقييم المخاطر. لا توجد عوائد مضمونة في أي من النموذجين.</div>
<div class="grid2"><div class="box"><h4>الملكية (Equity)</h4><ul><li>المستثمر شريك في الربح والخسارة بقدر حصته.</li><li>حقوق تصويت ومقعد في مجلس المديرين.</li><li>القيمة تتحقق عند التخارج.</li></ul></div><div class="box"><h4>المشاركة في الأرباح</h4><ul><li>نسبة من الأرباح الموزعة + استرداد رأس المال من الأصول عند التخارج.</li><li>إذا خسر المشروع لا يُسترد إلا ما تبقى من الأصول — ليس قرضاً مضموناً.</li><li>أبسط تنفيذاً ويناسب صيغ المشاركة الشرعية.</li></ul></div></div>

<h2>18. الخلاصة والتوصية</h2><p>بيانات الصورة تُظهر هامش شحنة جذاباً، لكنها لا تكفي وحدها لقرار استثمار كامل. ${M.totalNI5y > 0 ? 'بعد إضافة التكاليف الناقصة، يبقى المشروع مربحاً في السيناريو الأساسي مع دورة نقدية قصيرة، ويخسر في المتحفظ.' : `بعد تصحيح عدد الكراتين إلى ${sar(P.shipment.cartonsPerContainer)} وبسعر ${P.shipment.sellPricePerCarton} ر.س للكرتون، مساهمة الشحنة ${sar(U.contribution)} ر.س فقط، وسعر التعادل للكرتون ${n(M.breakEvenSellPrice, 2)} ر.س قبل المصاريف الثابتة. <b>المشروع غير مربح بهذه الأرقام</b> في السيناريوهات الثلاثة، ولا نوصي بالاستثمار حتى يتأكد سعر بيع أعلى (≈ ${PRICE_GATE} ر.س للكرتون أو أكثر) أو تكلفة أقل.`} القرار يعتمد على إثبات ثلاثة أرقام في السوق: سعر البيع الفعلي، نسبة التلف، والحجم الشهري القابل للبيع.</p>
<div class="good"><b>الجاهزية:</b> النموذج المالي جاهز ومُختبر؛ جاهزية الاستثمار «مشروطة» — يلزم قبل الإغلاق: عروض أسعار مكتوبة، 3–5 خطابات نوايا، تأكيد الإعفاء الجمركي والحمولة، وشحنة تجريبية.</div>
<h2>ملحق: المصادر</h2>${table(['المصدر', 'ما استخدمناه', 'الموثوقية'], sources.map(s => [`${s[0]}<br><span class="small num">${s[1]}</span>`, s[2], s[3]]), { numCols: false })}
<footer>تاريخ الوصول للمصادر الإلكترونية: ${TODAY}. أُعدّت الدراسة بمحرك مالي واحد (01_Investor_Pitch_Deck/engine.js) ومطابقة لملف Financial_Model.xlsx.</footer>
</div>`);
}

// ---------- EXECUTIVE SUMMARY ----------
function execSummary(fontRel) {
  const kp = (l, v) => `<div class="kpi"><span>${l}</span><b>${v}</b></div>`;
  return doc('Investor Executive Summary', fontRel, `<div class="page">
<div class="kicker">Investor Executive Summary · ${TODAY}</div><h1>ملخص تنفيذي للمستثمر — استيراد الموز السوداني إلى جدة</h1>
<div class="kpis">${kp('رأس المال', sar(M.capital) + ' ر.س')}${kp('IRR (أساسي)', pct(M.irrBook))}${kp('صافي ربح 5 سنوات', n(M.totalNI5y / 1e6, 2) + ' مليون')}${kp('الاسترداد النقدي', 'الشهر ' + mo(M.cashPaybackMonth))}</div>
<h2>الفرصة</h2><p>تجارة سلعة سريعة الدوران برأس مال 100 ألف ريال: شراء الموز من السودان، تعبئته بمواد من مصر، شحنه مبرداً من بورتسودان، إنضاجه وبيعه في جدة. الحجم ينمو من الأرباح المعاد استثمارها. دورة نقدية ≈ ${n(M.ccc)} يوماً ⇐ ${n(M.cyclesPerYear, 1)} دورات لرأس المال سنوياً. بيانات التكلفة مأخوذة من شحنة فعلية قدمها المؤسس.</p>
<h2>اقتصاديات الشحنة</h2>${table(['', 'كما في الصورة', 'بعد إضافة التكاليف الناقصة'], [['الإيراد', '85,000', sar(U.revenue)], ['التكلفة واصل', '50,958', sar(U.landed)], ['عمولة البيع', '0', sar(U.commission)], T(['المساهمة لكل شحنة', '34,042', sar(U.contribution)]), ['الهامش', '40.0%', pct(U.contributionMargin)]])}
<h2>التوقعات (السيناريو الأساسي)</h2>${table(['ر.س'].concat(yl), [['الإيرادات'].concat(Y.map(y => sar(y.revenue))), ['إجمالي الربح'].concat(Y.map(y => sar(y.grossProfit))), ['EBITDA'].concat(Y.map(y => sar(y.ebitda))), T(['صافي الربح'].concat(Y.map(y => sar(y.netIncome)))), ['التوزيعات'].concat(Y.map(y => sar(y.dividends))), ['النقد آخر السنة'].concat(Y.map(y => sar(y.cash)))])}
${barChart(yl, [{ label: 'الإيرادات', data: Y.map(y => y.revenue), color: '#1F7A5A' }, { label: 'صافي الربح', data: Y.map(y => y.netIncome), color: '#C59A3E' }], { h: 200 })}
<h2>السيناريوهات</h2>${table(['', 'متحفظ', 'أساسي', 'متفائل'], [['رأس المال'].concat(['conservative', 'base', 'optimistic'].map(s => sar(S[s].metrics.capital))), ['شحنات 5 سنوات'].concat(['conservative', 'base', 'optimistic'].map(s => n(S[s].metrics.shippedContainers5y, 0))), ['ينفد النقد في الشهر'].concat(['conservative', 'base', 'optimistic'].map(s => S[s].metrics.cashOutMonth ? String(S[s].metrics.cashOutMonth) : 'لا')), ['صافي ربح 5 سنوات'].concat(['conservative', 'base', 'optimistic'].map(s => sar(S[s].metrics.totalNI5y))), ['IRR'].concat(['conservative', 'base', 'optimistic'].map(s => pct(S[s].metrics.irrBook)))])}
<div class="warn"><b>نقاط ضعف معلنة:</b> لا عملاء متعاقدين بعد؛ سعر البيع وحجم المبيعات افتراضات؛ المتحفظ يخسر؛ الحرب في السودان (توريد وبنوك وموانئ)؛ التحصيل البطيء يوقف الشحن مع 100 ألف؛ موسمية الموز السوداني (شح نوفمبر–فبراير)؛ نسبة التعبئة من 32 طن إلى ≈23 طن تحتاج تأكيد.</div>
<h2>المطلوب</h2><ul><li>${num(sar(M.capital))} ر.س على دفعتين، حد أدنى للتذكرة ${num(sar(INV.minimumTicket))} ر.س.</li><li>هيكلان: حصة ملكية أو مشاركة في الأرباح (التفاصيل في Investment_Proposal.pdf).</li><li>توزيع ${pct(P.finance.payoutRatio, 0)} من الأرباح السنوية بشرط الاحتياطي. لا عوائد مضمونة.</li></ul>
<footer>الأرقام من النموذج المالي (Financial_Model.xlsx) ومطابقة للعرض التفاعلي. توقعات وليست ضمانات.</footer></div>`);
}

// ---------- INVESTMENT PROPOSAL ----------
function proposal(fontRel) {
  return doc('Investment Proposal', fontRel, `<div class="page">
<div class="kicker">Investment Proposal · Indicative Terms · ${TODAY}</div><h1>مقترح الاستثمار — شروط استرشادية</h1>
<div class="note">مستند للنقاش وليس عرضاً ملزماً أو طرحاً للأوراق المالية. الشروط النهائية تخضع للعناية الواجبة واتفاقية مساهمين يعدها مستشار قانوني.</div>
<h2>1. ملخص الشروط (Term Sheet)</h2>${table(['البند', 'الشرط المقترح'], [['المشروع', 'منشأة سعودية لاستيراد الموز السوداني (بمواد تعبئة من مصر) وتوزيعه في جدة'], ['المبلغ المطلوب', sar(M.capital) + ' ر.س'], ['الحد الأدنى للتذكرة', sar(INV.minimumTicket) + ' ر.س'], ['الاستخدام', 'تأسيس، أصول، رأس مال عامل، تغطية تشغيل حتى التعادل، احتياطي طوارئ (جدول 2)'], ['الضخ على دفعات', 'دفعة واحدة 100,000 ر.س (المبلغ صغير والشحنة الأولى تحتاج معظمه)؛ مراجعة إلزامية بعد أول 3 شحنات: سعر ≥ ' + PRICE_GATE + ' ر.س، تلف ≤ 7%، تحصيل ≤ 15 يوم — وإلا يتوقف التوسع'], ['الهيكل', 'خيار أ: حصة ملكية · خيار ب: مشاركة في الأرباح مع استرداد رأس المال عند التخارج'], ['توزيع الأرباح', pct(P.finance.payoutRatio, 0) + ' من صافي ربح السنة السابقة في الشهر ' + P.finance.dividendMonth + ' بعد الإقفال، بشرط بقاء النقد ≥ ' + sar(M.reserve) + ' ر.س'], ['إعادة الاستثمار', 'الباقي يُعاد استثماره في رأس المال العامل'], ['الحوكمة', 'مجلس مديرين بمقعد للمستثمر؛ موافقة مسبقة على: الاقتراض، دخول منتج/سوق جديد، أصول > 50,000 ر.س، رواتب الإدارة'], ['التقارير', 'شهرية: الشحنات، الأسعار الفعلية، التلف، التحصيل، النقد · سنوية: قوائم مراجعة'], ['قاعدة إيقاف الخسارة', 'إذا كانت مساهمة الشحنة < ' + sar(Math.ceil(B.monthly.overhead[3] / P.volume.y1TargetContainers / 500) * 500) + ' ر.س لثلاث شحنات متتالية يتوقف التوسع ويُعاد التقييم'], ['التخارج', 'حق شراء للمؤسس بعد السنة 3 بصيغة متفق عليها؛ أو مشاركة متناقصة؛ أو بيع استراتيجي'], ['شروط مسبقة', 'عروض أسعار مكتوبة، 3–5 خطابات نوايا، تأكيد الإعفاء الجمركي والحمولة، السجل والتراخيص']], { numCols: false })}
<h2>2. استخدامات الأموال</h2>${usesTable()}
<h2>3. العوائد المتوقعة حسب الهيكل (أساسي — غير مضمونة)</h2>${eqTables()}
<p class="small">IRR بنسبة ملكية ${pct(INV.equityShareForTarget, 0)} ≈ ${pct(INV.targetIRR, 0)} (تخارج دفتري). التدفقات للمساهمين: −رأس المال في السنة 0، توزيعات سنوية، ثم حقوق الملكية الدفترية أو مضاعف ${P.finance.exitMultipleNI}× صافي ربح السنة 5.</p>
<h2>4. مقارنة الهيكلين</h2>${table(['', 'حصة ملكية', 'مشاركة في الأرباح'], [['ما يحصل عليه المستثمر', 'نسبة من الأسهم والتوزيعات وقيمة التخارج', 'نسبة من الأرباح الموزعة + استرداد رأس المال من الأصول عند التخارج'], ['في حال الخسارة', 'يتحمل الخسارة بقدر حصته', 'يتحمل الخسارة؛ يُسترد ما تبقى من الأصول فقط'], ['السيطرة', 'حقوق تصويت', 'حقوق رقابة تعاقدية'], ['التعقيد', 'أعلى (تقييم، اتفاقية مساهمين)', 'أقل'], ['التزامات المؤسس', 'إدارة بدوام كامل، عدم منافسة', 'إدارة بدوام كامل، تقارير، عدم منافسة'], ['مناسب لـ', 'مستثمر طويل الأجل', 'مستثمر يفضل التدفقات وصيغة المشاركة']], { numCols: false })}
<h2>5. استراتيجية استرداد المستثمر</h2><ul><li>من التشغيل: التدفق الحر التراكمي يغطي رأس المال في الشهر ${mo(M.cashPaybackMonth)}.</li><li>نقداً للمستثمر عبر التوزيعات (100% من المساهمين): الشهر ${mo(M.distributionPaybackMonth)}.</li><li>الباقي عبر التخارج: حقوق ملكية دفترية متوقعة ${num(sar(M.endEquity))} ر.س نهاية السنة 5.</li></ul>
<h2>6. أهم المخاطر</h2>${table(['الخطر', 'الأثر على 5 سنوات (صافي ربح)'], SE.rows.map(r => [r.ar, sar(r.dNi5y) + ' ر.س']), { numCols: false })}
<p>السيناريو المتحفظ: خسارة تراكمية ${num(sar(S.conservative.metrics.totalNI5y))} ر.س، وبرأس مال الأساسي ينفد النقد في الشهر ${S.conservative.atBaseCapital.cashOutMonth} — ولذلك الضخ على دفعات وقاعدة الإيقاف.</p>
<footer>جميع الأرقام من النموذج المالي الموحد. للتواصل: [اسم المؤسس] · [الجوال] · [البريد].</footer></div>`);
}

function sourcesDoc(fontRel) {
  return doc('Sources and References', fontRel, `<div class="page"><div class="kicker">Sources &amp; References</div><h1>المصادر والمراجع</h1>
<p>تاريخ الوصول: ${TODAY}. صنّفنا كل مصدر حسب موثوقيته. أي رقم سوقي غير مؤكد معلن كذلك في الوثائق، ولم يُستخدم أي رقم سوقي في حساب الإيرادات — الإيرادات مبنية على بيانات الصورة والافتراضات المعلنة فقط.</p>
${table(['#', 'المصدر', 'الرابط', 'ما استخدمناه', 'الموثوقية'], sources.map((s, i) => [i + 1, s[0], `<span class="num small">${s[1]}</span>`, s[2], s[3]]), { numCols: false })}
<h2>بيانات مطلوبة من مصادر رسمية قبل الإغلاق</h2><ul><li>UN Comtrade / الهيئة العامة للإحصاء: واردات السعودية من الموز (HS 0803) بالطن والقيمة حسب بلد المنشأ.</li><li>البنك المركزي المصري: سعر الصرف الرسمي (لمواد التعبئة).</li><li>وزارة البيئة والمياه والزراعة وهيئة الغذاء والدواء: موقف استيراد الموز من السودان حالياً.</li><li>بنك سعودي: آلية التحويل النظامي للموردين في السودان.</li><li>هيئة الزكاة والضريبة والجمارك: التعرفة وتطبيق الإعفاء العربي على HS 0803.</li><li>هيئة الغذاء والدواء ووزارة البيئة: الاشتراطات الحالية لاستيراد الموز من مصر.</li><li>عروض أسعار من: مورد موز، مورد تعبئة، شركة شحن مبرد، مخلّص، مشغّل غرف إنضاج.</li></ul></div>`);
}

function mdToHtml(md) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lines = md.split('\n'); let h = '', inList = false, inTable = false, tRows = [];
  const flushT = () => { if (!inTable) return; const [hd, , ...body] = tRows; h += '<table><thead><tr>' + hd.split('|').slice(1, -1).map(c => `<th>${inl(c.trim())}</th>`).join('') + '</tr></thead><tbody>' + body.map(r => '<tr>' + r.split('|').slice(1, -1).map(c => `<td>${inl(c.trim())}</td>`).join('') + '</tr>').join('') + '</tbody></table>'; inTable = false; tRows = []; };
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
  lines.forEach(l => {
    if (l.startsWith('|')) { if (inList) { h += '</ul>'; inList = false; } inTable = true; tRows.push(l); return; } else flushT();
    if (/^#\s/.test(l)) h += `<h1>${inl(l.slice(2))}</h1>`; else if (/^##\s/.test(l)) h += `<h2>${inl(l.slice(3))}</h2>`; else if (/^###\s/.test(l)) h += `<h3>${inl(l.slice(4))}</h3>`;
    else if (/^[-*]\s/.test(l)) { if (!inList) { h += '<ul>'; inList = true; } h += `<li>${inl(l.slice(2))}</li>`; }
    else { if (inList) { h += '</ul>'; inList = false; } if (l.trim()) h += `<p>${inl(l)}</p>`; }
  });
  flushT(); if (inList) h += '</ul>';
  return h;
}

module.exports = { feasibility, execSummary, proposal, sourcesDoc, mdToHtml, doc };

if (require.main === module) {
  (async () => {
    const { chromium } = require('playwright');
    const fontFrom = (dir) => path.relative(dir, path.join(ROOT, '01_Investor_Pitch_Deck/assets/fonts')).split(path.sep).join('/');
    const out = [];
    const fsDir = path.join(ROOT, '03_Feasibility_Study');
    writeOut(path.join(fsDir, 'Feasibility_Study.html'), feasibility(fontFrom(fsDir)));
    const tmp = path.join(__dirname, 'html'); fs.mkdirSync(tmp, { recursive: true });
    const jobs = [
      [path.join(fsDir, 'Feasibility_Study.html'), path.join(fsDir, 'Feasibility_Study.pdf')],
      [path.join(tmp, 'exec.html'), path.join(ROOT, '04_Investor_Materials/Investor_Executive_Summary.pdf'), execSummary(fontFrom(tmp))],
      [path.join(tmp, 'proposal.html'), path.join(ROOT, '04_Investor_Materials/Investment_Proposal.pdf'), proposal(fontFrom(tmp))],
      [path.join(tmp, 'sources.html'), path.join(ROOT, '05_Documentation/Sources_And_References.pdf'), sourcesDoc(fontFrom(tmp))]
    ];
    const audit = path.join(ROOT, '05_Documentation/Investment_Model_Audit_Report.md');
    if (fs.existsSync(audit)) jobs.push([path.join(tmp, 'audit.html'), path.join(ROOT, '05_Documentation/Investment_Model_Audit_Report.pdf'), doc('Investment Model Audit Report', fontFrom(tmp), '<div class="page">' + mdToHtml(fs.readFileSync(audit, 'utf8')) + '</div>')]);
    const b = await chromium.launch();
    for (const [html, pdf, content] of jobs) {
      if (content) writeOut(html, content);
      const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
      await pg.goto('file://' + html); await pg.waitForTimeout(500);
      await pg.pdf({ path: pdf, format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
      out.push({ pdf: path.relative(ROOT, pdf), bytes: fs.statSync(pdf).size, errors: errs });
      await pg.close();
    }
    await b.close();
    console.log(JSON.stringify(out, null, 1));
  })().catch(err => fail(`PDF generation failed: ${err.message}`));
}
