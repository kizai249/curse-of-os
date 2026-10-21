import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { REGION } from "../shared/config.js";
import { gameDayId } from "../shared/gameDay.js";

export interface DailyMetrics {
  day: string;
  brandId: string;
  branchId: string;
  checkIns: number;
  verifiedVisits: number;
  couponsIssued: number;
  couponsRedeemed: number;
  roomsCreated: number;
  roundsStarted: number;
  roundsWon: number;
  uniquePlayers: number;
}

/** حدود يوم اللعبة بالـUTC: يبدأ 04:00 الرياض = 01:00 UTC. */
export function dayRange(day: string): { start: Date; end: Date } {
  const start = new Date(`${day}T01:00:00.000Z`);
  return { start, end: new Date(start.getTime() + 24 * 3600_000) };
}

/**
 * aggregateDaily — تجميع يوم لعبة إلى metricsDaily/{day_brandId_branchId} (DATA_CONTRACTS §8، ARCHITECTURE §10).
 * المصادر: visits (الحضور والزيارات المحققة واللاعبون)، وcoupons (الممنوح والمسترد)، وأحداث الغرف (S8).
 * Idempotent: إعادة التشغيل لنفس اليوم تكتب نفس الأرقام.
 */
export async function aggregateDay(day: string): Promise<DailyMetrics[]> {
  const db = getFirestore();
  const { start, end } = dayRange(day);
  const rows = new Map<string, DailyMetrics & { players: Set<string> }>();
  const row = (brandId: string, branchId: string) => {
    const key = `${day}_${brandId}_${branchId}`;
    let r = rows.get(key);
    if (!r) {
      r = { day, brandId, branchId, checkIns: 0, verifiedVisits: 0, couponsIssued: 0, couponsRedeemed: 0, roomsCreated: 0, roundsStarted: 0, roundsWon: 0, uniquePlayers: 0, players: new Set() };
      rows.set(key, r);
    }
    return r;
  };

  for (const v of (await db.collection("visits").where("day", "==", day).get()).docs) {
    const r = row(v.get("brandId"), v.get("branchId"));
    r.checkIns++;
    if (v.get("verified") === true) r.verifiedVisits++;
    r.players.add(v.get("uid"));
  }
  const ts = (d: Date) => Timestamp.fromDate(d);
  for (const c of (await db.collection("coupons").where("issuedAt", ">=", ts(start)).where("issuedAt", "<", ts(end)).get()).docs) {
    row(c.get("brandId"), c.get("issuedBranchId")).couponsIssued++;
  }
  for (const c of (await db.collection("coupons").where("redeemedAt", ">=", ts(start)).where("redeemedAt", "<", ts(end)).get()).docs) {
    row(c.get("brandId"), c.get("redeemedBranchId")).couponsRedeemed++;
  }
  for (const e of (await db.collection("events").where("ts", ">=", ts(start)).where("ts", "<", ts(end)).get()).docs) {
    const name = e.get("name") as string;
    const branchId = e.get("branchId") as string | undefined;
    const brandId = e.get("brandId") as string | undefined;
    if (!branchId || !brandId) continue;
    if (name === "co_op_room_created") row(brandId, branchId).roomsCreated++;
    else if (name === "co_op_round_started") row(brandId, branchId).roundsStarted++;
    else if (name === "co_op_win") row(brandId, branchId).roundsWon++;
  }

  const out: DailyMetrics[] = [];
  const writer = db.bulkWriter();
  for (const [key, r] of rows) {
    const { players, ...metrics } = r;
    metrics.uniquePlayers = players.size;
    out.push(metrics);
    writer.set(db.doc(`metricsDaily/${key}`), { ...metrics, updatedAt: Timestamp.now() });
  }
  await writer.close();
  return out.sort((a, b) => a.branchId.localeCompare(b.branchId));
}

/** 04:30 الرياض: تجميع اليوم المنتهي (يبدأ يوم اللعبة الجديد 04:00). */
export const aggregateDaily = onSchedule({ schedule: "30 4 * * *", timeZone: "Asia/Riyadh", region: REGION }, async () => {
  const yesterday = gameDayId(new Date(Date.now() - 24 * 3600_000));
  await aggregateDay(yesterday);
});
