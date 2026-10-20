import { describe, expect, it } from 'vitest';
import { DAILY_MISSION_POOL, INTRO_MISSIONS } from '../src/config/missions';
import {
  applyGameplayEvent, createMissionsState, markClaimed, MissionBook, objectiveIncrement,
  reconcileMissions, refreshDailyMissions, selectDailyMissions,
} from '../src/domain/missions';

const book = new MissionBook(INTRO_MISSIONS, DAILY_MISSION_POOL);

describe('missions', () => {
  it('starts every intro mission active at 0', () => {
    const s = createMissionsState(book);
    for (const def of INTRO_MISSIONS) expect(s.intro[def.id]).toEqual({ progress: 0, status: 'active' });
  });

  it('advances progress and completes on target', () => {
    let s = createMissionsState(book);
    const r1 = applyGameplayEvent(s, book, { type: 'discovery', pointId: 'p', locationKind: 'stadium', cityId: 'riyadh' });
    expect(r1.completed).toContain('intro_first_stadium');
    s = r1.state;
    expect(s.intro.intro_first_stadium).toEqual({ progress: 1, status: 'completed' });
    // further events do not push progress beyond target
    s = applyGameplayEvent(s, book, { type: 'discovery', pointId: 'p', locationKind: 'stadium', cityId: 'riyadh' }).state;
    expect(s.intro.intro_first_stadium!.progress).toBe(1);
  });

  it('respects rarity, game id, win and score filters', () => {
    expect(objectiveIncrement({ type: 'collect', target: 1, minRarity: 'rare' }, { type: 'item_collected', itemId: 'a', rarity: 'common', kind: 'player_card', duplicate: false })).toBe(0);
    expect(objectiveIncrement({ type: 'collect', target: 1, minRarity: 'rare' }, { type: 'item_collected', itemId: 'a', rarity: 'legendary', kind: 'team_badge', duplicate: true })).toBe(1);
    const lost = { type: 'minigame_finished', gameId: 'timing_shot', success: false, score: 5 } as const;
    expect(objectiveIncrement({ type: 'win_minigame', target: 1 }, lost)).toBe(0);
    expect(objectiveIncrement({ type: 'play_minigame', target: 1 }, lost)).toBe(1);
    expect(objectiveIncrement({ type: 'play_minigame', target: 1, gameId: 'cup_quiz' }, lost)).toBe(0);
    expect(objectiveIncrement({ type: 'score_minigame', target: 1, gameId: 'timing_shot', minScore: 5 }, lost)).toBe(1);
    expect(objectiveIncrement({ type: 'score_minigame', target: 1, gameId: 'timing_shot', minScore: 6 }, lost)).toBe(0);
  });

  it('claims only completed missions, exactly once', () => {
    let s = createMissionsState(book);
    expect(markClaimed(s, book, 'intro_first_stadium')).toMatchObject({ ok: false, error: 'not_completed' });
    s = applyGameplayEvent(s, book, { type: 'discovery', pointId: 'p', locationKind: 'stadium', cityId: 'riyadh' }).state;
    const claimed = markClaimed(s, book, 'intro_first_stadium');
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(markClaimed(claimed.value.state, book, 'intro_first_stadium')).toMatchObject({ ok: false, error: 'already_claimed' });
    expect(markClaimed(s, book, 'nope')).toMatchObject({ ok: false, error: 'unknown_mission' });
  });

  it('selects the same daily missions for the same day, and rotates them', () => {
    const a = selectDailyMissions(book, '2026-10-19', 3);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    expect(selectDailyMissions(book, '2026-10-19', 3)).toEqual(a);
    let s = refreshDailyMissions(createMissionsState(book), book, '2026-10-19', 3).state;
    expect(Object.keys(s.daily.entries)).toEqual(a);
    expect(refreshDailyMissions(s, book, '2026-10-19', 3).changed).toBe(false);
    const next = refreshDailyMissions(s, book, '2026-10-20', 3);
    expect(next.changed).toBe(true);
    expect(next.expired).toEqual(a); // nothing claimed → all expired (failure condition)
    s = next.state;
    expect(s.daily.dayKey).toBe('2026-10-20');
  });

  it('does not report already-claimed dailies as expired', () => {
    let s = refreshDailyMissions(createMissionsState(book), book, '2026-10-19', DAILY_MISSION_POOL.length).state;
    s = applyGameplayEvent(s, book, { type: 'minigame_finished', gameId: 'timing_shot', success: true, score: 19 }).state;
    const playId = 'daily_score_shot';
    const claimed = markClaimed(s, book, playId);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const next = refreshDailyMissions(claimed.value.state, book, '2026-10-20', DAILY_MISSION_POOL.length);
    expect(next.expired).not.toContain(playId);
  });

  it('filters discoveries by location kind and city, and collections by item kind', () => {
    const ev = (locationKind: 'stadium' | 'fanzone', cityId: string) => ({ type: 'discovery', pointId: 'p', locationKind, cityId }) as const;
    expect(objectiveIncrement({ type: 'discover', target: 1, locationKind: 'fanzone' }, ev('stadium', 'riyadh'))).toBe(0);
    expect(objectiveIncrement({ type: 'discover', target: 1, locationKind: 'fanzone' }, ev('fanzone', 'riyadh'))).toBe(1);
    expect(objectiveIncrement({ type: 'discover', target: 1, cityId: 'jeddah' }, ev('fanzone', 'riyadh'))).toBe(0);
    expect(objectiveIncrement({ type: 'discover', target: 1, cityId: 'jeddah' }, ev('stadium', 'jeddah'))).toBe(1);
    const card = { type: 'item_collected', itemId: 'c', rarity: 'rare', kind: 'player_card', duplicate: false } as const;
    expect(objectiveIncrement({ type: 'collect', target: 1, itemKind: 'team_badge' }, card)).toBe(0);
    expect(objectiveIncrement({ type: 'collect', target: 1, itemKind: 'player_card' }, card)).toBe(1);
  });

  it('reconciles old states with the current mission book', () => {
    const fresh = createMissionsState(book);
    expect(reconcileMissions(fresh, book)).toBe(fresh); // unchanged → same object
    const old = {
      intro: { retired_mission: { progress: 1, status: 'completed' as const }, intro_first_stadium: { progress: 1, status: 'claimed' as const } },
      daily: { dayKey: '2026-10-19', entries: { retired_daily: { progress: 0, status: 'active' as const }, daily_rare_1: { progress: 0, status: 'active' as const } } },
    };
    const r = reconcileMissions(old, book);
    expect(r.intro.retired_mission).toBeUndefined();
    expect(r.intro.intro_first_stadium!.status).toBe('claimed'); // progress kept
    for (const def of INTRO_MISSIONS) expect(r.intro[def.id]).toBeDefined();
    expect(Object.keys(r.daily.entries)).toEqual(['daily_rare_1']);
  });

  it('validates mission definitions', () => {
    expect(() => new MissionBook([{ ...INTRO_MISSIONS[0]!, objective: { type: 'discover', target: 0 } }], [])).toThrow(/invalid target/);
    expect(() => new MissionBook([INTRO_MISSIONS[0]!, INTRO_MISSIONS[0]!], [])).toThrow(/Duplicate/);
  });
});
