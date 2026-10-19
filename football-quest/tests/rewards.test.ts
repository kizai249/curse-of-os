import { describe, expect, it } from 'vitest';
import { REWARD_LIMITS } from '../src/config/balance';
import { ledgerHas, ledgerRecord, validateReward } from '../src/domain/rewards';

const exists = (id: string) => id === 'ball_dune';

describe('reward validation', () => {
  it('accepts well-formed rewards', () => {
    expect(validateReward({ xp: 10, shards: 5, itemId: 'ball_dune' }, exists).ok).toBe(true);
    expect(validateReward({}, exists).ok).toBe(true);
  });

  it('rejects negative, fractional and non-finite amounts', () => {
    for (const bad of [{ xp: -1 }, { xp: 1.5 }, { shards: Number.POSITIVE_INFINITY }, { xp: Number.NaN }]) {
      expect(validateReward(bad, exists)).toMatchObject({ ok: false, error: 'invalid_amount' });
    }
  });

  it('rejects amounts above per-grant limits', () => {
    expect(validateReward({ xp: REWARD_LIMITS.maxXpPerGrant + 1 }, exists)).toMatchObject({ ok: false, error: 'exceeds_limit' });
    expect(validateReward({ shards: REWARD_LIMITS.maxShardsPerGrant + 1 }, exists)).toMatchObject({ ok: false, error: 'exceeds_limit' });
  });

  it('rejects unknown items', () => {
    expect(validateReward({ itemId: 'fake' }, exists)).toMatchObject({ ok: false, error: 'unknown_item' });
  });
});

describe('reward ledger', () => {
  it('records grants and caps its size, dropping the oldest', () => {
    let ledger: string[] = [];
    for (let i = 0; i < 5; i++) ledger = ledgerRecord(ledger, `g${i}`, 3);
    expect(ledger).toEqual(['g2', 'g3', 'g4']);
    expect(ledgerHas(ledger, 'g4')).toBe(true);
    expect(ledgerHas(ledger, 'g0')).toBe(false);
  });
});
