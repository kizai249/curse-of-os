import type { Screen } from '../context';
import { el, progressBar } from '../dom';
import { fmt } from '../labels';

export const profileScreen: Screen = (root, ctx) => {
  const d = ctx.session.data;
  const lvl = ctx.session.levelInfo();
  const owned = Object.keys(d.inventory.items).length;
  const stat = (label: string, value: string) => el('div', { class: 'stat' }, el('strong', {}, value), el('span', { class: 'muted small' }, label));
  root.append(
    el('header', { class: 'screen-header profile-header' },
      el('div', { class: 'avatar-badge', 'aria-hidden': 'true' }, '⚽'),
      el('div', {},
        el('h2', {}, d.player.displayName),
        el('p', { class: 'muted small' }, 'حساب ضيف — تقدّمك محفوظ على هذا الجهاز')),
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'الإعدادات', onclick: () => ctx.navigate('settings') }, '⚙️')),
    el('section', { class: 'card' },
      el('div', { class: 'row' }, el('strong', {}, `المستوى ${lvl.level}`),
        el('span', { class: 'muted small', dir: 'ltr' }, lvl.isMaxLevel ? 'أعلى مستوى 🔥' : `${fmt(lvl.xpIntoLevel)} / ${fmt(lvl.xpForNextLevel)} XP`)),
      progressBar(lvl.xpIntoLevel, lvl.isMaxLevel ? 1 : lvl.xpForNextLevel, 'progress-xp')),
    el('section', { class: 'stats-grid' },
      stat('اكتشافات', fmt(d.stats.discoveries)),
      stat('قطع مجموعة', `${owned}/${ctx.catalog.items.length}`),
      stat('شظايا 💎', fmt(d.inventory.shards)),
      stat('تحديات', fmt(d.stats.miniGamesPlayed)),
      stat('فوز', fmt(d.stats.miniGamesWon)),
      stat('أفضل تسديد', fmt(d.stats.bestScores.timing_shot ?? 0))),
  );
};
