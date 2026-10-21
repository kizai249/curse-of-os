import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { normalizeManual, sha256 } from "../shared/codes.js";
import { REGION, isEmulator } from "../shared/config.js";
import { fail } from "../shared/errors.js";
import { writeEvent } from "../shared/events.js";
import { requireRole, StaffClaims } from "../shared/roles.js";

/** محاولات الإدخال اليدوي: 10 لكل موظف في الدقيقة — ARCHITECTURE §6.2. */
export const MANUAL_ATTEMPTS_PER_MINUTE = 10;

export interface RedeemInput {
  token?: string;
  manualCode?: string;
}

export type RedeemStatus = "ok" | "used" | "expired" | "wrong_branch" | "not_found" | "rate_limited";

export interface RedeemResult {
  status: RedeemStatus;
  /** معرّف الحالة في PERMISSION_AND_ERROR_STATES §4.1 (شاشة الموظف). */
  stateId: string;
  couponId?: string;
  title?: { ar: string; en: string };
  redeemedAt?: string;
  redeemedBranchId?: string;
}

const STATE: Record<RedeemStatus, string> = {
  ok: "STAFF_REDEEM_OK",
  used: "STAFF_REDEEM_USED",
  expired: "STAFF_REDEEM_EXPIRED",
  wrong_branch: "STAFF_REDEEM_WRONG_BRANCH",
  not_found: "STAFF_REDEEM_NOT_FOUND",
  rate_limited: "STAFF_RATE_LIMIT",
};
const result = (status: RedeemStatus, extra: Partial<RedeemResult> = {}): RedeemResult => ({ status, stateId: STATE[status], ...extra });

/**
 * redeemCoupon — ARCHITECTURE §6.2 وGAME_RULES §8.5: معاملة وحدة تقرأ القسيمة وتشترط الحالة `issued`،
 * والصلاحية، وإن فرع الموظف ضمن فروع الحملة، ثم تكتب `redeemed`. أي مسح ثانٍ — حتى المتزامن — يرجع «مستخدمة»
 * مع وقت ومكان الاسترداد الأول. الرفض يخص هذا الرمز فقط.
 */
export async function redeemCouponTx(staff: StaffClaims, input: RedeemInput, now: Date = new Date()): Promise<RedeemResult> {
  const branchId = staff.branchId;
  if (staff.role !== "branch_staff" || !branchId) fail("permission-denied", "BRANCH_STAFF_ONLY");
  const manual = typeof input?.manualCode === "string" && input.manualCode.length > 0;
  const token = manual ? null : input?.token;
  if (!manual && (typeof token !== "string" || token.length < 10 || token.length > 64)) return result("not_found");

  const db = getFirestore();
  const field = manual ? "manualCodeHash" : "redeemTokenHash";
  const hash = sha256(manual ? normalizeManual(input.manualCode!) : token!);
  const rateRef = db.doc(`staffRate/${staff.uid}`);

  return db.runTransaction(async (tx) => {
    // ── القراءات ──
    let rateCount = 0;
    let rateWindow: Timestamp | null = null;
    if (manual) {
      const rate = await tx.get(rateRef);
      if (rate.exists && now.getTime() - (rate.get("windowStart") as Timestamp).toMillis() < 60_000) {
        rateWindow = rate.get("windowStart") as Timestamp;
        rateCount = rate.get("count") as number;
      }
      if (rateCount >= MANUAL_ATTEMPTS_PER_MINUTE) return result("rate_limited");
    }
    const found = await tx.get(db.collection("coupons").where(field, "==", hash).limit(2));
    const coupon = found.size === 1 ? found.docs[0]! : null;
    const c = coupon?.data();
    const campaign = c ? await tx.get(db.doc(`campaigns/${c.campaignId}`)) : null;
    const user = c ? await tx.get(db.doc(`users/${c.uid}`)) : null;

    // ── الكتابات ──
    if (manual) tx.set(rateRef, { windowStart: rateWindow ?? Timestamp.fromDate(now), count: rateCount + 1 });
    if (!coupon || !c) return result("not_found");
    if (c.status === "redeemed") {
      return result("used", {
        couponId: coupon.id,
        title: c.title,
        redeemedAt: (c.redeemedAt as Timestamp).toDate().toISOString(),
        redeemedBranchId: c.redeemedBranchId,
      });
    }
    if (c.status !== "issued" || (c.expiresAt as Timestamp).toMillis() <= now.getTime()) {
      return result("expired", { couponId: coupon.id, title: c.title });
    }
    const branches: string[] = campaign?.get("branchIds") ?? [];
    if (!branches.includes(branchId!)) return result("wrong_branch", { couponId: coupon.id, title: c.title });

    tx.update(coupon.ref, {
      status: "redeemed",
      redeemedAt: Timestamp.fromDate(now),
      redeemedBranchId: branchId,
      redeemedBy: staff.uid,
    });
    tx.update(db.doc(`campaigns/${c.campaignId}`), { "totals.redeemed": FieldValue.increment(1) });
    writeEvent(tx, "coupon_redeemed", c.uid, user?.exists ? (user.get("city") as string) : null, undefined, {
      couponId: coupon.id,
      campaignId: c.campaignId,
      brandId: c.brandId,
      redeemedBranchId: branchId,
      issuedBranchId: c.issuedBranchId,
      trigger: c.source?.trigger ?? null,
      minutesSinceIssue: Math.round((now.getTime() - (c.issuedAt as Timestamp).toMillis()) / 60_000),
    }, now);
    return result("ok", { couponId: coupon.id, title: c.title, redeemedAt: now.toISOString(), redeemedBranchId: branchId });
  });
}

export const redeemCoupon = onCall<RedeemInput>({ region: REGION, enforceAppCheck: !isEmulator() }, async (request) =>
  redeemCouponTx(requireRole(request, ["branch_staff"]), request.data),
);
