import { getFirestore } from "firebase-admin/firestore";
import { fail } from "../shared/errors.js";
import { StaffClaims } from "../shared/roles.js";
import { staffCallable } from "../shared/staffCallable.js";
import { DailyMetrics } from "./aggregate.js";

/** قاعدة الخصوصية (ARCHITECTURE §8): أي خانة أقل من 10 تظهر «أقل من 10»، وما فيه أي معرّف لاعب ولا إحداثيات. */
export const MIN_CELL = 10;
export const MASKED = "<10";

export type Cell = number | typeof MASKED;
export type ReportRow = { day: string; brandId: string; branchId: string } & Record<Exclude<keyof DailyMetrics, "day" | "brandId" | "branchId">, Cell>;

const METRICS = ["checkIns", "verifiedVisits", "couponsIssued", "couponsRedeemed", "roomsCreated", "roundsStarted", "roundsWon", "uniquePlayers"] as const;

export function mask(row: DailyMetrics): ReportRow {
  const out = { day: row.day, brandId: row.brandId, branchId: row.branchId } as ReportRow;
  for (const m of METRICS) {
    const v = row[m];
    (out as Record<string, Cell>)[m] = v > 0 && v < MIN_CELL ? MASKED : v;
  }
  return out;
}

/** التقارير المجمعة لكل فرع ويوم — بنطاق الشريك (علامته) أو الكل لـ usersx_admin. */
export async function handleReport(staff: StaffClaims, input: { from?: string; to?: string; branchId?: string }) {
  if (staff.role === "branch_staff") fail("permission-denied", "PARTNER_ONLY");
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (!day.test(input?.from ?? "") || !day.test(input?.to ?? "") || input.from! > input.to!) fail("invalid-argument", "INVALID_RANGE");
  let q: FirebaseFirestore.Query = getFirestore().collection("metricsDaily").where("day", ">=", input.from).where("day", "<=", input.to);
  if (staff.role === "partner_admin") q = q.where("brandId", "==", staff.brandId ?? "_");
  const docs = (await q.get()).docs.map((d) => d.data() as DailyMetrics);
  const rows = docs.filter((r) => !input.branchId || r.branchId === input.branchId).map(mask);
  rows.sort((a, b) => (a.day === b.day ? a.branchId.localeCompare(b.branchId) : a.day.localeCompare(b.day)));
  return { rows, minCell: MIN_CELL };
}

export const getReport = staffCallable(["usersx_admin", "partner_admin"], (staff, data: { from?: string; to?: string; branchId?: string }) =>
  handleReport(staff, data),
);
