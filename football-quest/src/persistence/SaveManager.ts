import type { Clock } from '../core/Clock';
import type { Logger } from '../core/Logger';
import { fail, ok, type Result } from '../core/Result';
import { migrateSave, parseSave, SAVE_VERSION, type SaveData } from './saveSchema';

/** Minimal synchronous key/value API (matches window.localStorage). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryKeyValueStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  failWrites = false;
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('QuotaExceededError (simulated)');
    this.data.set(key, value);
  }
  removeItem(key: string): void { this.data.delete(key); }
}

export const SAVE_KEY = 'fq.save';
export const BACKUP_KEY = 'fq.save.backup';

/**
 * new         – no save existed; a fresh profile was created
 * loaded      – save read as-is
 * migrated    – older save upgraded to the current version
 * recovered   – save was corrupted; raw copy backed up and a fresh profile created
 * incompatible– save comes from a newer game version; kept untouched, session is read-only
 * unavailable – storage cannot be accessed (private mode, blocked); session is memory-only
 */
export type LoadStatus = 'new' | 'loaded' | 'migrated' | 'recovered' | 'incompatible' | 'unavailable';

export type SaveError = 'read_only' | 'write_failed';

export class SaveManager {
  private readOnly = false;

  constructor(
    private readonly store: KeyValueStore,
    private readonly createDefault: () => SaveData,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  get isReadOnly(): boolean { return this.readOnly; }

  load(): { data: SaveData; status: LoadStatus } {
    let raw: string | null;
    try {
      raw = this.store.getItem(SAVE_KEY);
    } catch (err) {
      this.logger.warn('Storage unavailable; running memory-only', err);
      this.readOnly = true;
      return { data: this.createDefault(), status: 'unavailable' };
    }
    if (raw === null) return { data: this.createDefault(), status: 'new' };

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return this.recover(raw, ['invalid JSON']);
    }

    const migration = migrateSave(json);
    if (migration.kind === 'too_new') {
      this.logger.warn(`Save version ${migration.version} is newer than supported ${SAVE_VERSION}; read-only session`);
      this.readOnly = true;
      return { data: this.createDefault(), status: 'incompatible' };
    }
    if (migration.kind === 'unmigratable') return this.recover(raw, [`cannot migrate version ${migration.version}`]);

    const parsed = parseSave(migration.raw);
    if (!parsed.ok) return this.recover(raw, parsed.problems);

    if (migration.kind === 'migrated') {
      this.logger.info(`Save migrated from v${migration.from} to v${SAVE_VERSION}`);
      this.save(parsed.data);
      return { data: parsed.data, status: 'migrated' };
    }
    return { data: parsed.data, status: 'loaded' };
  }

  save(data: SaveData): Result<SaveData, SaveError> {
    if (this.readOnly) return fail('read_only');
    const stamped: SaveData = { ...data, updatedAt: this.clock.now() };
    try {
      this.store.setItem(SAVE_KEY, JSON.stringify(stamped));
      return ok(stamped);
    } catch (err) {
      this.logger.error('Failed to write save', err);
      return fail('write_failed');
    }
  }

  /** Keeps the unreadable payload for support/debugging, then starts fresh. */
  private recover(raw: string, problems: string[]): { data: SaveData; status: LoadStatus } {
    this.logger.error('Save corrupted; backing up and starting fresh', problems);
    try {
      this.store.setItem(BACKUP_KEY, raw);
    } catch (err) {
      this.logger.warn('Could not back up corrupted save', err);
    }
    return { data: this.createDefault(), status: 'recovered' };
  }
}
