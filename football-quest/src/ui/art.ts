/**
 * Original 2D art for collectibles, generated as inline SVG from item data (no image files).
 * Inline SVG (not <img>) so Arabic text uses the page font. All text goes through textContent.
 */
import { POSITION_LABEL_AR } from '../config/items';
import { cityById, landmarkById, teamById, venueById, type LandmarkModel } from '../config/tournament';
import type { ItemDefinition } from '../domain/types';
import { RARITY_COLORS } from '../render/ArenaScene';

const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

type Attrs = Record<string, string | number>;
function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (SVGElement | string)[]): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  for (const c of children) n.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return n;
}

function text(x: number, y: number, size: number, fill: string, value: string, weight = 900): SVGTextElement {
  return s('text', { x, y, 'font-size': size, 'font-weight': weight, fill, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Tajawal, sans-serif' }, value);
}

const SHIELD = 'M10 8 H90 V52 Q90 82 50 96 Q10 82 10 52 Z';

function badgeArt(item: ItemDefinition): SVGSVGElement {
  const team = item.teamId ? teamById(item.teamId) : undefined;
  const [c1, c2, c3] = team?.colors ?? [item.color, item.secondaryColor, item.color];
  const id = `clip${++uid}`;
  const root = s('svg', { viewBox: '0 0 100 104' });
  root.append(
    s('defs', {}, s('clipPath', { id }, s('path', { d: SHIELD }))),
    s('path', { d: SHIELD, fill: '#ffd166', transform: 'translate(-4 -3) scale(1.08)' }),
    s('g', { 'clip-path': `url(#${id})` },
      s('rect', { x: 0, y: 0, width: 100, height: 104, fill: c1 }),
      s('rect', { x: 0, y: 40, width: 100, height: 16, fill: c2 }),
      s('rect', { x: 0, y: 56, width: 100, height: 4, fill: c3 })),
    s('circle', { cx: 50, cy: 74, r: 11, fill: '#ffffff', stroke: '#1b1f2a', 'stroke-width': 2 }),
    s('path', { d: 'M50 68 L55 72 L53 78 L47 78 L45 72 Z', fill: '#1b1f2a' }),
    text(50, 25, 16, c2 === '#ffffff' && c1 === '#ffffff' ? '#00732f' : c2, team ? team.id.toUpperCase() : ''),
  );
  return root;
}

function cardArt(item: ItemDefinition): SVGSVGElement {
  const team = item.teamId ? teamById(item.teamId) : undefined;
  const [c1, c2] = team?.colors ?? [item.color, item.secondaryColor];
  const rarity = RARITY_COLORS[item.rarity];
  const root = s('svg', { viewBox: '0 0 80 110' });
  root.append(
    s('rect', { x: 2, y: 2, width: 76, height: 106, rx: 9, fill: c1, stroke: rarity, 'stroke-width': 4 }),
    s('path', { d: 'M2 70 L78 58 L78 108 L2 108 Z', fill: c2, opacity: 0.9 }),
    s('circle', { cx: 40, cy: 36, r: 12, fill: '#2b2b2b' }),
    s('path', { d: 'M18 72 Q20 50 40 50 Q60 50 62 72 Z', fill: '#2b2b2b' }),
    text(40, 86, 11, c1 === c2 ? '#ffffff' : c1, item.position ? POSITION_LABEL_AR[item.position] : ''),
    text(40, 99, 9, c1 === c2 ? '#ffffff' : c1, team?.nameAr ?? '', 700),
    s('rect', { x: 8, y: 8, width: 22, height: 13, rx: 4, fill: '#0b1430', opacity: 0.6 }),
    text(19, 15, 8, '#ffffff', item.position ?? ''),
  );
  return root;
}

/** Simple silhouettes per landmark model, drawn on a 100×64 postcard. */
function landmarkSilhouette(model: LandmarkModel): SVGElement {
  const ink = '#0b1430';
  switch (model) {
    case 'tower_arch': return s('path', { d: 'M42 62 Q47 20 50 8 Q53 20 58 62 Z M47 22 Q50 13 53 22 Z', fill: ink, 'fill-rule': 'evenodd' });
    case 'mud_fort': return s('path', { d: 'M22 62 V36 H28 V30 H34 V36 H66 V30 H72 V36 H78 V62 Z M46 62 V50 H54 V62 Z', fill: '#7a4a2a', 'fill-rule': 'evenodd' });
    case 'arch_gate': return s('path', { d: 'M26 62 A24 26 0 0 1 74 62 H67 A17 19 0 0 0 33 62 Z', fill: '#7b2ff7' });
    case 'coral_houses': return s('g', {}, s('rect', { x: 26, y: 26, width: 16, height: 36, fill: '#e8dcc4' }), s('rect', { x: 43, y: 18, width: 16, height: 44, fill: '#e8dcc4' }), s('rect', { x: 60, y: 30, width: 14, height: 32, fill: '#e8dcc4' }),
      s('rect', { x: 46, y: 26, width: 10, height: 10, fill: '#7a4a2a' }), s('rect', { x: 29, y: 34, width: 10, height: 9, fill: '#7a4a2a' }), s('rect', { x: 62, y: 38, width: 10, height: 9, fill: '#7a4a2a' }));
    case 'fountain': return s('g', {}, s('rect', { x: 0, y: 54, width: 100, height: 10, fill: '#1e6fa8' }), s('path', { d: 'M48 56 L50 6 L52 56 Z', fill: '#e6f7ff' }), s('circle', { cx: 50, cy: 8, r: 5, fill: '#e6f7ff' }));
    case 'corniche': return s('g', {}, s('rect', { x: 0, y: 50, width: 100, height: 14, fill: '#1e6fa8' }), s('path', { d: 'M20 50 V24 M80 50 V24', stroke: '#7a5230', 'stroke-width': 3 }), s('path', { d: 'M10 26 Q20 16 30 26 M70 26 Q80 16 90 26', stroke: '#2f7d32', 'stroke-width': 4, fill: 'none' }));
    case 'water_mosque': return s('g', {}, s('rect', { x: 0, y: 54, width: 100, height: 10, fill: '#1e6fa8' }), s('rect', { x: 34, y: 38, width: 32, height: 16, fill: '#f2efe8' }), s('path', { d: 'M38 38 A12 12 0 0 1 62 38 Z', fill: '#4fb3bf' }), s('rect', { x: 68, y: 16, width: 5, height: 38, fill: '#f2efe8' }));
    case 'water_tower': return s('g', {}, s('rect', { x: 47, y: 26, width: 6, height: 36, fill: '#f2efe8' }), s('circle', { cx: 50, cy: 20, r: 11, fill: '#d0e4f2' }), s('path', { d: 'M49 4 L50 0 L51 4 Z', fill: '#f2efe8' }));
    case 'pebbles': return s('g', { fill: '#c9ced6' }, s('ellipse', { cx: 50, cy: 54, rx: 20, ry: 9 }), s('ellipse', { cx: 53, cy: 40, rx: 14, ry: 7 }), s('ellipse', { cx: 48, cy: 28, rx: 11, ry: 6 }), s('ellipse', { cx: 51, cy: 18, rx: 7, ry: 4 }));
    case 'bay': return s('g', {}, s('path', { d: 'M0 64 Q50 30 100 64 Z', fill: '#2bb3c0' }), s('path', { d: 'M0 64 Q50 44 100 64', stroke: '#d9b77e', 'stroke-width': 6, fill: 'none' }));
  }
}

function postcardArt(item: ItemDefinition): SVGSVGElement {
  const lm = item.landmarkId ? landmarkById(item.landmarkId) : undefined;
  const city = item.cityId ? cityById(item.cityId) : undefined;
  const id = `sky${++uid}`;
  const root = s('svg', { viewBox: '0 0 100 80' });
  root.append(
    s('defs', {}, s('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 },
      s('stop', { offset: 0, 'stop-color': '#ff9e5e' }), s('stop', { offset: 1, 'stop-color': '#ffd9a0' }))),
    s('rect', { x: 1, y: 1, width: 98, height: 78, rx: 6, fill: '#fdf6e3', stroke: RARITY_COLORS[item.rarity], 'stroke-width': 2.5 }),
    s('rect', { x: 5, y: 5, width: 90, height: 56, rx: 3, fill: `url(#${id})` }),
    s('g', { transform: 'translate(5 -3) scale(0.9)' }, lm ? landmarkSilhouette(lm.model) : s('g')),
    text(50, 70, 8, '#0b1430', city ? `${city.nameAr} · ${lm?.unesco ? 'تراث عالمي' : 'معلم'}` : '', 700),
  );
  return root;
}

function stampArt(item: ItemDefinition): SVGSVGElement {
  const venue = item.venueId ? venueById(item.venueId) : undefined;
  const city = item.cityId ? cityById(item.cityId) : undefined;
  const root = s('svg', { viewBox: '0 0 100 100' });
  const teeth: string[] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, r = i % 2 ? 46 : 49;
    teeth.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`);
  }
  root.append(
    s('polygon', { points: teeth.join(' '), fill: '#ffd166' }),
    s('circle', { cx: 50, cy: 50, r: 40, fill: item.color, stroke: '#ffffff', 'stroke-width': 2, 'stroke-dasharray': '4 3' }),
    text(50, 40, 11, item.secondaryColor === item.color ? '#ffffff' : item.secondaryColor, city?.nameAr ?? ''),
    text(50, 58, 8, '#ffffff', venue ? `${Math.round(venue.capacity / 1000)} ألف مقعد` : '', 700),
    text(50, 72, 7, '#ffffff', '2027', 700),
  );
  return root;
}

/** Collectible art as an inline SVG element sized by CSS class. */
export function itemArt(item: ItemDefinition, cls = 'item-art'): SVGSVGElement {
  const svg = item.kind === 'team_badge' ? badgeArt(item) : item.kind === 'player_card' ? cardArt(item) : item.kind === 'landmark' ? postcardArt(item) : stampArt(item);
  svg.setAttribute('class', cls);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', item.nameAr);
  return svg;
}

/**
 * Stylised map of Saudi Arabia (simplified outline from approximate border coordinates —
 * illustrative, not cartographic) with host-city pins at their real coordinates.
 */
const OUTLINE: readonly [number, number][] = [
  [34.6, 28.1], [36.0, 29.2], [37.0, 31.5], [39.2, 32.2], [42.0, 31.1], [44.7, 29.2], [46.5, 29.1], [47.7, 28.5],
  [48.4, 27.9], [49.6, 26.9], [50.2, 26.2], [50.8, 24.8], [51.6, 24.3], [52.6, 22.9], [55.2, 22.7], [55.7, 22.0],
  [55.0, 20.0], [52.0, 19.0], [49.1, 18.6], [47.0, 17.0], [46.4, 17.2], [43.4, 17.5], [42.8, 16.4], [41.2, 19.5],
  [40.0, 20.9], [39.1, 21.7], [38.5, 23.6], [37.4, 24.8], [36.6, 26.0], [35.2, 28.0],
];
export const MAP_BOUNDS = { minLon: 34, maxLon: 56.5, minLat: 15.5, maxLat: 33 } as const;
export function project(lon: number, lat: number, w: number, h: number): [number, number] {
  return [((lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) * w, ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * h];
}

export function saudiMap(w: number, h: number): SVGSVGElement {
  const pts = OUTLINE.map(([lon, lat]) => project(lon, lat, w, h).map((v) => v.toFixed(1)).join(',')).join(' ');
  const id = `land${++uid}`;
  return s('svg', { viewBox: `0 0 ${w} ${h}`, class: 'ksa-map', role: 'img', 'aria-label': 'خريطة توضيحية للمملكة والمدن المستضيفة' },
    s('defs', {}, s('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 },
      s('stop', { offset: 0, 'stop-color': '#1d6b45' }), s('stop', { offset: 1, 'stop-color': '#0f3d2a' }))),
    s('rect', { x: 0, y: 0, width: w, height: h, fill: '#0e2a52' }),
    s('polygon', { points: pts, fill: `url(#${id})`, stroke: '#ffd166', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
    // Sea labels sit in open water, clear of the Jeddah and Al Khobar pins.
    text(w * 0.13, h * 0.86, 9, '#7fb3e0', 'البحر الأحمر', 700),
    text(w * 0.86, h * 0.13, 9, '#7fb3e0', 'الخليج العربي', 700));
}
