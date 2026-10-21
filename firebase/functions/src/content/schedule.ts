import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import { REGION } from "../shared/config.js";
import { SLOT_PATTERN, loadStadiums, loadTeams } from "./catalog.js";

export interface ScheduleEntry {
  matchId: string;
  matchNo: number;
  stage: "group" | "r16" | "qf" | "sf" | "final";
  group: string | null;
  day: string;
  stadiumId: string | null;
  home: string;
  away: string;
  status: "scheduled" | "finished";
  score: { home: number; away: number } | null;
}

const STAGES = new Set(["group", "r16", "qf", "sf", "final"]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * يتحقق من مستند `matchResults` (DATA_CONTRACTS §7) ويرجع الحقول العامة فقط.
 * `updatedBy` (معرّف المسؤول) ما يُنشر للاعبين. يرجع null للمستند غير الصالح.
 */
export function toScheduleEntry(
  matchId: string,
  data: FirebaseFirestore.DocumentData,
  teamCodes: ReadonlySet<string>,
  stadiumIds: ReadonlySet<string>,
): ScheduleEntry | null {
  const side = (v: unknown) => typeof v === "string" && (teamCodes.has(v) || SLOT_PATTERN.test(v));
  if (!Number.isInteger(data.matchNo) || data.matchNo < 1 || data.matchNo > 51) return null;
  if (!STAGES.has(data.stage)) return null;
  if (typeof data.day !== "string" || !DAY.test(data.day)) return null;
  if (!side(data.home) || !side(data.away)) return null;
  if (data.stadiumId != null && !stadiumIds.has(data.stadiumId)) return null;
  if (data.status !== "scheduled" && data.status !== "finished") return null;
  const score =
    data.status === "finished" && data.score && Number.isInteger(data.score.home) && Number.isInteger(data.score.away)
      ? { home: data.score.home as number, away: data.score.away as number }
      : null;
  if (data.status === "finished" && score === null) return null;
  return {
    matchId,
    matchNo: data.matchNo,
    stage: data.stage,
    group: typeof data.group === "string" ? data.group : null,
    day: data.day,
    stadiumId: data.stadiumId ?? null,
    home: data.home,
    away: data.away,
    status: data.status,
    score,
  };
}

/**
 * يبني `content/schedule` (مستند واحد بكل المباريات) من `matchResults`، عشان العميل يقرأ مستندًا واحدًا
 * بدل 51 (ARCHITECTURE §11 تقليل القراءات). المستند قراءة عامة للمسجلين، وكتابة الخادم فقط.
 */
export async function rebuildSchedule(now: Date = new Date()): Promise<{ matches: number; skipped: string[] }> {
  const db = getFirestore();
  const teams = new Set(loadTeams().map((t) => t.code));
  const stadiums = new Set(loadStadiums().map((s) => s.id));
  const snap = await db.collection("matchResults").get();
  const skipped: string[] = [];
  const matches: ScheduleEntry[] = [];
  for (const doc of snap.docs) {
    const entry = toScheduleEntry(doc.id, doc.data(), teams, stadiums);
    if (entry) matches.push(entry);
    else skipped.push(doc.id);
  }
  matches.sort((a, b) => a.matchNo - b.matchNo);
  if (skipped.length > 0) logger.warn("rebuildSchedule skipped invalid matchResults", { skipped });
  await db.doc("content/schedule").set({ matches, updatedAt: Timestamp.fromDate(now) });
  return { matches: matches.length, skipped };
}

export const onMatchResultWritten = onDocumentWritten(
  { document: "matchResults/{matchId}", region: REGION },
  async () => {
    await rebuildSchedule();
  },
);
