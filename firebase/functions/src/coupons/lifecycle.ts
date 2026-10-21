import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { authedCallable } from "../shared/callable.js";
import { normalizeManual, randomCode, randomToken128, sha256 } from "../shared/codes.js";
import { REGION } from "../shared/config.js";
import { fail } from "../shared/errors.js";
import { MANUAL_CODE_LENGTH } from "./issue.js";

/** expireCoupons — كل ساعة: `issued` المنتهية ← `expired` (ARCHITECTURE §5). */
export async function expireCoupons(now: Date = new Date()): Promise<number> {
  const db = getFirestore();
  let total = 0;
  for (;;) {
    const due = await db.collection("coupons").where("status", "==", "issued").where("expiresAt", "<=", Timestamp.fromDate(now)).limit(400).get();
    if (due.empty) return total;
    const batch = db.batch();
    for (const d of due.docs) batch.update(d.ref, { status: "expired" });
    await batch.commit();
    total += due.size;
  }
}

export const expireCouponsHourly = onSchedule({ schedule: "5 * * * *", timeZone: "Asia/Riyadh", region: REGION }, async () => {
  await expireCoupons();
});

/**
 * إعادة عرض رمز الاسترداد (DATA_CONTRACTS §5): الخادم ما يخزن الرمز الصريح، فيولّد رمزين جديدين ويستبدل البصمات.
 * الرموز القديمة (ولقطات الشاشة) تتعطل تلقائيًا.
 */
export async function handleReissue(uid: string, input: { couponId?: string }) {
  const db = getFirestore();
  const ref = db.doc(`coupons/${typeof input?.couponId === "string" ? input.couponId : "_"}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("uid") !== uid) fail("not-found", "COUPON_NOT_FOUND");
    if (snap.get("status") !== "issued") fail("failed-precondition", snap.get("status") === "redeemed" ? "COUPON_REDEEMED" : "CPN_EXPIRED");
    const redeemToken = randomToken128();
    const manualCode = randomCode(MANUAL_CODE_LENGTH);
    tx.update(ref, { redeemTokenHash: sha256(redeemToken), manualCodeHash: sha256(normalizeManual(manualCode)) });
    return { couponId: ref.id, redeemToken, manualCode };
  });
}

export const reissueRedeemCode = authedCallable<{ couponId?: string }, { couponId: string; redeemToken: string; manualCode: string }>(
  async (request) => handleReissue(request.auth.uid, request.data),
);
