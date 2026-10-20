import { MINI_GAMES } from '../../config/minigames';
import type { Screen } from '../context';
import { append, el } from '../dom';
import { fmt } from '../labels';

export const resultsScreen: Screen = (root, ctx, params) => {
  const p = params?.results;
  if (!p) { ctx.navigate('games'); return; }
  const { result, xpAwarded, newBest, error, party, squad, quiz } = p;
  const info = MINI_GAMES[result.gameId];
  const best = ctx.session.data.stats.bestScores[result.gameId] ?? result.score;

  let headline: string;
  let icon: string;
  if (party) {
    const names = party.winners.map((i) => party.names[i]!).join(' و ');
    headline = party.winners.length > 1 ? `تعادل! ${names} يتقاسمون الفوز 🤝` : `${names} بطل الشلة! 🏆`;
    icon = '🥅';
  } else {
    headline = result.success ? 'فزت! كفو عليك 🔥' : result.gameId === 'cup_quiz' ? 'قريب! راجع معلوماتك وجرب ثاني 📚' : 'ما ضبطت هالمرة 😅';
    icon = result.success ? '🏆' : '💪';
  }

  const replay = result.gameId;
  append(root, el('div', { class: `results ${result.success ? 'win' : 'lose'}` },
    el('div', { class: 'results-icon', 'aria-hidden': 'true' }, icon),
    el('h2', {}, headline),
    el('p', { class: 'muted' }, info.titleAr),
    party
      ? el('div', { class: 'stack party-final' }, ...party.names.map((n, i) => el('div', { class: `row card ${party.winners.includes(i) ? 'winner' : ''}` }, el('span', {}, n), el('strong', { dir: 'ltr' }, `${party.goals[i]} ⚽`))))
      : el('div', { class: 'score-big', dir: 'ltr' }, fmt(result.score)),
    quiz ? el('span', { class: 'chip' }, `${quiz.correct} إجابات صح من ${quiz.total}`) : null,
    squad ? el('div', { class: 'chips center' },
      el('span', { class: 'chip' }, `الندرة ${squad.rarity}`), el('span', { class: 'chip' }, `المراكز ${squad.fit}`),
      el('span', { class: 'chip chip-xp' }, `نفس المنتخب ${squad.sameTeam}`), el('span', { class: 'chip chip-shard' }, `نفس المجموعة ${squad.sameGroup}`)) : null,
    !party ? (newBest ? el('span', { class: 'chip chip-gold' }, 'رقم قياسي جديد!') : el('span', { class: 'chip' }, `أفضل نتيجة: ${fmt(best)}`)) : null,
    error ? el('p', { class: 'warn-text' }, error) : el('span', { class: 'chip chip-xp', dir: 'ltr' }, `+${fmt(xpAwarded)} XP`),
    el('div', { class: 'row gap' },
      el('button', { class: 'btn btn-gold', type: 'button', onclick: () => ctx.navigate(replay) }, 'العب مرة ثانية'),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => ctx.navigate('games') }, 'رجوع'))));
};
