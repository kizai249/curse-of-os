/**
 * Every tunable gameplay number lives here — no magic numbers in systems.
 * Values can be overridden at runtime through RemoteConfig (see services/RemoteConfig.ts).
 */
import type { Rarity } from '../domain/types';

export const PROGRESSION = {
  /** XP required to go from level 1 to 2. */
  baseXpPerLevel: 100,
  /** Each level needs this multiple of the previous level's requirement. */
  levelGrowth: 1.2,
  maxLevel: 50,
} as const;

export const XP_REWARDS = {
  discovery: 15,
  miniGamePlayed: 10,
  miniGameWon: 40,
} as const;

/** Shards granted when a collected item is already owned. */
export const DUPLICATE_SHARDS: Readonly<Record<Rarity, number>> = {
  common: 5,
  rare: 15,
  epic: 40,
  legendary: 100,
};

/** Relative drop weights for a discovery roll. */
export const RARITY_WEIGHTS: Readonly<Record<Rarity, number>> = {
  common: 62,
  rare: 26,
  epic: 10,
  legendary: 2,
};

/** Upper bounds a single reward grant may carry; anything above is rejected as invalid. */
export const REWARD_LIMITS = {
  maxXpPerGrant: 1000,
  maxShardsPerGrant: 500,
} as const;

export const ARENA = {
  /** Distance (world units) within which the player can collect a discovery point. */
  interactionRadius: 2.4,
  /** Time before a collected point becomes available again. */
  respawnMs: 3 * 60 * 1000,
  /** Avatar walk speed in world units per second. */
  walkSpeed: 6,
  /** Half-size of the walkable square area. */
  boundsHalfSize: 22,
} as const;

export const SAVE = {
  /** Most recent reward-grant ids remembered to block duplicate claims. */
  ledgerCapacity: 500,
} as const;

export const DAILY_MISSIONS_PER_DAY = 3;

/** Frame/perf budget used by the in-game performance monitor. */
export const PERFORMANCE = {
  targetFpsLow: 30,
  targetFpsHigh: 60,
  /** Pixel-ratio cap per quality level; the main lever for mobile GPU cost. */
  pixelRatioCap: { low: 1, medium: 1.5, high: 2 },
  shadowMapSize: { low: 0, medium: 1024, high: 2048 },
  particlePoolSize: 160,
} as const;
