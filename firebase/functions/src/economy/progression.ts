import { DAILY_XP_CAP, MAX_LEVEL } from "./rules.js";

/** XP التراكمية اللازمة لبلوغ المستوى L: مجموع 100×k لـ k من 1 إلى L−1 (GAME_RULES §9.1). */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelFor(totalXp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= xpForLevel(level + 1)) level++;
  return level;
}

export interface XpState {
  xp: number;
  level: number;
  xpDay: { day: string; value: number };
}

/**
 * يضيف XP: كلها تُحسب للمستوى، وأول 600 في اليوم فقط تُحسب للمتصدرين (`xpDay` — GAME_RULES §9.2).
 * يرجع الحالة الجديدة ومقدار XP المحسوب للمتصدرين.
 */
export function addXp(state: XpState, amount: number, day: string): { next: XpState; leaderboardXp: number } {
  if (!Number.isInteger(amount) || amount < 0) throw new Error(`invalid xp amount ${amount}`);
  const today = state.xpDay?.day === day ? state.xpDay.value : 0;
  const leaderboardXp = Math.max(0, Math.min(amount, DAILY_XP_CAP - today));
  const xp = state.xp + amount;
  return {
    next: { xp, level: levelFor(xp), xpDay: { day, value: today + leaderboardXp } },
    leaderboardXp,
  };
}
