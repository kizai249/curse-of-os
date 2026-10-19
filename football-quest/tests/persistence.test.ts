import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, MemoryKeyValueStore, SAVE_KEY } from '../src/persistence/SaveManager';
import { migrateSave, parseSave, SAVE_VERSION } from '../src/persistence/saveSchema';
import { createHarness, T0 } from './helpers';

describe('save manager', () => {
  it('creates a new profile when no save exists', () => {
    const h = createHarness();
    expect(h.loadStatus).toBe('new');
    expect(h.session.data.player.mode).toBe('guest');
    expect(h.session.data.version).toBe(SAVE_VERSION);
  });

  it('round-trips a save through storage', async () => {
    const store = new MemoryKeyValueStore();
    const a = createHarness({ store });
    a.session.refreshDaily();
    const res = await a.session.collectDiscovery('p_center');
    expect(res.ok).toBe(true);
    const b = createHarness({ store });
    expect(b.loadStatus).toBe('loaded');
    expect(b.session.data).toEqual(a.session.data);
  });

  it('recovers from invalid JSON and backs up the raw payload', () => {
    const store = new MemoryKeyValueStore();
    store.setItem(SAVE_KEY, '{not json');
    const h = createHarness({ store });
    expect(h.loadStatus).toBe('recovered');
    expect(store.getItem(BACKUP_KEY)).toBe('{not json');
    expect(h.logs.some((l) => l.level === 'error')).toBe(true);
  });

  it('recovers from structurally corrupted data (negative XP, bad inventory)', () => {
    const store = new MemoryKeyValueStore();
    const good = createHarness({ store });
    good.session.updateSettings({ quality: 'high' });
    const raw = JSON.parse(store.getItem(SAVE_KEY)!);
    raw.progression.totalXp = -50;
    store.setItem(SAVE_KEY, JSON.stringify(raw));
    expect(createHarness({ store }).loadStatus).toBe('recovered');

    raw.progression.totalXp = 10;
    raw.inventory.items = { ball_dune: { count: 0, firstObtainedAt: 1 } };
    store.setItem(SAVE_KEY, JSON.stringify(raw));
    expect(createHarness({ store }).loadStatus).toBe('recovered');
  });

  it('repairs bad settings/stats without discarding progress', () => {
    const store = new MemoryKeyValueStore();
    const good = createHarness({ store });
    good.session.updateSettings({ musicVolume: 0.2 });
    const raw = JSON.parse(store.getItem(SAVE_KEY)!);
    raw.progression.totalXp = 77;
    raw.settings = { musicVolume: 5, quality: 'ultra' };
    raw.stats = 'oops';
    store.setItem(SAVE_KEY, JSON.stringify(raw));
    const h = createHarness({ store });
    expect(h.loadStatus).toBe('loaded');
    expect(h.session.data.progression.totalXp).toBe(77);
    expect(h.session.data.settings.musicVolume).toBe(0.6);
    expect(h.session.data.settings.quality).toBe('medium');
    expect(h.session.data.stats.discoveries).toBe(0);
  });

  it('never overwrites a save from a newer game version', () => {
    const store = new MemoryKeyValueStore();
    const future = JSON.stringify({ version: SAVE_VERSION + 1, anything: true });
    store.setItem(SAVE_KEY, future);
    const h = createHarness({ store });
    expect(h.loadStatus).toBe('incompatible');
    h.session.updateSettings({ sfxVolume: 0.1 });
    expect(store.getItem(SAVE_KEY)).toBe(future);
    expect(h.saveManager.isReadOnly).toBe(true);
  });

  it('keeps playing in memory when storage is unavailable', () => {
    const store = new MemoryKeyValueStore();
    store.getItem = () => { throw new Error('SecurityError'); };
    const h = createHarness({ store });
    expect(h.loadStatus).toBe('unavailable');
    expect(() => h.session.updateSettings({ haptics: false })).not.toThrow();
    expect(h.session.data.settings.haptics).toBe(false);
  });

  it('reports write failures (quota) but keeps in-memory progress', async () => {
    const store = new MemoryKeyValueStore();
    const h = createHarness({ store });
    const failures: string[] = [];
    h.bus.on('saveFailed', (e) => failures.push(e.reason));
    store.failWrites = true;
    const res = await h.session.collectDiscovery('p_center');
    expect(res.ok).toBe(true);
    expect(failures).toEqual(['write_failed']);
    expect(h.session.data.stats.discoveries).toBe(1);
  });

  it('stamps updatedAt from the clock on save', () => {
    const h = createHarness();
    h.clock.advance(5000);
    h.session.updateSettings({ reducedMotion: true });
    expect(h.session.data.updatedAt).toBe(T0 + 5000);
  });
});

describe('save migrations', () => {
  it('runs registered migrations in order', () => {
    const migrations = {
      0: (r: Record<string, unknown>) => ({ ...r, a: 1 }),
      1: (r: Record<string, unknown>) => ({ ...r, b: (r.a as number) + 1 }),
    };
    const out = migrateSave({ version: 0 }, 2, migrations);
    expect(out).toEqual({ kind: 'migrated', from: 0, raw: { version: 2, a: 1, b: 2 } });
  });

  it('flags missing migration steps, newer versions and garbage', () => {
    expect(migrateSave({ version: 0 }, 2, {}).kind).toBe('unmigratable');
    expect(migrateSave({ version: 9 }, 2, {}).kind).toBe('too_new');
    expect(migrateSave('hello').kind).toBe('unmigratable');
    expect(migrateSave(null).kind).toBe('unmigratable');
  });

  it('parseSave rejects a root that is not an object', () => {
    expect(parseSave([]).ok).toBe(false);
    expect(parseSave(undefined).ok).toBe(false);
  });
});
