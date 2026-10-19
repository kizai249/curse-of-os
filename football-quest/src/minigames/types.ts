import type { MiniGameId } from '../domain/types';

/** Lifecycle shared by every mini-game. */
export type MiniGameState = 'start' | 'active' | 'paused' | 'success' | 'failure' | 'aborted';

export interface MiniGameResult {
  /** Unique per run; used by the reward ledger so one run can never be rewarded twice. */
  readonly runId: string;
  readonly gameId: MiniGameId;
  readonly success: boolean;
  readonly score: number;
  readonly durationMs: number;
}
