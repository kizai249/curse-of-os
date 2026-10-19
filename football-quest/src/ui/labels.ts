import type { ItemCategory, ModelKey, Rarity } from '../domain/types';

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  common: 'عادية',
  rare: 'نادرة',
  epic: 'ملحمية',
  legendary: 'أسطورية',
};

export const CATEGORY_LABEL: Readonly<Record<ItemCategory, string>> = {
  ball: 'كرة',
  boots: 'حذاء',
  gloves: 'قفازات',
  kit: 'طقم',
  gear: 'معدات',
  trophy: 'كأس',
  card: 'بطاقة لاعب',
};

/** Fallback icons when 3D thumbnails can't be generated (no WebGL). */
export const MODEL_EMOJI: Readonly<Record<ModelKey, string>> = {
  ball: '⚽', boots: '👟', gloves: '🧤', kit: '👕', scarf: '🧣', cone: '🔺', whistle: '📯', trophy: '🏆', card: '🃏',
};

export const fmt = (n: number): string => Math.round(n).toLocaleString('en-US');

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د`;
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
