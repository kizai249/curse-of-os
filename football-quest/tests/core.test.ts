import { describe, expect, it } from 'vitest';
import { dayKey } from '../src/core/Clock';
import { EventBus } from '../src/core/EventBus';
import { createLogger, createMemorySink } from '../src/core/Logger';
import { createSeededRng, hashString, pickWeighted } from '../src/core/Rng';

describe('core', () => {
  it('seeded rng is deterministic and in [0,1)', () => {
    const a = createSeededRng(5);
    const b = createSeededRng(5);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('pickWeighted rejects all-zero weights', () => {
    expect(() => pickWeighted({ a: 0, b: 0 }, () => 0.5)).toThrow(RangeError);
    expect(pickWeighted({ a: 0, b: 1 }, () => 0.99)).toBe('b');
  });

  it('hashString is stable', () => {
    expect(hashString('2026-10-19')).toBe(hashString('2026-10-19'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });

  it('dayKey formats local dates', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });

  it('event bus isolates throwing handlers and supports unsubscribe', () => {
    const mem = createMemorySink();
    const bus = new EventBus<{ ping: number }>(createLogger('t', mem.sink));
    const got: number[] = [];
    bus.on('ping', () => { throw new Error('boom'); });
    const off = bus.on('ping', (n) => got.push(n));
    bus.emit('ping', 1);
    off();
    bus.emit('ping', 2);
    expect(got).toEqual([1]);
    expect(mem.entries.filter((e) => e.level === 'error')).toHaveLength(2);
  });

  it('logger filters below min level and scopes children', () => {
    const mem = createMemorySink();
    const log = createLogger('root', mem.sink, 'warn');
    log.info('hidden');
    log.child('sub').warn('shown');
    expect(mem.entries).toHaveLength(1);
    expect(mem.entries[0]!.scope).toBe('root.sub');
  });
});
