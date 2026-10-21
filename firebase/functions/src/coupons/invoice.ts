import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { authedCallable } from "../shared/callable.js";
import { normalizeManual, randomCode, sha256 } from "../shared/codes.js";
import { REGION, isEmulator } from "../shared/config.js";
import { fail } from "../shared/errors.js";
import { canActForBranch, requireRole, StaffClaims } from "../shared/roles.js";
import { checkIssue, isCampaignLive, IssuedCoupon, writeIssue } from "./issue.js";

/** رمز الفاتورة — ARCHITECTURE §6.3 وGAME_RULES §8.6: 6 أحرف، أحادي الاستخدام، صالح 24 ساعة، مربوط بالفرع والحملة. */
export const INVOICE_CODE_LENGTH = 6;
export const INVOICE_TTL_MS = 24 * 3600_000;

export async function handleIssueInvoiceCode(staff: StaffClaims, input: { campaignId?: string }, now: Date = new Date()) {
  const branchId = staff.branchId;
  if (staff.role !== "branch_staff" || !branchId) fail("permission-denied", "BRANCH_STAFF_ONLY");
  const db = getFirestore();
  const campaign = await db.doc(`campaigns/${input?.campaignId}`).get();
  if (!campaign.exists || !isCampaignLive(campaign.data()!, branchId!, "invoice_code", now)) {
    fail("failed-precondition", "CAMPAIGN_NOT_LIVE_HERE");
  }
  const branch = await db.doc(`branches/${branchId}`).get();
  if (!branch.exists || !canActForBranch(staff, branch.data() as { brandId: string }, branchId!)) fail("permission-denied", "STAFF_ONLY");

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(INVOICE_CODE_LENGTH);
    const ref = db.doc(`invoiceCodes/${sha256(code)}`);
    try {
      await ref.create({
        branchId,
        campaignId: campaign.id,
        issuedBy: staff.uid,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromMillis(now.getTime() + INVOICE_TTL_MS),
        usedBy: null,
        usedAt: null,
      });
      return { code, expiresAt: new Date(now.getTime() + INVOICE_TTL_MS).toISOString() };
    } catch (err) {
      if ((err as { code?: number }).code !== 6) throw err; // ALREADY_EXISTS ← جرّب رمزًا ثانيًا
    }
  }
  fail("unavailable", "SRV_BUSY");
}

export type InvoiceResult =
  | { status: "issued"; coupon: IssuedCoupon }
  | { status: "rejected"; stateId: "INV_INVALID" | "INV_USED" | "INV_EXPIRED" | "CPN_SOLD_OUT_BRANCH" | "CPN_USER_LIMIT" };

/**
 * submitInvoiceCode — يستهلك الرمز ذريًا ويمنح القسيمة حسب المخزون وحد الحساب (GAME_RULES §8.6).
 * إذا ما أمكن المنح (نفاد أو حد)، الرمز ما يُستهلك. ما يحتاج إذن موقع (§8.3).
 */
export async function handleSubmitInvoiceCode(uid: string, input: { code?: string }, now: Date = new Date()): Promise<InvoiceResult> {
  if (typeof input?.code !== "string") return { status: "rejected", stateId: "INV_INVALID" };
  const code = normalizeManual(input.code);
  if (code.length !== INVOICE_CODE_LENGTH) return { status: "rejected", stateId: "INV_INVALID" };
  const db = getFirestore();
  const ref = db.doc(`invoiceCodes/${sha256(code)}`);

  return db.runTransaction(async (tx) => {
    const [snap, user] = await Promise.all([tx.get(ref), tx.get(db.doc(`users/${uid}`))]);
    if (!user.exists) fail("failed-precondition", "NEEDS_ONBOARDING");
    if (!snap.exists) return { status: "rejected" as const, stateId: "INV_INVALID" as const };
    const inv = snap.data()!;
    if (inv.usedBy) return { status: "rejected" as const, stateId: "INV_USED" as const };
    if ((inv.expiresAt as Timestamp).toMillis() <= now.getTime()) return { status: "rejected" as const, stateId: "INV_EXPIRED" as const };
    const campaign = await tx.get(db.doc(`campaigns/${inv.campaignId}`));
    if (!campaign.exists || !isCampaignLive(campaign.data()!, inv.branchId, "invoice_code", now)) {
      return { status: "rejected" as const, stateId: "INV_EXPIRED" as const };
    }
    const check = await checkIssue(tx, { id: campaign.id, data: campaign.data()! }, inv.branchId, uid);
    if (check.block === "user_limit") return { status: "rejected" as const, stateId: "CPN_USER_LIMIT" as const };
    if (check.block) return { status: "rejected" as const, stateId: "CPN_SOLD_OUT_BRANCH" as const };
    tx.update(ref, { usedBy: uid, usedAt: Timestamp.fromDate(now) });
    const coupon = writeIssue(tx, check, uid, inv.branchId, { trigger: "invoice_code", invoiceCodeId: ref.id }, now);
    return { status: "issued" as const, coupon };
  });
}

export const issueInvoiceCode = onCall<{ campaignId?: string }>({ region: REGION, enforceAppCheck: !isEmulator() }, async (request) =>
  handleIssueInvoiceCode(requireRole(request, ["branch_staff"]), request.data),
);

export const submitInvoiceCode = authedCallable<{ code?: string }, InvoiceResult>(async (request) =>
  handleSubmitInvoiceCode(request.auth.uid, request.data),
);
