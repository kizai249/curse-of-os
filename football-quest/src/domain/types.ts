/** Shared domain types. Pure data — no behaviour, no engine/DOM dependencies. */

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export type ItemCategory = 'ball' | 'boots' | 'gloves' | 'kit' | 'gear' | 'trophy' | 'card';
export type ModelKey = 'ball' | 'boots' | 'gloves' | 'kit' | 'scarf' | 'cone' | 'whistle' | 'trophy' | 'card';
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export interface ItemDefinition {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr: string;
  readonly rarity: Rarity;
  readonly category: ItemCategory;
  /** Key of the (replaceable) 3D model used to present the item. */
  readonly modelKey: ModelKey;
  readonly color: string;
  readonly position?: PlayerPosition;
}

export const MINI_GAME_IDS = ['timing_shot', 'tactics_quiz', 'squad_builder'] as const;
export type MiniGameId = (typeof MINI_GAME_IDS)[number];

export interface Reward {
  readonly xp?: number;
  readonly shards?: number;
  readonly itemId?: string;
}

export type MissionObjective =
  | { readonly type: 'discover'; readonly target: number }
  | { readonly type: 'collect'; readonly target: number; readonly minRarity?: Rarity }
  | { readonly type: 'play_minigame'; readonly target: number; readonly gameId?: MiniGameId }
  | { readonly type: 'win_minigame'; readonly target: number; readonly gameId?: MiniGameId }
  | { readonly type: 'score_minigame'; readonly target: number; readonly gameId: MiniGameId; readonly minScore: number };

export interface MissionDefinition {
  readonly id: string;
  readonly kind: 'intro' | 'daily';
  readonly titleAr: string;
  readonly descriptionAr: string;
  readonly objective: MissionObjective;
  readonly reward: Reward;
}

export interface DiscoveryPointDefinition {
  readonly id: string;
  readonly x: number;
  readonly z: number;
}

/** Gameplay facts that drive mission progress and achievements. */
export type GameplayEvent =
  | { readonly type: 'discovery'; readonly pointId: string }
  | { readonly type: 'item_collected'; readonly itemId: string; readonly rarity: Rarity; readonly duplicate: boolean }
  | { readonly type: 'minigame_finished'; readonly gameId: MiniGameId; readonly success: boolean; readonly score: number };

export function rarityRank(rarity: Rarity): number {
  return RARITIES.indexOf(rarity);
}
