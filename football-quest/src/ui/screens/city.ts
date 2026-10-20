import { ITEM_CATALOG } from '../../config/items';
import { LOCATIONS } from '../../config/locations';
import { cityById, LANDMARKS, venueById } from '../../config/tournament';
import type { Screen } from '../context';
import { el } from '../dom';
import { itemArt } from '../art';
import { fmt } from '../labels';

export const cityScreen: Screen = (root, ctx, params) => {
  const city = params?.cityId ? cityById(params.cityId) : undefined;
  if (!city) { ctx.navigate('map'); return; }
  const owned = ctx.session.data.inventory.items;
  const enter = (locationId: string) => { ctx.audio.play('tap'); ctx.navigate('arena', { locationId }); };

  const fanzone = LOCATIONS.find((l) => l.cityId === city.id && l.kind === 'fanzone')!;
  const landmarks = LANDMARKS.filter((l) => l.cityId === city.id);
  const landmarkRow = el('div', { class: 'postcards' });
  for (const l of landmarks) {
    const item = ITEM_CATALOG.find((i) => i.landmarkId === l.id)!;
    const got = owned[item.id] !== undefined;
    landmarkRow.append(el('div', { class: `postcard-mini ${got ? '' : 'locked'}` },
      itemArt(item, 'item-art postcard-art'),
      el('span', { class: 'small' }, got ? `✔ ${l.nameAr}` : l.nameAr)));
  }

  const venues = LOCATIONS.filter((l) => l.cityId === city.id && l.kind === 'stadium');
  const venueCards = venues.map((loc) => {
    const v = venueById(loc.venueId!)!;
    const stampId = `stamp_${v.id}`;
    return el('button', { class: 'card venue-card', type: 'button', onclick: () => enter(loc.id) },
      el('div', { class: 'venue-text' },
        el('h3', {}, v.nameAr),
        el('p', { class: 'muted small' }, `حوالي ${fmt(v.capacity)} مقعد${v.noteAr ? ` · ${v.noteAr}` : ''}`),
        owned[stampId] ? el('span', { class: 'chip chip-xp' }, '✔ أخذت الختم') : el('span', { class: 'chip' }, 'الختم بانتظارك')),
      el('span', { class: 'btn btn-gold btn-sm', 'aria-hidden': 'true' }, 'ادخل'));
  });

  root.append(
    el('header', { class: 'screen-header' },
      el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'رجوع للخريطة', onclick: () => ctx.navigate('map') }, '→'),
      el('div', {}, el('h2', {}, city.nameAr), el('p', { class: 'muted small' }, city.taglineAr))),
    el('section', { class: 'card fanzone-card', style: `--accent:${city.accent}` },
      el('div', { class: 'row' }, el('h3', {}, `منطقة المشجعين في ${city.nameAr}`), el('span', { class: 'chip chip-gold' }, 'معالم')),
      el('p', { class: 'muted small' }, 'تمشّى بين أشهر معالم المدينة، كل معلم يعطيك بطاقة بريدية للألبوم.'),
      landmarkRow,
      el('button', { class: 'btn btn-gold', type: 'button', onclick: () => enter(fanzone.id) }, 'ادخل منطقة المشجعين')),
    el('section', {}, el('div', { class: 'section-title' }, el('h3', {}, 'ملاعب البطولة')), el('div', { class: 'stack' }, ...venueCards)));
};
