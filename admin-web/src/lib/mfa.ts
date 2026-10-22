/**
 * التحقق الثنائي (TOTP) لحسابات الإدارة — Q27. الخادم هو الحكم: staffCallable يرفض بـ MFA_REQUIRED
 * لما يكون ADMIN_MFA_REQUIRED=true والتوكن بدون عامل ثاني. اللوحة تقرأ هذا الرفض وتقرر الخطوة.
 */
export type MfaStep = "enroll" | "relogin";

/** رسالة الخطأ من الخادم هي stateId (shared/errors.ts). */
export function isMfaRequired(err: unknown): boolean {
  return (err as { message?: string })?.message === "MFA_REQUIRED";
}

/** بدون عامل مسجّل ← تسجيل TOTP. وعنده عامل لكن التوكن قديم ← دخول من جديد بالرمز. */
export function mfaStep(enrolledFactors: number): MfaStep {
  return enrolledFactors > 0 ? "relogin" : "enroll";
}

export function isTotpCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

export const MFA_TEXT = {
  enrollTitle: "تفعيل التحقق الثنائي",
  enrollHelp: "امسح الرمز بتطبيق المصادقة (مثل Google Authenticator أو Microsoft Authenticator)، ثم اكتب الرمز المكوّن من 6 أرقام.",
  secretLabel: "أو أدخل المفتاح يدويًا:",
  codeLabel: "رمز التحقق (6 أرقام)",
  confirm: "تفعيل",
  verify: "تحقق",
  enrolled: "تم تفعيل التحقق الثنائي. سجّل دخولك من جديد.",
  relogin: "سجّل دخولك من جديد وأدخل رمز التحقق.",
  badCode: "الرمز غير صحيح أو انتهت صلاحيته.",
  signInCodeTitle: "رمز التحقق الثنائي",
  unsupported: "هذا الحساب يستخدم طريقة تحقق غير مدعومة في اللوحة. تواصل مع مسؤول USERS-X.",
  notEnabled: "التحقق الثنائي غير مفعّل في المشروع. تواصل مع مسؤول USERS-X.",
} as const;
