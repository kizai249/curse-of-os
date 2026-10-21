import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { authedCallable } from "../shared/callable.js";
import { REGION } from "../shared/config.js";
import { DELETION_WINDOW_MS } from "../shared/contracts.js";
import { fail } from "../shared/errors.js";

export interface DeleteAccountRequest {
  confirm: true;
}

export type DeleteAccountResponse =
  | { status: "scheduled"; purgeBy: string }
  | { status: "deleted" };

async function deleteAuthUser(uid: string): Promise<void> {
  await getAuth()
    .deleteUser(uid)
    .catch((err: { code?: string }) => {
      if (err.code !== "auth/user-not-found") throw err;
    });
}

/**
 * طلب حذف الحساب (ACC_DELETE_CONFIRM → ACC_DELETE_DONE). الحساب يتعطل فورًا، والبيانات
 * تنحذف في `purgeDeletedAccounts` خلال 30 يومًا كحد أقصى (يوميًا عمليًا).
 */
export async function handleDeleteAccount(
  uid: string,
  input: DeleteAccountRequest,
  now: Date = new Date(),
): Promise<DeleteAccountResponse> {
  if (!input || input.confirm !== true) fail("invalid-argument", "CONFIRMATION_REQUIRED");

  const db = getFirestore();
  const ref = db.doc(`users/${uid}`);
  const existed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return false;
    if (!snap.data()!.deletionRequestedAt) tx.update(ref, { deletionRequestedAt: Timestamp.fromDate(now) });
    return true;
  });

  if (!existed) {
    await deleteAuthUser(uid);
    return { status: "deleted" };
  }

  // القسائم غير المستردة تُلغى فورًا (ARCHITECTURE §5): issued ← expired. (reserved ← released في S8.)
  const open = await db.collection("coupons").where("uid", "==", uid).where("status", "==", "issued").get();
  if (!open.empty) {
    const batch = db.batch();
    for (const c of open.docs) batch.update(c.ref, { status: "expired", cancelledReason: "account_deleted" });
    await batch.commit();
  }
  await getAuth().updateUser(uid, { disabled: true });
  await getAuth().revokeRefreshTokens(uid);
  return { status: "scheduled", purgeBy: new Date(now.getTime() + DELETION_WINDOW_MS).toISOString() };
}

/** يحذف نهائيًا كل الحسابات المطلوب حذفها: الملف ومجموعاته الفرعية ومستخدم Auth. */
export async function purgeDeletedAccounts(): Promise<number> {
  const db = getFirestore();
  const pending = await db.collection("users").where("deletionRequestedAt", "!=", null).get();
  for (const doc of pending.docs) {
    // بيانات اللاعب: الملف ومجموعاته الفرعية، وزياراته، وأحداثه. القسائم تبقى بدون ربط شخصي للتقارير المجمعة.
    await db.recursiveDelete(doc.ref);
    for (const col of ["visits", "events"]) {
      const owned = await db.collection(col).where("uid", "==", doc.id).get();
      const writer = db.bulkWriter();
      for (const d of owned.docs) writer.delete(d.ref);
      await writer.close();
    }
    const coupons = await db.collection("coupons").where("uid", "==", doc.id).get();
    const anonymize = db.bulkWriter();
    for (const c of coupons.docs) anonymize.update(c.ref, { uid: "deleted" });
    await anonymize.close();
    await deleteAuthUser(doc.id);
  }
  return pending.size;
}

export const deleteAccount = authedCallable<DeleteAccountRequest, DeleteAccountResponse>(async (request) =>
  handleDeleteAccount(request.auth.uid, request.data),
);

/** يوميًا 04:15 بتوقيت الرياض، بعد بداية يوم اللعبة. */
export const purgeDeletedAccountsDaily = onSchedule(
  { schedule: "15 4 * * *", timeZone: "Asia/Riyadh", region: REGION },
  async () => {
    await purgeDeletedAccounts();
  },
);
