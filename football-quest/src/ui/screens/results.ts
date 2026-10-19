import { MINI_GAMES } from '../../config/minigames';
import type { Screen } from '../context';
import { el } from '../dom';
import { fmt } from '../labels';

export const resultsScreen: Screen = (root, ctx, params) => {
  if (!params) { ctx.navigate('games'); return; }
  const { result, xpAwarded, newBest, error } = params;
  const info = MINI_GAMES[result.gameId];
  const best = ctx.session.data.stats.bestScores[result.gameId] ?? result.score;
  root.append(el('div', { class: `results ${result.success ? 'win' : 'lose'}` },
    el('div', { class: 'results-icon', 'aria-hidden': 'true' }, result.success ? '🏆' : '🧤'),
    el('h2', {}, result.success ? 'فزت! كفو عليك 🔥' : 'الحارس كان صاحي اليوم 😅'),
    el('p', { class: 'muted' }, info.titleAr),
    el('div', { class: 'score-big', dir: 'ltr' }, fmt(result.score)),
    newBest ? el('span', { class: 'chip chip-gold' }, 'رقم قياسي جديد!') : el('span', { class: 'chip' }, `أفضل نتيجة: ${fmt(best)}`),
    error ? el('p', { class: 'warn-text' }, error) : el('span', { class: 'chip chip-xp', dir: 'ltr' }, `+${fmt(xpAwarded)} XP`),
    el('div', { class: 'row gap' },
      el('button', { class: 'btn btn-gold', type: 'button', onclick: () => ctx.navigate(result.gameId === 'timing_shot' ? 'timing_shot' : 'games') }, 'العب مرة ثانية'),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: () => ctx.navigate('games') }, 'رجوع'))));
};
