import { CITIES, LANDMARKS, TEAMS, TOURNAMENT, VENUES, cityById, type TeamDefinition } from '../config/tournament';
import type { Rng } from '../core/Rng';

export interface QuizQuestion {
  readonly id: string;
  readonly promptAr: string;
  readonly options: readonly string[];
  readonly correctIndex: number;
}

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function pickDistinct<T>(pool: readonly T[], n: number, rng: Rng): T[] {
  return shuffle(pool, rng).slice(0, n);
}

/** Builds a question with the correct answer and distractors, options shuffled. */
function q(id: string, promptAr: string, correct: string, distractors: readonly string[], rng: Rng): QuizQuestion {
  const unique = [...new Set(distractors.filter((d) => d !== correct))];
  const options = shuffle([correct, ...pickDistinct(unique, 3, rng)], rng);
  return { id, promptAr, options, correctIndex: options.indexOf(correct) };
}

const teamName = (t: TeamDefinition) => t.nameAr;
/** Teams whose participation is confirmed — the only ones used as answers or distractors. */
const CONFIRMED = TEAMS.filter((t) => !t.unconfirmed);

/**
 * Every question is derived from config/tournament.ts, so the quiz can never contradict the
 * data shown elsewhere in the game. Generates the full candidate bank for a given RNG.
 */
export function buildQuestionBank(rng: Rng): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const cityNames = CITIES.map((c) => c.nameAr);
  const ksa = TEAMS.find((t) => t.isHost)!;

  for (const v of VENUES) {
    out.push(q(`venue_city_${v.id}`, `في أي مدينة يقع «${v.nameAr}»؟`, cityById(v.cityId)!.nameAr, cityNames, rng));
  }
  for (const l of LANDMARKS) {
    out.push(q(`landmark_city_${l.id}`, `«${l.nameAr}» في أي مدينة مستضيفة؟`, cityById(l.cityId)!.nameAr, cityNames, rng));
  }
  for (const t of TEAMS) {
    if (t.unconfirmed) continue;
    out.push(q(`group_${t.id}`, `منتخب ${t.nameAr} في أي مجموعة؟`, `المجموعة ${t.group}`, ['A', 'B', 'C', 'D', 'E', 'F'].map((g) => `المجموعة ${g}`), rng));
    const mate = TEAMS.find((o) => o.group === t.group && o.id !== t.id && !o.unconfirmed);
    if (mate) {
      const others = CONFIRMED.filter((o) => o.group !== t.group).map(teamName);
      out.push(q(`mate_${t.id}`, `مين في نفس مجموعة ${t.nameAr}؟`, mate.nameAr, others, rng));
    }
  }
  const nicknames = TEAMS.filter((t) => t.nicknameAr && TEAMS.filter((o) => o.nicknameAr === t.nicknameAr).length === 1);
  for (const t of nicknames) {
    out.push(q(`nick_${t.id}`, `أي منتخب لقبه «${t.nicknameAr}»؟`, t.nameAr, CONFIRMED.filter((o) => o.id !== t.id).map(teamName), rng));
  }
  for (const t of TEAMS.filter((x) => x.titles > 0)) {
    out.push(q(`titles_${t.id}`, `كم مرة فاز منتخب ${t.nameAr} بكأس آسيا قبل 2027؟`, String(t.titles), ['0', '1', '2', '3', '4', '5'], rng));
  }
  const finalVenue = VENUES.find((v) => v.id === 'kfsc')!;
  out.push(q('final_venue', 'أي ملعب يستضيف مباراة النهائي؟', finalVenue.nameAr, VENUES.filter((v) => v !== finalVenue).map((v) => v.nameAr), rng));
  out.push(q('start_date', 'متى تنطلق البطولة؟', TOURNAMENT.startLabelAr, ['7 يناير 2027', '20 نوفمبر 2026', '12 يناير 2027', '1 فبراير 2027'], rng));
  out.push(q('team_count', 'كم منتخب يشارك في النهائيات؟', String(TOURNAMENT.teamCount), ['16', '20', '24', '32'], rng));
  out.push(q('venue_count', 'كم ملعب يستضيف مباريات البطولة؟', String(TOURNAMENT.venueCount), ['6', '8', '10', '12'], rng));
  out.push(q('opener', `مين يواجه ${ksa.nicknameAr} في مباراة الافتتاح؟`, 'فلسطين', CONFIRMED.filter((t) => t.id !== 'ple' && t.id !== ksa.id).map(teamName), rng));
  out.push(q('host_cities', 'وش المدن المستضيفة للبطولة؟', 'الرياض وجدة والخبر', ['الرياض وجدة والدمام', 'الرياض ومكة والخبر', 'جدة والطائف والخبر', 'الرياض وأبها وجدة'], rng));
  return out;
}

/** A fresh, shuffled round of `count` questions. */
export function drawQuestions(rng: Rng, count: number): QuizQuestion[] {
  return shuffle(buildQuestionBank(rng), rng).slice(0, count);
}
