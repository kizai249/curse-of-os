import { describe, expect, it } from 'vitest';
import { addXp, levelFromTotalXp, xpRequiredForLevel } from '../src/domain/progression';

const cfg = { baseXpPerLevel: 100, levelGrowth: 1.5, maxLevel: 4 };

describe('progression', () => {
  it('computes per-level requirements from the curve', () => {
    expect(xpRequiredForLevel(1, cfg)).toBe(100);
    expect(xpRequiredForLevel(2, cfg)).toBe(150);
    expect(xpRequiredForLevel(3, cfg)).toBe(225);
  });

  it('derives level and in-level progress from total XP', () => {
    expect(levelFromTotalXp(0, cfg)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 100, isMaxLevel: false });
    expect(levelFromTotalXp(99, cfg).level).toBe(1);
    expect(levelFromTotalXp(100, cfg)).toEqual({ level: 2, xpIntoLevel: 0, xpForNextLevel: 150, isMaxLevel: false });
    expect(levelFromTotalXp(260, cfg)).toEqual({ level: 3, xpIntoLevel: 10, xpForNextLevel: 225, isMaxLevel: false });
  });

  it('caps at max level', () => {
    expect(levelFromTotalXp(1_000_000, cfg)).toEqual({ level: 4, xpIntoLevel: 0, xpForNextLevel: 0, isMaxLevel: true });
  });

  it('reports multi-level gains', () => {
    const gain = addXp(0, 300, cfg);
    expect(gain).toEqual({ totalXp: 300, previousLevel: 1, newLevel: 3, levelsGained: 2 });
  });

  it('rejects invalid XP amounts and invalid totals', () => {
    expect(() => addXp(0, -5, cfg)).toThrow(RangeError);
    expect(() => addXp(0, 1.5, cfg)).toThrow(RangeError);
    expect(() => addXp(0, Number.NaN, cfg)).toThrow(RangeError);
    expect(() => levelFromTotalXp(-1, cfg)).toThrow(RangeError);
    expect(() => xpRequiredForLevel(0, cfg)).toThrow(RangeError);
  });
});
