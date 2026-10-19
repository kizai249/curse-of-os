import { RARITIES, type ItemDefinition, type Rarity } from '../../domain/types';
import { RARITY_COLORS } from '../../render/ArenaScene';
import type { Screen, UIContext } from '../context';
import { clear, el, progressBar } from '../dom';
import { CATEGORY_LABEL, fmt, MODEL_EMOJI, RARITY_LABEL } from '../labels';

export function itemArt(item: ItemDefinition, ctx: UIContext, cls = 'item-art'): HTMLElement {
  const src = ctx.thumbnails.get(item.id);
  return src
    ? el('img', { class: cls, src, alt: item.nameAr, draggable: 'false' })
    : el('div', { class: `${cls} item-emoji`, role: 'img', 'aria-label': item.nameAr }, MODEL_EMOJI[item.modelKey]);
}

function openDetail(item: ItemDefinition, ctx: UIContext): void {
  const owned = ctx.session.data.inventory.items[item.id];
  if (!owned) return;
  const close = () => { overlay.remove(); };
  const overlay = el('div', { class: 'sheet-overlay', onclick: (e: Event) => { if (e.target === overlay) close(); } },
    el('div', { class: `sheet rarity-${item.rarity}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': item.nameAr, style: `--rarity:${RARITY_COLORS[item.rarity]}` },
      el('button', { class: 'icon-btn sheet-close', type: 'button', 'aria-label': 'إغلاق', onclick: close }, '✕'),
      itemArt(item, ctx, 'item-art item-art-lg'),
      el('span', { class: 'rarity-pill' }, RARITY_LABEL[item.rarity]),
      el('h2', {}, item.nameAr),
      el('p', { class: 'muted en' }, item.nameEn),
      el('p', {}, item.descriptionAr),
      el('dl', { class: 'meta' },
        el('dt', {}, 'النوع'), el('dd', {}, CATEGORY_LABEL[item.category] + (item.position ? ` · ${item.position}` : '')),
        el('dt', {}, 'العدد'), el('dd', {}, `×${fmt(owned.count)}`),
        el('dt', {}, 'أول مرة'), el('dd', {}, new Date(owned.firstObtainedAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn'))),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: close }, 'تمام')));
  document.body.append(overlay);
  (overlay.querySelector('.sheet-close') as HTMLElement | null)?.focus();
}

export const inventoryScreen: Screen = (root, ctx) => {
  let filter: Rarity | 'all' = 'all';
  const grid = el('div', { class: 'grid' });
  const all = ctx.catalog.items;
  const inv = ctx.session.data.inventory;
  const ownedCount = all.filter((i) => inv.items[i.id]).length;

  const chips = el('div', { class: 'filters', role: 'tablist' });
  const renderChips = () => {
    clear(chips);
    for (const key of ['all', ...RARITIES] as const) {
      chips.append(el('button', {
        class: `chip-btn ${filter === key ? 'active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(filter === key),
        onclick: () => { filter = key; renderChips(); renderGrid(); },
      }, key === 'all' ? 'الكل' : RARITY_LABEL[key]));
    }
  };

  const renderGrid = () => {
    clear(grid);
    const items = all.filter((i) => filter === 'all' || i.rarity === filter);
    for (const item of items) {
      const owned = inv.items[item.id];
      if (owned) {
        grid.append(el('button', { class: `tile rarity-${item.rarity}`, type: 'button', style: `--rarity:${RARITY_COLORS[item.rarity]}`, onclick: () => openDetail(item, ctx), 'aria-label': `${item.nameAr}، ${RARITY_LABEL[item.rarity]}` },
          itemArt(item, ctx),
          el('span', { class: 'tile-name' }, item.nameAr),
          owned.count > 1 ? el('span', { class: 'tile-count' }, `×${owned.count}`) : null));
      } else {
        grid.append(el('div', { class: 'tile tile-locked', 'aria-label': 'قطعة ما اكتشفتها' },
          el('div', { class: 'item-art item-emoji locked' }, '?'),
          el('span', { class: 'tile-name muted' }, '؟؟؟')));
      }
    }
  };

  root.append(
    el('header', { class: 'screen-header' },
      el('h2', {}, 'مجموعتي'),
      el('div', { class: 'row' }, el('span', {}, `جمعت ${ownedCount} من ${all.length}`), el('span', { class: 'chip chip-shard', dir: 'ltr' }, `${fmt(inv.shards)} 💎`)),
      progressBar(ownedCount, all.length)),
  );
  if (ownedCount === 0) {
    root.append(el('div', { class: 'empty-state' },
      el('div', { class: 'empty-icon' }, '🧺'),
      el('h3', {}, 'مجموعتك فاضية للحين'),
      el('p', { class: 'muted' }, 'روح الساحة والتقط النقاط اللامعة عشان تبدأ تجمع.'),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: () => ctx.navigate('arena') }, 'روح الساحة ⚽')));
    return;
  }
  renderChips();
  renderGrid();
  root.append(chips, grid);
};
