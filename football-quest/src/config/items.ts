import type { ItemDefinition, PlayerPosition, Rarity } from '../domain/types';
import { RARITIES } from '../domain/types';
import { LANDMARKS, TEAMS, VENUES, type TeamDefinition } from './tournament';

/**
 * The collectible catalogue is *generated* from tournament data so a fact changes in one place.
 * Player cards are fictional position cards — no real player names or likenesses are used.
 */

export const POSITION_LABEL_AR: Readonly<Record<PlayerPosition, string>> = {
  GK: 'حارس',
  DF: 'مدافع',
  MF: 'صانع ألعاب',
  FW: 'هدّاف',
};

/** Goalkeepers/defenders drop one rarity tier below their team badge, attackers keep it. */
function cardRarity(team: TeamDefinition, position: PlayerPosition): Rarity {
  if (position === 'MF' || position === 'FW') return team.rarity;
  return RARITIES[Math.max(0, RARITIES.indexOf(team.rarity) - 1)]!;
}

export const teamLabel = (t: TeamDefinition): string => t.nicknameAr ?? t.nameAr;

export function buildCatalog(): ItemDefinition[] {
  const items: ItemDefinition[] = [];
  for (const t of TEAMS) {
    items.push({
      id: `badge_${t.id}`, kind: 'team_badge', modelKey: 'badge', teamId: t.id, rarity: t.rarity,
      nameAr: `شارة ${t.nameAr}`, nameEn: `${t.nameEn} fan badge`,
      descriptionAr: `شارة مشجعين بألوان ${t.nameAr} — المجموعة ${t.group}${t.titles ? ` · بطل آسيا ${t.titles} ${t.titles === 1 ? 'مرة' : 'مرات'}` : ''}.`,
      color: t.colors[0], secondaryColor: t.colors[1],
    });
    for (const pos of ['GK', 'DF', 'MF', 'FW'] as const) {
      items.push({
        id: `card_${t.id}_${pos.toLowerCase()}`, kind: 'player_card', modelKey: 'card', teamId: t.id, position: pos,
        rarity: cardRarity(t, pos),
        nameAr: `${POSITION_LABEL_AR[pos]} ${teamLabel(t)}`, nameEn: `${t.nameEn} ${pos} card`,
        descriptionAr: `بطاقة مركز (${POSITION_LABEL_AR[pos]}) لمنتخب ${t.nameAr}. شخصية خيالية — مو لاعب حقيقي.`,
        color: t.colors[0], secondaryColor: t.colors[1],
      });
    }
  }
  for (const l of LANDMARKS) {
    items.push({
      id: `landmark_${l.id}`, kind: 'landmark', modelKey: 'postcard', landmarkId: l.id, cityId: l.cityId, rarity: l.rarity,
      nameAr: l.nameAr, nameEn: l.nameEn, descriptionAr: l.blurbAr,
      color: '#ffd166', secondaryColor: '#0b1430',
    });
  }
  for (const v of VENUES) {
    items.push({
      id: `stamp_${v.id}`, kind: 'venue_stamp', modelKey: 'stamp', venueId: v.id, cityId: v.cityId, rarity: 'rare',
      nameAr: `ختم ${v.nameAr}`, nameEn: `${v.nameEn} stamp`,
      descriptionAr: `ختم زيارة ${v.nameAr} — يتسع لحوالي ${v.capacity.toLocaleString('en-US')} متفرج.${v.noteAr ? ` ${v.noteAr}.` : ''}`,
      color: v.palette[0], secondaryColor: v.palette[1],
    });
  }
  return items;
}

export const ITEM_CATALOG: readonly ItemDefinition[] = buildCatalog();

/** Items obtainable from random discovery points (landmarks/stamps come only from their place). */
export const RANDOM_DROP_POOL: readonly ItemDefinition[] = ITEM_CATALOG.filter((i) => i.kind === 'team_badge' || i.kind === 'player_card');
