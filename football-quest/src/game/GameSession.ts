import { ARENA, DAILY_MISSIONS_PER_DAY, RARITY_WEIGHTS, XP_REWARDS } from '../config/balance';
import { MINI_GAMES } from '../config/minigames';
import { dayKey, type Clock } from '../core/Clock';
import type { EventBus } from '../core/EventBus';
import type { Logger } from '../core/Logger';
import { fail, ok, type Result } from '../core/Result';
import type { Rng } from '../core/Rng';
import type { ItemCatalog } from '../domain/catalog';
import { addItem, addShards } from '../domain/inventory';
import { applyGameplayEvent, markClaimed, refreshDailyMissions, type ClaimError, type MissionBook } from '../domain/missions';
import { addXp, levelFromTotalXp, type LevelInfo } from '../domain/progression';
import { ledgerHas, ledgerRecord, type RewardError } from '../domain/rewards';
import { MINI_GAME_IDS, type DiscoveryPointDefinition, type GameplayEvent, type ItemDefinition, type Reward } from '../domain/types';
import type { MiniGameResult } from '../minigames/types';
import type { SaveManager } from '../persistence/SaveManager';
import type { SaveData, Settings } from '../persistence/saveSchema';
import type { RewardAuthority } from '../services/RewardAuthority';

export interface SessionEvents {
  saveChanged: SaveData;
  levelUp: { level: number };
  missionCompleted: { missionId: string };
  dailyExpired: { missionIds: readonly string[] };
  saveFailed: { reason: string };
}

export interface SessionDeps {
  readonly saveManager: SaveManager;
  readonly catalog: ItemCatalog;
  readonly missionBook: MissionBook;
  readonly points: readonly DiscoveryPointDefinition[];
  readonly authority: RewardAuthority;
  readonly clock: Clock;
  readonly rng: Rng;
  readonly logger: Logger;
  readonly bus: EventBus<SessionEvents>;
}

export interface CollectOutcome {
  readonly item: ItemDefinition;
  readonly duplicate: boolean;
  readonly shardsAwarded: number;
  readonly xpAwarded: number;
}

export interface MiniGameOutcome {
  readonly xpAwarded: number;
  readonly newBest: boolean;
}

export type CollectError = 'unknown_point' | 'cooldown' | RewardError;
export type MiniGameRecordError = 'unknown_game' | 'invalid_score' | RewardError;

/**
 * Application service that owns the live SaveData and is the single place where
 * domain rules are combined (rewards → XP → missions → persistence). UI and rendering
 * call these commands and react to bus events; they never mutate state themselves.
 */
export class GameSession {
  private state: SaveData;
  /** Keys of grants currently awaiting authorization — blocks rapid repeated input. */
  private readonly pending = new Set<string>();

  constructor(private readonly deps: SessionDeps, initial: SaveData) {
    this.state = initial;
  }

  get data(): SaveData { return this.state; }

  levelInfo(): LevelInfo { return levelFromTotalXp(this.state.progression.totalXp); }

  /** Rotates daily missions when the calendar day changes. Safe to call often (e.g. on resume). */
  refreshDaily(): void {
    const refresh = refreshDailyMissions(this.state.missions, this.deps.missionBook, dayKey(this.deps.clock.now()), DAILY_MISSIONS_PER_DAY);
    if (!refresh.changed) return;
    this.commit({ ...this.state, missions: refresh.state });
    if (refresh.expired.length > 0) this.deps.bus.emit('dailyExpired', { missionIds: refresh.expired });
  }

  /** Milliseconds until a point can be collected again (0 = available). */
  pointCooldownRemaining(pointId: string): number {
    const last = this.state.arena.collectedAt[pointId];
    if (last === undefined) return 0;
    return Math.max(0, last + ARENA.respawnMs - this.deps.clock.now());
  }

  async collectDiscovery(pointId: string, signal?: AbortSignal): Promise<Result<CollectOutcome, CollectError>> {
    if (!this.deps.points.some((p) => p.id === pointId)) return fail('unknown_point');
    if (this.pointCooldownRemaining(pointId) > 0) return fail('cooldown');
    const pendingKey = `discovery:${pointId}`;
    if (this.pending.has(pendingKey)) return fail('grant_in_progress');

    const item = this.deps.catalog.roll(RARITY_WEIGHTS, this.deps.rng);
    const reward: Reward = { xp: XP_REWARDS.discovery, itemId: item.id };
    const grantId = `discovery:${pointId}:${this.deps.clock.now()}`;

    this.pending.add(pendingKey);
    try {
      const auth = await this.authorize(grantId, reward, signal);
      if (!auth.ok) return auth;
      if (this.pointCooldownRemaining(pointId) > 0) return fail('cooldown');

      const now = this.deps.clock.now();
      const added = addItem(this.state.inventory, item, now);
      let next: SaveData = {
        ...this.state,
        inventory: added.inventory,
        arena: { collectedAt: { ...this.state.arena.collectedAt, [pointId]: now } },
        stats: { ...this.state.stats, discoveries: this.state.stats.discoveries + 1, itemsCollected: this.state.stats.itemsCollected + 1 },
      };
      next = this.withXp(next, XP_REWARDS.discovery);
      next = this.withEvent(next, { type: 'discovery', pointId });
      next = this.withEvent(next, { type: 'item_collected', itemId: item.id, rarity: item.rarity, duplicate: added.duplicate });
      this.commit(next);
      return ok({ item, duplicate: added.duplicate, shardsAwarded: added.shardsAwarded, xpAwarded: XP_REWARDS.discovery });
    } finally {
      this.pending.delete(pendingKey);
    }
  }

