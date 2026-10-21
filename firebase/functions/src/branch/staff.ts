import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { REGION, isEmulator } from "../shared/config.js";
import { fail } from "../shared/errors.js";
import { gameDayId, nextRollover } from "../shared/gameDay.js";
import { canActForBranch, requireRole, StaffClaims } from "../shared/roles.js";
import { signBranchCode } from "./codes.js";
import { BRANCH_CODE_SECRET } from "./scan.js";

/** rotateBranchCodes — 04:00 الرياض: رموز اليوم لكل الفروع النشطة في branches/{id}/daily/{day} (خادم فقط). */
export async function rotateBranchCodes(secret: string, now: Date = new Date()): Promise<number> {
  const db = getFirestore();
  const day = gameDayId(now);
  const branches = await db.collection("branches").where("active", "==", true).get();
  const writer = db.bulkWriter();
  for (const b of branches.docs) {
    writer.set(db.doc(`branches/${b.id}/daily/${day}`), { token: signBranchCode(secret, b.id, day), createdAt: Timestamp.fromDate(now) });
  }
  await writer.close();
  return branches.size;
}

export const rotateBranchCodesDaily = onSchedule(
  { schedule: "0 4 * * *", timeZone: "Asia/Riyadh", region: REGION, secrets: [BRANCH_CODE_SECRET] },
  async () => {
    await rotateBranchCodes(BRANCH_CODE_SECRET.value());
  },
);

/** getBranchScreen — «شاشة الفرع» في لوحة الشركاء: رمز اليوم ووقت تغيّره (AT-03: يتغير بعد 04:00 تلقائيًا). */
export async function handleBranchScreen(staff: StaffClaims, input: { branchId?: string }, secret: string, now: Date = new Date()) {
  const branchId = staff.role === "branch_staff" ? staff.branchId : input?.branchId;
  if (!branchId) fail("invalid-argument", "BRANCH_REQUIRED");
  const db = getFirestore();
  const branch = await db.doc(`branches/${branchId}`).get();
  if (!branch.exists) fail("not-found", "BRANCH_NOT_FOUND");
  if (!canActForBranch(staff, branch.data() as { brandId: string }, branchId!)) fail("permission-denied", "STAFF_ONLY");
  if (branch.get("active") !== true) fail("failed-precondition", "QR_BRANCH_INACTIVE");
  const day = gameDayId(now);
  const ref = db.doc(`branches/${branchId}/daily/${day}`);
  const existing = await ref.get();
  const token = existing.exists ? (existing.get("token") as string) : signBranchCode(secret, branchId!, day);
  if (!existing.exists) await ref.set({ token, createdAt: Timestamp.fromDate(now) });
  return { branchId, name: branch.get("name"), day, token, validUntil: nextRollover(now).toISOString() };
}

export const getBranchScreen = onCall<{ branchId?: string }>(
  { region: REGION, enforceAppCheck: !isEmulator(), secrets: [BRANCH_CODE_SECRET] },
  async (request) =>
    handleBranchScreen(requireRole(request, ["branch_staff", "partner_admin", "usersx_admin"]), request.data, BRANCH_CODE_SECRET.value()),
);
