import type { Logger } from '../core/Logger';

export type AnalyticsEvent =
  | { name: 'session_start'; props: { loadStatus: string } }
  | { name: 'discovery_collected'; props: { itemId: string; rarity: string; duplicate: boolean } }
  | { name: 'minigame_finished'; props: { gameId: string; success: boolean; score: number; durationMs: number } }
  | { name: 'minigame_aborted'; props: { gameId: string } }
  | { name: 'mission_claimed'; props: { missionId: string } }
  | { name: 'level_up'; props: { level: number } }
  | { name: 'error'; props: { message: string } };

export interface Analytics {
  track(event: AnalyticsEvent): void;
}

/**
 * Local development analytics: logs at debug level and keeps a small ring buffer.
 * No data leaves the device. Swap for a real provider in phase 6 behind this interface.
 */
export class LocalAnalytics implements Analytics {
  private readonly buffer: AnalyticsEvent[] = [];
  constructor(private readonly logger: Logger, private readonly capacity = 200) {}

  track(event: AnalyticsEvent): void {
    this.buffer.push(event);
    if (this.buffer.length > this.capacity) this.buffer.shift();
    this.logger.debug(event.name, event.props);
  }

  recent(): readonly AnalyticsEvent[] { return this.buffer; }
}
