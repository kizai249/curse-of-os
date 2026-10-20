import { describe, expect, it } from 'vitest';
import { ARENA, XP_REWARDS } from '../src/config/balance';
import { fail } from '../src/core/Result';
import type { RewardAuthority } from '../src/services/RewardAuthority';
import { createHarness, LANDMARK_POINT, RANDOM_POINT, STAMP_POINT } from './helpers';

const result = (over: Partial<{ runId: string; success: boolean; score: number }> = {}) => ({
  runId: 'run-1', gameId: 'timing_shot' as const, success: true, score: 10, durationMs: 9000, ...over,
});

describe('GameSession — discovery', () => {
  it('a stadium centre point grants that venue stamp, XP and progresses the stadium mission', async () => {
    const h = createHarness();
    const completed: string[] = [];
    h.bus.on('missionCompleted', (e) => completed.push(e.missionId));
    const res = await h.session.collectDiscovery(STAMP_POINT);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.item.id).toBe('stamp_kfsc');
    expect(h.session.data.inventory.items.stamp_kfsc?.count).toBe(1);
    expect(h.session.data.progression.totalXp).toBe(XP_REWARDS.discovery);
    expect(completed).toContain('intro_first_stadium');
    expect(completed).not.toContain('intro_first_landmark');
  });

  it('a fan-zone landmark point grants its postcard and completes the tourism mission', async () => {
    const h = createHarness();
    const res = await h.session.collectDiscovery(LANDMARK_POINT);
    expect(res.ok && res.value.item.id).toBe('landmark_al_balad');
    expect(h.session.data.missions.intro.intro_first_landmark!.status).toBe('completed');
  });

  it('random points only drop team badges and player cards', async () => {
    const h = createHarness({ seed: 3 });
    for (let i = 0; i < 30; i++) {
      h.clock.advance(ARENA.respawnMs);
      const r = await h.session.collectDiscovery(RANDOM_POINT);
      expect(r.ok).toBe(true);
      if (r.ok) expect(['team_badge', 'player_card']).toContain(r.value.item.kind);
    }
  });

  it('enforces the point cooldown and respawns afterwards', async () => {
    const h = createHarness();
    expect((await h.session.collectDiscovery(RANDOM_POINT)).ok).toBe(true);
    expect(await h.session.collectDiscovery(RANDOM_POINT)).toMatchObject({ ok: false, error: 'cooldown' });
    h.clock.advance(ARENA.respawnMs - 1);
    expect(h.session.pointCooldownRemaining(RANDOM_POINT)).toBe(1);
    h.clock.advance(1);
    expect((await h.session.collectDiscovery(RANDOM_POINT)).ok).toBe(true);
  });

  it('blocks rapid repeated taps on the same point (single grant)', async () => {
    const h = createHarness();
    const results = await Promise.all(Array.from({ length: 10 }, () => h.session.collectDiscovery(RANDOM_POINT)));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(h.session.data.stats.discoveries).toBe(1);
  });

  it('rejects unknown points', async () => {
    const h = createHarness();
    expect(await h.session.collectDiscovery('p_nowhere')).toMatchObject({ ok: false, error: 'unknown_point' });
  });

  it('revisiting a fixed point after respawn gives a duplicate → shards', async () => {
    const h = createHarness();
    await h.session.collectDiscovery(STAMP_POINT);
    h.clock.advance(ARENA.respawnMs);
    const r = await h.session.collectDiscovery(STAMP_POINT);
    expect(r).toMatchObject({ ok: true, value: { duplicate: true } });
    expect(h.session.data.inventory.shards).toBeGreaterThan(0);
  });

  it('remembers the last location and ignores unknown ones', () => {
    const h = createHarness();
    h.session.setLastLocation('fanzone_khobar');
    expect(h.session.data.arena.lastLocationId).toBe('fanzone_khobar');
    h.session.setLastLocation('nowhere');
    expect(h.session.data.arena.lastLocationId).toBe('fanzone_khobar');
  });
});

