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

export interface CupQuizConfig {
  readonly questionsPerRound: number;
  readonly correctToWin: number;
  readonly questionTimeMs: number;
  readonly feedbackMs: number;
  readonly pointsPerCorrect: number;
  readonly pointsPerSecondLeft: number;
}

export const CUP_QUIZ_CONFIG: CupQuizConfig = {
  questionsPerRound: 10,
  correctToWin: 6,
  questionTimeMs: 15000,
  feedbackMs: 1400,
  pointsPerCorrect: 100,
  pointsPerSecondLeft: 5,
};

export function cupQuizMaxScore(c: CupQuizConfig = CUP_QUIZ_CONFIG): number {
  return c.questionsPerRound * (c.pointsPerCorrect + Math.floor(c.questionTimeMs / 1000) * c.pointsPerSecondLeft);
}

export interface SquadConfig {
  readonly rarityValue: Readonly<Record<'common' | 'rare' | 'epic' | 'legendary', number>>;
  readonly fitBonus: number;
  readonly flexFitBonus: number;
  readonly sameTeamBonus: number;
  readonly sameGroupBonus: number;
  readonly winScore: number;
}

export const SQUAD_CONFIG: SquadConfig = {
  rarityValue: { common: 10, rare: 20, epic: 35, legendary: 50 },
  fitBonus: 15,
  flexFitBonus: 5,
  sameTeamBonus: 20,
  sameGroupBonus: 8,
  /** Reachable early with a few cards from one team; strong lineups score 250+. */
  winScore: 100,
};

export interface PartyConfig {
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly rounds: number;
  readonly maxSuddenDeathRounds: number;
  readonly sweepMs: number;
  readonly targetMin: number;
  readonly targetMax: number;
  readonly perfectWindow: number;
  readonly goodWindow: number;
  readonly resolveDelayMs: number;
}

export const PARTY_CONFIG: PartyConfig = {
  minPlayers: 2,
  maxPlayers: 4,
  rounds: 5,
  maxSuddenDeathRounds: 5,
  sweepMs: 1200,
  targetMin: 0.25,
  targetMax: 0.75,
  perfectWindow: 0.05,
  goodWindow: 0.14,
  resolveDelayMs: 1300,
};

export function partyMaxScore(c: PartyConfig = PARTY_CONFIG): number {
  return c.rounds + c.maxSuddenDeathRounds;
}

export interface MiniGameInfo {
  readonly id: MiniGameId;
  readonly titleAr: string;
  readonly descriptionAr: string;
  readonly maxScore: number;
  /** Party games are played by several people on one device. */
  readonly party: boolean;
}

/** 5 slots, 4 exact-fit slots + FLEX, 10 card pairs. Mirrors squadMaxScore() (asserted in tests). */
const SQUAD_SCORE_CEILING = 5 * SQUAD_CONFIG.rarityValue.legendary + 4 * SQUAD_CONFIG.fitBonus + SQUAD_CONFIG.flexFitBonus
  + 10 * Math.max(SQUAD_CONFIG.sameTeamBonus, SQUAD_CONFIG.sameGroupBonus);

export const MINI_GAMES: Readonly<Record<MiniGameId, MiniGameInfo>> = {
  timing_shot: { id: 'timing_shot', titleAr: 'تحدي التسديد', descriptionAr: 'وقّف المؤشر في المنطقة الذهبية وسجّل 3 أهداف من 5.', maxScore: timingShotMaxScore(), party: false },
  cup_quiz: { id: 'cup_quiz', titleAr: 'وش تعرف عن البطولة؟', descriptionAr: '10 أسئلة سريعة عن المنتخبات والملاعب والمدن المستضيفة.', maxScore: cupQuizMaxScore(), party: false },
  squad_builder: { id: 'squad_builder', titleAr: 'تحدي التشكيلة', descriptionAr: 'كوّن خماسي من بطاقاتك: المركز الصح + نفس المنتخب = كيمياء أعلى.', maxScore: SQUAD_SCORE_CEILING, party: false },
  party_shootout: { id: 'party_shootout', titleAr: 'ركلات الشلة', descriptionAr: 'من 2 إلى 4 لاعبين على نفس الجوال: كل واحد يختار منتخبه والأكثر أهداف يفوز.', maxScore: partyMaxScore(), party: true },
};
