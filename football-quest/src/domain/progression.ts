import { PROGRESSION } from '../config/balance';

export interface ProgressionConfig {
  readonly baseXpPerLevel: number;
  readonly levelGrowth: number;
  readonly maxLevel: number;
}

export interface LevelInfo {
  readonly level: number;
  /** XP earned inside the current level. */
  readonly xpIntoLevel: number;
  /** XP required to finish the current level (0 at max level). */
  readonly xpForNextLevel: number;
  readonly isMaxLevel: boolean;
}

/** XP needed to advance from `level` to `level + 1`. */
export function xpRequiredForLevel(level: number, config: ProgressionConfig = PROGRESSION): number {
  if (!Number.isInteger(level) || level < 1) throw new RangeError(`Invalid level: ${level}`);
  return Math.round(config.baseXpPerLevel * Math.pow(config.levelGrowth, level - 1));
}

/** Level is always derived from total XP so the two can never disagree in a save file. */
export function levelFromTotalXp(totalXp: number, config: ProgressionConfig = PROGRESSION): LevelInfo {
  if (!Number.isFinite(totalXp) || totalXp < 0) throw new RangeError(`Invalid total XP: ${totalXp}`);
  let level = 1;
  let remaining = Math.floor(totalXp);
  while (level < config.maxLevel) {
    const need = xpRequiredForLevel(level, config);
    if (remaining < need) {
      return { level, xpIntoLevel: remaining, xpForNextLevel: need, isMaxLevel: false };
    }
    remaining -= need;
    level++;
  }
  return { level: config.maxLevel, xpIntoLevel: 0, xpForNextLevel: 0, isMaxLevel: true };
}

export interface XpGain {
  readonly totalXp: number;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly levelsGained: number;
}

export function addXp(totalXp: number, amount: number, config: ProgressionConfig = PROGRESSION): XpGain {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError(`XP amount must be a non-negative integer, got ${amount}`);
  const previousLevel = levelFromTotalXp(totalXp, config).level;
  const next = totalXp + amount;
  const newLevel = levelFromTotalXp(next, config).level;
  return { totalXp: next, previousLevel, newLevel, levelsGained: newLevel - previousLevel };
}
