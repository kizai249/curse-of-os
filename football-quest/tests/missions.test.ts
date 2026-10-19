import { describe, expect, it } from 'vitest';
import { DAILY_MISSION_POOL, INTRO_MISSIONS } from '../src/config/missions';
import {
  applyGameplayEvent, createMissionsState, markClaimed, MissionBook, objectiveIncrement,
  refreshDailyMissions, selectDailyMissions,
} from '../src/domain/missions';

const book = new MissionBook(INTRO_MISSIONS, DAILY_MISSION_POOL);

describe('missions', () => {
  it('starts every intro mission active at 0', () => {
    const s = createMissionsState(book);
    for (const def of INTRO_MISSIONS) expect(s.intro[def.id]).toEqual({ progress: 0, status: 'active' });
  });

  it('advances progress and completes on target', () => {
    let s = createMissionsState(book);
    const r1 = applyGameplayEvent(s, book, { type: 'discovery', pointId: 'p' });
    expect(r1.completed).toContain('intro_first_find');
    s = r1.state;
    expect(s.intro.intro_first_find).toEqual({ progress: 1, status: 'completed' });
    // further events do not push progress beyond target
    s = applyGameplayEvent(s, book, { type: 'discovery', pointId: 'p' }).state;
    expect(s.intro.intro_first_find!.progress).toBe(1);
  });

  it('respects rarity, game id, win and score filters', () => {
    expect(objectiveIncrement({ type: 'collect', target: 1, minRarity: 'rare' }, { type: 'item_collected', itemId: 'a', rarity: 'common', duplicate: false })).toBe(0);
    expect(objectiveIncrement({ type: 'collect', target: 1, minRarity: 'rare' }, { type: 'item_collected', itemId: 'a', rarity: 'legendary', duplicate: true })).toBe(1);
    const lost = { type: 'minigame_finished', gameId: 'timing_shot', success: false, score: 5 } as const;
    expect(objectiveIncrement({ type: 'win_minigame', target: 1 }, lost)).toBe(0);
    expect(objectiveIncrement({ type: 'play_minigame', target: 1 }, lost)).toBe(1);
    expect(objectiveIncrement({ type: 'play_minigame', target: 1, gameId: 'tactics_quiz' }, lost)).toBe(0);
    expect(objectiveIncrement({ type: 'score_minigame', target: 1, gameId: 'timing_shot', minScore: 5 }, lost)).toBe(1);
    expect(objectiveIncrement({ type: 'score_minigame', target: 1, gameId: 'timing_shot', minScore: 6 }, lost)).toBe(0);
  });

  it('claims only completed missions, exactly once', () => {
    let s = createMissionsState(book);
    expect(markClaimed(s, book, 'intro_first_find')).toMatchObject({ ok: false, error: 'not_completed' });
    s = applyGameplayEvent(s, book, { type: 'discovery', pointId: 'p' }).state;
    const claimed = markClaimed(s, book, 'intro_first_find');
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    expect(markClaimed(claimed.value.state, book, 'intro_first_find')).toMatchObject({ ok: false, error: 'already_claimed' });
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
    let s = refreshDailyMissions(createMissionsState(book), book, '2026-10-19', 6).state;
    s = applyGameplayEvent(s, book, { type: 'minigame_finished', gameId: 'timing_shot', success: true, score: 19 }).state;
    const playId = 'daily_score_shot';
    const claimed = markClaimed(s, book, playId);
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    const next = refreshDailyMissions(claimed.value.state, book, '2026-10-20', 6);
    expect(next.expired).not.toContain(playId);
  });

  it('validates mission definitions', () => {
    expect(() => new MissionBook([{ ...INTRO_MISSIONS[0]!, objective: { type: 'discover', target: 0 } }], [])).toThrow(/invalid target/);
    expect(() => new MissionBook([INTRO_MISSIONS[0]!, INTRO_MISSIONS[0]!], [])).toThrow(/Duplicate/);
  });
});
