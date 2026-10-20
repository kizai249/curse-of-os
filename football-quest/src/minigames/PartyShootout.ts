import type { Rng } from '../core/Rng';
import { PARTY_CONFIG, type PartyConfig } from '../config/minigames';
import { gradeShot, meterPosition, type ShotGrade } from './shot';
import type { MiniGameResult, MiniGameState } from './types';

export interface PartyPlayer {
  readonly name: string;
  readonly teamId: string;
}

export interface PartyKick {
  readonly playerIndex: number;
  readonly round: number;
  readonly grade: ShotGrade;
  readonly goal: boolean;
}

export interface PartySnapshot {
  readonly state: MiniGameState;
  readonly phase: 'aiming' | 'resolving';
  readonly round: number;
  readonly suddenDeath: boolean;
  readonly currentPlayer: number;
  readonly goals: readonly number[];
  /** Players still competing (everyone in regulation; only the tied leaders in sudden death). */
  readonly active: readonly number[];
  readonly meterValue: number;
  readonly target: number;
  readonly perfectWindow: number;
  readonly goodWindow: number;
  readonly lastKick: PartyKick | null;
  readonly kicks: readonly PartyKick[];
  readonly winners: readonly number[];
}

/**
 * Pass-and-play penalty shootout for 2–4 friends on one phone. Everyone takes `rounds` kicks in
 * turn; tied leaders go to sudden-death rounds; after `maxSuddenDeathRounds` the tie is shared.
 */
export class PartyShootout {
  private state: MiniGameState = 'start';
  private phase: 'aiming' | 'resolving' = 'aiming';
  private round = 0;
  private suddenDeath = false;
  private turn = 0;
  private active: number[];
  private readonly goals: number[];
  private readonly kicks: PartyKick[] = [];
  private aimElapsed = 0;
  private resolveRemaining = 0;
  private totalElapsed = 0;
  private target = 0.5;
  private winners: number[] = [];

  constructor(
    readonly players: readonly PartyPlayer[],
    private readonly rng: Rng,
    readonly runId: string,
    private readonly config: PartyConfig = PARTY_CONFIG,
  ) {
    if (players.length < config.minPlayers || players.length > config.maxPlayers) {
      throw new RangeError(`PartyShootout needs ${config.minPlayers}-${config.maxPlayers} players`);
    }
    this.goals = players.map(() => 0);
    this.active = players.map((_, i) => i);
  }

  start(): boolean {
    if (this.state !== 'start') return false;
    this.state = 'active';
    this.beginKick();
    return true;
  }

  pause(): boolean { if (this.state !== 'active') return false; this.state = 'paused'; return true; }
  resume(): boolean { if (this.state !== 'paused') return false; this.state = 'active'; return true; }

  abort(): boolean {
    if (this.state === 'success' || this.state === 'failure' || this.state === 'aborted') return false;
    this.state = 'aborted';
    return true;
  }

  tick(dtMs: number): void {
    if (this.state !== 'active' || !(dtMs > 0)) return;
    this.totalElapsed += dtMs;
    if (this.phase === 'aiming') { this.aimElapsed += dtMs; return; }
    this.resolveRemaining -= dtMs;
    if (this.resolveRemaining > 0) return;
    this.advanceTurn();
  }

  kick(): PartyKick | null {
    if (this.state !== 'active' || this.phase !== 'aiming') return null;
    const playerIndex = this.active[this.turn]!;
    const grade = gradeShot(this.meterValue(), this.target, this.config);
    const goal = grade !== 'saved';
    if (goal) this.goals[playerIndex]!++;
    const k: PartyKick = { playerIndex, round: this.round, grade, goal };
    this.kicks.push(k);
    this.phase = 'resolving';
    this.resolveRemaining = this.config.resolveDelayMs;
    return k;
  }

  meterValue(): number {
    return meterPosition(this.aimElapsed, this.config.sweepMs);
  }

  /** The party game always "succeeds" once finished — the reward is for playing together. */
  result(): MiniGameResult | null {
    if (this.state !== 'success') return null;
    const best = Math.max(...this.goals);
    return { runId: this.runId, gameId: 'party_shootout', success: true, score: best, durationMs: Math.round(this.totalElapsed) };
  }

  snapshot(): PartySnapshot {
    return {
      state: this.state, phase: this.phase, round: this.round, suddenDeath: this.suddenDeath,
      currentPlayer: this.active[this.turn] ?? 0, goals: [...this.goals], active: [...this.active],
      meterValue: this.meterValue(), target: this.target,
      perfectWindow: this.config.perfectWindow, goodWindow: this.config.goodWindow,
      lastKick: this.kicks[this.kicks.length - 1] ?? null, kicks: [...this.kicks], winners: [...this.winners],
    };
  }

  private advanceTurn(): void {
    if (this.turn + 1 < this.active.length) {
      this.turn++;
      this.beginKick();
      return;
    }
    // A full round is complete.
    this.round++;
    this.turn = 0;
    const regulationDone = this.round >= this.config.rounds;
    if (regulationDone) {
      const best = Math.max(...this.active.map((i) => this.goals[i]!));
      const leaders = this.active.filter((i) => this.goals[i] === best);
      const suddenDeathRounds = this.round - this.config.rounds;
      if (leaders.length === 1 || suddenDeathRounds >= this.config.maxSuddenDeathRounds) {
        this.winners = leaders;
        this.state = 'success';
        return;
      }
      this.active = leaders;
      this.suddenDeath = true;
    }
    this.beginKick();
  }

  private beginKick(): void {
    this.phase = 'aiming';
    this.aimElapsed = 0;
    this.target = this.config.targetMin + this.rng() * (this.config.targetMax - this.config.targetMin);
  }
}
