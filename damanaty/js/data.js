/*
 * Damanaty — data layer
 * Everything here reads/writes real localStorage state. No field is ever
 * fabricated: if a computation lacks the inputs it needs, it returns
 * null / "INSUFFICIENT_DATA" instead of a guessed number.
 */
const DamanatyData = (function () {
  const STORAGE_KEY = "damanaty_v1";
  const DAY_MS = 24 * 60 * 60 * 1000;

  function emptyState() {
    return {
      meta: { onboarded: false, portfolioSize: null, intents: [] },
      products: [],
      documents: [],
      serviceRecords: [],
      claims: [],
      events: [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      return Object.assign(emptyState(), parsed);
    } catch (e) {
      console.warn("Damanaty: corrupt local state, resetting.", e);
      return emptyState();
    }
  }

  let state = load();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid(prefix) {
    return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function logEvent(productId, type, label) {
    state.events.push({ id: uid("evt"), productId, type, label, at: new Date().toISOString() });
  }

  // ---------------- meta / onboarding ----------------

  function getMeta() {
    return state.meta;
  }

  function completeOnboarding(portfolioSize, intents) {
    state.meta.onboarded = true;
    state.meta.portfolioSize = portfolioSize;
    state.meta.intents = intents;
    save();
  }

  function isOnboarded() {
    return !!state.meta.onboarded;
  }

  // ---------------- products ----------------

  function addProduct(fields) {
    const now = new Date().toISOString();
    const product = {
      id: uid("prd"),
      name: fields.name,
      brand: fields.brand || "",
      model: fields.model || "",
      serial: fields.serial || "",
      category: fields.category || "other",
      purchaseDate: fields.purchaseDate || null,
      seller: fields.seller || "",
      price: fields.price ? Number(fields.price) : null,
      warrantyMonths: fields.warrantyMonths ? Number(fields.warrantyMonths) : null,
      createdAt: now,
      lifecycleState: "REGISTERED",
    };
    state.products.push(product);
    logEvent(product.id, "REGISTERED", "تم تسجيل المنتج");
    if (product.purchaseDate) logEvent(product.id, "PURCHASED", "تاريخ الشراء مسجّل");
    if (product.warrantyMonths) logEvent(product.id, "WARRANTY_ACTIVE", "بدأ سريان الضمان");
    save();
    return product;
  }

  function updateProduct(id, fields) {
    const p = getProduct(id);
    if (!p) return null;
    Object.assign(p, fields);
    save();
    return p;
  }

  function deleteProduct(id) {
    state.products = state.products.filter((p) => p.id !== id);
    state.documents = state.documents.filter((d) => d.productId !== id);
    state.serviceRecords = state.serviceRecords.filter((s) => s.productId !== id);
    state.claims = state.claims.filter((c) => c.productId !== id);
    state.events = state.events.filter((e) => e.productId !== id);
    save();
  }

  function getProduct(id) {
    return state.products.find((p) => p.id === id) || null;
  }

  function getProducts() {
    return state.products.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function setLifecycleState(id, newState, label) {
    const p = getProduct(id);
    if (!p) return;
    p.lifecycleState = newState;
    logEvent(id, newState, label);
    save();
  }

  function transferProduct(id) {
    setLifecycleState(id, "TRANSFERRED", "تم نقل ملكية المنتج");
  }

  function archiveProduct(id) {
    setLifecycleState(id, "ARCHIVED", "تمت أرشفة المنتج");
  }

  // ---------------- documents ----------------

  function addDocument(productId, doc) {
    const record = {
      id: uid("doc"),
      productId,
      type: doc.type, // invoice | warranty | receipt | other
      name: doc.name,
      dataUrl: doc.dataUrl,
      addedAt: new Date().toISOString(),
    };
    state.documents.push(record);
    logEvent(productId, "DOCUMENT_ADDED", "تمت إضافة مستند: " + labelForDocType(doc.type));
    save();
    return record;
  }

  function getDocuments(productId) {
    return state.documents.filter((d) => d.productId === productId);
  }

  function deleteDocument(id) {
    state.documents = state.documents.filter((d) => d.id !== id);
    save();
  }

  function labelForDocType(type) {
    return { invoice: "فاتورة", warranty: "بطاقة ضمان", receipt: "إيصال", other: "مستند" }[type] || "مستند";
  }

  // ---------------- service / maintenance / repair ----------------

  function addServiceRecord(productId, rec) {
    const record = {
      id: uid("svc"),
      productId,
      type: rec.type, // maintenance | service | repair
      date: rec.date || new Date().toISOString().slice(0, 10),
      description: rec.description || "",
      cost: rec.cost ? Number(rec.cost) : null,
      provider: rec.provider || "",
    };
    state.serviceRecords.push(record);
    const labels = { maintenance: "صيانة دورية", service: "زيارة خدمة", repair: "إصلاح" };
    logEvent(productId, rec.type === "repair" ? "REPAIR" : "UNDER_SERVICE", labels[rec.type] + " مسجّلة");
    save();
    return record;
  }

  function getServiceRecords(productId) {
    return state.serviceRecords
      .filter((s) => s.productId === productId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // ---------------- claims ----------------

  function addClaim(productId, claim) {
    const record = {
      id: uid("clm"),
      productId,
      status: "open",
      note: claim.note || "",
      openedAt: new Date().toISOString(),
      resolvedAt: null,
    };
    state.claims.push(record);
    logEvent(productId, "CLAIM_OPEN", "تم فتح مطالبة ضمان");
    save();
    return record;
  }

  function resolveClaim(id) {
    const c = state.claims.find((c) => c.id === id);
    if (!c) return;
    c.status = "resolved";
    c.resolvedAt = new Date().toISOString();
    logEvent(c.productId, "CLAIM_RESOLVED", "تم حل مطالبة الضمان");
    save();
  }

  function getClaims(productId) {
    return state.claims.filter((c) => c.productId === productId);
  }

  function getOpenClaims(productId) {
    return getClaims(productId).filter((c) => c.status === "open");
  }

  // ---------------- events / timeline ----------------

  function getTimeline(productId) {
    return state.events
      .filter((e) => e.productId === productId)
      .sort((a, b) => new Date(a.at) - new Date(b.at));
  }

  // ---------------- derived warranty facts (real math, no guessing) ----------------

  function warrantyExpiry(product) {
    if (!product.purchaseDate || !product.warrantyMonths) return null;
    const d = new Date(product.purchaseDate);
    d.setMonth(d.getMonth() + Number(product.warrantyMonths));
    return d;
  }

  function warrantyDaysLeft(product) {
    const exp = warrantyExpiry(product);
    if (!exp) return null;
    return Math.ceil((exp.getTime() - Date.now()) / DAY_MS);
  }

  function warrantyStatus(product) {
    const days = warrantyDaysLeft(product);
    if (days === null) return "UNKNOWN";
    if (days < 0) return "EXPIRED";
    if (days <= 30) return "EXPIRING_SOON";
    return "ACTIVE";
  }

  function productAgeDays(product) {
    if (!product.purchaseDate) return null;
    return Math.floor((Date.now() - new Date(product.purchaseDate).getTime()) / DAY_MS);
  }

  return {
    getMeta,
    completeOnboarding,
    isOnboarded,
    addProduct,
    updateProduct,
    deleteProduct,
    getProduct,
    getProducts,
    transferProduct,
    archiveProduct,
    addDocument,
    getDocuments,
    deleteDocument,
    labelForDocType,
    addServiceRecord,
    getServiceRecords,
    addClaim,
    resolveClaim,
    getClaims,
    getOpenClaims,
    getTimeline,
    warrantyExpiry,
    warrantyDaysLeft,
    warrantyStatus,
    productAgeDays,
    _uid: uid,
  };
})();
