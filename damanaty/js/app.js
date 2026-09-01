/*
 * Damanaty — UI controller. Renders screens from DamanatyData /
 * DamanatyIntelligence state; no view here invents data of its own.
 */
(function (D, AI) {
  const CATEGORY_LABEL = {
    phone: "هاتف", laptop: "حاسوب محمول", tv: "تلفاز", vehicle: "مركبة",
    appliance: "جهاز منزلي", electronics: "إلكترونيات", other: "أخرى",
  };
  const DOC_TYPE_LABEL = { invoice: "فاتورة", warranty: "بطاقة ضمان", receipt: "إيصال", other: "مستند" };
  const REC_TYPE_LABEL = { maintenance: "صيانة دورية", service: "خدمة", repair: "إصلاح" };

  let onbState = { step: 1, portfolioSize: null, intents: [] };
  let currentProductId = null;
  let currentTab = "warranty";

  // ---------------- helpers ----------------

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function fmtDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ar-SA-u-ca-gregory", { year: "numeric", month: "long", day: "numeric" });
  }
  function fmtMoney(n) { return n === null || n === undefined ? "—" : Number(n).toLocaleString("ar-SA") + " ر.س"; }

  function toast(msg) {
    const wrap = $("#toastWrap");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function showScreen(id) {
    $all(".screen").forEach((s) => s.classList.add("hidden"));
    $("#" + id).classList.remove("hidden");
    $all(".appbar nav button").forEach((b) => b.classList.toggle("active", b.dataset.screen === id));
    window.scrollTo(0, 0);
  }

  function closeModal() {
    const m = $("#modalHost");
    m.classList.add("hidden");
    m.innerHTML = "";
  }

  function openModal(html) {
    const m = $("#modalHost");
    m.innerHTML =
      '<div class="modal-backdrop" id="modalBackdrop"><div class="modal">' + html + "</div></div>";
    m.classList.remove("hidden");
    $("#modalBackdrop").addEventListener("click", (e) => {
      if (e.target.id === "modalBackdrop") closeModal();
    });
  }

  // ---------------- onboarding ----------------

  function renderOnboarding() {
    const wrap = $("#screen-onboarding");
    let html = "";
    if (onbState.step === 1) {
      html = `
        <div class="onb-screen"><div class="onb-inner">
          <div class="onb-kicker">DAMANATY</div>
          <h1>أهلًا بك في ضماناتي</h1>
          <p class="sub">نظامك الذكي لإدارة ملكية المنتجات — من لحظة الشراء حتى نهاية عمرها.</p>
          <button class="btn btn-primary btn-block" onclick="DamanatyApp.onbNext()">ابدأ</button>
          <div class="progress-dots"><span class="on"></span><span></span><span></span><span></span></div>
        </div></div>`;
    } else if (onbState.step === 2) {
      const opts = ["1–5", "6–20", "21–50", "+50"];
      html = `
        <div class="onb-screen"><div class="onb-inner">
          <div class="onb-kicker">الخطوة ٢ من ٤</div>
          <h1>لنؤمّن منتجاتك</h1>
          <p class="sub">كم عدد المنتجات التي تمتلكها تقريبًا؟</p>
          <div class="choice-grid">${opts.map((o) => `<div class="choice ${onbState.portfolioSize === o ? "selected" : ""}" onclick="DamanatyApp.pickPortfolio('${o}')">${o}</div>`).join("")}</div>
          <button class="btn btn-primary btn-block" ${onbState.portfolioSize ? "" : "disabled"} onclick="DamanatyApp.onbNext()">التالي</button>
          <div class="progress-dots"><span class="on"></span><span class="on"></span><span></span><span></span></div>
        </div></div>`;
    } else if (onbState.step === 3) {
      const opts = [
        ["warranty", "الضمانات"], ["documents", "مستندات الشراء"], ["maintenance", "الصيانة"],
        ["repairs", "الإصلاحات"], ["history", "سجل المنتج"], ["all", "كل ما سبق"],
      ];
      html = `
        <div class="onb-screen"><div class="onb-inner">
          <div class="onb-kicker">الخطوة ٣ من ٤</div>
          <h1>ماذا تريد من ضماناتي أن يدير؟</h1>
          <p class="sub">اختر كل ما ينطبق.</p>
          <div class="choice-list">
            ${opts.map(([k, l]) => `<div class="choice" style="display:flex;justify-content:space-between;" data-intent="${k}" onclick="DamanatyApp.toggleIntent('${k}', this)">${l}<span>${onbState.intents.includes(k) ? "✓" : ""}</span></div>`).join("")}
          </div>
          <button class="btn btn-primary btn-block" onclick="DamanatyApp.onbNext()">التالي</button>
          <div class="progress-dots"><span class="on"></span><span class="on"></span><span class="on"></span><span></span></div>
        </div></div>`;
    } else {
      html = `
        <div class="onb-screen"><div class="onb-inner">
          <div class="onb-kicker">الخطوة ٤ من ٤</div>
          <h1>أضف منتجك الأول</h1>
          <p class="sub">أدخل بياناته الآن — الاستخراج التلقائي من الفاتورة (OCR) قيد التطوير حاليًا.</p>
          <div class="btn-row" style="justify-content:center;margin-bottom:22px;">
            <span class="badge planned">قريبًا: مسح الفاتورة</span>
            <span class="badge planned">قريبًا: الباركود / QR</span>
          </div>
          <button class="btn btn-primary btn-block" onclick="DamanatyApp.finishOnboardingAndAdd()">إدخال يدوي للمنتج</button>
          <button class="btn btn-ghost btn-block" style="margin-top:8px;" onclick="DamanatyApp.finishOnboarding()">تخطي الآن</button>
          <div class="progress-dots"><span class="on"></span><span class="on"></span><span class="on"></span><span class="on"></span></div>
        </div></div>`;
    }
    wrap.innerHTML = html;
  }

  function onbNext() { onbState.step++; renderOnboarding(); }
  function pickPortfolio(v) { onbState.portfolioSize = v; renderOnboarding(); }
  function toggleIntent(k, el) {
    const i = onbState.intents.indexOf(k);
    if (i === -1) onbState.intents.push(k); else onbState.intents.splice(i, 1);
    renderOnboarding();
  }
  function finishOnboarding() {
    D.completeOnboarding(onbState.portfolioSize, onbState.intents);
    boot();
  }
  function finishOnboardingAndAdd() {
    D.completeOnboarding(onbState.portfolioSize, onbState.intents);
    boot();
    openAddProduct();
  }

  // ---------------- home / command center ----------------

  function renderHome() {
    const products = D.getProducts();
    const summary = AI.generateOwnershipSummary(products);
    const activeCount = products.filter((p) => D.warrantyStatus(p) === "ACTIVE" || D.warrantyStatus(p) === "EXPIRING_SOON").length;
    const docsCount = products.reduce((n, p) => n + D.getDocuments(p.id).length, 0);
    const openClaims = products.reduce((n, p) => n + D.getOpenClaims(p.id).length, 0);

    let html = `
      <div class="stat-row">
        <div class="stat-card"><div class="v">${products.length}</div><div class="l">منتجاتي</div></div>
        <div class="stat-card"><div class="v">${activeCount}</div><div class="l">ضمانات سارية</div></div>
        <div class="stat-card"><div class="v">${summary.attentionCount}</div><div class="l">يحتاج انتباه</div></div>
        <div class="stat-card"><div class="v">${docsCount}</div><div class="l">مستندات محفوظة</div></div>
      </div>

      <div class="section-title"><h2>يحتاج انتباهك</h2><span class="count">${summary.attentionCount}</span></div>
      ${summary.items.length === 0
        ? '<div class="empty-note">لا شيء يحتاج انتباهك الآن — ضماناتي هادئ عن قصد.</div>'
        : summary.items.map(({ product, insight }) => `
          <div class="attn-card ${insight.severity}">
            <div class="txt">${insight.text}</div>
            <div class="btn-row">${insight.actions.map((a) => actionButton(a, product.id)).join("")}</div>
          </div>`).join("")}

      <div class="section-title"><h2>منتجاتي</h2><span class="count">${products.length}</span></div>
      ${products.length === 0
        ? '<div class="empty-note">لم تُضِف أي منتج بعد. اضغط زر + لإضافة أول منتج.</div>'
        : `<div class="product-grid">${products.map(productCardHtml).join("")}</div>`}
    `;
    $("#screen-home .container").innerHTML = html;
  }

  function actionButton(action, productId) {
    const map = {
      view_warranty: ["عرض الضمان", `DamanatyApp.openProduct('${productId}','warranty')`],
      prepare_claim: ["تجهيز مطالبة", `DamanatyApp.openProduct('${productId}','claims')`],
      add_document: ["إضافة مستند", `DamanatyApp.openProduct('${productId}','documents')`],
      add_maintenance: ["تسجيل صيانة", `DamanatyApp.openProduct('${productId}','service')`],
      view_claim: ["عرض المطالبة", `DamanatyApp.openProduct('${productId}','claims')`],
    };
    const [label, onclick] = map[action] || ["فتح", `DamanatyApp.openProduct('${productId}','warranty')`];
    return `<button class="btn btn-sm" onclick="${onclick}">${label}</button>`;
  }

  function productCardHtml(p) {
    const score = AI.healthScore(p);
    const label = AI.healthLabel(score);
    const status = D.warrantyStatus(p);
    const statusText = { ACTIVE: "ضمان ساري", EXPIRING_SOON: "ينتهي قريبًا", EXPIRED: "الضمان منتهٍ", UNKNOWN: "بيانات الضمان غير مكتملة" }[status];
    return `
      <div class="product-card" onclick="DamanatyApp.openProduct('${p.id}')">
        <div class="top">
          <div><div class="name">${escapeHtml(p.name)}</div><div class="meta">${escapeHtml(p.brand || "")} ${escapeHtml(p.model || "")}</div></div>
          <span class="health-badge ${label.tone}">${score === null ? "—" : score}</span>
        </div>
        <div class="warranty-pill">${statusText}</div>
      </div>`;
  }

  function escapeHtml(s) { return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  // ---------------- add product ----------------

  function openAddProduct() {
    openModal(`
      <h3>إضافة منتج</h3>
      <p class="sub">أدخل ما تعرفه — يمكنك إكمال الباقي لاحقًا.</p>
      <div class="field"><label>اسم المنتج *</label><input id="f-name" placeholder="مثال: ثلاجة LG" /></div>
      <div class="field-row">
        <div class="field"><label>العلامة التجارية</label><input id="f-brand" /></div>
        <div class="field"><label>الموديل</label><input id="f-model" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>الرقم التسلسلي</label><input id="f-serial" /></div>
        <div class="field"><label>الفئة</label>
          <select id="f-category">${Object.entries(CATEGORY_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>تاريخ الشراء</label><input id="f-purchase" type="date" /></div>
        <div class="field"><label>مدة الضمان (أشهر)</label><input id="f-warranty" type="number" min="0" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>البائع / المتجر</label><input id="f-seller" /></div>
        <div class="field"><label>السعر (ر.س)</label><input id="f-price" type="number" min="0" /></div>
      </div>
      <div class="field"><label>إرفاق فاتورة أو صورة الآن (اختياري)</label><input id="f-doc" type="file" accept="image/*,.pdf" /></div>
      <p class="small-muted">الاستخراج التلقائي من الصورة (OCR) قيد التطوير — سيُحفظ الملف كمستند فقط.</p>
      <div class="btn-row" style="margin-top:16px;">
        <button class="btn btn-primary" onclick="DamanatyApp.submitAddProduct()">حفظ المنتج</button>
        <button class="btn btn-ghost" onclick="DamanatyApp.closeModal()">إلغاء</button>
      </div>
    `);
  }

  function submitAddProduct() {
    const name = $("#f-name").value.trim();
    if (!name) { toast("اسم المنتج مطلوب"); return; }
    const product = D.addProduct({
      name, brand: $("#f-brand").value.trim(), model: $("#f-model").value.trim(),
      serial: $("#f-serial").value.trim(), category: $("#f-category").value,
      purchaseDate: $("#f-purchase").value || null, warrantyMonths: $("#f-warranty").value || null,
      seller: $("#f-seller").value.trim(), price: $("#f-price").value || null,
    });
    const file = $("#f-doc").files[0];
    const finish = () => { closeModal(); toast("تم حفظ منتجك — أصبح محميًا بضماناتي."); renderHome(); };
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { D.addDocument(product.id, { type: "invoice", name: file.name, dataUrl: reader.result }); finish(); };
      reader.readAsDataURL(file);
    } else { finish(); }
  }

  // ---------------- product profile ----------------

  function openProduct(id, tab) {
    currentProductId = id;
    currentTab = tab || "warranty";
    renderProduct();
    showScreen("screen-product");
  }

  function renderProduct() {
    const p = D.getProduct(currentProductId);
    if (!p) { showScreen("screen-home"); return; }
    const score = AI.healthScore(p);
    const label = AI.healthLabel(score);
    const status = D.warrantyStatus(p);
    const days = D.warrantyDaysLeft(p);

    $("#screen-product .container").innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="DamanatyApp.backToHome()">← منتجاتي</button>
      <div class="profile-header" style="margin-top:14px;">
        <div>
          <h1>${escapeHtml(p.name)}</h1>
          <div class="sub">${escapeHtml(p.brand || "—")} · ${escapeHtml(p.model || "—")} · ${CATEGORY_LABEL[p.category] || ""}</div>
        </div>
        <span class="health-badge ${label.tone}" style="font-size:13px;padding:6px 14px;">${score === null ? "بيانات غير كافية" : "الصحة " + score}</span>
      </div>

      <div class="tabs">
        ${["warranty","documents","service","claims","ownership","timeline","intelligence"].map((t) =>
          `<button class="${currentTab === t ? "active" : ""}" onclick="DamanatyApp.switchTab('${t}')">${tabLabel(t)}</button>`).join("")}
      </div>
      <div id="tabPanel"></div>
    `;
    renderTabPanel(p, status, days, score);
  }

  function tabLabel(t) {
    return { warranty: "الضمان", documents: "المستندات", service: "الصيانة", claims: "المطالبات", ownership: "الملكية", timeline: "الجدول الزمني", intelligence: "الذكاء" }[t];
  }

  function switchTab(t) { currentTab = t; const p = D.getProduct(currentProductId); renderTabPanel(p, D.warrantyStatus(p), D.warrantyDaysLeft(p), AI.healthScore(p)); }

  function renderTabPanel(p, status, days, score) {
    const panel = $("#tabPanel");
    if (currentTab === "warranty") {
      const statusText = { ACTIVE: "ساري", EXPIRING_SOON: "ينتهي قريبًا", EXPIRED: "منتهٍ", UNKNOWN: "غير معروف" }[status];
      panel.innerHTML = `
        <div class="passport-row"><span class="k">الحالة</span><span>${statusText}</span></div>
        <div class="passport-row"><span class="k">تاريخ الشراء</span><span>${fmtDate(p.purchaseDate)}</span></div>
        <div class="passport-row"><span class="k">مدة الضمان</span><span>${p.warrantyMonths ? p.warrantyMonths + " شهرًا" : "—"}</span></div>
        <div class="passport-row"><span class="k">تاريخ الانتهاء</span><span>${D.warrantyExpiry(p) ? fmtDate(D.warrantyExpiry(p)) : "—"}</span></div>
        <div class="passport-row"><span class="k">الأيام المتبقية</span><span>${days === null ? "—" : days + " يوم"}</span></div>
        <div class="passport-row"><span class="k">البائع</span><span>${escapeHtml(p.seller) || "—"}</span></div>
        <div class="passport-row"><span class="k">السعر</span><span>${fmtMoney(p.price)}</span></div>
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn btn-sm" onclick="DamanatyApp.openEditProduct()">تعديل بيانات المنتج</button>
        </div>`;
    } else if (currentTab === "documents") {
      const docs = D.getDocuments(p.id);
      panel.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="DamanatyApp.openAddDocument()">+ إضافة مستند</button>
        <div style="margin-top:14px;">
        ${docs.length === 0 ? '<div class="empty-note">لا توجد مستندات بعد.</div>' :
          docs.map((d) => `
            <div class="doc-row">
              <div class="info"><div class="tag">${DOC_TYPE_LABEL[d.type]}</div>${escapeHtml(d.name)}</div>
              <div class="btn-row"><a class="btn btn-sm" href="${d.dataUrl}" download="${escapeHtml(d.name)}">تنزيل</a>
              <button class="btn btn-sm btn-danger" onclick="DamanatyApp.removeDocument('${d.id}')">حذف</button></div>
            </div>`).join("")}
        </div>`;
    } else if (currentTab === "service") {
      const recs = D.getServiceRecords(p.id);
      panel.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="DamanatyApp.openAddService()">+ تسجيل صيانة / إصلاح</button>
        <div style="margin-top:14px;">
        ${recs.length === 0 ? '<div class="empty-note">لا يوجد سجل صيانة بعد.</div>' :
          recs.map((r) => `
            <div class="rec-row"><div class="info"><div class="tag">${REC_TYPE_LABEL[r.type]}</div>${fmtDate(r.date)} — ${escapeHtml(r.description || "")}</div>
            <div class="small-muted">${r.provider ? escapeHtml(r.provider) : ""} ${r.cost ? fmtMoney(r.cost) : ""}</div></div>`).join("")}
        </div>`;
    } else if (currentTab === "claims") {
      const claims = D.getClaims(p.id);
      panel.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="DamanatyApp.openAddClaim()">+ فتح مطالبة ضمان</button>
        <div style="margin-top:14px;">
        ${claims.length === 0 ? '<div class="empty-note">لا توجد مطالبات.</div>' :
          claims.map((c) => `
            <div class="claim-row"><div class="info"><div class="tag">${c.status === "open" ? "مفتوحة" : "محلولة"}</div>
            فُتحت ${fmtDate(c.openedAt)}${c.note ? " — " + escapeHtml(c.note) : ""}</div>
            ${c.status === "open" ? `<button class="btn btn-sm" onclick="DamanatyApp.resolveClaim('${c.id}')">تمييز كمحلولة</button>` : ""}</div>`).join("")}
        </div>`;
    } else if (currentTab === "ownership") {
      panel.innerHTML = `
        <div class="passport-row"><span class="k">الرقم التسلسلي</span><span>${escapeHtml(p.serial) || "—"}</span></div>
        <div class="passport-row"><span class="k">حالة الملكية</span><span>${lifecycleLabel(p.lifecycleState)}</span></div>
        <div class="btn-row" style="margin-top:16px;">
          <button class="btn btn-sm" onclick="DamanatyApp.viewPassport()">عرض جواز المنتج</button>
          <button class="btn btn-sm" onclick="DamanatyApp.transferProduct()">نقل الملكية</button>
          <button class="btn btn-sm btn-danger" onclick="DamanatyApp.archiveProduct()">أرشفة</button>
        </div>`;
    } else if (currentTab === "timeline") {
      const events = D.getTimeline(p.id);
      panel.innerHTML = `<div class="timeline">${events.map((e) => `
        <div class="t-item"><div class="label">${escapeHtml(e.label)}</div><div class="date">${fmtDate(e.at)}</div></div>`).join("")}</div>`;
    } else if (currentTab === "intelligence") {
      const insights = AI.allInsights(p);
      panel.innerHTML = insights.length === 0
        ? '<div class="empty-note">لا توجد ملاحظات ذكية حاليًا — كل شيء يبدو جيدًا أو تنقص البيانات لتحليله.</div>'
        : insights.map((i) => `
          <div class="attn-card ${i.severity}">
            <div class="txt">${i.text}</div>
            <div class="btn-row">${i.actions.map((a) => actionButton(a, p.id)).join("")}</div>
          </div>`).join("");
    }
  }

  function lifecycleLabel(s) {
    return { REGISTERED: "مسجّل", TRANSFERRED: "منقول الملكية", ARCHIVED: "مؤرشف" }[s] || s;
  }

  function backToHome() { renderHome(); showScreen("screen-home"); }

  function openEditProduct() {
    const p = D.getProduct(currentProductId);
    openModal(`
      <h3>تعديل بيانات المنتج</h3>
      <div class="field"><label>اسم المنتج</label><input id="e-name" value="${escapeHtml(p.name)}" /></div>
      <div class="field-row">
        <div class="field"><label>العلامة التجارية</label><input id="e-brand" value="${escapeHtml(p.brand || "")}" /></div>
        <div class="field"><label>الموديل</label><input id="e-model" value="${escapeHtml(p.model || "")}" /></div>
      </div>
      <div class="field-row">
        <div class="field"><label>تاريخ الشراء</label><input id="e-purchase" type="date" value="${p.purchaseDate || ""}" /></div>
        <div class="field"><label>مدة الضمان (أشهر)</label><input id="e-warranty" type="number" value="${p.warrantyMonths || ""}" /></div>
      </div>
      <div class="btn-row" style="margin-top:16px;">
        <button class="btn btn-primary" onclick="DamanatyApp.submitEditProduct()">حفظ</button>
        <button class="btn btn-ghost" onclick="DamanatyApp.closeModal()">إلغاء</button>
      </div>
    `);
  }
  function submitEditProduct() {
    D.updateProduct(currentProductId, {
      name: $("#e-name").value.trim(), brand: $("#e-brand").value.trim(), model: $("#e-model").value.trim(),
      purchaseDate: $("#e-purchase").value || null, warrantyMonths: $("#e-warranty").value || null,
    });
    closeModal(); renderProduct(); toast("تم تحديث بيانات المنتج");
  }

  function openAddDocument() {
    openModal(`
      <h3>إضافة مستند</h3>
      <div class="field"><label>نوع المستند</label>
        <select id="d-type"><option value="invoice">فاتورة</option><option value="warranty">بطاقة ضمان</option><option value="receipt">إيصال</option><option value="other">أخرى</option></select>
      </div>
      <div class="field"><label>الملف</label><input id="d-file" type="file" accept="image/*,.pdf" /></div>
      <div class="btn-row" style="margin-top:16px;">
        <button class="btn btn-primary" onclick="DamanatyApp.submitAddDocument()">حفظ</button>
        <button class="btn btn-ghost" onclick="DamanatyApp.closeModal()">إلغاء</button>
      </div>
    `);
  }
  function submitAddDocument() {
    const file = $("#d-file").files[0];
    if (!file) { toast("اختر ملفًا أولًا"); return; }
    const type = $("#d-type").value;
    const reader = new FileReader();
    reader.onload = () => {
      D.addDocument(currentProductId, { type, name: file.name, dataUrl: reader.result });
      closeModal(); switchTab("documents"); renderProduct(); toast("تم حفظ المستند");
    };
    reader.readAsDataURL(file);
  }
  function removeDocument(id) { D.deleteDocument(id); renderProduct(); }

  function openAddService() {
    openModal(`
      <h3>تسجيل صيانة أو إصلاح</h3>
      <div class="field"><label>النوع</label>
        <select id="s-type"><option value="maintenance">صيانة دورية</option><option value="service">زيارة خدمة</option><option value="repair">إصلاح</option></select>
      </div>
      <div class="field-row">
        <div class="field"><label>التاريخ</label><input id="s-date" type="date" value="${new Date().toISOString().slice(0,10)}" /></div>
        <div class="field"><label>التكلفة (ر.س)</label><input id="s-cost" type="number" min="0" /></div>
      </div>
      <div class="field"><label>مزوّد الخدمة</label><input id="s-provider" /></div>
      <div class="field"><label>الوصف</label><textarea id="s-desc" rows="3"></textarea></div>
      <div class="btn-row" style="margin-top:16px;">
        <button class="btn btn-primary" onclick="DamanatyApp.submitAddService()">حفظ</button>
        <button class="btn btn-ghost" onclick="DamanatyApp.closeModal()">إلغاء</button>
      </div>
    `);
  }
  function submitAddService() {
    D.addServiceRecord(currentProductId, {
      type: $("#s-type").value, date: $("#s-date").value, cost: $("#s-cost").value || null,
      provider: $("#s-provider").value.trim(), description: $("#s-desc").value.trim(),
    });
    closeModal(); switchTab("service"); renderProduct(); toast("تم تسجيل السجل");
  }

  function openAddClaim() {
    openModal(`
      <h3>فتح مطالبة ضمان</h3>
      <p class="sub">${(() => { const docs = D.getDocuments(currentProductId); const hasInvoice = docs.some(d=>d.type==="invoice"); return hasInvoice ? "الفاتورة متوفرة لدعم المطالبة." : "تنبيه: لا توجد فاتورة محفوظة لهذا المنتج بعد."; })()}</p>
      <div class="field"><label>ملاحظة المطالبة</label><textarea id="c-note" rows="3" placeholder="وصف العطل أو سبب المطالبة"></textarea></div>
      <div class="btn-row" style="margin-top:16px;">
        <button class="btn btn-primary" onclick="DamanatyApp.submitAddClaim()">فتح المطالبة</button>
        <button class="btn btn-ghost" onclick="DamanatyApp.closeModal()">إلغاء</button>
      </div>
    `);
  }
  function submitAddClaim() {
    D.addClaim(currentProductId, { note: $("#c-note").value.trim() });
    closeModal(); switchTab("claims"); renderProduct(); toast("تم فتح المطالبة");
  }
  function resolveClaim(id) { D.resolveClaim(id); renderProduct(); toast("تم تحديث حالة المطالبة"); }

  function transferProduct() {
    if (!confirm("سيتم تعليم هذا المنتج كمنقول الملكية. متابعة؟")) return;
    D.transferProduct(currentProductId); renderProduct(); toast("تم نقل الملكية");
  }
  function archiveProduct() {
    if (!confirm("سيتم أرشفة هذا المنتج. متابعة؟")) return;
    D.archiveProduct(currentProductId); backToHome(); toast("تمت الأرشفة");
  }

  // ---------------- passport ----------------

  const passportPrivacy = { seller: false, price: false, serial: true };

  function viewPassport() {
    const p = D.getProduct(currentProductId);
    renderPassport(p);
    showScreen("screen-passport");
  }

  function renderPassport(p) {
    const docs = D.getDocuments(p.id);
    const services = D.getServiceRecords(p.id);
    const claims = D.getClaims(p.id);
    $("#screen-passport .container").innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="DamanatyApp.backToProduct()">← رجوع للمنتج</button>
      <div class="passport-card" style="margin-top:16px;">
        <div class="ph-title">جواز منتج ضماناتي</div>
        <h2 style="margin-top:8px;font-size:22px;">${escapeHtml(p.name)}</h2>
        <div class="passport-row"><span class="k">العلامة / الموديل</span><span>${escapeHtml(p.brand||"—")} / ${escapeHtml(p.model||"—")}</span></div>
        <div class="passport-row"><span class="k">الرقم التسلسلي</span><span>${passportPrivacy.serial ? "مخفي" : (escapeHtml(p.serial)||"—")}</span></div>
        <div class="passport-row"><span class="k">تاريخ الشراء</span><span>${fmtDate(p.purchaseDate)}</span></div>
        <div class="passport-row"><span class="k">حالة الضمان</span><span>${{ACTIVE:"ساري",EXPIRING_SOON:"ينتهي قريبًا",EXPIRED:"منتهٍ",UNKNOWN:"—"}[D.warrantyStatus(p)]}</span></div>
        <div class="passport-row"><span class="k">البائع</span><span>${passportPrivacy.seller ? "مخفي" : (escapeHtml(p.seller)||"—")}</span></div>
        <div class="passport-row"><span class="k">السعر</span><span>${passportPrivacy.price ? "مخفي" : fmtMoney(p.price)}</span></div>
        <div class="passport-row"><span class="k">المستندات</span><span>${docs.length}</span></div>
        <div class="passport-row"><span class="k">سجلات الصيانة</span><span>${services.length}</span></div>
        <div class="passport-row"><span class="k">المطالبات</span><span>${claims.length} (${claims.filter(c=>c.status==="open").length} مفتوحة)</span></div>
      </div>

      <div class="section-title"><h2>حقول خاصة — تحكّم قبل المشاركة</h2></div>
      ${["serial","seller","price"].map((k) => `
        <div class="priv-toggle"><span>إخفاء ${{serial:"الرقم التسلسلي",seller:"البائع",price:"السعر"}[k]} عند المشاركة</span>
        <input type="checkbox" ${passportPrivacy[k] ? "checked" : ""} onchange="DamanatyApp.togglePrivacy('${k}')" /></div>`).join("")}

      <div class="btn-row" style="margin-top:16px;">
        <button class="btn btn-primary" onclick="DamanatyApp.copyPassport()">نسخ ملخص الجواز</button>
      </div>
      <p class="small-muted" style="margin-top:10px;">لا توجد مشاركة أو رفع فعلي لأي جهة خارجية — هذا نسخ نصي محلي فقط.</p>
    `;
  }

  function backToProduct() { renderProduct(); showScreen("screen-product"); }
  function togglePrivacy(k) { passportPrivacy[k] = !passportPrivacy[k]; renderPassport(D.getProduct(currentProductId)); }
  function copyPassport() {
    const p = D.getProduct(currentProductId);
    const lines = [
      "جواز منتج ضماناتي — " + p.name,
      "العلامة/الموديل: " + (p.brand||"—") + " / " + (p.model||"—"),
      passportPrivacy.serial ? null : "الرقم التسلسلي: " + (p.serial||"—"),
      "تاريخ الشراء: " + fmtDate(p.purchaseDate),
      "حالة الضمان: " + {ACTIVE:"ساري",EXPIRING_SOON:"ينتهي قريبًا",EXPIRED:"منتهٍ",UNKNOWN:"—"}[D.warrantyStatus(p)],
    ].filter(Boolean).join("\n");
    navigator.clipboard && navigator.clipboard.writeText(lines).then(() => toast("تم نسخ ملخص الجواز")).catch(() => toast("تعذّر النسخ"));
  }

  // ---------------- roadmap / future ----------------

  function renderRoadmap() {
    const years = [
      ["2026–2027", "التأسيس", ["تسجيل المنتجات", "إدارة الضمانات", "إدارة المستندات", "التقاط الفواتير", "تذكيرات الضمان", "لوحة المنتجات", "الجدول الزمني", "استخراج ذكي أساسي", "الإشعارات"]],
      ["2027–2028", "الذكاء", ["مؤشر صحة المنتج", "إشعارات سياقية", "توصيات ذكية", "ذكاء الضمان", "ذكاء الصيانة", "مساعدة المطالبات", "بحث متقدم", "تنبيهات تنبؤية"]],
      ["2028–2029", "المنظومة", ["تكامل تجار التجزئة", "تكامل المصنّعين", "تكامل مراكز الصيانة", "لوحة أعمال B2B", "واجهات برمجية", "تكامل CRM", "منظومة الشركاء"]],
      ["2029–2030", "جواز المنتج", ["هوية المنتج", "سجل الملكية", "سجل الضمان", "الصيانة والإصلاحات", "سجل المطالبات", "إثبات الشراء", "نقل الملكية"]],
      ["2030–2031", "ذكاء الملكية", ["ذكاء اصطناعي متقدم", "صيانة تنبؤية", "تقييم قيمة المنتج", "تحليلات الملكية", "منظومة خدمة", "واجهات متقدمة", "ذكاء أعمال"]],
    ];
    $("#screen-roadmap .container").innerHTML = `
      <h2 style="font-size:20px;margin-bottom:6px;">مستقبل ضماناتي</h2>
      <p class="small-muted" style="margin-bottom:22px;max-width:60ch;">خارطة طريق تخطيطية لخمس سنوات — أداة توثيق وتخطيط منتج، وليست استشارة قانونية ولا ضمانًا لأي حماية للملكية الفكرية.</p>
      <div class="roadmap-list">
      ${years.map(([yr, title, caps]) => `
        <div class="rm-year">
          <div class="yr" dir="ltr">${yr}</div><h3>${title}</h3>
          <div class="rm-caps">${caps.map((c) => `<span>${c}</span>`).join("")}</div>
        </div>`).join("")}
      </div>
    `;
  }

  // ---------------- notifications ----------------

  function renderNotifications() {
    const products = D.getProducts();
    const summary = AI.generateOwnershipSummary(products);
    $("#screen-notifications .container").innerHTML = `
      <h2 style="font-size:20px;margin-bottom:16px;">الإشعارات</h2>
      ${summary.items.length === 0 ? '<div class="empty-note">لا توجد إشعارات الآن.</div>' :
        summary.items.map(({ product, insight }) => `
          <div class="attn-card ${insight.severity}">
            <div class="txt"><b>${escapeHtml(product.name)}</b> — ${insight.text}</div>
            <div class="btn-row">${insight.actions.map((a) => actionButton(a, product.id)).join("")}</div>
          </div>`).join("")}
    `;
  }

  // ---------------- boot / nav ----------------

  function nav(screenId) {
    if (screenId === "screen-home") renderHome();
    if (screenId === "screen-roadmap") renderRoadmap();
    if (screenId === "screen-notifications") renderNotifications();
    showScreen(screenId);
  }

  function boot() {
    if (!D.isOnboarded()) {
      $("#appbar").classList.add("hidden");
      renderOnboarding();
      showScreen("screen-onboarding");
    } else {
      $("#appbar").classList.remove("hidden");
      renderHome();
      showScreen("screen-home");
    }
  }

  document.addEventListener("DOMContentLoaded", boot);

  window.DamanatyApp = {
    onbNext, pickPortfolio, toggleIntent, finishOnboarding, finishOnboardingAndAdd,
    nav, openAddProduct, submitAddProduct, closeModal,
    openProduct, backToHome, switchTab, openEditProduct, submitEditProduct,
    openAddDocument, submitAddDocument, removeDocument,
    openAddService, submitAddService, openAddClaim, submitAddClaim, resolveClaim,
    transferProduct, archiveProduct, viewPassport, backToProduct, togglePrivacy, copyPassport,
  };
})(DamanatyData, DamanatyIntelligence);
