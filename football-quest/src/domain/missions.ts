import { createSeededRng, hashString } from '../core/Rng';
import { fail, ok, type Result } from '../core/Result';
import { rarityRank, type GameplayEvent, type MissionDefinition, type MissionObjective } from './types';

export type MissionStatus = 'active' | 'completed' | 'claimed' | 'expired';

export interface MissionProgress {
  readonly progress: number;
  readonly status: MissionStatus;
}

export interface MissionsState {
  readonly intro: Readonly<Record<string, MissionProgress>>;
  readonly daily: {
    readonly dayKey: string;
    readonly entries: Readonly<Record<string, MissionProgress>>;
  };
}

export type ClaimError = 'unknown_mission' | 'not_completed' | 'already_claimed' | 'expired';

const FRESH: MissionProgress = { progress: 0, status: 'active' };

/** Lookup over intro missions and the daily pool. */
export class MissionBook {
  private readonly byId = new Map<string, MissionDefinition>();

  constructor(readonly intro: readonly MissionDefinition[], readonly dailyPool: readonly MissionDefinition[]) {
    for (const def of [...intro, ...dailyPool]) {
      if (this.byId.has(def.id)) throw new Error(`Duplicate mission id: ${def.id}`);
      if (!Number.isInteger(def.objective.target) || def.objective.target < 1) {
        throw new Error(`Mission ${def.id} has an invalid target`);
      }
      this.byId.set(def.id, def);
    }
  }

  get(id: string): MissionDefinition | undefined {
    return this.byId.get(id);
  }
}

export function createMissionsState(book: MissionBook): MissionsState {
  const intro: Record<string, MissionProgress> = {};
  for (const def of book.intro) intro[def.id] = FRESH;
  return { intro, daily: { dayKey: '', entries: {} } };
}

/**
 * Aligns a (possibly older) missions state with the current mission book: intro missions added
 * in a content update appear as fresh, removed ones are dropped. Daily entries no longer in the
 * pool are dropped too. Returns the same object when nothing changed.
 */
export function reconcileMissions(state: MissionsState, book: MissionBook): MissionsState {
  let changed = false;
  const intro: Record<string, MissionProgress> = {};
  for (const def of book.intro) {
    const existing = state.intro[def.id];
    if (!existing) changed = true;
    intro[def.id] = existing ?? FRESH;
  }
  if (Object.keys(state.intro).some((id) => !(id in intro))) changed = true;
  const entries: Record<string, MissionProgress> = {};
  for (const [id, p] of Object.entries(state.daily.entries)) {
    if (book.get(id)?.kind === 'daily') entries[id] = p; else changed = true;
  }
  return changed ? { intro, daily: { ...state.daily, entries } } : state;
}

/** Deterministic daily selection: every player gets the same set for a given day. */
export function selectDailyMissions(book: MissionBook, dayKey: string, count: number): string[] {
  const rng = createSeededRng(hashString(dayKey));
  const ids = book.dailyPool.map((d) => d.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids.slice(0, Math.min(count, ids.length));
}

export interface DailyRefresh {
  readonly state: MissionsState;
  /** Missions from the previous day that were never claimed (failure condition). */
  readonly expired: readonly string[];
  readonly changed: boolean;
}

export function refreshDailyMissions(state: MissionsState, book: MissionBook, dayKey: string, count: number): DailyRefresh {
  if (state.daily.dayKey === dayKey) return { state, expired: [], changed: false };
  const expired = Object.entries(state.daily.entries)
    .filter(([, p]) => p.status === 'active' || p.status === 'completed')
    .map(([id]) => id);
  const entries: Record<string, MissionProgress> = {};
  for (const id of selectDailyMissions(book, dayKey, count)) entries[id] = FRESH;
  return { state: { ...state, daily: { dayKey, entries } }, expired, changed: true };
}

/** How much a single event advances an objective (0 when unrelated). */
export function objectiveIncrement(objective: MissionObjective, event: GameplayEvent): number {
  switch (objective.type) {
    case 'discover':
      if (event.type !== 'discovery') return 0;
      if (objective.locationKind !== undefined && objective.locationKind !== event.locationKind) return 0;
      return objective.cityId === undefined || objective.cityId === event.cityId ? 1 : 0;
    case 'collect':
      if (event.type !== 'item_collected') return 0;
      if (objective.itemKind !== undefined && objective.itemKind !== event.kind) return 0;
      return objective.minRarity === undefined || rarityRank(event.rarity) >= rarityRank(objective.minRarity) ? 1 : 0;
    case 'play_minigame':
      return event.type === 'minigame_finished' && (objective.gameId === undefined || objective.gameId === event.gameId) ? 1 : 0;
    case 'win_minigame':
      return event.type === 'minigame_finished' && event.success && (objective.gameId === undefined || objective.gameId === event.gameId) ? 1 : 0;
    case 'score_minigame':
      return event.type === 'minigame_finished' && event.gameId === objective.gameId && event.score >= objective.minScore ? 1 : 0;
  }
}

function advance(entries: Readonly<Record<string, MissionProgress>>, book: MissionBook, event: GameplayEvent, completed: string[]): Record<string, MissionProgress> {
  const next: Record<string, MissionProgress> = {};
  for (const [id, p] of Object.entries(entries)) {
    const def = book.get(id);
    if (!def || p.status !== 'active') { next[id] = p; continue; }
    const inc = objectiveIncrement(def.objective, event);
    if (inc === 0) { next[id] = p; continue; }
    const progress = Math.min(def.objective.target, p.progress + inc);
    const done = progress >= def.objective.target;
    if (done) completed.push(id);
    next[id] = { progress, status: done ? 'completed' : 'active' };
  }
  return next;
}

export function applyGameplayEvent(state: MissionsState, book: MissionBook, event: GameplayEvent): { state: MissionsState; completed: string[] } {
  const completed: string[] = [];
  const intro = advance(state.intro, book, event, completed);
  const dailyEntries = advance(state.daily.entries, book, event, completed);
  return { state: { intro, daily: { ...state.daily, entries: dailyEntries } }, completed };
}

export function getMissionProgress(state: MissionsState, id: string): MissionProgress | undefined {
  return state.intro[id] ?? state.daily.entries[id];
}

/** Marks a completed mission as claimed. Reward granting is done by the caller (GameSession). */
export function markClaimed(state: MissionsState, book: MissionBook, id: string): Result<{ state: MissionsState; def: MissionDefinition }, ClaimError> {
  const def = book.get(id);
  const progress = getMissionProgress(state, id);
  if (!def || !progress) return fail('unknown_mission');
  if (progress.status === 'claimed') return fail('already_claimed');
  if (progress.status === 'expired') return fail('expired');
  if (progress.status !== 'completed') return fail('not_completed');
  const claimed: MissionProgress = { ...progress, status: 'claimed' };
  const next: MissionsState = id in state.intro
    ? { ...state, intro: { ...state.intro, [id]: claimed } }
    : { ...state, daily: { ...state.daily, entries: { ...state.daily.entries, [id]: claimed } } };
  return ok({ state: next, def });
}
