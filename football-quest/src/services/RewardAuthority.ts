import type { Result } from '../core/Result';
import { validateReward, type RewardError } from '../domain/rewards';
import type { Reward } from '../domain/types';

export interface RewardRequest {
  readonly grantId: string;
  readonly playerId: string;
  readonly reward: Reward;
}

/**
 * Decides whether a reward may be applied. The local implementation only performs
 * structural validation — it is NOT tamper-proof. A server implementation must be
 * plugged in before rewards feed anything competitive (leaderboards, trading, purchases).
 */
export interface RewardAuthority {
  readonly isAuthoritative: boolean;
  authorize(request: RewardRequest, signal?: AbortSignal): Promise<Result<Reward, RewardError>>;
}

export class LocalRewardAuthority implements RewardAuthority {
  readonly isAuthoritative = false;

  constructor(private readonly itemExists: (id: string) => boolean) {}

  async authorize(request: RewardRequest): Promise<Result<Reward, RewardError>> {
    return validateReward(request.reward, this.itemExists);
  }
}
