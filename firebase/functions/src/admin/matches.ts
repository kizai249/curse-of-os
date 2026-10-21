import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { fail } from "../shared/errors.js";
import { StaffClaims } from "../shared/roles.js";
import { staffCallable } from "../shared/staffCallable.js";
import { loadStadiums, loadTeams } from "../content/catalog.js";
import { toScheduleEntry } from "../content/schedule.js";

/**
 * upsertMatchResult — usersx_admin يدخل الجدول والنتائج يدويًا من مصادر منشورة (RIGHTS_REGISTER الصف 18).
 * نفس تحقق content/schedule، والـtrigger يعيد بناء الجدول. النتائج ما تأثر على أي مكافأة.
 */
export async function handleUpsertMatch(staff: StaffClaims, input: Record<string, unknown>, now = new Date()) {
  if (staff.role !== "usersx_admin") fail("permission-denied", "ADMIN_ONLY");
  const matchNo = input?.matchNo;
  if (typeof matchNo !== "number" || !Number.isInteger(matchNo) || matchNo < 1 || matchNo > 51) fail("invalid-argument", "INVALID_FIELD", { field: "matchNo" });
  const matchId = `m${String(matchNo).padStart(2, "0")}`;
  const data = {
    matchNo,
    stage: input.stage,
    group: input.group ?? null,
    day: input.day,
    stadiumId: input.stadiumId ?? null,
    home: input.home,
    away: input.away,
    status: input.status ?? "scheduled",
    score: input.score ?? null,
  };
  const valid = toScheduleEntry(matchId, data, new Set(loadTeams().map((t) => t.code)), new Set(loadStadiums().map((s) => s.id)));
  if (!valid) fail("invalid-argument", "INVALID_MATCH");
  await getFirestore().doc(`matchResults/${matchId}`).set({ ...data, updatedBy: staff.uid, updatedAt: Timestamp.fromDate(now) });
  return { matchId };
}

export const upsertMatchResult = staffCallable(["usersx_admin"], (staff, data: Record<string, unknown>) => handleUpsertMatch(staff, data));
