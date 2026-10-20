import { ITEM_CATALOG } from '../../config/items';
import { LOCATIONS } from '../../config/locations';
import { CITIES, GROUP_IDS, TEAMS, cityById, landmarkById, teamById, type TeamDefinition } from '../../config/tournament';
import type { ItemDefinition, ItemKind } from '../../domain/types';
import { RARITY_COLORS } from '../../render/ArenaScene';
import { itemArt } from '../art';
import type { Screen, UIContext } from '../context';
import { append, clear, el, progressBar } from '../dom';
import { fmt, RARITY_LABEL } from '../labels';

const TABS: readonly { kind: ItemKind; label: string }[] = [
  { kind: 'team_badge', label: 'المنتخبات' },
  { kind: 'player_card', label: 'اللاعبين' },
  { kind: 'landmark', label: 'المعالم' },
  { kind: 'venue_stamp', label: 'الملاعب' },
];

let lastTab: ItemKind = 'team_badge';

function openSheet(rarityColor: string, ...content: (Node | null)[]): void {
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  const overlay = el('div', { class: 'sheet-overlay', onclick: (e: Event) => { if (e.target === overlay) close(); } },
    el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', style: `--rarity:${rarityColor}` },
      el('button', { class: 'icon-btn sheet-close', type: 'button', 'aria-label': 'إغلاق', onclick: close }, '✕'),
      ...content.filter((c): c is Node => c !== null),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: close }, 'تمام')));
  document.addEventListener('keydown', onKey);
  document.body.append(overlay);
  overlay.querySelector<HTMLElement>('.sheet-close')?.focus();
}

function teamSheet(team: TeamDefinition, ctx: UIContext): void {
  const owned = ctx.session.data.inventory.items;
  const badge = ITEM_CATALOG.find((i) => i.kind === 'team_badge' && i.teamId === team.id)!;
  const cards = ITEM_CATALOG.filter((i) => i.kind === 'player_card' && i.teamId === team.id);
  const mates = TEAMS.filter((t) => t.group === team.group && t.id !== team.id).map((t) => t.nameAr).join('، ');
  openSheet(RARITY_COLORS[team.rarity],
    el('div', { class: owned[badge.id] ? '' : 'locked-art' }, itemArt(badge, 'item-art item-art-lg')),
    el('span', { class: 'rarity-pill' }, RARITY_LABEL[team.rarity]),
    el('h2', {}, team.nameAr),
    team.nicknameAr ? el('p', { class: 'muted' }, `اللقب: «${team.nicknameAr}»`) : null,
    el('dl', { class: 'meta' },
      el('dt', {}, 'المجموعة'), el('dd', {}, team.group),
      el('dt', {}, 'ألقاب آسيا'), el('dd', {}, team.titles ? String(team.titles) : 'ولا لقب للحين'),
      el('dt', {}, 'معه في المجموعة'), el('dd', {}, mates)),
    team.isHost ? el('p', { class: 'chip chip-gold' }, 'البلد المستضيف 🇸🇦') : null,
    team.unconfirmed ? el('p', { class: 'warn-text small' }, 'تأهل هذا المنتخب يحتاج تأكيد رسمي — ممكن يتحدث.') : null,
    el('div', { class: 'mini-cards' }, ...cards.map((c) => el('div', { class: owned[c.id] ? '' : 'locked-art' }, itemArt(c, 'item-art card-art-sm')))),
    el('p', { class: 'muted small' }, owned[badge.id] ? `عندك ${cards.filter((c) => owned[c.id]).length} من 4 بطاقات` : 'الشارة للحين ما جمعتها — دورها في الملاعب ومنطقة المشجعين'));
}