describe('GameSession — mini-games', () => {
  it('records a win, XP and best score', async () => {
    const h = createHarness();
    const r = await h.session.recordMiniGame(result());
    expect(r).toMatchObject({ ok: true, value: { xpAwarded: XP_REWARDS.miniGamePlayed + XP_REWARDS.miniGameWon, newBest: true } });
    expect(h.session.data.stats.bestScores.timing_shot).toBe(10);
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

  it('quiz play completes the intro quiz mission', async () => {
    const h = createHarness();
    await h.session.recordMiniGame({ runId: 'q1', gameId: 'cup_quiz', success: false, score: 300, durationMs: 1000 });
    expect(h.session.data.missions.intro.intro_quiz!.status).toBe('completed');
  });
});

describe('GameSession — squad submission', () => {
  /** Owns all four Saudi cards (one team → strong chemistry). */
  function withSaudiCards() {
    const h = createHarness();
    const items: Record<string, { count: number; firstObtainedAt: number }> = {};
    for (const pos of ['gk', 'df', 'mf', 'fw']) items[`card_ksa_${pos}`] = { count: 1, firstObtainedAt: 1 };
    items.card_kuw_fw = { count: 1, firstObtainedAt: 1 };
    return createHarness({ initial: { ...h.session.data, inventory: { items, shards: 0 } } });
  }

  it('scores on the session side, wins and completes the squad mission', async () => {
    const h = withSaudiCards();
    const r = await h.session.submitSquad('s1', { GK: 'card_ksa_gk', DF: 'card_ksa_df', MF: 'card_ksa_mf', FW: 'card_ksa_fw', FLEX: 'card_kuw_fw' }, 5000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.success).toBe(true);
    expect(r.value.score.sameTeam).toBe(6 * 20);
    expect(h.session.data.stats.bestScores.squad_builder).toBe(r.value.score.total);
    expect(h.session.data.missions.intro.intro_squad!.status).toBe('completed');
  });

  it('rejects cards the player does not own, duplicates, non-cards and empty lineups', async () => {
    const h = withSaudiCards();
    expect(await h.session.submitSquad('a', { GK: 'card_jpn_gk' }, 1)).toMatchObject({ ok: false, error: 'not_owned' });
    expect(await h.session.submitSquad('b', { GK: 'card_ksa_gk', FLEX: 'card_ksa_gk' }, 1)).toMatchObject({ ok: false, error: 'duplicate_card' });
    expect(await h.session.submitSquad('c', { GK: 'badge_ksa' }, 1)).toMatchObject({ ok: false, error: 'not_a_player' });
    expect(await h.session.submitSquad('d', { GK: 'nope' }, 1)).toMatchObject({ ok: false, error: 'not_a_player' });
    expect(await h.session.submitSquad('e', {}, 1)).toMatchObject({ ok: false, error: 'empty_lineup' });
    expect(h.session.data.stats.miniGamesPlayed).toBe(0);
  });
});

describe('GameSession — mission claims', () => {
  it('claims a completed mission once and applies its reward', async () => {
    const h = createHarness();
    await h.session.collectDiscovery(STAMP_POINT);
    const xpBefore = h.session.data.progression.totalXp;
    const claim = await h.session.claimMission('intro_first_stadium');
    expect(claim).toMatchObject({ ok: true, value: { xp: 60, shards: 10 } });
    expect(h.session.data.progression.totalXp).toBe(xpBefore + 60);
    expect(await h.session.claimMission('intro_first_stadium')).toMatchObject({ ok: false, error: 'already_claimed' });
  });

  it('concurrent double-claims grant exactly once', async () => {
    const h = createHarness();
    await h.session.collectDiscovery(STAMP_POINT);
    const shardsBefore = h.session.data.inventory.shards;
    const [a, b] = await Promise.all([h.session.claimMission('intro_first_stadium'), h.session.claimMission('intro_first_stadium')]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect(h.session.data.inventory.shards).toBe(shardsBefore + 10);
  });

  it('refuses claims for incomplete missions', async () => {
    const h = createHarness();
    expect(await h.session.claimMission('intro_badges_3')).toMatchObject({ ok: false, error: 'not_completed' });
  });

  it('does not grant when the authority rejects or is unreachable', async () => {
    const rejecting: RewardAuthority = { isAuthoritative: true, authorize: async () => fail('rejected') };
    const h = createHarness({ authority: rejecting });
    expect(await h.session.collectDiscovery(RANDOM_POINT)).toMatchObject({ ok: false, error: 'rejected' });
    expect(h.session.data.stats.discoveries).toBe(0);

    const throwing: RewardAuthority = { isAuthoritative: true, authorize: async () => { throw new Error('timeout'); } };
    const h2 = createHarness({ authority: throwing });
    expect(await h2.session.recordMiniGame(result())).toMatchObject({ ok: false, error: 'authority_unavailable' });
    expect(h2.logs.some((l) => l.level === 'error')).toBe(true);
    expect(h2.session.pointCooldownRemaining(RANDOM_POINT)).toBe(0);
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
    h.session.refreshDaily();
    expect(expired).toHaveLength(0);
    h.clock.advance(24 * 60 * 60 * 1000);
    h.session.refreshDaily();
    expect(expired).toEqual([today]);
  });
});
