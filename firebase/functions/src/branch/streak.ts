import { defineBoolean } from "firebase-functions/params";
import { isEmulator } from "../shared/config.js";

/**
 * مكافآت سلسلة الزيارات — GAME_RULES §6.4 (S6b، R2). العدّ يشتغل من R1، والمكافآت خلف
 * `STREAK_REWARDS=true` في `.env.fq-prod` يوم إصدار R2 (مع `feature_streak` في Remote Config). المحاكي: مفعّلة.
 */
export const STREAK_REWARDS = defineBoolean("STREAK_REWARDS", { default: false });
export const streakRewardsOn = (): boolean => isEmulator() || STREAK_REWARDS.value();

export interface StreakReward {
  day: 3 | 5 | 7;
  packs: number;
  epicPacks: number;
  /** بطاقة لاعب نادرة أو أعلى. */
  playerCard: boolean;
  /** أهلية قسيمة حملة `visit_streak` للعلامة. */
  coupon: boolean;
}

const TABLE: Record<number, StreakReward> = {
  3: { day: 3, packs: 2, epicPacks: 0, playerCard: false, coupon: false },
  5: { day: 5, packs: 0, epicPacks: 0, playerCard: true, coupon: false },
  7: { day: 7, packs: 0, epicPacks: 1, playerCard: false, coupon: true },
};

/**
 * المكافأة لما توصل السلسلة لليوم 3 أو 5 أو 7 (أول زيارة محققة للعلامة في ذاك اليوم فقط).
 * بعد اليوم 7 ما فيه دورة جديدة لين تنقطع السلسلة (Q39).
 */
export function streakReward(previousCount: number, nextCount: number): StreakReward | null {
  if (nextCount === previousCount) return null;
  return TABLE[nextCount] ?? null;
}
