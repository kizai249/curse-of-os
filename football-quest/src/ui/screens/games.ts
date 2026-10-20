import { MINI_GAMES } from '../../config/minigames';
import { MINI_GAME_IDS, type MiniGameId } from '../../domain/types';
import type { Screen } from '../context';
import { el } from '../dom';
import { fmt } from '../labels';

const ICONS: Readonly<Record<MiniGameId, string>> = { timing_shot: '🎯', cup_quiz: '🧠', squad_builder: '🧩', party_shootout: '🥅' };

export const gamesScreen: Screen = (root, ctx) => {
  const best = ctx.session.data.stats.bestScores;
  const solo = el('div', { class: 'stack' });
  const party = el('div', { class: 'stack' });
  for (const id of MINI_GAME_IDS) {
    const info = MINI_GAMES[id];
    const card = el('button', { class: 'card game-card', type: 'button', onclick: () => { ctx.audio.unlock(); ctx.audio.play('tap'); ctx.navigate(id); } },
      el('div', { class: 'game-icon', 'aria-hidden': 'true' }, ICONS[id]),
      el('div', { class: 'game-text' },
        el('h3', {}, info.titleAr),
        el('p', { class: 'muted' }, info.descriptionAr),
        best[id] !== undefined ? el('span', { class: 'chip' }, `أفضل نتيجة: ${fmt(best[id]!)}`) : null),
      el('span', { class: 'btn btn-gold btn-sm', 'aria-hidden': 'true' }, 'العب'));
    (info.party ? party : solo).append(card);
  }
  root.append(
    el('header', { class: 'screen-header' }, el('h2', {}, 'التحديات'), el('p', { class: 'muted' }, 'العب، افز، وخذ XP.')),
    el('section', {}, el('div', { class: 'section-title' }, el('h3', {}, 'تحديات فردية')), solo),
    el('section', {}, el('div', { class: 'section-title' }, el('h3', {}, 'ألعاب جماعية 👥'), el('span', { class: 'muted small' }, 'على نفس الجوال')), party),
    el('section', { class: 'card ideas' },
      el('h3', {}, 'قريباً أونلاين'),
      el('ul', { class: 'muted small' },
        el('li', {}, 'دوري المدن: الرياض ضد جدة ضد الخبر — كل اكتشاف يضيف نقاط لمدينتك'),
        el('li', {}, 'روابط المشجعين: انضم لجمهور منتخبك وكمّلوا ألبوم المنتخب سوا'),
        el('li', {}, 'توقعات المباريات مع الشلة خلال أيام البطولة'),
        el('li', {}, 'تبادل البطاقات المكررة مع ربعك')),
      el('p', { class: 'muted small' }, 'تحتاج سيرفر وحسابات — مخططة للمرحلة 6.')));
};
