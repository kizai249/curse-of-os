/*!
 * Fruit Import — Financial Engine (single source of truth)
 * Sudanese bananas → Jeddah, packaging materials sourced from Egypt.
 * ---------------------------------------------------------------
 * Every number shown in the pitch deck, control panel, feasibility study,
 * investor PDFs and the Excel snapshot comes from this one engine.
 * The Excel model (02_Financial_Model) re-implements the same logic with
 * live formulas; the QA script recalculates it and compares it to this file.
 *
 * Units: SAR unless stated. Time step: month (60 months = 5 years).
 * Flows that happen "N days later" are distributed between month floor(N/30)
 * and the following month (linear lag-distribution approximation).
 * Capital is fixed (default SAR 100,000). When `volume.cashConstrained` is on,
 * the shipments bought in a month are capped by the cash available at the start
 * of that month after the month's overheads and the emergency reserve — the
 * business grows only as fast as its own cash allows.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FruitEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MONTHS = 60;

  function defaults() {
    return {
      meta: { startYear: 2027, startMonth: 1, currency: 'SAR', scenario: 'base', origin: 'Sudan' },
      shipment: {
        cartonsPerContainer: 1700,      // IMG
        cartonKg: 13.5,                 // CLIENT: carton holds 13–14 kg
        tonsPerContainer: 32,           // IMG: 32 t bananas bought (field weight)
        buyPricePerTon: 637.5,          // IMG: 20,400 / 32 (SAR, paid in Sudan)
        fxEGPperSAR: 14.0,              // ASSUMPTION (image used 14.90; Oct-2026 ≈ 52.4 EGP/USD ÷ 3.75)
        treatment: 350,                 // IMG
        labor: 500,                     // IMG: labour in Sudan
        freight: 16000,                 // IMG: reefer Sudan → Jeddah
        clearance: 6000,                // IMG
        coordination: 1000,             // ASSUMPTION: Sudan agent / coordination per shipment
        dutyRate: 0,                    // ASSUMPTION: GAFTA Arab-origin exemption (verify)
        localTransport: 1500,           // ASSUMPTION
        ripeningStorage: 2500,          // ASSUMPTION (outsourced ripening rooms + cold storage)
        cargoInsuranceRate: 0.003,      // ASSUMPTION
        salesCommissionRate: 0.03,      // ASSUMPTION
        spoilageRate: 0.05,             // ASSUMPTION (image assumes 0%)
        sellPricePerCarton: 50,         // IMG
        delayStorageCostPerDay: 250,    // ASSUMPTION
        spoilagePerDelayDay: 0.003      // ASSUMPTION
      },
      // Packaging bill of materials (bought in Egypt, EGP, ex-factory) — CLIENT data
      packaging: {
        cartonPriceEGP: 44,             // per carton
        bagPriceEGPperKg: 110,          // per kg of bags
        bagsPerKg: 40,                  // ≈40 bags per kg
        bagsPerCarton: 45 * 40 / 1700,  // image buys 45 kg = 1,800 bags ≈ 1 bag/carton + 6% spare
        foamRollPriceEGP: 430,          // roll 100 cm × 100 m, 2 mm
        foamPiecesPerRoll: 666,         // at 50 × 30 cm
        foamPiecesPerCarton: 15 * 666 / 1700, // image buys 15 rolls ⇒ ≈5.9 pieces per carton (confirm)
        cornerPaperEGPperM: 24,         // per metre
        cornerPaperMeters: 250,         // per reefer
        strapEGPperTon: 27000,          // plastic strap
        strapKg: 20,                    // per reefer
        clipEGPperKg: 45,               // steel clips
        clipKg: 1,                      // per reefer
        transportEGP: 15000             // packaging transport Egypt → Sudan & other
      },
      volume: {
        launchMonth: 2, startContainers: 1, y1TargetContainers: 2,
        monthlyGrowth: 0.015, maxContainers: 6, cashConstrained: true,
        // Sudan banana supply index Jan..Dec — scarce Nov–Feb (FAO/AGRIS study); rest ASSUMPTION
        seasonality: [0.6, 0.6, 0.9, 1.0, 1.0, 1.0, 0.9, 0.9, 1.0, 1.0, 0.7, 0.6]
      },
      timing: {
        prepDays: 4, transitDays: 2, clearanceDays: 2, ripeningDays: 5, sellingDays: 5,
        extraDelayDays: 0, customerDays: 10, supplierDays: 0
      },
      overhead: {
        salaries: 8500, benefitsRate: 0.10, rent: 300, utilitiesIT: 400, marketing: 500,
        travel: 1000, insurance: 150, professionalFees: 500, misc: 400,
        preLaunchFactor: 0.6, annualGrowth: 0.10
      },
      oneTime: { establishment: 8000, launchMarketing: 2000 },
      capex: { officeIT: 3000, equipment: 2000, strappingMachineEGP: 7000, usefulLifeYears: 4 },
      deposits: { supplierDeposit: 0 },
      finance: {
        initialInvestment: 100000,     // CLIENT: capital fixed at SAR 100,000 (null = engine computes)
        discountRate: 0.20, payoutRatio: 0.5, dividendMonth: 4, zakatRate: 0.025,
        exitMultipleNI: 3, reserveMonthsOverhead: 1, reserveContainers: 0, capitalRounding: 25000
      },
      shocks: { buyPriceChange: 0, sellPriceChange: 0, freightChange: 0, volumeChange: 0 },
      investor: { equityShare: 0.5, profitShare: 0.6, targetIRR: 0.25 }
    };
  }

  var SCENARIOS = {
    conservative: {
      label: 'Conservative', labelAr: 'متحفظ',
      shipment: { sellPricePerCarton: 46, spoilageRate: 0.08, buyPricePerTon: 669.375, freight: 17600 },
      volume: { y1TargetContainers: 1.5, monthlyGrowth: 0.01 },
      timing: { customerDays: 20, extraDelayDays: 3 }
    },
    base: { label: 'Base Case', labelAr: 'الأساسي' },
    optimistic: {
      label: 'Optimistic', labelAr: 'متفائل',
      shipment: { sellPricePerCarton: 52, spoilageRate: 0.03 },
      volume: { y1TargetContainers: 3, monthlyGrowth: 0.025 },
      timing: { customerDays: 7 }
    }
  };

  // ---------- helpers ----------
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(t, s) {
    if (!s) return t;
    Object.keys(s).forEach(function (k) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && t[k] && typeof t[k] === 'object') merge(t[k], s[k]);
      else t[k] = s[k];
    });
    return t;
  }
  function scenarioParams(name, overrides) {
    var p = defaults();
    var sc = clone(SCENARIOS[name] || {});
    delete sc.label; delete sc.labelAr;
    merge(p, sc);
    p.meta.scenario = name;
    if (overrides) merge(p, clone(overrides));
    return p;
  }
  function zeros(n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = 0; return a; }
  function distAt(arr, lagMonths, m) {
    var k = Math.floor(lagMonths), f = lagMonths - k;
    var a = m - k >= 0 ? arr[m - k] : 0, b = m - k - 1 >= 0 ? arr[m - k - 1] : 0;
    return a * (1 - f) + b * f;
  }
  function dist(arr, lagMonths) { var out = zeros(arr.length); for (var m = 0; m < arr.length; m++) out[m] = distAt(arr, lagMonths, m); return out; }
  function sum(a, from, to) { var s = 0; for (var i = from || 0; i < (to == null ? a.length : to); i++) s += a[i]; return s; }
  function npv(rate, flows) { var v = 0; for (var i = 0; i < flows.length; i++) v += flows[i] / Math.pow(1 + rate, i); return v; }
  function irr(flows) {
    var lo = -0.99, hi = 10, flo = npv(lo, flows), fhi = npv(hi, flows);
    if (isNaN(flo) || isNaN(fhi) || flo * fhi > 0) return null;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2, fm = npv(mid, flows);
      if (Math.abs(fm) < 1e-7) return mid;
      if (fm * flo > 0) { lo = mid; flo = fm; } else { hi = mid; }
    }
    return (lo + hi) / 2;
  }

  // ---------- packaging bill of materials (per shipment) ----------
  function packagingBOM(p) {
    var k = p.packaging, c = p.shipment.cartonsPerContainer, fx = p.shipment.fxEGPperSAR;
    var bagKg = c * k.bagsPerCarton / k.bagsPerKg;
    var foamRolls = c * k.foamPiecesPerCarton / k.foamPiecesPerRoll;
    var lines = [
      { key: 'cartons', ar: 'كراتين (13–14 كجم)', en: 'Cartons (13–14 kg)', qty: c, unit: 'كرتون', priceEGP: k.cartonPriceEGP, basis: 'لكل كرتون' },
      { key: 'bags', ar: 'أكياس', en: 'Bags', qty: bagKg, unit: 'كجم', priceEGP: k.bagPriceEGPperKg, basis: '≈' + k.bagsPerKg + ' كيس/كجم' },
      { key: 'foam', ar: 'فوم فواصل 2 مم', en: 'Foam separators 2 mm', qty: foamRolls, unit: 'لفة', priceEGP: k.foamRollPriceEGP, basis: k.foamPiecesPerRoll + ' قطعة 50×30 لكل لفة' },
      { key: 'corner', ar: 'زوايا ورق تثبيت', en: 'Corner paper', qty: k.cornerPaperMeters, unit: 'متر', priceEGP: k.cornerPaperEGPperM, basis: 'حسب طول البراد' },
      { key: 'strap', ar: 'شريط ربط بلاستيك', en: 'Plastic strap', qty: k.strapKg, unit: 'كجم', priceEGP: k.strapEGPperTon / 1000, basis: k.strapEGPperTon.toLocaleString('en-US') + ' جنيه/طن' },
      { key: 'clips', ar: 'كلبسات ربط حديد', en: 'Steel clips', qty: k.clipKg, unit: 'كجم', priceEGP: k.clipEGPperKg, basis: '≈1 كجم/براد' },
      { key: 'transport', ar: 'نقل المواد من مصر للسودان وأخرى', en: 'Transport Egypt → Sudan & other', qty: 1, unit: 'رحلة', priceEGP: k.transportEGP, basis: 'لكل شحنة' }
    ];
    var totalEGP = 0;
    lines.forEach(function (l) { l.totalEGP = l.qty * l.priceEGP; l.totalSAR = l.totalEGP / fx; totalEGP += l.totalEGP; });
    return { lines: lines, totalEGP: totalEGP, totalSAR: totalEGP / fx, perCartonSAR: totalEGP / fx / c,
      bagsPerCarton: k.bagsPerCarton, foamPiecesPerCarton: k.foamPiecesPerCarton };
  }

  // ---------- unit economics (one container / shipment) ----------
  function unitEconomics(p) {
    var s = p.shipment, sh = p.shocks, t = p.timing;
    var delay = t.extraDelayDays || 0;
    var bom = packagingBOM(p);
    var fruit = s.tonsPerContainer * s.buyPricePerTon * (1 + sh.buyPriceChange);
    var packaging = bom.totalSAR;
    var freight = s.freight * (1 + sh.freightChange);
    var insurance = s.cargoInsuranceRate * (fruit + packaging + freight);
    var duty = s.dutyRate * (fruit + packaging + freight + insurance);
    var ripening = s.ripeningStorage + delay * s.delayStorageCostPerDay;
    var c = {
      fruit: fruit, packaging: packaging, treatment: s.treatment, labor: s.labor, coordination: s.coordination, freight: freight,
      insurance: insurance, clearance: s.clearance, duty: duty, localTransport: s.localTransport, ripening: ripening
    };
    var landed = 0; Object.keys(c).forEach(function (k) { landed += c[k]; });
    var spoil = Math.min(0.9, s.spoilageRate + delay * s.spoilagePerDelayDay);
    var cartonsSold = s.cartonsPerContainer * (1 - spoil);
    var price = s.sellPricePerCarton * (1 + sh.sellPriceChange);
    var revenue = cartonsSold * price;
    var commission = s.salesCommissionRate * revenue;
    var grossProfit = revenue - landed;
    var contribution = grossProfit - commission;
    var packedTons = s.cartonsPerContainer * s.cartonKg / 1000;
    return {
      components: c, bom: bom, landed: landed, landedPerCarton: landed / s.cartonsPerContainer,
      landedPerSoldCarton: landed / cartonsSold, spoilage: spoil, cartonsSold: cartonsSold,
      packedTons: packedTons, packOut: packedTons / s.tonsPerContainer, pricePerKg: (s.sellPricePerCarton * (1 + sh.sellPriceChange)) / s.cartonKg,
      price: price, revenue: revenue, commission: commission, grossProfit: grossProfit,
      grossMargin: revenue ? grossProfit / revenue : 0, contribution: contribution,
      contributionMargin: revenue ? contribution / revenue : 0,
      lagDays: {
        fruit: t.supplierDays, packaging: t.supplierDays, treatment: 0, labor: 0, coordination: 0,
        freight: t.prepDays, insurance: t.prepDays,
        clearance: t.prepDays + t.transitDays + delay, duty: t.prepDays + t.transitDays + delay,
        localTransport: t.prepDays + t.transitDays + t.clearanceDays + delay,
        ripening: t.prepDays + t.transitDays + t.clearanceDays + delay
      }
    };
  }

  function overheadMonthlyBase(p) {
    var o = p.overhead;
    return o.salaries * (1 + o.benefitsRate) + o.rent + o.utilitiesIT + o.marketing + o.travel +
      o.insurance + o.professionalFees + o.misc;
  }

  function shipmentsPlan(p) {
    var v = p.volume, out = zeros(MONTHS);
    for (var m = 0; m < MONTHS; m++) {
      var mn = m + 1, base;
      if (mn < v.launchMonth) base = 0;
      else if (mn <= 12) base = v.launchMonth >= 12 ? v.y1TargetContainers :
        v.startContainers + (v.y1TargetContainers - v.startContainers) * (mn - v.launchMonth) / (12 - v.launchMonth);
      else base = v.y1TargetContainers * Math.pow(1 + v.monthlyGrowth, mn - 12);
      base = Math.min(v.maxContainers, base);
      var cal = (p.meta.startMonth - 1 + m) % 12;
      out[m] = Math.max(0, base * v.seasonality[cal] * (1 + p.shocks.volumeChange));
    }
    return out;
  }

  function reserveTarget(p, ue) {
    return p.finance.reserveMonthsOverhead * overheadMonthlyBase(p) + p.finance.reserveContainers * ue.landed;
  }

  // ---------- core monthly simulation ----------
  function simulate(p, capital, opts) {
    opts = opts || {};
    var constrained = opts.unconstrained ? false : !!p.volume.cashConstrained;
    var ue = unitEconomics(p), t = p.timing, f = p.finance, o = p.overhead;
    var delay = t.extraDelayDays || 0;
    var daysToSale = t.prepDays + t.transitDays + t.clearanceDays + t.ripeningDays + t.sellingDays + delay;
    var Ls = daysToSale / 30, Lc = (daysToSale + t.customerDays) / 30;
    var plan = shipmentsPlan(p);
    var ship = zeros(MONTHS), cap = zeros(MONTHS);
    var keys = Object.keys(ue.components);
    var ohBase = overheadMonthlyBase(p);
    var strap = p.capex.strappingMachineEGP / p.shipment.fxEGPperSAR;
    var capexTotal = p.capex.officeIT + p.capex.equipment + strap;
    var depMonthly = capexTotal / (p.capex.usefulLifeYears * 12);
    var reserve = reserveTarget(p, ue);
    // cash a shipment needs inside its own purchase month (payments due that month − collections received that month)
    function wIn(L) { return Math.floor(L) === 0 ? 1 - (L - Math.floor(L)) : 0; }
    var netOutPerUnit = 0;
    keys.forEach(function (k) { netOutPerUnit += ue.components[k] * wIn(ue.lagDays[k] / 30); });
    netOutPerUnit -= (ue.revenue - ue.commission) * wIn(Lc);
    netOutPerUnit = Math.max(1, netOutPerUnit);

    var R = {
      month: [], plan: plan, shipments: ship, capacity: cap, sold: [], revenue: [], cogs: [], grossProfit: [], commission: [],
      overhead: [], oneTime: [], ebitda: [], depreciation: [], ebit: [], zakat: [], netIncome: [],
      collections: [], supplierPayments: [], commissionPaid: [],
      capex: [], deposits: [], equityIn: [], dividends: [], zakatPaid: [],
      cfo: [], cfi: [], cff: [], netCash: [], cash: [], ar: [], inventory: [], depositsBal: [], netFA: [],
      ap: [], commPayable: [], zakatPayable: [], paidIn: [], retained: [], totalAssets: [], totalLE: [], balanceCheck: []
    };
    var cash = 0, cumRev = 0, cumColl = 0, cumInc = 0, cumCogs = 0, cumPaid = 0, cumComm = 0, cumCommPaid = 0;
    var zakPay = 0, paidIn = 0, retained = 0, grossFA = 0, accDep = 0, depBal = 0, yearNI = 0, prevYearNI = 0;
    var pendingZakat = {};
    var prev = { ar: 0, inv: 0, ap: 0, cp: 0, zp: 0 };
    for (var m = 0; m < MONTHS; m++) {
      var yr = Math.floor(m / 12), mo = m % 12;
      var oh = ohBase * Math.pow(1 + o.annualGrowth, yr) * (m + 1 < p.volume.launchMonth ? o.preLaunchFactor : 1);
      var one = (m === 0 ? p.oneTime.establishment : 0) + (m === Math.max(0, p.volume.launchMonth - 2) ? p.oneTime.launchMarketing : 0);
      var cx = m === 0 ? capexTotal : 0;
      var dp = m === 0 ? p.deposits.supplierDeposit : 0;
      var eq = m === 0 ? capital : 0;
      // shipments this month: the plan, capped so that month-end cash stays >= reserve.
      // known flows = this month's collections/payments from EARLIER shipments (ship[m] is still 0 here)
      var zPaidNow = pendingZakat[m] || 0;
      var knownIn = distAt(ship, Lc, m) * (ue.revenue - ue.commission);
      var knownOut = 0;
      for (var kj = 0; kj < keys.length; kj++) knownOut += distAt(ship, ue.lagDays[keys[kj]] / 30, m) * ue.components[keys[kj]];
      cap[m] = Math.max(0, (cash + eq - cx - dp - oh - one - zPaidNow + knownIn - knownOut - reserve) / netOutPerUnit);
      ship[m] = constrained ? Math.max(0, Math.min(plan[m], cap[m])) : plan[m];
      var sold = distAt(ship, Ls, m);
      var revenue = sold * ue.revenue, cogs = sold * ue.landed, commission = sold * ue.commission;
      var incurred = ship[m] * ue.landed;
      var collections = distAt(ship, Lc, m) * ue.revenue;
      var commPaid = distAt(ship, Lc, m) * ue.commission;
      var payments = 0;
      for (var ki = 0; ki < keys.length; ki++) payments += distAt(ship, ue.lagDays[keys[ki]] / 30, m) * ue.components[keys[ki]];
      grossFA += cx;
      var dep = Math.min(depMonthly, grossFA - accDep); accDep += dep;
      var gp = revenue - cogs;
      var ebitda = gp - commission - oh - one;
      var ebit = ebitda - dep;
      var zakat = 0;
      if (mo === 11) {
        var eqPre = paidIn + eq + retained + ebit;
        var base = Math.max(0, eqPre - (grossFA - accDep) - (depBal + dp));
        zakat = f.zakatRate * base;
        pendingZakat[m + f.dividendMonth] = zakat;
      }
      var ni = ebit - zakat;
      yearNI += ni;
      var zPaid = pendingZakat[m] || 0;
      zakPay += zakat - zPaid;
      cumRev += revenue; cumColl += collections; cumInc += incurred; cumCogs += cogs;
      cumPaid += payments; cumComm += commission; cumCommPaid += commPaid;
      var opCash = collections - payments - commPaid - oh - one - zPaid;
      var cashPre = cash + opCash - cx - dp + eq;
      var div = 0;
      if (yr >= 1 && mo === f.dividendMonth - 1 && prevYearNI > 0) {
        div = Math.max(0, Math.min(f.payoutRatio * prevYearNI, cashPre - reserve));
      }
      cash = cashPre - div;
      paidIn += eq; retained += ni - div; depBal += dp;
      var ar = cumRev - cumColl, inv = cumInc - cumCogs, ap = cumInc - cumPaid, cp = cumComm - cumCommPaid;
      var cfo = ni + dep - (ar - prev.ar) - (inv - prev.inv) + (ap - prev.ap) + (cp - prev.cp) + (zakPay - prev.zp);
      var cfi = -cx - dp, cff = eq - div;
      var netFA = grossFA - accDep;
      var ta = cash + ar + inv + depBal + netFA, tle = ap + cp + zakPay + paidIn + retained;
      R.month.push(m + 1); R.sold.push(sold); R.revenue.push(revenue); R.cogs.push(cogs); R.commission.push(commission);
      R.collections.push(collections); R.supplierPayments.push(payments); R.commissionPaid.push(commPaid);
      R.grossProfit.push(gp); R.overhead.push(oh); R.oneTime.push(one); R.ebitda.push(ebitda);
      R.depreciation.push(dep); R.ebit.push(ebit); R.zakat.push(zakat); R.netIncome.push(ni);
      R.capex.push(cx); R.deposits.push(dp); R.equityIn.push(eq); R.dividends.push(div); R.zakatPaid.push(zPaid);
      R.cfo.push(cfo); R.cfi.push(cfi); R.cff.push(cff); R.netCash.push(cfo + cfi + cff); R.cash.push(cash);
      R.ar.push(ar); R.inventory.push(inv); R.depositsBal.push(depBal); R.netFA.push(netFA); R.ap.push(ap);
      R.commPayable.push(cp); R.zakatPayable.push(zakPay); R.paidIn.push(paidIn); R.retained.push(retained);
      R.totalAssets.push(ta); R.totalLE.push(tle); R.balanceCheck.push(ta - tle);
      prev = { ar: ar, inv: inv, ap: ap, cp: cp, zp: zakPay };
      if (mo === 11) { prevYearNI = yearNI; yearNI = 0; }
    }
    R.unit = ue; R.reserve = reserve; R.overheadBase = ohBase; R.capexTotal = capexTotal;
    R.daysToSale = daysToSale; R.minCash = Math.min.apply(null, R.cash);
    R.minCashMonth = R.cash.indexOf(R.minCash) + 1;
    R.planShortfall = sum(plan) - sum(ship); R.netOutPerUnit = netOutPerUnit;
    return R;
  }

  // capital needed to run the PLAN without any cash cap (information for investors)
  function requiredCapital(p) {
    var step = p.finance.capitalRounding, C = 0, R;
    for (var i = 0; i < 400; i++) {
      R = simulate(p, C, { unconstrained: true });
      if (R.minCash >= R.reserve - 1e-6) return C;
      C = Math.max(C + step, Math.ceil((C + (R.reserve - R.minCash)) / step) * step);
    }
    return C;
  }

  // ---------- aggregation ----------
  function aggregate(R, periods) {
    var flowKeys = ['plan', 'shipments', 'sold', 'revenue', 'cogs', 'grossProfit', 'commission', 'overhead', 'oneTime', 'ebitda',
      'depreciation', 'ebit', 'zakat', 'netIncome', 'collections', 'supplierPayments', 'commissionPaid', 'capex',
      'deposits', 'equityIn', 'dividends', 'zakatPaid', 'cfo', 'cfi', 'cff', 'netCash'];
    var stockKeys = ['cash', 'ar', 'inventory', 'depositsBal', 'netFA', 'ap', 'commPayable', 'zakatPayable', 'paidIn',
      'retained', 'totalAssets', 'totalLE', 'balanceCheck'];
    return periods.map(function (pr) {
      var o = { label: pr.label, from: pr.from, to: pr.to };
      flowKeys.forEach(function (k) { o[k] = sum(R[k], pr.from, pr.to); });
      stockKeys.forEach(function (k) { o[k] = R[k][pr.to - 1]; });
      o.openingCash = pr.from === 0 ? 0 : R.cash[pr.from - 1];
      o.grossMargin = o.revenue ? o.grossProfit / o.revenue : 0;
      o.ebitdaMargin = o.revenue ? o.ebitda / o.revenue : 0;
      o.netMargin = o.revenue ? o.netIncome / o.revenue : 0;
      o.equity = o.paidIn + o.retained;
      o.nwc = o.ar + o.inventory - o.ap - o.commPayable;
      return o;
    });
  }
  function yearPeriods() { var a = []; for (var y = 0; y < 5; y++) a.push({ label: 'Y' + (y + 1), from: y * 12, to: y * 12 + 12 }); return a; }
  function quarterPeriods() { var a = []; for (var q = 0; q < 20; q++) a.push({ label: 'Y' + (Math.floor(q / 4) + 1) + '-Q' + (q % 4 + 1), from: q * 3, to: q * 3 + 3 }); return a; }

  function firstMonth(arr, pred) { for (var i = 0; i < arr.length; i++) if (pred(arr[i], i)) return i + 1; return null; }

  // ---------- full run ----------
  function run(p) {
    p = p || defaults();
    var req = requiredCapital(p);
    var capital = (p.finance.initialInvestment == null || p.finance.initialInvestment === '') ? req : +p.finance.initialInvestment;
    var R = simulate(p, capital);
    var years = aggregate(R, yearPeriods()), quarters = aggregate(R, quarterPeriods());
    var ue = R.unit, f = p.finance, t = p.timing;
    var Y5 = years[4];
    var endEquity = Y5.equity;
    var divs = years.map(function (y) { return y.dividends; });
    var flowsBook = [-capital].concat(divs); flowsBook[5] += endEquity;
    var exitValue = Math.max(endEquity, f.exitMultipleNI * Y5.netIncome);
    var flowsExit = [-capital].concat(divs); flowsExit[5] += exitValue;
    var fcf = R.cfo.map(function (x, i) { return x + R.cfi[i]; });
    var cum = 0, cumFcf = fcf.map(function (x) { cum += x; return cum; });
    cum = 0; var cumDiv = R.dividends.map(function (x) { cum += x; return cum; });
    cum = 0; var cumNI = R.netIncome.map(function (x) { cum += x; return cum; });
    var cashPayback = firstMonth(cumFcf, function (x) { return x >= capital; });
    var distPayback = firstMonth(cumDiv, function (x) { return x >= capital - 1e-6; });
    var launch = p.volume.launchMonth;
    var ebitdaBE = firstMonth(R.ebitda, function (x, i) { return i + 1 >= launch && x > 0; });
    var cumNIBE = firstMonth(cumNI, function (x, i) { return i > 0 && x >= 0 && cumNI[0] < 0; });
    var beContainers = ue.contribution > 0 ? R.overheadBase / ue.contribution : Infinity;
    var beContainersY2 = ue.contribution > 0 ? R.overheadBase * (1 + p.overhead.annualGrowth) / ue.contribution : Infinity;
    var supplierShare = (ue.components.fruit + ue.components.packaging) / ue.landed;
    var dpo = t.supplierDays * supplierShare;
    var invDays = R.daysToSale;
    var ccc = invDays + t.customerDays - dpo;
    var cycles = 365 / ccc;
    var capitalPerContainer = ue.landed;
    var salesPer100k = 100000 / capitalPerContainer * cycles * ue.revenue;
    var avgNWC = function (y) { var s = 0; for (var i = y * 12; i < y * 12 + 12; i++) s += R.ar[i] + R.inventory[i] - R.ap[i] - R.commPayable[i]; return s / 12; };
    var roe = years.map(function (y, i) { var open = i === 0 ? capital : years[i - 1].equity; var avg = (open + y.equity) / 2; return avg ? y.netIncome / avg : 0; });
    var totalDiv = sum(divs);
    var metrics = {
      capital: capital, requiredCapital: req, reserve: R.reserve, minCash: R.minCash, minCashMonth: R.minCashMonth,
      fundingGap: Math.max(0, -R.minCash), cashOutMonth: firstMonth(R.cash, function (x) { return x < 0; }),
      belowReserve: R.minCash < R.reserve - 1e-6, cashConstrained: !!p.volume.cashConstrained,
      planContainers5y: sum(R.plan), shippedContainers5y: sum(R.shipments), planShortfall: R.planShortfall,
      firstShipment: R.shipments[launch - 1] || 0,
      firstFullCapacityMonth: firstMonth(R.shipments, function (x, i) { return i + 1 >= launch && x >= R.plan[i] - 1e-9 && R.plan[i] > 0; }),
      totalRevenue5y: sum(R.revenue), totalNI5y: sum(R.netIncome), totalDividends5y: totalDiv, endEquity: endEquity, endCash: Y5.cash,
      irrBook: irr(flowsBook), irrExit: irr(flowsExit), npvBook: npv(f.discountRate, flowsBook), npvExit: npv(f.discountRate, flowsExit),
      flowsBook: flowsBook, flowsExit: flowsExit, exitValue: exitValue,
      roi5y: (totalDiv + endEquity - capital) / capital, roiAnnualized: Math.pow(Math.max(0.0001, (totalDiv + endEquity) / capital), 1 / 5) - 1,
      roe: roe, cashPaybackMonth: cashPayback, distributionPaybackMonth: distPayback,
      ebitdaBreakEvenMonth: ebitdaBE, cumulativeBreakEvenMonth: cumNIBE,
      breakEvenContainersY1: beContainers, breakEvenContainersY2: beContainersY2,
      breakEvenSellPrice: (ue.landed / ue.cartonsSold) / (1 - p.shipment.salesCommissionRate),
      inventoryDays: invDays, transitDays: t.prepDays + t.transitDays + t.clearanceDays + (t.extraDelayDays || 0),
      dso: t.customerDays, dpo: dpo, ccc: ccc, cyclesPerYear: cycles, capitalPerContainer: capitalPerContainer,
      salesPer100k: salesPer100k, capitalTurnoverY2: avgNWC(1) ? years[1].revenue / avgNWC(1) : 0,
      peakNWC: Math.max.apply(null, R.ar.map(function (a, i) { return a + R.inventory[i] - R.ap[i] - R.commPayable[i]; })),
      revenueToCapitalY2: years[1].revenue / capital,
      maxBalanceError: Math.max.apply(null, R.balanceCheck.map(Math.abs)),
      cashTieError: Math.max.apply(null, R.cash.map(function (c, i) { var prevC = i ? R.cash[i - 1] : 0; return Math.abs(c - prevC - R.netCash[i]); }))
    };
    var uses = usesOfFunds(p, R, capital);
    return { params: p, R: R, years: years, quarters: quarters, unit: ue, metrics: metrics, uses: uses,
      investor: investorModels(p, capital, divs, endEquity, exitValue) };
  }

  // How the fixed capital is deployed up to the first shipment
  function usesOfFunds(p, R, capital) {
    var strap = p.capex.strappingMachineEGP / p.shipment.fxEGPperSAR;
    var L = Math.max(1, p.volume.launchMonth);
    var preLaunch = 0; for (var m = 0; m < L - 1; m++) preLaunch += R.overhead[m];
    var firstShip = R.shipments[L - 1] * R.unit.landed;
    var items = [
      { key: 'establishment', en: 'Company establishment & licensing', ar: 'تأسيس المنشأة والتراخيص', v: p.oneTime.establishment, type: 'fixed' },
      { key: 'launch', en: 'Launch marketing', ar: 'تسويق الإطلاق', v: p.oneTime.launchMarketing, type: 'fixed' },
      { key: 'capex', en: 'CAPEX (IT, equipment, strapping machine)', ar: 'أصول ثابتة (أجهزة، معدات، مكنة شد)', v: p.capex.officeIT + p.capex.equipment + strap, type: 'fixed' },
      { key: 'deposit', en: 'Supplier deposit', ar: 'تأمين لدى المورد', v: p.deposits.supplierDeposit, type: 'working' },
      { key: 'prelaunch', en: 'Overheads before the first shipment', ar: 'مصاريف تشغيل قبل أول شحنة', v: preLaunch, type: 'working' },
      { key: 'firstShipment', en: 'Working capital: first shipment (bananas, packaging, freight, clearance)', ar: 'رأس مال عامل: أول شحنة (موز، تعبئة، شحن، تخليص)', v: firstShip, type: 'working' },
      { key: 'reserve', en: 'Emergency cash reserve (1 month of overheads)', ar: 'احتياطي نقدي (مصاريف شهر)', v: R.reserve, type: 'reserve' }
    ];
    var subtotal = items.reduce(function (s, x) { return s + x.v; }, 0);
    items.push({ key: 'rounding', en: 'Launch-month overheads & buffer', ar: 'مصاريف شهر الإطلاق وهامش', v: capital - subtotal, type: 'reserve' });
    return { troughMonth: R.minCashMonth, items: items.filter(function (i) { return Math.abs(i.v) > 0.5; }), total: capital };
  }

  function investorModels(p, capital, divs, endEquity, exitValue) {
    var inv = p.investor;
    function equityFlows(e, terminal) { var a = [-capital]; divs.forEach(function (d) { a.push(e * d); }); a[5] += e * terminal; return a; }
    function profitShareFlows(s) {
      var a = [-capital]; divs.forEach(function (d) { a.push(s * d); });
      var capBack = Math.min(capital, endEquity); a[5] += capBack + s * Math.max(0, endEquity - capBack);
      return a;
    }
    var equityTable = [0.4, 0.5, 0.6, 0.7].map(function (e) {
      var fb = equityFlows(e, endEquity), fe = equityFlows(e, exitValue);
      return { share: e, irrBook: irr(fb), irrExit: irr(fe), moicBook: (sum(fb, 1)) / capital, moicExit: sum(fe, 1) / capital };
    });
    var psTable = [0.5, 0.6, 0.7].map(function (s) {
      var fl = profitShareFlows(s); return { share: s, irr: irr(fl), moic: sum(fl, 1) / capital, flows: fl };
    });
    var lo = 0.01, hi = 1, need = null;
    if ((irr(equityFlows(1, endEquity)) || -1) >= inv.targetIRR) {
      for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2, r = irr(equityFlows(mid, endEquity)); if (r != null && r >= inv.targetIRR) hi = mid; else lo = mid; }
      need = hi;
    }
    return { equityTable: equityTable, profitShareTable: psTable, equityShareForTarget: need, targetIRR: inv.targetIRR,
      minimumTicket: Math.max(10000, Math.round(capital / 4 / 5000) * 5000) };
  }

  // ---------- sensitivity (capital held at the base capital) ----------
  function sensitivity(baseP) {
    var cap = baseP.finance.initialInvestment == null ? requiredCapital(baseP) : +baseP.finance.initialInvestment;
    function runFixed(mod) { var p = clone(baseP); merge(p, mod); p.finance.initialInvestment = cap; return run(p); }
    var base = runFixed({});
    var cases = [
      { key: 'buy10', en: 'Purchase price +10%', ar: 'ارتفاع سعر الشراء 10%', mod: { shocks: { buyPriceChange: 0.10 } } },
      { key: 'buy20', en: 'Purchase price +20%', ar: 'ارتفاع سعر الشراء 20%', mod: { shocks: { buyPriceChange: 0.20 } } },
      { key: 'sell5', en: 'Selling price −5%', ar: 'انخفاض سعر البيع 5%', mod: { shocks: { sellPriceChange: -0.05 } } },
      { key: 'sell10', en: 'Selling price −10%', ar: 'انخفاض سعر البيع 10%', mod: { shocks: { sellPriceChange: -0.10 } } },
      { key: 'freight25', en: 'Freight cost +25%', ar: 'ارتفاع تكلفة الشحن 25%', mod: { shocks: { freightChange: 0.25 } } },
      { key: 'delay7', en: 'Shipping / port delay +7 days', ar: 'تأخر الشحن/الميناء 7 أيام', mod: { timing: { extraDelayDays: 7 } } },
      { key: 'spoil12', en: 'Spoilage 12% (vs 5%)', ar: 'تلف 12% بدل 5%', mod: { shipment: { spoilageRate: 0.12 } } },
      { key: 'dso40', en: 'Customer collection 40 days (vs 10)', ar: 'تأخر التحصيل 40 يوم بدل 10', mod: { timing: { customerDays: 40 } } },
      { key: 'vol20', en: 'Sales volume −20%', ar: 'انخفاض حجم المبيعات 20%', mod: { shocks: { volumeChange: -0.20 } } },
      { key: 'fx', en: 'EGP strengthens 15% (packaging cost ↑)', ar: 'ارتفاع الجنيه 15% (تكلفة التعبئة ↑)', mod: { shipment: { fxEGPperSAR: baseP.shipment.fxEGPperSAR / 1.15 } } }
    ];
    var rows = cases.map(function (c) {
      var r = runFixed(c.mod);
      return { key: c.key, en: c.en, ar: c.ar,
        contribution: r.unit.contribution, ni5y: r.metrics.totalNI5y, niY2: r.years[1].netIncome,
        npv: r.metrics.npvBook, irr: r.metrics.irrBook, minCash: r.metrics.minCash, cashPayback: r.metrics.cashPaybackMonth,
        shipped: r.metrics.shippedContainers5y,
        dNi5y: r.metrics.totalNI5y - base.metrics.totalNI5y, dNpv: r.metrics.npvBook - base.metrics.npvBook,
        requiredCapital: requiredCapital((function () { var p = clone(baseP); merge(p, c.mod); return p; })()) };
    });
    var grid = { sell: [-0.10, -0.05, 0, 0.05], buy: [-0.10, 0, 0.10, 0.20], v: [] };
    grid.buy.forEach(function (b) { grid.v.push(grid.sell.map(function (s) {
      var p = clone(baseP); p.shocks.buyPriceChange = b; p.shocks.sellPriceChange = s; return unitEconomics(p).contribution; })); });
    return { capitalHeld: cap, base: { ni5y: base.metrics.totalNI5y, npv: base.metrics.npvBook, irr: base.metrics.irrBook }, rows: rows, grid: grid };
  }

  function runScenarios(overrides) {
    var out = {};
    Object.keys(SCENARIOS).forEach(function (k) {
      var r = run(scenarioParams(k, overrides));
      out[k] = { label: SCENARIOS[k].label, labelAr: SCENARIOS[k].labelAr, metrics: r.metrics, years: r.years, unit: r.unit,
        atBaseCapital: { capital: r.metrics.capital, minCash: r.metrics.minCash, cashOutMonth: r.metrics.cashOutMonth,
          irrBook: r.metrics.irrBook, npvBook: r.metrics.npvBook, cashPaybackMonth: r.metrics.cashPaybackMonth, endEquity: r.metrics.endEquity } };
    });
    return out;
  }

  return {
    MONTHS: MONTHS, defaults: defaults, SCENARIOS: SCENARIOS, scenarioParams: scenarioParams, merge: merge, clone: clone,
    packagingBOM: packagingBOM, unitEconomics: unitEconomics, overheadMonthlyBase: overheadMonthlyBase, shipmentsPlan: shipmentsPlan,
    simulate: simulate, requiredCapital: requiredCapital, run: run, sensitivity: sensitivity, runScenarios: runScenarios,
    irr: irr, npv: npv, dist: dist
  };
});
