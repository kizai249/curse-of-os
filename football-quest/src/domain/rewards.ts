import { REWARD_LIMITS, SAVE } from '../config/balance';
import { fail, ok, type Result } from '../core/Result';
import type { Reward } from './types';

export type RewardError = 'invalid_amount' | 'exceeds_limit' | 'unknown_item' | 'duplicate_grant' | 'grant_in_progress' | 'authority_unavailable' | 'rejected';

/** Structural validation every reward passes before it can be applied. */
export function validateReward(reward: Reward, itemExists: (id: string) => boolean): Result<Reward, RewardError> {
  for (const amount of [reward.xp, reward.shards]) {
    if (amount === undefined) continue;
    if (!Number.isInteger(amount) || amount < 0) return fail('invalid_amount');
  }
  if ((reward.xp ?? 0) > REWARD_LIMITS.maxXpPerGrant) return fail('exceeds_limit');
  if ((reward.shards ?? 0) > REWARD_LIMITS.maxShardsPerGrant) return fail('exceeds_limit');
  if (reward.itemId !== undefined && !itemExists(reward.itemId)) return fail('unknown_item');
  return ok(reward);
}

/**
 * Remembers recently applied grant ids so the same reward can never be applied twice
 * (double taps, replayed requests, reloading mid-claim).
 */
export function ledgerHas(ledger: readonly string[], grantId: string): boolean {
  return ledger.includes(grantId);
}

export function ledgerRecord(ledger: readonly string[], grantId: string, capacity: number = SAVE.ledgerCapacity): string[] {
  const next = [...ledger, grantId];
  return next.length > capacity ? next.slice(next.length - capacity) : next;
}
