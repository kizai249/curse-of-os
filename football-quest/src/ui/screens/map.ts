import { LOCATIONS } from '../../config/locations';
import { CITIES, TOURNAMENT } from '../../config/tournament';
import type { Screen, UIContext } from '../context';
import { el, progressBar } from '../dom';
import { project, saudiMap } from '../art';

const MAP_W = 340;
const MAP_H = 270;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Landmark postcards + venue stamps owned in a city vs. available there. */
export function cityProgress(ctx: UIContext, cityId: string): { done: number; total: number } {
  const fixed = LOCATIONS.filter((l) => l.cityId === cityId).flatMap((l) => l.points).filter((p) => p.grantItemId);
  const done = fixed.filter((p) => ctx.session.data.inventory.items[p.grantItemId!] !== undefined).length;
  return { done, total: fixed.length };
}

function countdownText(now: number): string {
  const start = new Date(`${TOURNAMENT.startDate}T00:00:00`).getTime();
  const end = new Date(`${TOURNAMENT.endDate}T23:59:59`).getTime();
  if (now < start) return `باقي ${Math.ceil((start - now) / DAY_MS)} يوم على صافرة الافتتاح`;
  if (now <= end) return 'البطولة شغّالة الحين! 🔥';
  return 'شكراً يا آسيا 💚';
}

export const mapScreen: Screen = (root, ctx) => {
  const map = saudiMap(MAP_W, MAP_H);
  const pins = el('div', { class: 'map-pins' });
  for (const city of CITIES) {
    const [x, y] = project(city.lon, city.lat, MAP_W, MAP_H);
    const prog = cityProgress(ctx, city.id);
    pins.append(el('button', {
      class: 'map-pin', type: 'button', style: `left:${(x / MAP_W) * 100}%;top:${(y / MAP_H) * 100}%;--accent:${city.accent}`,
      'aria-label': `${city.nameAr} — ${prog.done} من ${prog.total}`,
      onclick: () => { ctx.audio.unlock(); ctx.audio.play('tap'); ctx.navigate('city', { cityId: city.id }); },
    }, el('span', { class: 'pin-dot', 'aria-hidden': 'true' }), el('span', { class: 'pin-label' }, city.nameAr)));
  }
  const cards = el('div', { class: 'stack' });
  for (const city of CITIES) {
    const prog = cityProgress(ctx, city.id);
    const venues = LOCATIONS.filter((l) => l.cityId === city.id && l.kind === 'stadium').length;
    cards.append(el('button', { class: 'card city-card', type: 'button', style: `--accent:${city.accent}`, onclick: () => ctx.navigate('city', { cityId: city.id }) },
      el('div', { class: 'row' }, el('h3', {}, city.nameAr), el('span', { class: 'muted small', dir: 'ltr' }, `${prog.done}/${prog.total}`)),
      el('p', { class: 'muted small' }, `${city.taglineAr} · ${venues} ${venues === 1 ? 'ملعب' : 'ملاعب'}`),
      progressBar(prog.done, prog.total)));
  }
  root.append(
    el('header', { class: 'screen-header' },
      el('h2', {}, 'درب الكأس 🏆'),
      el('p', { class: 'muted' }, `${TOURNAMENT.nameAr} · ${TOURNAMENT.startLabelAr} – ${TOURNAMENT.endLabelAr}`),
      el('span', { class: 'chip chip-gold' }, countdownText(ctx.clock.now()))),
    el('div', { class: 'map-wrap' }, map, pins),
    el('p', { class: 'muted small center-text' }, 'اختر مدينة: زور ملاعب البطولة ومعالم المدينة واجمع الشارات والبطاقات'),
    cards);
};
