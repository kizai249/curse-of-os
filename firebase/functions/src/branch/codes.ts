import { hmacBase64Url, safeEqual } from "../shared/codes.js";

/**
 * رمز الفرع اليومي — ARCHITECTURE §6.1: معرّف الفرع + يوم اللعبة + توقيع HMAC-SHA256 بمفتاح Secret Manager.
 * الصيغة داخل QR: `FQB1:{branchId}:{day}:{sig}`. التحقق بدون حالة (نعيد حساب التوقيع)، وما فيه أي قفل
 * على الرمز: يقبله الخادم من أي عدد لاعبين في نفس الوقت.
 */
export const BRANCH_CODE_PREFIX = "FQB1";

export function signBranchCode(secret: string, branchId: string, day: string): string {
  if (!secret) throw new Error("BRANCH_CODE_SECRET missing");
  return `${BRANCH_CODE_PREFIX}:${branchId}:${day}:${hmacBase64Url(secret, `${branchId}|${day}`)}`;
}

export type CodeCheck =
  | { ok: true; branchId: string; day: string }
  | { ok: false; reason: "format" | "signature" | "not_today" };

export function verifyBranchCode(secret: string, code: unknown, today: string): CodeCheck {
  if (typeof code !== "string" || code.length > 200) return { ok: false, reason: "format" };
  const parts = code.trim().split(":");
  if (parts.length !== 4 || parts[0] !== BRANCH_CODE_PREFIX) return { ok: false, reason: "format" };
  const [, branchId, day, sig] = parts as [string, string, string, string];
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(branchId) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, reason: "format" };
  if (!safeEqual(sig, hmacBase64Url(secret, `${branchId}|${day}`))) return { ok: false, reason: "signature" };
  if (day !== today) return { ok: false, reason: "not_today" };
  return { ok: true, branchId, day };
}
