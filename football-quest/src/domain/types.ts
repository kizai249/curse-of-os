/** Shared domain types. Pure data — no behaviour, no engine/DOM dependencies. */

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

/** team_badge: one per national team · player_card: fictional position card per team ·
 *  landmark: city landmark postcard · venue_stamp: stamp for visiting a host stadium. */
export const ITEM_KINDS = ['team_badge', 'player_card', 'landmark', 'venue_stamp'] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
export type ModelKey = 'badge' | 'card' | 'postcard' | 'stamp';
export const POSITIONS = ['GK', 'DF', 'MF', 'FW'] as const;
export type PlayerPosition = (typeof POSITIONS)[number];
export type LocationKind = 'stadium' | 'fanzone';

export interface ItemDefinition {
  readonly id: string;
  readonly nameAr: string;
  readonly nameEn: string;
  readonly descriptionAr: string;
  readonly rarity: Rarity;
  readonly kind: ItemKind;
  /** Key of the (replaceable) 3D model used to present the item. */
  readonly modelKey: ModelKey;
  readonly color: string;
  readonly secondaryColor: string;
  readonly teamId?: string;
  readonly position?: PlayerPosition;
  readonly cityId?: string;
  readonly landmarkId?: string;
  readonly venueId?: string;
}

export const MINI_GAME_IDS = ['timing_shot', 'cup_quiz', 'squad_builder', 'party_shootout'] as const;
export type MiniGameId = (typeof MINI_GAME_IDS)[number];

export interface Reward {
  readonly xp?: number;
  readonly shards?: number;
  readonly itemId?: string;
}

export type MissionObjective =
  | { readonly type: 'discover'; readonly target: number; readonly locationKind?: LocationKind; readonly cityId?: string }
  | { readonly type: 'collect'; readonly target: number; readonly minRarity?: Rarity; readonly itemKind?: ItemKind }
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
  readonly locationId: string;
  readonly x: number;
  readonly z: number;
  /** Fixed reward (landmark postcard, venue stamp). Absent → random roll from the drop pool. */
  readonly grantItemId?: string;
}

/** A playable place on the map: a host stadium or a city fan zone with landmarks. */
export interface LocationDefinition {
  readonly id: string;
  readonly kind: LocationKind;
  readonly cityId: string;
  readonly venueId?: string;
  readonly nameAr: string;
  readonly points: readonly DiscoveryPointDefinition[];
}

/** Gameplay facts that drive mission progress and achievements. */
export type GameplayEvent =
  | { readonly type: 'discovery'; readonly pointId: string; readonly locationKind: LocationKind; readonly cityId: string }
  | { readonly type: 'item_collected'; readonly itemId: string; readonly rarity: Rarity; readonly kind: ItemKind; readonly duplicate: boolean }
  | { readonly type: 'minigame_finished'; readonly gameId: MiniGameId; readonly success: boolean; readonly score: number };

export function rarityRank(rarity: Rarity): number {
  return RARITIES.indexOf(rarity);
}
