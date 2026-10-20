import type { Rng } from '../core/Rng';
import { TIMING_SHOT_CONFIG, type TimingShotConfig } from '../config/minigames';
import { gradeShot, meterPosition, type ShotGrade } from './shot';
import type { MiniGameResult, MiniGameState } from './types';

export type { ShotGrade } from './shot';

export interface ShotOutcome {
  readonly grade: ShotGrade;
  readonly goal: boolean;
  readonly points: number;
  readonly meterValue: number;
  readonly target: number;
}

export interface TimingShotSnapshot {
  readonly state: MiniGameState;
  /** 'aiming' accepts input; 'resolving' plays the shot animation. */
  readonly phase: 'aiming' | 'resolving';
  readonly shotIndex: number;
  readonly shotsTotal: number;
  readonly goals: number;
  readonly score: number;
  readonly streak: number;
  readonly meterValue: number;
  readonly target: number;
  readonly perfectWindow: number;
  readonly goodWindow: number;
  readonly lastOutcome: ShotOutcome | null;
  readonly history: readonly ShotOutcome[];
}

/**
 * Pure rules for the timing shot challenge. Time is advanced explicitly through tick(),
 * so the game is deterministic, pausable and fully unit-testable without a renderer.
 */
export class TimingShot {
  private state: MiniGameState = 'start';
  private phase: 'aiming' | 'resolving' = 'aiming';
  private shotIndex = 0;
  private goals = 0;
  private score = 0;
  private streak = 0;
  private aimElapsed = 0;
  private resolveRemaining = 0;
  private totalElapsed = 0;
  private target = 0.5;
  private lastOutcome: ShotOutcome | null = null;
  private readonly history: ShotOutcome[] = [];

  constructor(
    private readonly rng: Rng,
    readonly runId: string,
    private readonly config: TimingShotConfig = TIMING_SHOT_CONFIG,
  ) {}

  start(): boolean {
    if (this.state !== 'start') return false;
    this.state = 'active';
    this.beginShot();
    return true;
  }

  pause(): boolean {
    if (this.state !== 'active') return false;
    this.state = 'paused';
    return true;
  }

  resume(): boolean {
    if (this.state !== 'paused') return false;
    this.state = 'active';
    return true;
  }

  /** Player quits mid-game: no result is produced and nothing is rewarded. */
  abort(): boolean {
    if (this.state === 'success' || this.state === 'failure' || this.state === 'aborted') return false;
    this.state = 'aborted';
    return true;
  }

  tick(dtMs: number): void {
    if (this.state !== 'active' || !(dtMs > 0)) return;
    this.totalElapsed += dtMs;
    if (this.phase === 'aiming') {
      this.aimElapsed += dtMs;
      return;
    }
    this.resolveRemaining -= dtMs;
    if (this.resolveRemaining > 0) return;
    if (this.shotIndex + 1 >= this.config.shots) {
      this.state = this.goals >= this.config.goalsToWin ? 'success' : 'failure';
      return;
    }
    this.shotIndex++;
    this.beginShot();
  }

  /** Returns null when input is not accepted (wrong state, or a shot is already in flight). */
  shoot(): ShotOutcome | null {
    if (this.state !== 'active' || this.phase !== 'aiming') return null;
    const meterValue = this.meterValue();
    const grade: ShotGrade = gradeShot(meterValue, this.target, this.config);
    const goal = grade !== 'saved';
    let points = this.config.points[grade];
    if (goal) {
      if (this.streak > 0) points += this.config.streakBonus;
      this.streak++;
      this.goals++;
    } else {
      this.streak = 0;
    }
    this.score += points;
    const outcome: ShotOutcome = { grade, goal, points, meterValue, target: this.target };
    this.lastOutcome = outcome;
    this.history.push(outcome);
    this.phase = 'resolving';
    this.resolveRemaining = this.config.resolveDelayMs;
    return outcome;
  }

  /** Current needle position in [0, 1] — a triangle wave that speeds up every shot. */
  meterValue(): number {
    return meterPosition(this.aimElapsed, this.sweepMs());
  }

  sweepMs(): number {
    return Math.max(this.config.minSweepMs, this.config.baseSweepMs - this.shotIndex * this.config.sweepSpeedupMs);
  }

  result(): MiniGameResult | null {
    if (this.state !== 'success' && this.state !== 'failure') return null;
    return { runId: this.runId, gameId: 'timing_shot', success: this.state === 'success', score: this.score, durationMs: Math.round(this.totalElapsed) };
  }

  snapshot(): TimingShotSnapshot {
    return {
      state: this.state,
      phase: this.phase,
      shotIndex: this.shotIndex,
      shotsTotal: this.config.shots,
      goals: this.goals,
      score: this.score,
      streak: this.streak,
      meterValue: this.meterValue(),
      target: this.target,
      perfectWindow: this.config.perfectWindow,
      goodWindow: this.config.goodWindow,
      lastOutcome: this.lastOutcome,
      history: [...this.history],
    };
  }

  private beginShot(): void {
    this.phase = 'aiming';
    this.aimElapsed = 0;
    this.target = this.config.targetMin + this.rng() * (this.config.targetMax - this.config.targetMin);
  }
}
