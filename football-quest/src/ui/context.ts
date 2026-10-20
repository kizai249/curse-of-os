import type { Clock } from '../core/Clock';
import type { ItemCatalog } from '../domain/catalog';
import type { MissionBook } from '../domain/missions';
import type { GameSession } from '../game/GameSession';
import type { MiniGameResult } from '../minigames/types';
import type { SquadScore } from '../minigames/SquadBuilder';
import type { PerfMonitor } from '../render/PerfMonitor';
import type { Analytics } from '../services/Analytics';
import type { AudioService } from '../services/AudioService';

export type ScreenId =
  | 'map' | 'city' | 'arena'
  | 'missions' | 'album' | 'games' | 'profile' | 'settings'
  | 'timing_shot' | 'cup_quiz' | 'squad_builder' | 'party_shootout' | 'results';

export interface ResultsParams {
  readonly result: MiniGameResult;
  readonly xpAwarded: number;
  readonly newBest: boolean;
  /** Set when the reward could not be recorded (e.g. validation failed). */
  readonly error?: string;
  readonly party?: { readonly names: readonly string[]; readonly goals: readonly number[]; readonly winners: readonly number[] };
  readonly squad?: SquadScore;
  readonly quiz?: { readonly correct: number; readonly total: number };
}

export interface ScreenParams {
  readonly cityId?: string;
  readonly locationId?: string;
  readonly results?: ResultsParams;
}

export interface UIContext {
  readonly session: GameSession;
  readonly catalog: ItemCatalog;
  readonly missionBook: MissionBook;
  readonly audio: AudioService;
  readonly analytics: Analytics;
  readonly clock: Clock;
  navigate(screen: ScreenId, params?: ScreenParams): void;
  toast(text: string, kind?: 'info' | 'success' | 'warn' | 'error'): void;
  haptic(pattern: number | number[]): void;
  perf(): PerfMonitor | null;
  /** Shared mini-game finish: records the run and opens the results screen. */
  finishRun(results: Omit<ResultsParams, 'xpAwarded' | 'newBest' | 'error'>): Promise<void>;
}

/** A screen renders into its root and may return a cleanup function. */
export type Screen = (root: HTMLElement, ctx: UIContext, params?: ScreenParams) => (() => void) | void;
