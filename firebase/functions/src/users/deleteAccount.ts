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

  // TODO(S7): إلغاء القسائم غير المستردة (issued → expired، وreserved → released) داخل نفس الطلب.
  await getAuth().updateUser(uid, { disabled: true });
  await getAuth().revokeRefreshTokens(uid);
  return { status: "scheduled", purgeBy: new Date(now.getTime() + DELETION_WINDOW_MS).toISOString() };
}

/** يحذف نهائيًا كل الحسابات المطلوب حذفها: الملف ومجموعاته الفرعية ومستخدم Auth. */
export async function purgeDeletedAccounts(): Promise<number> {
  const db = getFirestore();
  const pending = await db.collection("users").where("deletionRequestedAt", "!=", null).get();
  for (const doc of pending.docs) {
    // TODO(S7/S9): حذف `visits` و`events` المرتبطة بـ uid عند إضافتها.
    await db.recursiveDelete(doc.ref);
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
