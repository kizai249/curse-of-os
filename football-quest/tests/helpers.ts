import { ITEM_CATALOG } from '../src/config/items';
import { ARENA_POINTS } from '../src/config/arena';
import { DAILY_MISSION_POOL, INTRO_MISSIONS } from '../src/config/missions';
import { FakeClock } from '../src/core/Clock';
import { EventBus } from '../src/core/EventBus';
import { createLogger, createMemorySink } from '../src/core/Logger';
import { createSeededRng } from '../src/core/Rng';
import { ItemCatalog } from '../src/domain/catalog';
import { MissionBook } from '../src/domain/missions';
import { GameSession, type SessionEvents } from '../src/game/GameSession';
import { createNewSave } from '../src/game/newSave';
import { MemoryKeyValueStore, SaveManager } from '../src/persistence/SaveManager';
import type { SaveData } from '../src/persistence/saveSchema';
import { LocalRewardAuthority, type RewardAuthority } from '../src/services/RewardAuthority';

/** 2026-10-19 12:00 local time — mid-day so ±hours never cross a day boundary by accident. */
export const T0 = new Date(2026, 9, 19, 12, 0, 0).getTime();

export function createHarness(opts: { authority?: RewardAuthority; store?: MemoryKeyValueStore; seed?: number; initial?: SaveData } = {}) {
  const clock = new FakeClock(T0);
  const memory = createMemorySink();
  const logger = createLogger('test', memory.sink, 'debug');
  const bus = new EventBus<SessionEvents>(logger);
  const catalog = new ItemCatalog(ITEM_CATALOG);
  const missionBook = new MissionBook(INTRO_MISSIONS, DAILY_MISSION_POOL);
  const store = opts.store ?? new MemoryKeyValueStore();
  let n = 0;
  const saveManager = new SaveManager(store, () => createNewSave(missionBook, clock, () => `player-${++n}`), clock, logger);
  const loaded = opts.initial ? { data: opts.initial, status: 'loaded' as const } : saveManager.load();
  const session = new GameSession(
    {
      saveManager, catalog, missionBook, points: ARENA_POINTS,
      authority: opts.authority ?? new LocalRewardAuthority((id) => catalog.get(id) !== undefined),
      clock, rng: createSeededRng(opts.seed ?? 42), logger, bus,
    },
    loaded.data,
  );
  return { clock, logs: memory.entries, logger, bus, catalog, missionBook, store, saveManager, session, loadStatus: loaded.status };
}