  async recordMiniGame(result: MiniGameResult, signal?: AbortSignal): Promise<Result<MiniGameOutcome, MiniGameRecordError>> {
    if (!MINI_GAME_IDS.includes(result.gameId)) return fail('unknown_game');
    const info = MINI_GAMES[result.gameId];
    if (!Number.isInteger(result.score) || result.score < 0 || result.score > info.maxScore) return fail('invalid_score');
    const grantId = `minigame:${result.runId}`;
    if (ledgerHas(this.state.ledger, grantId)) return fail('duplicate_grant');
    if (this.pending.has(grantId)) return fail('grant_in_progress');

    const xp = XP_REWARDS.miniGamePlayed + (result.success ? XP_REWARDS.miniGameWon : 0);
    this.pending.add(grantId);
    try {
      const auth = await this.authorize(grantId, { xp }, signal);
      if (!auth.ok) return auth;
      if (ledgerHas(this.state.ledger, grantId)) return fail('duplicate_grant');

      const previousBest = this.state.stats.bestScores[result.gameId] ?? 0;
      const newBest = result.score > previousBest;
      let next: SaveData = {
        ...this.state,
        ledger: ledgerRecord(this.state.ledger, grantId),
        stats: {
          ...this.state.stats,
          miniGamesPlayed: this.state.stats.miniGamesPlayed + 1,
          miniGamesWon: this.state.stats.miniGamesWon + (result.success ? 1 : 0),
          bestScores: newBest ? { ...this.state.stats.bestScores, [result.gameId]: result.score } : this.state.stats.bestScores,
        },
      };
      next = this.withXp(next, xp);
      next = this.withEvent(next, { type: 'minigame_finished', gameId: result.gameId, success: result.success, score: result.score });
      this.commit(next);
      return ok({ xpAwarded: xp, newBest });
    } finally {
      this.pending.delete(grantId);
    }
  }

  async claimMission(missionId: string, signal?: AbortSignal): Promise<Result<Reward, ClaimError | RewardError>> {
    const check = markClaimed(this.state.missions, this.deps.missionBook, missionId);
    if (!check.ok) return check;
    const def = check.value.def;
    const grantId = def.kind === 'daily' ? `mission:${missionId}:${this.state.missions.daily.dayKey}` : `mission:${missionId}`;
    if (ledgerHas(this.state.ledger, grantId)) return fail('duplicate_grant');
    if (this.pending.has(grantId)) return fail('grant_in_progress');

    this.pending.add(grantId);
    try {
      const auth = await this.authorize(grantId, def.reward, signal);
      if (!auth.ok) return auth;
      // Re-validate against the state as it is *now*; it may have changed while awaiting.
      const claimed = markClaimed(this.state.missions, this.deps.missionBook, missionId);
      if (!claimed.ok) return claimed;
      let next: SaveData = { ...this.state, missions: claimed.value.state, ledger: ledgerRecord(this.state.ledger, grantId) };
      next = this.withReward(next, auth.value);
      this.commit(next);
      return ok(auth.value);
    } finally {
      this.pending.delete(grantId);
    }
  }

  updateSettings(patch: Partial<Settings>): void {
    this.commit({ ...this.state, settings: { ...this.state.settings, ...patch } });
  }

  // ── internals ───────────────────────────────────────────────────────────

  private async authorize(grantId: string, reward: Reward, signal?: AbortSignal): Promise<Result<Reward, RewardError>> {
    try {
      return await this.deps.authority.authorize({ grantId, playerId: this.state.player.id, reward }, signal);
    } catch (err) {
      this.deps.logger.error('Reward authority failed', { grantId, err });
      return fail('authority_unavailable');
    }
  }

  private withXp(save: SaveData, amount: number): SaveData {
    if (amount === 0) return save;
    const gain = addXp(save.progression.totalXp, amount);
    if (gain.levelsGained > 0) this.deps.bus.emit('levelUp', { level: gain.newLevel });
    return { ...save, progression: { totalXp: gain.totalXp } };
  }

  private withReward(save: SaveData, reward: Reward): SaveData {
    let next = this.withXp(save, reward.xp ?? 0);
    if (reward.shards) next = { ...next, inventory: addShards(next.inventory, reward.shards) };
    if (reward.itemId) {
      const item = this.deps.catalog.get(reward.itemId);
      if (item) next = { ...next, inventory: addItem(next.inventory, item, this.deps.clock.now()).inventory };
    }
    return next;
  }

  private withEvent(save: SaveData, event: GameplayEvent): SaveData {
    const applied = applyGameplayEvent(save.missions, this.deps.missionBook, event);
    for (const missionId of applied.completed) this.deps.bus.emit('missionCompleted', { missionId });
    return { ...save, missions: applied.state };
  }

  /** Updates in-memory state first so gameplay continues even if persistence fails. */
  private commit(next: SaveData): void {
    this.state = next;
    const saved = this.deps.saveManager.save(next);
    if (saved.ok) this.state = saved.value;
    else if (saved.error === 'write_failed') this.deps.bus.emit('saveFailed', { reason: saved.error });
    this.deps.bus.emit('saveChanged', this.state);
  }
}
