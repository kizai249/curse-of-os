import type { ItemKind, Rarity } from '../domain/types';

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  common: 'عادية',
  rare: 'نادرة',
  epic: 'ملحمية',
  legendary: 'أسطورية',
};

export const KIND_LABEL: Readonly<Record<ItemKind, string>> = {
  team_badge: 'شارة منتخب',
  player_card: 'بطاقة لاعب',
  landmark: 'بطاقة معلم',
  venue_stamp: 'ختم ملعب',
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
