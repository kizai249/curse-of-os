import { CUP_QUIZ_CONFIG, type CupQuizConfig } from '../config/minigames';
import type { QuizQuestion } from './quizBank';
import type { MiniGameResult, MiniGameState } from './types';

export interface AnswerOutcome {
  readonly correct: boolean;
  /** null when the timer ran out. */
  readonly chosenIndex: number | null;
  readonly correctIndex: number;
  readonly points: number;
}

export interface CupQuizSnapshot {
  readonly state: MiniGameState;
  readonly phase: 'asking' | 'feedback';
  readonly index: number;
  readonly total: number;
  readonly question: QuizQuestion;
  readonly remainingMs: number;
  readonly correctCount: number;
  readonly score: number;
  readonly lastOutcome: AnswerOutcome | null;
}

/**
 * Timed multiple-choice quiz about the tournament and host cities. Pure and tick-driven:
 * questions are injected (see quizBank.ts) so tests control content and order.
 */
export class CupQuiz {
  private state: MiniGameState = 'start';
  private phase: 'asking' | 'feedback' = 'asking';
  private index = 0;
  private remaining: number;
  private feedbackRemaining = 0;
  private correctCount = 0;
  private score = 0;
  private elapsed = 0;
  private lastOutcome: AnswerOutcome | null = null;

  constructor(
    private readonly questions: readonly QuizQuestion[],
    readonly runId: string,
    private readonly config: CupQuizConfig = CUP_QUIZ_CONFIG,
  ) {
    if (questions.length === 0) throw new RangeError('CupQuiz needs at least one question');
    this.remaining = config.questionTimeMs;
  }

  start(): boolean {
    if (this.state !== 'start') return false;
    this.state = 'active';
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

  abort(): boolean {
    if (this.state === 'success' || this.state === 'failure' || this.state === 'aborted') return false;
    this.state = 'aborted';
    return true;
  }

  /** Returns null when the answer is not accepted (wrong state, already answered, bad index). */
  answer(optionIndex: number): AnswerOutcome | null {
    if (this.state !== 'active' || this.phase !== 'asking') return null;
    const q = this.current();
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= q.options.length) return null;
    return this.resolve(optionIndex);
  }

  tick(dtMs: number): void {
    if (this.state !== 'active' || !(dtMs > 0)) return;
    this.elapsed += dtMs;
    if (this.phase === 'asking') {
      this.remaining -= dtMs;
      if (this.remaining <= 0) { this.remaining = 0; this.resolve(null); }
      return;
    }
    this.feedbackRemaining -= dtMs;
    if (this.feedbackRemaining > 0) return;
    if (this.index + 1 >= this.questions.length) {
      this.state = this.correctCount >= this.config.correctToWin ? 'success' : 'failure';
      return;
    }
    this.index++;
    this.phase = 'asking';
    this.remaining = this.config.questionTimeMs;
  }

  result(): MiniGameResult | null {
    if (this.state !== 'success' && this.state !== 'failure') return null;
    return { runId: this.runId, gameId: 'cup_quiz', success: this.state === 'success', score: this.score, durationMs: Math.round(this.elapsed) };
  }

  snapshot(): CupQuizSnapshot {
    return {
      state: this.state, phase: this.phase, index: this.index, total: this.questions.length,
      question: this.current(), remainingMs: this.remaining, correctCount: this.correctCount,
      score: this.score, lastOutcome: this.lastOutcome,
    };
  }

  private current(): QuizQuestion {
    return this.questions[this.index]!;
  }

  private resolve(chosenIndex: number | null): AnswerOutcome {
    const q = this.current();
    const correct = chosenIndex === q.correctIndex;
    const timeBonus = Math.floor(this.remaining / 1000) * this.config.pointsPerSecondLeft;
    const points = correct ? this.config.pointsPerCorrect + timeBonus : 0;
    if (correct) this.correctCount++;
    this.score += points;
    const outcome: AnswerOutcome = { correct, chosenIndex, correctIndex: q.correctIndex, points };
    this.lastOutcome = outcome;
    this.phase = 'feedback';
    this.feedbackRemaining = this.config.feedbackMs;
    return outcome;
  }
}
