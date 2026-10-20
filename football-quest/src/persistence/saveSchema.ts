import type { InventoryState, OwnedItem } from '../domain/inventory';
import type { MissionProgress, MissionsState, MissionStatus } from '../domain/missions';
import type { MiniGameId } from '../domain/types';
import { MINI_GAME_IDS } from '../domain/types';

export const SAVE_VERSION = 2;

export type QualityLevel = 'low' | 'medium' | 'high';

export interface Settings {
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly reducedMotion: boolean;
  readonly quality: QualityLevel;
  readonly haptics: boolean;
  /** Player opted in to GPS map mode. The arena mode never needs location. */
  readonly locationOptIn: boolean;
}

export interface PlayerStats {
  readonly discoveries: number;
  readonly itemsCollected: number;
  readonly miniGamesPlayed: number;
  readonly miniGamesWon: number;
  readonly bestScores: Readonly<Partial<Record<MiniGameId, number>>>;
}

export interface SaveData {
  readonly version: typeof SAVE_VERSION;
  readonly player: {
    readonly id: string;
    readonly displayName: string;
    readonly createdAt: number;
    readonly mode: 'guest';
  };
  readonly progression: { readonly totalXp: number };
  readonly inventory: InventoryState;
  readonly missions: MissionsState;
  /** Applied reward grant ids (duplicate-claim protection). */
  readonly ledger: readonly string[];
  readonly arena: { readonly collectedAt: Readonly<Record<string, number>>; readonly lastLocationId?: string };
  readonly stats: PlayerStats;
  readonly settings: Settings;
  readonly updatedAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.6,
  sfxVolume: 0.8,
  reducedMotion: false,
  quality: 'medium',
  haptics: true,
  locationOptIn: false,
};

export const EMPTY_STATS: PlayerStats = {
  discoveries: 0,
  itemsCollected: 0,
  miniGamesPlayed: 0,
  miniGamesWon: 0,
  bestScores: {},
};

// ── Validation helpers ─────────────────────────────────────────────────────

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonNegInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const isUnit = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
const isStr = (v: unknown): v is string => typeof v === 'string';
const MISSION_STATUSES: readonly MissionStatus[] = ['active', 'completed', 'claimed', 'expired'];

function parseRecordOf<T>(v: unknown, parse: (x: unknown) => T | null): Record<string, T> | null {
  if (!isRec(v)) return null;
  const out: Record<string, T> = {};
  for (const [k, x] of Object.entries(v)) {
    const parsed = parse(x);
    if (parsed === null) return null;
    out[k] = parsed;
  }
  return out;
}

const parseOwned = (v: unknown): OwnedItem | null =>
  isRec(v) && isNonNegInt(v.count) && v.count > 0 && isNonNegInt(v.firstObtainedAt)
    ? { count: v.count, firstObtainedAt: v.firstObtainedAt }
    : null;

const parseMission = (v: unknown): MissionProgress | null =>
  isRec(v) && isNonNegInt(v.progress) && MISSION_STATUSES.includes(v.status as MissionStatus)
    ? { progress: v.progress, status: v.status as MissionStatus }
    : null;

/** Settings are repaired field-by-field: a bad volume should never cost the player their progress. */
export function parseSettings(v: unknown): Settings {
  const s = isRec(v) ? v : {};
  return {
    musicVolume: isUnit(s.musicVolume) ? s.musicVolume : DEFAULT_SETTINGS.musicVolume,
    sfxVolume: isUnit(s.sfxVolume) ? s.sfxVolume : DEFAULT_SETTINGS.sfxVolume,
    reducedMotion: typeof s.reducedMotion === 'boolean' ? s.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    quality: s.quality === 'low' || s.quality === 'medium' || s.quality === 'high' ? s.quality : DEFAULT_SETTINGS.quality,
    haptics: typeof s.haptics === 'boolean' ? s.haptics : DEFAULT_SETTINGS.haptics,
    locationOptIn: typeof s.locationOptIn === 'boolean' ? s.locationOptIn : DEFAULT_SETTINGS.locationOptIn,
  };
}

function parseStats(v: unknown): PlayerStats {
  const s = isRec(v) ? v : {};
  const bestScores: Partial<Record<MiniGameId, number>> = {};
  if (isRec(s.bestScores)) {
    for (const id of MINI_GAME_IDS) {
      const score = s.bestScores[id];
      if (isNonNegInt(score)) bestScores[id] = score;
    }
  }
  return {
    discoveries: isNonNegInt(s.discoveries) ? s.discoveries : 0,
    itemsCollected: isNonNegInt(s.itemsCollected) ? s.itemsCollected : 0,
    miniGamesPlayed: isNonNegInt(s.miniGamesPlayed) ? s.miniGamesPlayed : 0,
    miniGamesWon: isNonNegInt(s.miniGamesWon) ? s.miniGamesWon : 0,
    bestScores,
  };
}

