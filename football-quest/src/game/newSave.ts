import type { Clock } from '../core/Clock';
import { EMPTY_INVENTORY } from '../domain/inventory';
import { createMissionsState, type MissionBook } from '../domain/missions';
import { DEFAULT_SETTINGS, EMPTY_STATS, SAVE_VERSION, type SaveData } from '../persistence/saveSchema';

export function generateId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNewSave(book: MissionBook, clock: Clock, idGen: () => string = generateId): SaveData {
  const now = clock.now();
  const id = idGen();
  return {
    version: SAVE_VERSION,
    player: { id, displayName: `لاعب ${id.slice(0, 4).toUpperCase()}`, createdAt: now, mode: 'guest' },
    progression: { totalXp: 0 },
    inventory: EMPTY_INVENTORY,
    missions: createMissionsState(book),
    ledger: [],
    arena: { collectedAt: {} },
    stats: EMPTY_STATS,
    settings: DEFAULT_SETTINGS,
    updatedAt: now,
  };
}
