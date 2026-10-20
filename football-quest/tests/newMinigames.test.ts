import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from '../src/config/items';
import { CUP_QUIZ_CONFIG, cupQuizMaxScore, MINI_GAMES, PARTY_CONFIG, SQUAD_CONFIG } from '../src/config/minigames';
import { createSeededRng } from '../src/core/Rng';
import { CupQuiz } from '../src/minigames/CupQuiz';
import { PartyShootout } from '../src/minigames/PartyShootout';
import { buildQuestionBank, drawQuestions, type QuizQuestion } from '../src/minigames/quizBank';
import { gradeShot, meterPosition } from '../src/minigames/shot';
import { scoreSquad, squadMaxScore, validateLineup } from '../src/minigames/SquadBuilder';

const card = (id: string) => ITEM_CATALOG.find((i) => i.id === id)!;

describe('quiz bank', () => {
  it('every question has 2–4 unique options and a valid answer', () => {
    const bank = buildQuestionBank(createSeededRng(1));
    expect(bank.length).toBeGreaterThan(40);
    for (const q of bank) {
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options.length).toBeLessThanOrEqual(4);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });

  it('answers match the data (spot checks)', () => {
    const bank = buildQuestionBank(createSeededRng(2));
    const answer = (id: string) => { const q = bank.find((x) => x.id === id)!; return q.options[q.correctIndex]; };
    expect(answer('venue_city_aramco')).toBe('الخبر');
    expect(answer('venue_city_kasc')).toBe('جدة');
    expect(answer('group_jpn')).toBe('المجموعة F');
    expect(answer('titles_ksa')).toBe('3');
    expect(answer('opener')).toBe('فلسطين');
    expect(answer('team_count')).toBe('24');
  });

  it('never asks about unconfirmed teams and skips shared nicknames', () => {
    const bank = buildQuestionBank(createSeededRng(3));
    expect(bank.some((q) => q.id === 'group_yem')).toBe(false);
    expect(bank.some((q) => q.id === 'nick_oma' || q.id === 'nick_bhr')).toBe(false); // both «الأحمر»
    expect(bank.some((q) => q.options.includes('اليمن'))).toBe(false);
  });

  it('draws the requested number of distinct questions', () => {
    const qs = drawQuestions(createSeededRng(4), 10);
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map((q) => q.id)).size).toBe(10);
  });
});

const Q = (correctIndex = 0): QuizQuestion => ({ id: `q${Math.random()}`, promptAr: '؟', options: ['a', 'b', 'c', 'd'], correctIndex });
const C = CUP_QUIZ_CONFIG;

describe('CupQuiz', () => {
  it('scores correct answers with a time bonus and wins at the threshold', () => {
    const quiz = new CupQuiz(Array.from({ length: 10 }, () => Q(0)), 'r');
    expect(quiz.answer(0)).toBeNull(); // not started
    quiz.start();
    for (let i = 0; i < 10; i++) {
      quiz.tick(2500); // 2.5 s elapsed → 12 whole seconds left
      const out = quiz.answer(i < C.correctToWin ? 0 : 1)!;
      expect(out.correct).toBe(i < C.correctToWin);
      if (out.correct) expect(out.points).toBe(C.pointsPerCorrect + 12 * C.pointsPerSecondLeft);
      quiz.tick(C.feedbackMs + 1);
    }
    expect(quiz.snapshot().state).toBe('success');
    expect(quiz.result()).toMatchObject({ gameId: 'cup_quiz', success: true, score: C.correctToWin * (C.pointsPerCorrect + 60) });
  });

  it('a timeout counts as wrong and moves on', () => {
    const quiz = new CupQuiz([Q(), Q()], 'r');
    quiz.start();
    quiz.tick(C.questionTimeMs + 10);
    expect(quiz.snapshot().lastOutcome).toMatchObject({ correct: false, chosenIndex: null });
    expect(quiz.answer(0)).toBeNull(); // locked during feedback
    quiz.tick(C.feedbackMs + 1);
    expect(quiz.snapshot().index).toBe(1);
  });

  it('fails below the threshold; rejects double answers and bad indices; pauses time', () => {
    const quiz = new CupQuiz([Q(2)], 'r');
    quiz.start();
    expect(quiz.answer(9)).toBeNull();
    expect(quiz.answer(-1)).toBeNull();
    quiz.pause();
    quiz.tick(60_000);
    expect(quiz.snapshot().remainingMs).toBe(C.questionTimeMs);
    quiz.resume();
    expect(quiz.answer(0)).not.toBeNull();
    expect(quiz.answer(2)).toBeNull();
    quiz.tick(C.feedbackMs + 1);
    expect(quiz.snapshot().state).toBe('failure');
  });

  it('max score constant matches the rules', () => {
    expect(MINI_GAMES.cup_quiz.maxScore).toBe(cupQuizMaxScore());
    expect(() => new CupQuiz([], 'r')).toThrow(RangeError);
  });
});