/**
 * Validates a current-version save. Progress-bearing data (player, XP, inventory, missions,
 * ledger) must be intact; cosmetic data (settings, stats, arena timers) is repaired.
 * Returns the list of problems when the save cannot be trusted.
 */
export function parseSave(raw: unknown): { ok: true; data: SaveData } | { ok: false; problems: string[] } {
  const problems: string[] = [];
  if (!isRec(raw)) return { ok: false, problems: ['root is not an object'] };
  if (raw.version !== SAVE_VERSION) problems.push(`unexpected version ${String(raw.version)}`);

  const p = raw.player;
  const playerOk = isRec(p) && isStr(p.id) && p.id.length > 0 && isStr(p.displayName) && isNonNegInt(p.createdAt);
  if (!playerOk) problems.push('player invalid');

  const prog = raw.progression;
  if (!isRec(prog) || !isNonNegInt(prog.totalXp)) problems.push('progression invalid');

  const inv = raw.inventory;
  const items = isRec(inv) ? parseRecordOf(inv.items, parseOwned) : null;
  if (!isRec(inv) || items === null || !isNonNegInt(inv.shards)) problems.push('inventory invalid');

  const m = raw.missions;
  const intro = isRec(m) ? parseRecordOf(m.intro, parseMission) : null;
  const daily = isRec(m) && isRec(m.daily) ? m.daily : null;
  const dailyEntries = daily ? parseRecordOf(daily.entries, parseMission) : null;
  if (intro === null || daily === null || !isStr(daily.dayKey) || dailyEntries === null) problems.push('missions invalid');

  const ledger = raw.ledger;
  if (!Array.isArray(ledger) || !ledger.every(isStr)) problems.push('ledger invalid');

  if (problems.length > 0) return { ok: false, problems };

  const arenaRaw = isRec(raw.arena) ? parseRecordOf(raw.arena.collectedAt, (x) => (isNonNegInt(x) ? x : null)) : null;

  const player = p as Rec;
  return {
    ok: true,
    data: {
      version: SAVE_VERSION,
      player: { id: player.id as string, displayName: player.displayName as string, createdAt: player.createdAt as number, mode: 'guest' },
      progression: { totalXp: (prog as Rec).totalXp as number },
      inventory: { items: items!, shards: (inv as Rec).shards as number },
      missions: { intro: intro!, daily: { dayKey: daily!.dayKey as string, entries: dailyEntries! } },
      ledger: ledger as string[],
      arena: isRec(raw.arena) && isStr(raw.arena.lastLocationId)
        ? { collectedAt: arenaRaw ?? {}, lastLocationId: raw.arena.lastLocationId }
        : { collectedAt: arenaRaw ?? {} },
      stats: parseStats(raw.stats),
      settings: parseSettings(raw.settings),
      updatedAt: isNonNegInt(raw.updatedAt) ? raw.updatedAt : 0,
    },
  };
}

/** A migration upgrades a raw save object from version N to N+1. */
export type Migration = (raw: Rec) => Rec;

/**
 * Registered migrations keyed by the version they upgrade *from*.
 * Add an entry here (and a test) whenever SAVE_VERSION is bumped.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1toV2,
};

/** Shards granted per owned copy of a retired v1 item when the catalogue was re-themed. */
export const V1_RETIRED_ITEM_SHARDS = 5;

/**
 * v1 → v2: the generic football catalogue and arena were replaced by the tournament theme.
 * Old items become shards (nothing is silently lost), old point cooldowns are cleared because
 * the point ids no longer exist. XP, missions, ledger, stats and settings are kept.
 */
export function migrateV1toV2(raw: Rec): Rec {
  const inv = isRec(raw.inventory) ? raw.inventory : {};
  let copies = 0;
  if (isRec(inv.items)) {
    for (const v of Object.values(inv.items)) if (isRec(v) && isNonNegInt(v.count)) copies += v.count;
  }
  const shards = isNonNegInt(inv.shards) ? inv.shards : 0;
  return { ...raw, inventory: { items: {}, shards: shards + copies * V1_RETIRED_ITEM_SHARDS }, arena: { collectedAt: {} } };
}

export type MigrationOutcome =
  | { kind: 'current'; raw: Rec }
  | { kind: 'migrated'; raw: Rec; from: number }
  | { kind: 'too_new'; version: number }
  | { kind: 'unmigratable'; version: number };

export function migrateSave(raw: unknown, target: number = SAVE_VERSION, migrations: Readonly<Record<number, Migration>> = MIGRATIONS): MigrationOutcome {
  if (!isRec(raw) || !isNonNegInt(raw.version)) return { kind: 'unmigratable', version: -1 };
  const from = raw.version;
  if (from === target) return { kind: 'current', raw };
  if (from > target) return { kind: 'too_new', version: from };
  let current: Rec = raw;
  for (let v = from; v < target; v++) {
    const step = migrations[v];
    if (!step) return { kind: 'unmigratable', version: from };
    current = { ...step(current), version: v + 1 };
  }
  return { kind: 'migrated', raw: current, from };
}
