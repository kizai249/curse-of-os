import { describe, expect, it } from 'vitest';
import { ARENA, XP_REWARDS } from '../src/config/balance';
import { fail } from '../src/core/Result';
import type { RewardAuthority } from '../src/services/RewardAuthority';
import { createHarness } from './helpers';

const result = (over: Partial<{ runId: string; success: boolean; score: number }> = {}) => ({
  runId: 'run-1', gameId: 'timing_shot' as const, success: true, score: 10, durationMs: 9000, ...over,
});

describe('GameSession — discovery', () => {
  it('collects an item, grants XP and progresses intro missions', async () => {
    const h = createHarness();
    const completed: string[] = [];
    h.bus.on('missionCompleted', (e) => completed.push(e.missionId));
    const res = await h.session.collectDiscovery('p_center');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(h.session.data.inventory.items[res.value.item.id]?.count).toBe(1);
    expect(h.session.data.progression.totalXp).toBe(XP_REWARDS.discovery);
    expect(h.session.data.stats.discoveries).toBe(1);
    expect(completed).toContain('intro_first_find');
  });

  it('enforces the point cooldown and respawns afterwards', async () => {
    const h = createHarness();
    expect((await h.session.collectDiscovery('p_center')).ok).toBe(true);
    expect(await h.session.collectDiscovery('p_center')).toMatchObject({ ok: false, error: 'cooldown' });
    h.clock.advance(ARENA.respawnMs - 1);
    expect(h.session.pointCooldownRemaining('p_center')).toBe(1);
    h.clock.advance(1);
    expect((await h.session.collectDiscovery('p_center')).ok).toBe(true);
  });

  it('blocks rapid repeated taps on the same point (single grant)', async () => {
    const h = createHarness();
    const results = await Promise.all(Array.from({ length: 10 }, () => h.session.collectDiscovery('p_center')));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(h.session.data.stats.discoveries).toBe(1);
  });

  it('rejects unknown points', async () => {
    const h = createHarness();
    expect(await h.session.collectDiscovery('p_nowhere')).toMatchObject({ ok: false, error: 'unknown_point' });
  });

  it('awards shards for duplicates', async () => {
    const h = createHarness({ seed: 1 });
    let duplicates = 0;
    for (let i = 0; i < 40; i++) {
      h.clock.advance(ARENA.respawnMs);
      const r = await h.session.collectDiscovery('p_center');
      if (r.ok && r.value.duplicate) { duplicates++; expect(r.value.shardsAwarded).toBeGreaterThan(0); }
    }
    expect(duplicates).toBeGreaterThan(0);
    expect(h.session.data.inventory.shards).toBeGreaterThan(0);
  });
});

describe('GameSession — mini-games', () => {
  it('records a win, XP and best score', async () => {
    const h = createHarness();
    const r = await h.session.recordMiniGame(result());
    expect(r).toMatchObject({ ok: true, value: { xpAwarded: XP_REWARDS.miniGamePlayed + XP_REWARDS.miniGameWon, newBest: true } });
    expect(h.session.data.stats.bestScores.timing_shot).toBe(10);
    expect(h.session.data.missions.intro.intro_first_win!.status).toBe('completed');
  });

  it('rejects replaying the same run (duplicate reward)', async () => {
    const h = createHarness();
    expect((await h.session.recordMiniGame(result())).ok).toBe(true);
    expect(await h.session.recordMiniGame(result())).toMatchObject({ ok: false, error: 'duplicate_grant' });
    expect(h.session.data.stats.miniGamesPlayed).toBe(1);
  });

  it('rejects impossible scores', async () => {
    const h = createHarness();
    expect(await h.session.recordMiniGame(result({ score: 9999 }))).toMatchObject({ ok: false, error: 'invalid_score' });
    expect(await h.session.recordMiniGame(result({ score: -1 }))).toMatchObject({ ok: false, error: 'invalid_score' });
    expect(await h.session.recordMiniGame({ ...result(), gameId: 'bogus' as never })).toMatchObject({ ok: false, error: 'unknown_game' });
  });
});

describe('GameSession — mission claims', () => {
  it('claims a completed mission once and applies its reward', async () => {
    const h = createHarness();
    await h.session.collectDiscovery('p_center');
    const xpBefore = h.session.data.progression.totalXp;
    const claim = await h.session.claimMission('intro_first_find');
    expect(claim).toMatchObject({ ok: true, value: { xp: 50, shards: 10 } });
    expect(h.session.data.progression.totalXp).toBe(xpBefore + 50);
    expect(h.session.data.inventory.shards).toBeGreaterThanOrEqual(10);
    expect(await h.session.claimMission('intro_first_find')).toMatchObject({ ok: false, error: 'already_claimed' });
  });

  it('concurrent double-claims grant exactly once', async () => {
    const h = createHarness();
    await h.session.collectDiscovery('p_center');
    const shardsBefore = h.session.data.inventory.shards;
    const [a, b] = await Promise.all([h.session.claimMission('intro_first_find'), h.session.claimMission('intro_first_find')]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(h.session.data.inventory.shards).toBe(shardsBefore + 10);
  });

  it('refuses claims for incomplete missions', async () => {
    const h = createHarness();
    expect(await h.session.claimMission('intro_collect_3')).toMatchObject({ ok: false, error: 'not_completed' });
  });

  it('does not grant when the authority rejects or is unreachable', async () => {
    const rejecting: RewardAuthority = { isAuthoritative: true, authorize: async () => fail('rejected') };
    const h = createHarness({ authority: rejecting });
    expect(await h.session.collectDiscovery('p_center')).toMatchObject({ ok: false, error: 'rejected' });
    expect(h.session.data.stats.discoveries).toBe(0);

    const throwing: RewardAuthority = { isAuthoritative: true, authorize: async () => { throw new Error('timeout'); } };
    const h2 = createHarness({ authority: throwing });
    expect(await h2.session.recordMiniGame(result())).toMatchObject({ ok: false, error: 'authority_unavailable' });
    expect(h2.logs.some((l) => l.level === 'error')).toBe(true);
    // point is not put on cooldown by a failed grant
    expect(h2.session.pointCooldownRemaining('p_center')).toBe(0);
  });

  it('emits levelUp when XP crosses a level boundary', async () => {
    const h = createHarness();
    const levels: number[] = [];
    h.bus.on('levelUp', (e) => levels.push(e.level));
    for (let i = 0; i < 3; i++) await h.session.recordMiniGame(result({ runId: `r${i}` }));
    expect(levels).toEqual([2]);
    expect(h.session.levelInfo().level).toBe(2);
  });
});

describe('GameSession — daily rotation', () => {
  it('assigns daily missions and expires them on the next day', () => {
    const h = createHarness();
    const expired: string[][] = [];
    h.bus.on('dailyExpired', (e) => expired.push([...e.missionIds]));
    h.session.refreshDaily();
    const today = Object.keys(h.session.data.missions.daily.entries);
    expect(today).toHaveLength(3);
    h.session.refreshDaily(); // idempotent
    expect(expired).toHaveLength(0);
    h.clock.advance(24 * 60 * 60 * 1000);
    h.session.refreshDaily();
    expect(expired).toEqual([today]);
  });
});