function itemSheet(item: ItemDefinition, ctx: UIContext): void {
  const owned = ctx.session.data.inventory.items[item.id];
  if (!owned) return;
  const lm = item.landmarkId ? landmarkById(item.landmarkId) : undefined;
  const city = item.cityId ? cityById(item.cityId) : undefined;
  const team = item.teamId ? teamById(item.teamId) : undefined;
  const fanzone = city ? LOCATIONS.find((l) => l.cityId === city.id && l.kind === 'fanzone') : undefined;
  openSheet(RARITY_COLORS[item.rarity],
    itemArt(item, `item-art item-art-lg ${item.kind === 'landmark' ? 'postcard-lg' : ''}`),
    el('span', { class: 'rarity-pill' }, RARITY_LABEL[item.rarity]),
    el('h2', {}, item.nameAr),
    el('p', { class: 'muted en' }, item.nameEn),
    el('p', {}, item.descriptionAr),
    lm?.unesco ? el('span', { class: 'chip chip-gold' }, 'موقع تراث عالمي – يونسكو') : null,
    el('dl', { class: 'meta' },
      team ? el('dt', {}, 'المنتخب') : null, team ? el('dd', {}, `${team.nameAr} · المجموعة ${team.group}`) : null,
      city ? el('dt', {}, 'المدينة') : null, city ? el('dd', {}, city.nameAr) : null,
      el('dt', {}, 'العدد'), el('dd', {}, `×${fmt(owned.count)}`),
      el('dt', {}, 'أول مرة'), el('dd', {}, new Date(owned.firstObtainedAt).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn'))),
    item.kind === 'landmark' && fanzone
      ? el('button', { class: 'btn btn-gold', type: 'button', onclick: () => { document.querySelector('.sheet-overlay')?.remove(); ctx.navigate('city', { cityId: fanzone.cityId }); } }, `خطط زيارتك لـ${city!.nameAr} 📍`)
      : null);
}

function tile(item: ItemDefinition, ctx: UIContext, onOpen: () => void): HTMLElement {
  const owned = ctx.session.data.inventory.items[item.id];
  return el('button', {
    class: `tile ${owned ? `rarity-${item.rarity}` : 'tile-locked'}`, type: 'button', style: `--rarity:${RARITY_COLORS[item.rarity]}`,
    onclick: onOpen, 'aria-label': owned ? `${item.nameAr}، ${RARITY_LABEL[item.rarity]}` : `${item.nameAr} — ما جمعتها`,
  },
    el('div', { class: owned ? '' : 'locked-art' }, itemArt(item, item.kind === 'landmark' ? 'item-art postcard-art' : 'item-art')),
    el('span', { class: 'tile-name' }, item.kind === 'team_badge' ? teamById(item.teamId!)!.nameAr : item.nameAr),
    owned && owned.count > 1 ? el('span', { class: 'tile-count' }, `×${owned.count}`) : null);
}

function renderTab(kind: ItemKind, body: HTMLElement, ctx: UIContext): void {
  clear(body);
  const items = ITEM_CATALOG.filter((i) => i.kind === kind);
  const owned = ctx.session.data.inventory.items;
  const have = items.filter((i) => owned[i.id]).length;
  body.append(el('div', { class: 'row' }, el('span', {}, `جمعت ${have} من ${items.length}`), el('span', { class: 'muted small', dir: 'ltr' }, `${Math.round((have / items.length) * 100)}%`)), progressBar(have, items.length));

  if (kind === 'team_badge') {
    for (const g of GROUP_IDS) {
      const grid = el('div', { class: 'grid grid-4' });
      for (const t of TEAMS.filter((x) => x.group === g)) {
        const badge = items.find((i) => i.teamId === t.id)!;
        grid.append(tile(badge, ctx, () => teamSheet(t, ctx)));
      }
      body.append(el('h3', { class: 'group-title' }, `المجموعة ${g}`), grid);
    }
  } else if (kind === 'player_card') {
    for (const t of TEAMS) {
      const cards = items.filter((i) => i.teamId === t.id);
      const got = cards.filter((c) => owned[c.id]).length;
      const grid = el('div', { class: 'grid grid-4' }, ...cards.map((c) => tile(c, ctx, () => itemSheet(c, ctx))));
      body.append(el('div', { class: 'row group-title' }, el('h3', {}, t.nameAr), el('span', { class: 'muted small', dir: 'ltr' }, `${got}/4`)), grid);
    }
  } else {
    for (const c of CITIES) {
      const cityItems = items.filter((i) => i.cityId === c.id);
      body.append(el('h3', { class: 'group-title' }, c.nameAr),
        el('div', { class: `grid ${kind === 'landmark' ? 'grid-2' : 'grid-3'}` }, ...cityItems.map((i) => tile(i, ctx, () => itemSheet(i, ctx)))));
    }
  }
}

export const albumScreen: Screen = (root, ctx) => {
  const inv = ctx.session.data.inventory;
  const total = ITEM_CATALOG.length;
  const ownedCount = ITEM_CATALOG.filter((i) => inv.items[i.id]).length;
  const body = el('div', { class: 'stack' });
  const tabs = el('div', { class: 'filters', role: 'tablist' });
  const renderTabs = () => {
    clear(tabs);
    for (const t of TABS) {
      tabs.append(el('button', {
        class: `chip-btn ${lastTab === t.kind ? 'active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(lastTab === t.kind),
        onclick: () => { lastTab = t.kind; renderTabs(); renderTab(t.kind, body, ctx); },
      }, t.label));
    }
  };
  append(root,
    el('header', { class: 'screen-header' },
      el('h2', {}, 'ألبوم البطولة'),
      el('div', { class: 'row' }, el('span', {}, `المجموع: ${ownedCount} من ${total}`), el('span', { class: 'chip chip-shard', dir: 'ltr' }, `${fmt(inv.shards)} 💎`)),
      progressBar(ownedCount, total)),
    ownedCount === 0 ? el('div', { class: 'empty-state' },
      el('div', { class: 'empty-icon' }, '📒'),
      el('h3', {}, 'ألبومك فاضي للحين'),
      el('p', { class: 'muted' }, 'روح الخريطة، ادخل ملعب أو منطقة مشجعين، والتقط النقاط اللامعة.'),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: () => ctx.navigate('map') }, 'افتح الخريطة 🗺️')) : null);
  renderTabs();
  root.append(tabs, body);
  renderTab(lastTab, body, ctx);
};
