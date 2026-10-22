import type { Puzzle } from "./puzzle.js";

/** الثوابت — GAME_RULES §7.2، §7.5، §7.7، §7.8، و§8.4. */
export const COOP = {
  minPlayers: 2,
  maxPlayers: 6,
  roundSec: 180,
  /** عد تنازلي قبل البدء يعرض فيه إعلان القسائم (`ROUND_WITH_COUPONS` / `ROUND_NO_COUPONS`). */
  countdownSec: 5,
  lobbyMinutes: 10,
  penaltySec: 15,
  heartbeatTimeoutSec: 30,
  /** الحجز يُحرر بعد `endsAt` + 60 ث كحد أقصى. */
  releaseGraceSec: 60,
  dailyWinRewards: 5,
  winReward: { xp: 50, packs: 1 },
  lossReward: { xp: 10 },
} as const;

export interface Member {
  uid: string;
  alias: string;
  joinedAt: string;
  active: boolean;
}

/** أقدم عضو باقٍ (§7.7). */
export function nextHost(members: readonly Member[], leaving?: string): string | null {
  const remaining = members.filter((m) => m.active && m.uid !== leaving).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  return remaining[0]?.uid ?? null;
}

/** الخانات بالتساوي (§7.4): بالترتيب على الأعضاء النشطين. */
export function assignSlots(slotIds: readonly string[], uids: readonly string[]): Record<string, string> {
  return Object.fromEntries(slotIds.map((slotId, i) => [slotId, uids[i % uids.length]!]));
}

/**
 * بطاقات المعلومات (§7.4): إحصاءات قطعة أي خانة تظهر عند لاعب **غير** صاحب الخانة، وتمويه الحل
 * يتوزع على الأقل حملًا. مع لاعب واحد باقٍ (بعد خروج الباقين) تصير كل البطاقات عنده.
 */
export function assignInfo(puzzle: Pick<Puzzle, "pieces" | "solution">, owners: Record<string, string>, uids: readonly string[]): Record<string, string[]> {
  const cards: Record<string, string[]> = Object.fromEntries(uids.map((u) => [u, []]));
  const neededBy = new Map<string, string>();
  for (const [slotId, playerId] of Object.entries(puzzle.solution)) neededBy.set(playerId, owners[slotId]!);
  const lightest = (exclude?: string) => {
    const pool = uids.filter((u) => u !== exclude);
    const from = pool.length > 0 ? pool : uids;
    return from.reduce((a, b) => (cards[b]!.length < cards[a]!.length ? b : a));
  };
  // قطع الحل أولًا (القيد)، ثم التمويه.
  const ordered = [...puzzle.pieces].sort((a, b) => Number(!neededBy.has(a)) - Number(!neededBy.has(b)));
  for (const playerId of ordered) cards[lightest(neededBy.get(playerId))]!.push(playerId);
  return cards;
}

/** خروج لاعب أثناء اللعب (§7.7): خاناته وبطاقاته تتوزع على الباقين بالتساوي، والقطع الموضوعة تبقى. */
export function redistribute(
  puzzle: Pick<Puzzle, "pieces" | "solution">,
  owners: Record<string, string>,
  remaining: readonly string[],
): { owners: Record<string, string>; info: Record<string, string[]> } {
  if (remaining.length === 0) return { owners, info: {} };
  const next = { ...owners };
  const load = (u: string) => Object.values(next).filter((o) => o === u).length;
  for (const slotId of Object.keys(next).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))) {
    if (remaining.includes(next[slotId]!)) continue;
    next[slotId] = remaining.reduce((a, b) => (load(b) < load(a) ? b : a));
  }
  return { owners: next, info: assignInfo(puzzle, next, remaining) };
}

/** وقت الانتهاء بعد العقوبات (§7.5): كل تأكيد خاطئ −15 ث. */
export function endsAtMs(startAtMs: number, penaltySec: number): number {
  return startAtMs + (COOP.roundSec - penaltySec) * 1000;
}

/** المنظور الخاص بكل لاعب (DATA_CONTRACTS §6: `rooms/{id}/views/{uid}`). */
export interface ViewSlot {
  slotId: string;
  position: string;
  requirement: { ar: string; en: string };
}

export function viewFor(
  uid: string,
  puzzle: Pick<Puzzle, "slots">,
  owners: Record<string, string>,
  info: Record<string, string[]>,
  stats: (playerId: string) => Record<string, number>,
): { slots: ViewSlot[]; infoCards: { playerId: string; stats: Record<string, number> }[] } {
  return {
    slots: puzzle.slots.filter((s) => owners[s.slotId] === uid).map((s) => ({ slotId: s.slotId, position: s.position, requirement: s.text })),
    infoCards: (info[uid] ?? []).map((playerId) => ({ playerId, stats: stats(playerId) })),
  };
}

export type CouponMode = "with_coupons" | "no_coupons" | "no_campaign";

/**
 * الحجز الجماعي (§8.4): كله أو لا شيء. المؤهل = ما وصل حد الحملة ولا حد مكافآت الفوز اليومي.
 * يرجع من يُحجز له ومن يأخذ البديل (حزمة ملحمية مضمونة عند الفوز).
 */
export function planReservation(
  hasCampaign: boolean,
  eligible: readonly string[],
  remaining: number,
): { mode: CouponMode; reserveFor: string[] } {
  if (!hasCampaign) return { mode: "no_campaign", reserveFor: [] };
  if (eligible.length === 0) return { mode: "no_coupons", reserveFor: [] };
  return remaining >= eligible.length ? { mode: "with_coupons", reserveFor: [...eligible] } : { mode: "no_coupons", reserveFor: [] };
}
