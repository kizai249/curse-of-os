/*
 * Damanaty Intelligence — rule-based insight engine (Section 30 of the
 * evolution blueprint). Deterministic and explainable today; written so a
 * real ML/AI service could sit behind these same function names later
 * without changing any caller. Nothing here invents a value: every insight
 * traces back to a stored product, document, service record, or claim.
 */
const DamanatyIntelligence = (function (D) {
  function detectExpiringWarranty(product) {
    const status = D.warrantyStatus(product);
    if (status !== "EXPIRING_SOON") return null;
    const days = D.warrantyDaysLeft(product);
    const hasInvoice = D.getDocuments(product.id).some((d) => d.type === "invoice");
    return {
      key: "expiring",
      severity: "amber",
      text:
        "ضمان “" + product.name + "” ينتهي خلال " + days + " يوم" +
        (hasInvoice ? "، وفاتورة الشراء محفوظة لديك بالفعل." : "، ولم تُضف فاتورة الشراء بعد."),
      actions: hasInvoice ? ["view_warranty", "prepare_claim"] : ["add_document"],
    };
  }

  function detectWarrantyRisk(product) {
    const status = D.warrantyStatus(product);
    if (status !== "EXPIRING_SOON" && status !== "ACTIVE") return null;
    const services = D.getServiceRecords(product.id);
    const days = D.warrantyDaysLeft(product);
    if (services.length > 0) return null;
    if (days === null || days > 60) return null;
    return {
      key: "risk",
      severity: "amber",
      text: "لا يوجد أي سجل صيانة لـ“" + product.name + "” قبل انتهاء الضمان — قد يكون فحصًا الآن أوفر من مطالبة لاحقًا.",
      actions: ["add_maintenance"],
    };
  }

  function detectMissingDocuments(product) {
    const docs = D.getDocuments(product.id);
    const hasInvoice = docs.some((d) => d.type === "invoice");
    const hasWarranty = docs.some((d) => d.type === "warranty");
    if (hasInvoice && hasWarranty) return null;
    const missing = [];
    if (!hasInvoice) missing.push("الفاتورة");
    if (!hasWarranty) missing.push("بطاقة الضمان");
    return {
      key: "missing_docs",
      severity: "purple",
      text: "مستندات “" + product.name + "” غير مكتملة: " + missing.join(" و") + " غير مضافة.",
      actions: ["add_document"],
    };
  }

  function detectMaintenanceNeed(product) {
    const services = D.getServiceRecords(product.id);
    const lastDate = services.length ? new Date(services[0].date) : (product.purchaseDate ? new Date(product.purchaseDate) : null);
    if (!lastDate) return null;
    const daysSince = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
    if (daysSince < 365) return null;
    return {
      key: "maintenance_due",
      severity: "purple",
      text: "مضى أكثر من عام على آخر صيانة مسجّلة لـ“" + product.name + "”.",
      actions: ["add_maintenance"],
    };
  }

  function detectOpenClaim(product) {
    const open = D.getOpenClaims(product.id);
    if (!open.length) return null;
    return {
      key: "open_claim",
      severity: "green",
      text: "لديك مطالبة ضمان مفتوحة على “" + product.name + "” بانتظار المتابعة.",
      actions: ["view_claim"],
    };
  }

  // Priority order: an open claim needs attention over everything else,
  // then real risk, then an approaching deadline, then missing paperwork,
  // then routine maintenance.
  function generateProductInsight(product) {
    const detectors = [detectOpenClaim, detectWarrantyRisk, detectExpiringWarranty, detectMissingDocuments, detectMaintenanceNeed];
    for (const fn of detectors) {
      const insight = fn(product);
      if (insight) return insight;
    }
    return null;
  }

  function allInsights(product) {
    return [detectOpenClaim, detectWarrantyRisk, detectExpiringWarranty, detectMissingDocuments, detectMaintenanceNeed]
      .map((fn) => fn(product))
      .filter(Boolean);
  }

  function generateOwnershipSummary(products) {
    const withInsight = products.map((p) => ({ product: p, insight: generateProductInsight(p) })).filter((x) => x.insight);
    return {
      attentionCount: withInsight.length,
      items: withInsight,
    };
  }

  // ---------------- Product Health Score ----------------
  // 0-100, built only from data that actually exists. Returns null
  // (render as "بيانات غير كافية" / INSUFFICIENT DATA) when there is
  // nothing to score against — never a fabricated number.
  function healthScore(product) {
    const hasWarrantyInfo = !!(product.purchaseDate && product.warrantyMonths);
    const docs = D.getDocuments(product.id);
    const hasAnyDoc = docs.length > 0;
    const services = D.getServiceRecords(product.id);
    const claims = D.getClaims(product.id);

    if (!hasWarrantyInfo && !hasAnyDoc && services.length === 0 && claims.length === 0) {
      return null; // INSUFFICIENT_DATA
    }

    let score = 100;
    const status = D.warrantyStatus(product);
    if (status === "EXPIRED") score -= 25;
    else if (status === "EXPIRING_SOON") score -= 10;

    const hasInvoice = docs.some((d) => d.type === "invoice");
    const hasWarrantyDoc = docs.some((d) => d.type === "warranty");
    if (!hasInvoice) score -= 15;
    if (!hasWarrantyDoc) score -= 10;

    const openClaims = claims.filter((c) => c.status === "open");
    if (openClaims.length) score -= 20;

    const age = D.productAgeDays(product);
    if (age !== null && age > 365 && services.length === 0) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  function healthLabel(score) {
    if (score === null) return { text: "بيانات غير كافية", tone: "unknown" };
    if (score >= 80) return { text: "ممتاز", tone: "green" };
    if (score >= 55) return { text: "جيد", tone: "amber" };
    return { text: "يحتاج انتباه", tone: "red" };
  }

  return {
    detectExpiringWarranty,
    detectWarrantyRisk,
    detectMissingDocuments,
    detectMaintenanceNeed,
    detectOpenClaim,
    generateProductInsight,
    allInsights,
    generateOwnershipSummary,
    healthScore,
    healthLabel,
  };
})(DamanatyData);
