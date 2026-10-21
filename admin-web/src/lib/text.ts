/**
 * نصوص اللوحة. حالات شاشة الموظف منقولة من docs/design/PERMISSION_AND_ERROR_STATES.md §4.1 حرفيًا
 * (الأقواس [..] صارت {..}). اللوحة عربية للشركاء في المملكة.
 */
export const STAFF_STATES: Record<string, string> = {
  STAFF_REDEEM_OK: "✓ تم الاسترداد: {title} — {time}",
  STAFF_REDEEM_USED: "✗ القسيمة مستخدمة — استُردت في {branch} الساعة {time}.",
  STAFF_REDEEM_EXPIRED: "✗ القسيمة منتهية الصلاحية.",
  STAFF_REDEEM_WRONG_BRANCH: "✗ هذي القسيمة غير صالحة في هذا الفرع.",
  STAFF_REDEEM_NOT_FOUND: "✗ رمز غير معروف. تأكد من الإدخال.",
  STAFF_RATE_LIMIT: "محاولات كثيرة — انتظر دقيقة.",
};

export const DISCLAIMER =
  "Football Quest لعبة مستقلة وغير رسمية، وغير معتمدة من الاتحاد الآسيوي لكرة القدم (AFC) أو أي اتحاد وطني أو منظم للبطولة. أسماء المنتخبات والملاعب مستخدمة كمعلومات عامة فقط.";

export const ERRORS: Record<string, string> = {
  STAFF_ONLY: "ما عندك صلاحية لهذي العملية.",
  ADMIN_ONLY: "هذي العملية لمسؤول USERS-X فقط.",
  PARTNER_ONLY: "هذي العملية لمسؤول الشريك.",
  MFA_REQUIRED: "فعّل التحقق الثنائي لحسابك ثم سجّل الدخول من جديد.",
  INVALID_FIELD: "فيه حقل غير صحيح.",
  INVALID_ZONE: "إحداثيات أو نصف قطر المنطقة غير صحيح (الفرع 150–500 م).",
  BRANCH_NOT_IN_BRAND: "الفرع ما يتبع هذي العلامة.",
  BRANCH_NOT_IN_CAMPAIGN: "الفرع مو ضمن فروع الحملة.",
  TRIGGER_LOCKED: "ما يمكن تغيير المحفّز بعد تفعيل الحملة.",
  CAMPAIGN_ENDED: "الحملة منتهية وما تتعدل.",
  STOCK_BELOW_USED: "المخزون الجديد أقل من الممنوح والمحجوز.",
  CAMPAIGN_NOT_LIVE_HERE: "الحملة غير نشطة في هذا الفرع.",
  INVALID_MATCH: "بيانات المباراة غير صحيحة.",
  INVALID_RANGE: "نطاق التاريخ غير صحيح.",
  BRAND_NOT_FOUND: "العلامة غير موجودة.",
  QR_BRANCH_INACTIVE: "هذا الفرع غير مشارك حاليًا.",
};

export function fill(template: string, values: Record<string, string | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

export function errorText(err: unknown): string {
  const message = (err as { message?: string })?.message ?? "";
  return ERRORS[message] ?? "صار خطأ. جرّب مرة ثانية.";
}

export const TRIGGERS: Record<string, string> = {
  verified_visit: "زيارة محققة",
  invoice_code: "رمز فاتورة",
  co_op_win: "فوز «منتخبنا يجمعنا»",
  visit_streak: "سلسلة زيارات (اليوم 7)",
};

export const STATUSES: Record<string, string> = { draft: "مسودة", active: "نشطة", paused: "موقوفة", ended: "منتهية" };

export const METRIC_LABELS: Record<string, string> = {
  checkIns: "تسجيلات الحضور",
  verifiedVisits: "زيارات محققة",
  couponsIssued: "قسائم ممنوحة",
  couponsRedeemed: "قسائم مستردة",
  roomsCreated: "غرف",
  roundsStarted: "جولات بدأت",
  roundsWon: "جولات فازت",
  uniquePlayers: "لاعبون",
};
