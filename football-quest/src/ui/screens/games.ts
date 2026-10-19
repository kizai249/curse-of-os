import { MINI_GAMES } from '../../config/minigames';
import { MINI_GAME_IDS } from '../../domain/types';
import type { Screen } from '../context';
import { el } from '../dom';
import { fmt } from '../labels';

const ICONS = { timing_shot: '🎯', tactics_quiz: '🧠', squad_builder: '🧩' } as const;

export const gamesScreen: Screen = (root, ctx) => {
  const best = ctx.session.data.stats.bestScores;
  root.append(el('header', { class: 'screen-header' }, el('h2', {}, 'التحديات'), el('p', { class: 'muted' }, 'العب، افز، وخذ XP.')));
  const list = el('div', { class: 'stack' });
  for (const id of MINI_GAME_IDS) {
    const info = MINI_GAMES[id];
    const body = [
      el('div', { class: 'game-icon', 'aria-hidden': 'true' }, ICONS[id]),
      el('div', { class: 'game-text' },
        el('h3', {}, info.titleAr),
        el('p', { class: 'muted' }, info.descriptionAr),
        info.available && best[id] !== undefined ? el('span', { class: 'chip' }, `أفضل نتيجة: ${fmt(best[id]!)}`) : null),
    ];
    if (info.available) {
      list.append(el('button', { class: 'card game-card', type: 'button', onclick: () => { ctx.audio.play('tap'); ctx.navigate('timing_shot'); } },
        ...body, el('span', { class: 'btn btn-gold btn-sm', 'aria-hidden': 'true' }, 'العب')));
    } else {
      // Not implemented yet: rendered as static content (no button role, no handler).
      list.append(el('div', { class: 'card game-card disabled', 'aria-disabled': 'true' }, ...body, el('span', { class: 'soon' }, 'قريباً')));
    }
  }
  root.append(list);
};
