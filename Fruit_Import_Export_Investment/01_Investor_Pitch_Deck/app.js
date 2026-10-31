/* Investor deck controller — every number on screen is read from FruitEngine.run(). */
(function () {
  'use strict';
  var E = window.FruitEngine;
  var Q = function (s, r) { return (r || document).querySelector(s); };
  var QA = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);
  var PRINT = params.has('print');
  var hasGsap = typeof window.gsap !== 'undefined';
  var C = { forest: '#0E3A2C', emerald: '#1F7A5A', emerald2: '#2E9E74', mint: '#CFE7DA', gold: '#C59A3E', gold2: '#E3C27A', beige: '#E7DBC4', char: '#1E2326', muted: '#6C675C', red: '#B4483C' };
  var MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  // ---------------- state ----------------
  var state = { scn: 'base', ctrl: {}, autoCapital: true };
  var res, ctx, scenStatic, sens;

  // ---------------- formatting ----------------
  function n(v, d) { return (+v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  var FMT = {
    sar: function (v) { return n(Math.round(v), 0); },
    k: function (v) { return n(Math.round(v / 1000), 0) + ' ألف'; },
    m: function (v) { return Math.abs(v) >= 1e6 ? n(v / 1e6, 2) + ' مليون' : n(Math.round(v / 1000), 0) + ' ألف'; },
    pct: function (v) { return n(v * 100, 1) + '%'; }, pct0: function (v) { return n(v * 100, 0) + '%'; },
    pct1: function (v) { return n(v * 100, 1) + '%'; }, pct2: function (v) { return n(v * 100, 2) + '%'; },
    n0: function (v) { return n(v, 0); }, n1: function (v) { return n(v, 1); }, n2: function (v) { return n(v, 2); },
    mo: function (v) { return v == null ? '> 60' : String(v); },
    d: function (v) { return v + ' يوم'; }
  };
  function fmt(v, f) {
    if (v === undefined) return '…';
    if (typeof v === 'string') return v;
    if (v === null && f !== 'mo') return 'غير متاح';
    if (typeof v === 'number' && !isFinite(v)) return '∞';
    return (FMT[f] || FMT.sar)(v);
  }
  function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, ctx); }

  // ---------------- engine run ----------------
  var OH_KEYS = ['salaries', 'rent', 'utilitiesIT', 'marketing', 'travel', 'insurance', 'professionalFees', 'misc'];
  function buildParams() {
    var p = E.scenarioParams(state.scn);
    Object.keys(state.ctrl).forEach(function (key) {
      var v = state.ctrl[key];
      if (key === 'opexScale') { OH_KEYS.forEach(function (k) { p.overhead[k] = p.overhead[k] * v; }); return; }
      if (key === 'finance.initialInvestment') return;
      var parts = key.split('.'); p[parts[0]][parts[1]] = v;
    });
    p.finance.initialInvestment = state.autoCapital ? null : (state.ctrl['finance.initialInvestment'] || null);
    return p;
  }
  function compute() {
    var p = buildParams();
    res = E.run(p);
    sens = E.sensitivity(p);
    if (!scenStatic) scenStatic = E.runScenarios();
    var fixed = 0, work = 0, reserve = 0;
    res.uses.items.forEach(function (it) { if (it.type === 'fixed') fixed += it.v; else if (it.type === 'working') work += it.v; else reserve += it.v; });
    ctx = {
      m: res.metrics, u: res.unit, y: res.years, inv: res.investor, uses: res.uses, p: Object.assign({}, p, { unitKg: p.shipment.tonsPerContainer * 1000 / p.shipment.cartonsPerContainer }),
      d: { marketShareY5: res.years[4].revenue / 3.75 / 307e6, fixedCap: fixed, workCap: work, reserveCap: reserve,
        stopLoss: Math.ceil(res.R.overheadBase / Math.max(1, p.volume.y1TargetContainers) / 500) * 500 },
      scnLabel: E.SCENARIOS[state.scn].labelAr + (Object.keys(state.ctrl).length ? ' (معدّل)' : '')
    };
  }

  // ---------------- binding ----------------
  function bindAll(animateCounters) {
    QA('[data-k]').forEach(function (el) {
      var v = get(el.dataset.k), f = el.dataset.f || 'sar';
      if (el.classList.contains('count') && typeof v === 'number' && isFinite(v) && animateCounters && hasGsap && !PRINT && el.closest('.slide.active')) {
        var o = { x: 0 }; gsap.to(o, { x: v, duration: 1.2, ease: 'power2.out', onUpdate: function () { el.textContent = fmt(o.x, f); } });
      } else el.textContent = fmt(v, f);
    });
    tables(); heat(); cycle(); updateCharts();
    var warn = Q('#warn'), m = res.metrics;
    if (m.belowReserve) {
      warn.classList.add('show');
      warn.innerHTML = 'تنبيه تمويل: أدنى رصيد نقدي ' + fmt(m.minCash, 'k') + ' في الشهر ' + m.minCashMonth +
        ' أقل من الاحتياطي (' + fmt(m.reserve, 'k') + '). رأس المال المطلوب: ' + fmt(m.requiredCapital, 'sar') + ' ر.س' +
        (m.cashOutMonth ? ' — النقد يصبح سالباً في الشهر ' + m.cashOutMonth : '');
    } else warn.classList.remove('show');
  }

  function tables() {
    var u = res.unit, c = u.components, p = ctx.p;
    var rows = [
      ['الموز (32 طن)', 20400, c.fruit], ['مواد التعبئة', 7707.52, c.packaging], ['المعالجة + العمالة', 850, c.treatment + c.labor],
      ['شحن البراد', 16000, c.freight], ['تصديق وتخليص', 6000, c.clearance], ['رسوم جمركية', 0, c.duty], ['تأمين البضاعة', 0, c.insurance],
      ['نقل داخلي', 0, c.localTransport], ['إنضاج وتخزين', 0, c.ripening], ['التكلفة واصل', 50957.52, u.landed, 1],
      ['الكراتين المباعة', 1700, u.cartonsSold], ['الإيراد', 85000, u.revenue, 1], ['عمولة البيع', 0, u.commission],
      ['المساهمة لكل شحنة', 34042.48, u.contribution, 1], ['هامش المساهمة', 34042.48 / 85000, u.contributionMargin, 0, 'pct']
    ];
    Q('#ueTable').innerHTML = rows.map(function (r) {
      return '<tr' + (r[3] ? ' class="tot"' : '') + '><td>' + r[0] + '</td><td class="n">' + fmt(r[1], r[4] || 'sar') + '</td><td class="n">' + fmt(r[2], r[4] || 'sar') + '</td></tr>';
    }).join('');
    var TYPE = { fixed: '<span class="tag g">ثابت</span>', working: '<span class="tag a">عامل</span>', reserve: '<span class="tag">احتياطي</span>' };
    Q('#usesTable').innerHTML = res.uses.items.map(function (it) { return '<tr><td>' + it.ar + '</td><td>' + TYPE[it.type] + '</td><td class="n">' + fmt(it.v, 'sar') + '</td></tr>'; }).join('') +
      '<tr class="tot"><td>الإجمالي</td><td></td><td class="n">' + fmt(res.uses.total, 'sar') + '</td></tr>';
    var Y = res.years, K = function (v) { return n(Math.round(v / 1000), 0); };
    var isRows = [['شحنات', 'shipments', function (v) { return n(v, 1); }], ['الإيرادات', 'revenue', K], ['تكلفة البضاعة', 'cogs', K], ['إجمالي الربح', 'grossProfit', K, 1],
      ['عمولات', 'commission', K], ['مصاريف ثابتة', 'overhead', K], ['تأسيس', 'oneTime', K], ['EBITDA', 'ebitda', K, 1], ['إهلاك', 'depreciation', K], ['زكاة', 'zakat', K],
      ['صافي الربح', 'netIncome', K, 1], ['هامش صافي', 'netMargin', function (v) { return n(v * 100, 1) + '%'; }]];
    Q('#isTable').innerHTML = '<thead><tr><th></th>' + Y.map(function (y, i) { return '<th class="n">س' + (i + 1) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      isRows.map(function (r) { return '<tr' + (r[3] ? ' class="tot"' : '') + '><td>' + r[0] + '</td>' + Y.map(function (y) { return '<td class="n">' + r[2](y[r[1]]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>';
    var cfRows = [['تدفق تشغيلي', 'cfo'], ['تدفق استثماري', 'cfi'], ['تدفق تمويلي', 'cff'], ['نقد آخر السنة', 'cash', 1], ['رأس مال عامل', 'nwc']];
    Q('#cfTable').innerHTML = '<thead><tr><th>ألف ر.س</th>' + Y.map(function (y, i) { return '<th class="n">س' + (i + 1) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      cfRows.map(function (r) { return '<tr' + (r[2] ? ' class="tot"' : '') + '><td>' + r[0] + '</td>' + Y.map(function (y) { return '<td class="n">' + K(y[r[1]]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>';
    var inv = res.investor;
    Q('#eqTable').innerHTML = inv.equityTable.map(function (e) { return '<tr><td>' + fmt(e.share, 'pct0') + '</td><td class="n">' + fmt(e.irrBook, 'pct') + '</td><td class="n">' + fmt(e.irrExit, 'pct') + '</td><td class="n">' + n(e.moicBook, 2) + '×</td></tr>'; }).join('');
    Q('#psTable').innerHTML = inv.profitShareTable.map(function (e) { return '<tr><td>' + fmt(e.share, 'pct0') + '</td><td class="n">' + fmt(e.irr, 'pct') + '</td><td class="n">' + n(e.moic, 2) + '×</td></tr>'; }).join('');
  }

  function heat() {
    var s = ctx.p.volume.seasonality;
    var rows = [
      { f: 'موز مصري (النموذج)', v: s.map(function (x) { return x; }), model: true },
      { f: 'برتقال مصري *', v: [2, 2, 2, 2, 1, 0, 0, 0, 0, 0, 0, 2] },
      { f: 'مانجو مصري', v: [0, 0, 0, 0, 0, 1, 3, 3, 3, 3, 3, 0] },
      { f: 'بطيخ مصري', v: [0, 0, 1, 1, 3, 3, 3, 1, 1, 0, 0, 0] }
    ];
    var h = '<div></div>' + MONTHS_AR.map(function (m) { return '<div class="h">' + m + '</div>'; }).join('');
    rows.forEach(function (r) {
      h += '<div class="f">' + r.f + '</div>';
      r.v.forEach(function (x) {
        if (r.model) { var l = x >= 0.95 ? 3 : x >= 0.75 ? 2 : 1; h += '<div class="c l' + l + '">' + n(x, 1) + '</div>'; }
        else h += '<div class="c' + (x ? ' p' + x : '') + '"></div>';
      });
    });
    Q('#heat').innerHTML = h + '<div class="small" style="grid-column:1/-1;margin-top:6px">* برتقال: بداية التصدير ديسمبر (مصدر)؛ نهاية الموسم افتراض.</div>';
  }

  function cycle() {
    var svg = Q('#cycleSvg'); if (!svg) return;
    var t = ctx.p.timing, m = res.metrics;
    var segs = [['تجهيز', t.prepDays], ['شحن', t.transitDays + (t.extraDelayDays || 0)], ['تخليص', t.clearanceDays], ['إنضاج', t.ripeningDays], ['بيع', t.sellingDays], ['تحصيل', t.customerDays]];
    var total = segs.reduce(function (s, x) { return s + x[1]; }, 0) || 1;
    var cx = 310, cy = 262, R = 196, r2 = 140, a0 = -Math.PI / 2, out = '';
    var cols = ['#2E9E74', '#1F7A5A', '#3BAE85', '#7FC2A1', '#CFE7DA', '#E3C27A'];
    function pt(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var a = a0;
    segs.forEach(function (sgm, i) {
      if (!sgm[1]) return;
      var da = sgm[1] / total * Math.PI * 2, b = a + da - 0.02;
      var p1 = pt(R, a), p2 = pt(R, b), large = da > Math.PI ? 1 : 0;
      out += '<path class="arc seg" d="M' + p1 + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p2 + '" stroke="' + cols[i] + '"/>';
      var mid = a + da / 2, lp = pt(R + 46, mid), ip = pt(R, mid);
      out += '<text x="' + lp[0] + '" y="' + lp[1] + '" fill="#FBF8F2" font-size="15" text-anchor="middle" dominant-baseline="middle">' + sgm[0] + '</text>';
      out += '<text x="' + ip[0] + '" y="' + (ip[1] + 1) + '" fill="#0A2C21" font-size="13" font-weight="700" text-anchor="middle" dominant-baseline="middle">' + sgm[1] + 'd</text>';
      a += da;
    });
    // inner ring: money tied up (CCC) vs supplier credit
    var ccc = Math.max(0, m.ccc), frac = Math.min(1, ccc / total);
    var b = a0 + frac * Math.PI * 2 - 0.001, q1 = pt(r2, a0), q2 = pt(r2, b);
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r2 + '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="16"/>';
    out += '<path class="arc money" d="M' + q1 + ' A' + r2 + ' ' + r2 + ' 0 ' + (frac > 0.5 ? 1 : 0) + ' 1 ' + q2 + '" stroke="#C59A3E" style="stroke-width:16"/>';
    out += '<text x="' + cx + '" y="' + (cy - 30) + '" fill="#E3C27A" font-size="18" text-anchor="middle">النقد محبوس</text>';
    out += '<text x="' + cx + '" y="' + (cy + 18) + '" fill="#FBF8F2" font-size="54" font-weight="700" text-anchor="middle">' + n(ccc, 0) + '</text>';
    out += '<text x="' + cx + '" y="' + (cy + 52) + '" fill="rgba(251,248,242,.7)" font-size="16" text-anchor="middle">يوماً · ' + n(m.cyclesPerYear, 1) + ' دورة/سنة</text>';
    out += '<text x="' + cx + '" y="' + (cy + R + 70) + '" fill="rgba(251,248,242,.6)" font-size="13" text-anchor="middle">الحلقة الخارجية: حركة البضاعة · الحلقة الذهبية: حركة الأموال (من الدفع للمورد حتى التحصيل)</text>';
    svg.innerHTML = out;
  }

  // ---------------- charts ----------------
  var charts = {};
  function baseOpts(extra) {
    var o = {
      responsive: true, maintainAspectRatio: false, animation: PRINT ? false : { duration: 900, easing: 'easeOutQuart' },
      plugins: { legend: { rtl: true, position: 'top', align: 'start', labels: { boxWidth: 12, boxHeight: 12, usePointStyle: true, font: { size: 13 } } },
        tooltip: { rtl: true, callbacks: { label: function (c) { var v = c.raw; if (Array.isArray(v)) v = v[1] - v[0]; return (c.dataset.label ? c.dataset.label + ': ' : '') + '\u200E' + n(typeof v === 'object' && v ? (v.y != null ? v.y : v.x) : v, Math.abs(v) < 100 ? 2 : 0); } } } },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 12 } } }, y: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 12 }, callback: function (v) { return '\u200E' + (Math.abs(v) >= 1e6 ? n(v / 1e6, 1) + 'M' : Math.abs(v) >= 1000 ? n(v / 1000, 0) + 'K' : v); } } } }
    };
    return E.merge(o, extra || {});
  }
  function catY(o) { o.scales.y.ticks.callback = function (v) { return this.getLabelForValue(v); }; return o; }
  function mk(id, cfg) {
    if (cfg.options && cfg.options.indexAxis === 'y') catY(cfg.options);
    var el = Q('#' + id); if (!el) return;
    if (charts[id]) { charts[id].data = cfg.data; charts[id].options = cfg.options; charts[id].update(PRINT ? 'none' : undefined); return; }
    charts[id] = new Chart(el, cfg);
  }
  function updateCharts() {
    Chart.defaults.font.family = "'Plex Arabic', Tahoma, sans-serif"; Chart.defaults.color = C.muted;
    var Y = res.years, R = res.R, u = res.unit, yl = ['س1', 'س2', 'س3', 'س4', 'س5'];
    mk('c-exec', { type: 'bar', data: { labels: yl, datasets: [
      { label: 'الإيرادات', data: Y.map(function (y) { return y.revenue; }), backgroundColor: C.emerald, borderRadius: 6, order: 2 },
      { label: 'صافي الربح', data: Y.map(function (y) { return y.netIncome; }), type: 'line', borderColor: C.gold, backgroundColor: C.gold, tension: .35, pointRadius: 5, borderWidth: 3, order: 1 }] }, options: baseOpts() });
    // waterfall per shipped carton
    var cc = u.components, k = ctx.p.shipment.cartonsPerContainer, per = function (v) { return v / k; };
    var steps = [['الموز', cc.fruit], ['التعبئة', cc.packaging], ['الشحن', cc.freight], ['التخليص والرسوم', cc.clearance + cc.duty], ['إنضاج ونقل', cc.ripening + cc.localTransport], ['أخرى', cc.treatment + cc.labor + cc.insurance], ['العمولة', u.commission]];
    var lab = ['الإيراد/كرتون'], dat = [[0, per(u.revenue)]], cols = [C.forest], top = per(u.revenue);
    steps.forEach(function (s) { lab.push(s[0]); dat.push([top - per(s[1]), top]); cols.push(C.gold2); top -= per(s[1]); });
    lab.push('المساهمة'); dat.push([0, top]); cols.push(top >= 0 ? C.emerald2 : C.red);
    mk('c-waterfall', { type: 'bar', data: { labels: lab, datasets: [{ label: 'ر.س/كرتون', data: dat, backgroundColor: cols, borderRadius: 4, barPercentage: .7 }] },
      options: baseOpts({ plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: function (v) { return v; } } } } }) });
    mk('c-cost', { type: 'bar', data: { labels: Object.keys(cc).map(function (x) { return ({ fruit: 'الموز', packaging: 'التعبئة', treatment: 'المعالجة', labor: 'العمالة', freight: 'الشحن', insurance: 'التأمين', clearance: 'التخليص', duty: 'الجمارك', localTransport: 'نقل داخلي', ripening: 'الإنضاج' })[x]; }),
      datasets: [{ label: 'ر.س', data: Object.keys(cc).map(function (x) { return cc[x]; }), backgroundColor: Object.keys(cc).map(function (x, i) { return ['fruit', 'freight', 'packaging', 'clearance'].indexOf(x) >= 0 ? C.emerald : C.gold2; }), borderRadius: 4 }] },
      options: baseOpts({ indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(0,0,0,.06)' } }, y: { grid: { display: false } } } }) });
    var useCols = [C.forest, C.emerald, C.emerald2, '#7FC2A1', C.gold, C.gold2, '#9C8B6A', C.beige];
    var uses = res.uses.items.filter(function (i) { return i.v > 0.5; });
    var uData = { labels: uses.map(function (i) { return i.ar; }), datasets: [{ data: uses.map(function (i) { return i.v; }), backgroundColor: useCols, borderWidth: 0 }] };
    mk('c-uses-d', { type: 'doughnut', data: uData, options: { responsive: true, maintainAspectRatio: false, cutout: '62%', animation: PRINT ? false : { animateRotate: true, duration: 1100 },
      plugins: { legend: { position: 'bottom', rtl: true, labels: { color: 'rgba(251,248,242,.8)', boxWidth: 10, font: { size: 11.5 } } }, tooltip: { rtl: true } } } });
    mk('c-uses', { type: 'bar', data: { labels: uses.map(function (i) { return i.ar.split(' (')[0]; }), datasets: [{ label: 'ر.س', data: uses.map(function (i) { return i.v; }), backgroundColor: useCols, borderRadius: 4 }] },
      options: baseOpts({ indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(0,0,0,.06)' } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } }) });
    var m12 = MONTHS_AR.map(function (m) { return m.slice(0, 5); });
    mk('c-monthly', { type: 'bar', data: { labels: m12, datasets: [
      { label: 'الإيرادات', data: R.revenue.slice(0, 12), backgroundColor: C.emerald, borderRadius: 4, order: 2 },
      { label: 'صافي الربح', data: R.netIncome.slice(0, 12), type: 'line', borderColor: C.gold, backgroundColor: C.gold, tension: .3, borderWidth: 2.5, pointRadius: 3, order: 1 }] }, options: baseOpts() });
    mk('c-annual', { type: 'bar', data: { labels: yl, datasets: [
      { label: 'الإيرادات', data: Y.map(function (y) { return y.revenue; }), backgroundColor: C.forest, borderRadius: 4 },
      { label: 'إجمالي الربح', data: Y.map(function (y) { return y.grossProfit; }), backgroundColor: C.emerald2, borderRadius: 4 },
      { label: 'صافي الربح', data: Y.map(function (y) { return y.netIncome; }), backgroundColor: C.gold, borderRadius: 4 }] }, options: baseOpts() });
    var ml = R.month.map(function (x) { return 'ش' + x; });
    mk('c-cash', { type: 'line', data: { labels: ml, datasets: [
      { label: 'الرصيد النقدي', data: R.cash, borderColor: C.emerald, backgroundColor: 'rgba(31,122,90,.10)', fill: true, tension: .3, pointRadius: 0, borderWidth: 2.5 },
      { label: 'رأس المال العامل', data: R.ar.map(function (a, i) { return a + R.inventory[i] - R.ap[i] - R.commPayable[i]; }), borderColor: C.gold, pointRadius: 0, borderWidth: 2, tension: .3 },
      { label: 'الاحتياطي', data: R.cash.map(function () { return res.metrics.reserve; }), borderColor: C.red, borderDash: [6, 6], pointRadius: 0, borderWidth: 1.5 }] },
      options: baseOpts({ scales: { x: { ticks: { maxTicksLimit: 10 } } } }) });
    mk('c-dist', { type: 'bar', data: { labels: yl, datasets: [
      { label: 'صافي الربح', data: Y.map(function (y) { return y.netIncome; }), backgroundColor: C.emerald, borderRadius: 4 },
      { label: 'توزيعات مدفوعة خلال السنة', data: Y.map(function (y) { return y.dividends; }), backgroundColor: C.gold, borderRadius: 4 },
      { label: 'نقد آخر السنة', data: Y.map(function (y) { return y.cash; }), type: 'line', borderColor: C.forest, pointRadius: 4, borderWidth: 2, tension: .3 }] }, options: baseOpts() });
    var sc = scenStatic, scCols = { conservative: C.red, base: C.emerald, optimistic: C.gold };
    mk('c-scen', { type: 'line', data: { labels: yl, datasets: Object.keys(sc).map(function (k2) {
      return { label: sc[k2].labelAr + ' (رأس مال ' + fmt(sc[k2].metrics.requiredCapital, 'k') + ')', data: sc[k2].years.map(function (y) { return y.netIncome; }), borderColor: scCols[k2], backgroundColor: scCols[k2], borderWidth: k2 === state.scn ? 4 : 2, pointRadius: 4, tension: .3 }; }) }, options: baseOpts() });
    var ohM = R.overhead.map(function (o, i) { return i + 1 < ctx.p.volume.launchMonth ? null : o / u.contribution; });
    mk('c-be', { type: 'bar', data: { labels: ml, datasets: [
      { label: 'الشحنات المخططة', data: R.shipments, backgroundColor: R.shipments.map(function (s, i) { return ohM[i] != null && s >= ohM[i] ? C.emerald : C.gold2; }), borderRadius: 2, order: 2 },
      { label: 'شحنات التعادل', data: ohM, type: 'line', borderColor: C.red, borderDash: [5, 5], pointRadius: 0, borderWidth: 2, order: 1 }] },
      options: baseOpts({ scales: { x: { ticks: { maxTicksLimit: 12 } }, y: { ticks: { callback: function (v) { return v; } } } } }) });
    var rows = sens.rows.slice().sort(function (a, b) { return a.dNi5y - b.dNi5y; });
    mk('c-tornado', { type: 'bar', data: { labels: rows.map(function (r) { return r.ar; }), datasets: [{ label: 'التغير (ألف ر.س)', data: rows.map(function (r) { return r.dNi5y / 1000; }), backgroundColor: rows.map(function (r) { return r.dNi5y < 0 ? C.red : C.emerald; }), borderRadius: 4 }] },
      options: baseOpts({ indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { callback: function (v) { return '\u200E' + n(v, 0); } } }, y: { grid: { display: false }, ticks: { font: { size: 12 } } } } }) });
  }

  // ---------------- slides & navigation ----------------
  var slides = QA('.slide'), cur = 0;
  function setScale() {
    var w = window.innerWidth, h = window.innerHeight;
    var reader = !PRINT && (w < 760 || (w < 1024 && h > w * 1.1));
    document.body.classList.toggle('reader', reader);
    var st = Q('#stage');
    if (reader || PRINT) { st.style.transform = ''; return; }
    var s = Math.min(w / 1600, h / 900); st.style.transform = 'scale(' + s + ')';
  }
  function animateIn(sl) {
    if (!hasGsap || PRINT || document.body.classList.contains('reader')) return;
    var items = QA('.head, .kpi, .card, .step, .meta > *, .heat, .cycle', sl).filter(function (el) { return !el.closest('.kpis .kpi .kpi'); });
    gsap.fromTo(items, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .045, ease: 'power3.out', clearProps: 'transform,opacity' });
    QA('canvas', sl).forEach(function (cv) { var ch = charts[cv.id]; if (ch) { ch.reset(); ch.update(); } });
    var fl = Q('.flowline', sl); if (fl) gsap.fromTo(fl, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'power2.inOut' });
    QA('.arc.seg', sl).forEach(function (pth, i) { var L = pth.getTotalLength(); gsap.fromTo(pth, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: .5, delay: .15 + i * .18, ease: 'power1.out' }); });
    QA('.arc.money', sl).forEach(function (pth) { var L = pth.getTotalLength(); gsap.fromTo(pth, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.6, delay: .3, ease: 'power2.inOut' }); });
    var orb = Q('.orbit path', sl); if (orb) gsap.fromTo(orb, { strokeDashoffset: 200 }, { strokeDashoffset: 0, duration: 6, repeat: -1, ease: 'none' });
    QA('.count', sl).forEach(function (el) {
      var v = get(el.dataset.k), f = el.dataset.f; if (typeof v !== 'number' || !isFinite(v)) return;
      var o = { x: 0 }; gsap.to(o, { x: v, duration: 1.3, ease: 'power2.out', onUpdate: function () { el.textContent = fmt(o.x, f); } });
    });
  }
  function go(i, instant) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    var prev = slides[cur], next = slides[i], dir = i > cur ? 1 : -1;
    if (prev !== next) {
      prev.classList.remove('active');
      if (hasGsap && !instant && !PRINT) {
        gsap.fromTo(prev, { opacity: 1, x: 0, visibility: 'visible' }, { opacity: 0, x: 60 * dir, duration: .45, ease: 'power2.in', onComplete: function () { gsap.set(prev, { clearProps: 'all' }); } });
        gsap.fromTo(next, { opacity: 0, x: -60 * dir }, { opacity: 1, x: 0, duration: .6, ease: 'power3.out', clearProps: 'transform' });
      }
    }
    next.classList.add('active'); cur = i;
    Q('#counter').textContent = (i + 1) + ' / ' + slides.length;
    Q('#progress').style.width = ((i + 1) / slides.length * 100) + '%';
    if (location.hash !== '#' + (i + 1)) history.replaceState(null, '', '#' + (i + 1));
    animateIn(next);
  }
  function nextS() { go(cur + 1); } function prevS() { go(cur - 1); }

  // ---------------- control panel ----------------
  var CTRL = [
    ['الاستثمار', [['finance.initialInvestment', 'رأس المال المستثمر (ر.س)', 200000, 2500000, 25000, 'sar']]],
    ['الأسعار', [['shipment.buyPricePerTon', 'سعر شراء الموز (ر.س/طن)', 400, 1000, 5, 'n1'], ['shipment.sellPricePerCarton', 'سعر بيع الكرتون (ر.س)', 35, 65, 0.5, 'n1'], ['shipment.fxEGPperSAR', 'سعر الصرف (جنيه/ريال)', 10, 20, 0.1, 'n1']]],
    ['الكميات والنمو', [['volume.y1TargetContainers', 'شحنات/شهر نهاية السنة 1', 1, 8, 0.5, 'n1'], ['volume.monthlyGrowth', 'النمو الشهري للمبيعات بعد س1', 0, 0.04, 0.001, 'pct1']]],
    ['تكاليف الشحنة', [['shipment.freight', 'تكلفة الشحن (ر.س/شحنة)', 8000, 28000, 250, 'sar'], ['shipment.clearance', 'تخليص وتصديق (ر.س/شحنة)', 2000, 12000, 250, 'sar'],
      ['shipment.dutyRate', 'الرسوم الجمركية', 0, 0.1, 0.005, 'pct1'], ['shipment.ripeningStorage', 'تخزين وإنضاج (ر.س/شحنة)', 0, 8000, 100, 'sar'], ['shipment.spoilageRate', 'نسبة التلف', 0, 0.25, 0.005, 'pct1']]],
    ['شروط الدفع والوقت', [['timing.customerDays', 'مدة تحصيل العملاء (يوم)', 0, 90, 1, 'n0'], ['timing.supplierDays', 'مدة السداد للمورد (يوم)', 0, 60, 1, 'n0'], ['timing.extraDelayDays', 'تأخير الشحن (يوم)', 0, 20, 1, 'n0']]],
    ['المصاريف والتوزيع', [['opexScale', 'المصاريف التشغيلية الثابتة (× الأساس)', 0.5, 1.5, 0.05, 'x'], ['finance.payoutRatio', 'نسبة توزيع الأرباح', 0, 1, 0.05, 'pct0']]]
  ];
  function ctrlValue(key) {
    if (key in state.ctrl) return state.ctrl[key];
    if (key === 'opexScale') return 1;
    if (key === 'finance.initialInvestment') return res ? res.metrics.capital : 650000;
    var p = E.scenarioParams(state.scn), parts = key.split('.'); return p[parts[0]][parts[1]];
  }
  function ctrlFmt(v, f) { return f === 'x' ? n(v, 2) + '×' : fmt(v, f); }
  function buildPanel() {
    var h = '';
    CTRL.forEach(function (g) {
      h += '<fieldset><legend>' + g[0] + '</legend>';
      g[1].forEach(function (c) {
        var v = ctrlValue(c[0]);
        h += '<div class="ctrl"><label for="i-' + c[0] + '">' + c[1] + '<output id="o-' + c[0] + '">' + ctrlFmt(v, c[5]) + '</output></label>' +
          '<input type="range" id="i-' + c[0] + '" data-key="' + c[0] + '" data-f="' + c[5] + '" min="' + c[2] + '" max="' + c[3] + '" step="' + c[4] + '" value="' + v + '"' + (c[0] === 'finance.initialInvestment' && state.autoCapital ? ' disabled' : '') + '>' +
          (c[0] === 'finance.initialInvestment' ? '<div class="chk"><input type="checkbox" id="autoCap"' + (state.autoCapital ? ' checked' : '') + '><label for="autoCap">احسب رأس المال المطلوب تلقائياً</label></div>' : '') + '</div>';
      });
      h += '</fieldset>';
    });
    Q('#ctrls').innerHTML = h;
    QA('#ctrls input[type=range]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var key = inp.dataset.key, v = parseFloat(inp.value);
        state.ctrl[key] = v; document.getElementById('o-' + key).textContent = ctrlFmt(v, inp.dataset.f); schedule();
      });
    });
    Q('#autoCap').addEventListener('change', function (e) {
      state.autoCapital = e.target.checked;
      var inp = document.getElementById('i-finance.initialInvestment'); inp.disabled = state.autoCapital;
      if (!state.autoCapital) state.ctrl['finance.initialInvestment'] = parseFloat(inp.value); else delete state.ctrl['finance.initialInvestment'];
      schedule();
    });
  }
  function syncCapSlider() {
    if (!state.autoCapital) return;
    var inp = document.getElementById('i-finance.initialInvestment'); if (!inp) return;
    inp.value = res.metrics.capital; document.getElementById('o-finance.initialInvestment').textContent = fmt(res.metrics.capital, 'sar');
  }
  var timer;
  function schedule() { clearTimeout(timer); timer = setTimeout(function () { compute(); bindAll(false); syncCapSlider(); }, 90); }
  function setScenario(s) {
    state.scn = s; state.ctrl = {}; state.autoCapital = true;
    QA('#scenarioPill button').forEach(function (b) { b.classList.toggle('on', b.dataset.scn === s); });
    compute(); buildPanel(); bindAll(true); syncCapSlider();
  }

  // ---------------- UI wiring ----------------
  function togglePanel(open) { Q('#panel').classList.toggle('open', open == null ? !Q('#panel').classList.contains('open') : open); }
  function toggleGrid() {
    var ov = Q('#overview');
    if (!ov.innerHTML) ov.innerHTML = slides.map(function (s, i) { return '<button data-i="' + i + '"><b>' + String(i + 1).padStart(2, '0') + '</b><span>' + s.dataset.title + '</span></button>'; }).join('');
    ov.classList.toggle('open');
  }
  function fullscreen() { if (!document.fullscreenElement) (document.documentElement.requestFullscreen || function () {}).call(document.documentElement); else document.exitFullscreen(); }
  function doPrint() {
    document.body.classList.add('printing');
    Object.keys(charts).forEach(function (k) { charts[k].resize(); });
    setTimeout(function () { window.print(); }, 300);
  }
  window.addEventListener('afterprint', function () { if (!PRINT) { document.body.classList.remove('printing'); setScale(); Object.keys(charts).forEach(function (k) { charts[k].resize(); }); } });

  function wire() {
    Q('#btnNext').onclick = nextS; Q('#btnPrev').onclick = prevS;
    Q('#btnPanel').onclick = function () { togglePanel(); }; Q('#panelClose').onclick = Q('#panelDone').onclick = function () { togglePanel(false); };
    Q('#reset').onclick = function () { setScenario(state.scn); };
    Q('#btnGrid').onclick = toggleGrid; Q('#btnFull').onclick = fullscreen; Q('#btnPrint').onclick = doPrint;
    Q('#btnHelp').onclick = function () { Q('#help').classList.toggle('open'); };
    Q('#overview').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { Q('#overview').classList.remove('open'); go(+b.dataset.i); } });
    QA('#scenarioPill button').forEach(function (b) { b.onclick = function () { setScenario(b.dataset.scn); }; });
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT') return;
      var k = e.key;
      if (['ArrowLeft', 'ArrowDown', 'PageDown', ' ', 'Enter'].indexOf(k) >= 0) { e.preventDefault(); nextS(); }
      else if (['ArrowRight', 'ArrowUp', 'PageUp', 'Backspace'].indexOf(k) >= 0) { e.preventDefault(); prevS(); }
      else if (k === 'Home') go(0); else if (k === 'End') go(slides.length - 1);
      else if (k === 'f' || k === 'F') fullscreen(); else if (k === 'p' || k === 'P') togglePanel();
      else if (k === 'g' || k === 'G') toggleGrid(); else if (k === 'Escape') { togglePanel(false); Q('#overview').classList.remove('open'); Q('#help').classList.remove('open'); }
      else if (k === '1') setScenario('conservative'); else if (k === '2') setScenario('base'); else if (k === '3') setScenario('optimistic');
    });
    var tx = null;
    document.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (tx == null || document.body.classList.contains('reader')) return;
      var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 50) { if (dx > 0) nextS(); else prevS(); } tx = null;
    });
    window.addEventListener('resize', function () { setScale(); });
    window.addEventListener('hashchange', function () { var h = parseInt(location.hash.slice(1), 10); if (h && h - 1 !== cur) go(h - 1); });
  }

  // ---------------- boot ----------------
  if (PRINT) document.body.classList.add('printing');
  if (params.get('scn') && E.SCENARIOS[params.get('scn')]) state.scn = params.get('scn');
  QA('#scenarioPill button').forEach(function (b) { b.classList.toggle('on', b.dataset.scn === state.scn); });
  compute(); buildPanel(); setScale(); bindAll(false); syncCapSlider(); wire();
  var start = parseInt(location.hash.slice(1), 10);
  go(start ? start - 1 : 0, true);
  window.__deck = { go: go, state: state, get res() { return res; }, setScenario: setScenario, charts: charts, ready: true };
})();
