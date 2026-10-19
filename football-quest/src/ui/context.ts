import type { Clock } from '../core/Clock';
import type { ItemCatalog } from '../domain/catalog';
import type { MissionBook } from '../domain/missions';
import type { GameSession } from '../game/GameSession';
import type { MiniGameResult } from '../minigames/types';
import type { PerfMonitor } from '../render/PerfMonitor';
import type { Analytics } from '../services/Analytics';
import type { AudioService } from '../services/AudioService';

export type ScreenId = 'arena' | 'missions' | 'inventory' | 'games' | 'profile' | 'settings' | 'timing_shot' | 'results';

export interface ResultsParams {
  readonly result: MiniGameResult;
  readonly xpAwarded: number;
  readonly newBest: boolean;
  /** Set when the reward could not be recorded (e.g. validation failed). */
  readonly error?: string;
}

export interface UIContext {
  readonly session: GameSession;
  readonly catalog: ItemCatalog;
  readonly missionBook: MissionBook;
  readonly audio: AudioService;
  readonly analytics: Analytics;
  readonly clock: Clock;
  readonly thumbnails: ReadonlyMap<string, string>;
  navigate(screen: ScreenId, params?: ResultsParams): void;
  toast(text: string, kind?: 'info' | 'success' | 'warn' | 'error'): void;
  haptic(pattern: number | number[]): void;
  perf(): PerfMonitor | null;
}

/** A screen renders into its root and may return a cleanup function. */
export type Screen = (root: HTMLElement, ctx: UIContext, params?: ResultsParams) => (() => void) | void;
