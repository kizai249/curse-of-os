import type { MiniGameId } from '../domain/types';

export interface TimingShotConfig {
  readonly shots: number;
  readonly goalsToWin: number;
  readonly baseSweepMs: number;
  readonly sweepSpeedupMs: number;
  readonly minSweepMs: number;
  readonly targetMin: number;
  readonly targetMax: number;
  readonly perfectWindow: number;
  readonly goodWindow: number;
  readonly points: { readonly perfect: number; readonly good: number; readonly saved: number };
  readonly streakBonus: number;
  readonly resolveDelayMs: number;
}

export const TIMING_SHOT_CONFIG: TimingShotConfig = {
  shots: 5,
  goalsToWin: 3,
  /** Time for the power needle to sweep 0→1→0 on the first shot. */
  baseSweepMs: 1500,
  /** Each shot the needle gets faster by this much… */
  sweepSpeedupMs: 130,
  /** …but never faster than this. */
  minSweepMs: 750,
  /** Sweet-spot centre is randomised inside this range of the meter. */
  targetMin: 0.25,
  targetMax: 0.75,
  /** Max distance from the sweet-spot centre (normalised meter units). */
  perfectWindow: 0.05,
  goodWindow: 0.14,
  points: { perfect: 3, good: 2, saved: 0 },
  /** Extra point for each goal that continues a scoring streak. */
  streakBonus: 1,
  /** Input lock while the shot animation plays — also absorbs rapid repeated taps. */
  resolveDelayMs: 1100,
};

export function timingShotMaxScore(c: TimingShotConfig = TIMING_SHOT_CONFIG): number {
  return c.shots * c.points.perfect + (c.shots - 1) * c.streakBonus;
}

export interface MiniGameInfo {
  readonly id: MiniGameId;
  readonly titleAr: string;
  readonly descriptionAr: string;
  readonly maxScore: number;
  /** Only implemented games can be launched; the rest are shown as "coming soon" (non-interactive). */
  readonly available: boolean;
}

export const MINI_GAMES: Readonly<Record<MiniGameId, MiniGameInfo>> = {
  timing_shot: { id: 'timing_shot', titleAr: 'تحدي التسديد', descriptionAr: 'وقّف المؤشر في المنطقة الذهبية وسجّل 3 أهداف من 5.', maxScore: timingShotMaxScore(), available: true },
  tactics_quiz: { id: 'tactics_quiz', titleAr: 'تحدي التكتيك', descriptionAr: 'أسئلة خطط ومواقف كروية سريعة.', maxScore: 0, available: false },
  squad_builder: { id: 'squad_builder', titleAr: 'تحدي التشكيلة', descriptionAr: 'كوّن تشكيلة من بطاقاتك وحقق الكيمياء.', maxScore: 0, available: false },
};