describe('SquadBuilder', () => {
  it('scores rarity, position fit, same-team and same-group chemistry', () => {
    const s = scoreSquad({ GK: card('card_ksa_gk'), FW: card('card_ksa_fw'), FLEX: card('card_kuw_fw') });
    // ksa gk epic(35)+ksa fw legendary(50)+kuw fw epic(35); fit 15+15+5; ksa-ksa team 20; kuw-ksa group A ×2 = 16
    expect(s).toMatchObject({ rarity: 120, fit: 35, sameTeam: 20, sameGroup: 16, total: 191 });
    expect(s.links).toHaveLength(3);
  });

  it('wrong position gets no fit bonus; empty lineup scores 0', () => {
    expect(scoreSquad({ GK: card('card_ksa_fw') }).fit).toBe(0);
    expect(scoreSquad({}).total).toBe(0);
  });

  it('validates ownership, duplicates and item kind', () => {
    const owns = (id: string) => id !== 'card_jpn_gk';
    expect(validateLineup({ GK: card('card_ksa_gk') }, owns)).toBeNull();
    expect(validateLineup({ GK: card('card_jpn_gk') }, owns)).toBe('not_owned');
    expect(validateLineup({ GK: card('card_ksa_gk'), FLEX: card('card_ksa_gk') }, owns)).toBe('duplicate_card');
    expect(validateLineup({ GK: card('badge_ksa') }, owns)).toBe('not_a_player');
  });

  it('config ceiling equals the computed maximum and is above the win score', () => {
    expect(MINI_GAMES.squad_builder.maxScore).toBe(squadMaxScore());
    expect(squadMaxScore()).toBeGreaterThan(SQUAD_CONFIG.winScore);
  });
});

describe('shot helpers', () => {
  it('meter is a 0→1→0 triangle wave', () => {
    expect(meterPosition(0, 1000)).toBe(0);
    expect(meterPosition(500, 1000)).toBe(1);
    expect(meterPosition(250, 1000)).toBe(0.5);
    expect(meterPosition(1000, 1000)).toBe(0);
  });
  it('grades by distance', () => {
    const w = { perfectWindow: 0.05, goodWindow: 0.1 };
    expect(gradeShot(0.5, 0.52, w)).toBe('perfect');
    expect(gradeShot(0.5, 0.58, w)).toBe('good');
    expect(gradeShot(0.5, 0.7, w)).toBe('saved');
  });
});

describe('PartyShootout', () => {
  const P = PARTY_CONFIG;
  const players = [{ name: 'سعود', teamId: 'ksa' }, { name: 'ريم', teamId: 'jpn' }];
  /** rng 0.5 → target 0.5; aim the needle at `v` (rising half) then kick. */
  function kickAt(g: PartyShootout, v: number) {
    const now = g.meterValue();
    g.tick(Math.max(1e-6, (v - now) * P.sweepMs / 2));
    const k = g.kick();
    g.tick(P.resolveDelayMs + 1);
    return k;
  }

  it('alternates turns, counts goals and declares a single winner', () => {
    const g = new PartyShootout(players, () => 0.5, 'p');
    g.start();
    for (let r = 0; r < P.rounds; r++) {
      expect(g.snapshot().currentPlayer).toBe(0);
      expect(kickAt(g, 0.5)!.goal).toBe(true);
      expect(g.snapshot().currentPlayer).toBe(1);
      expect(kickAt(g, 0.95)!.goal).toBe(false);
    }
    const s = g.snapshot();
    expect(s.state).toBe('success');
    expect(s.goals).toEqual([5, 0]);
    expect(s.winners).toEqual([0]);
    expect(g.result()).toMatchObject({ gameId: 'party_shootout', success: true, score: 5 });
  });

  it('goes to sudden death on a tie and only tied leaders keep kicking', () => {
    const three = [...players, { name: 'فهد', teamId: 'qat' }];
    const g = new PartyShootout(three, () => 0.5, 'p');
    g.start();
    for (let r = 0; r < P.rounds; r++) { kickAt(g, 0.5); kickAt(g, 0.5); kickAt(g, 0.95); }
    let s = g.snapshot();
    expect(s.suddenDeath).toBe(true);
    expect(s.active).toEqual([0, 1]);
    kickAt(g, 0.5); // player 0 scores
    kickAt(g, 0.95); // player 1 misses
    s = g.snapshot();
    expect(s.state).toBe('success');
    expect(s.winners).toEqual([0]);
  });

  it('shares the win after the sudden-death limit', () => {
    const g = new PartyShootout(players, () => 0.5, 'p');
    g.start();
    for (let r = 0; r < P.rounds + P.maxSuddenDeathRounds; r++) { kickAt(g, 0.5); kickAt(g, 0.5); }
    expect(g.snapshot()).toMatchObject({ state: 'success', winners: [0, 1] });
    expect(g.result()!.score).toBeLessThanOrEqual(MINI_GAMES.party_shootout.maxScore);
  });

  it('enforces player count and blocks double kicks', () => {
    expect(() => new PartyShootout([players[0]!], () => 0.5, 'p')).toThrow(RangeError);
    expect(() => new PartyShootout([...players, ...players, players[0]!], () => 0.5, 'p')).toThrow(RangeError);
    const g = new PartyShootout(players, () => 0.5, 'p');
    expect(g.kick()).toBeNull();
    g.start();
    expect(g.kick()).not.toBeNull();
    expect(g.kick()).toBeNull();
  });
});
