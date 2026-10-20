import { SQUAD_CONFIG, type SquadConfig } from '../config/minigames';
import { teamById } from '../config/tournament';
import type { ItemDefinition, PlayerPosition } from '../domain/types';

/** Formation slots. FLEX accepts any position at a reduced fit bonus. */
export const SQUAD_SLOTS = ['GK', 'DF', 'MF', 'FW', 'FLEX'] as const;
export type SquadSlot = (typeof SQUAD_SLOTS)[number];

export type SquadLineup = Readonly<Partial<Record<SquadSlot, ItemDefinition>>>;

export interface SquadScore {
  readonly rarity: number;
  readonly fit: number;
  readonly sameTeam: number;
  readonly sameGroup: number;
  readonly total: number;
  /** Pairs of slots that are linked (same team or same group), for drawing chemistry lines. */
  readonly links: readonly { a: SquadSlot; b: SquadSlot; kind: 'team' | 'group' }[];
}

/** Validates a lineup: only player cards, each card at most once, and only cards the player owns. */
export function validateLineup(lineup: SquadLineup, owns: (itemId: string) => boolean): string | null {
  const seen = new Set<string>();
  for (const slot of SQUAD_SLOTS) {
    const card = lineup[slot];
    if (!card) continue;
    if (card.kind !== 'player_card' || !card.position) return 'not_a_player';
    if (seen.has(card.id)) return 'duplicate_card';
    if (!owns(card.id)) return 'not_owned';
    seen.add(card.id);
  }
  return null;
}

function fitFor(slot: SquadSlot, position: PlayerPosition | undefined, c: SquadConfig): number {
  if (!position) return 0;
  if (slot === 'FLEX') return c.flexFitBonus;
  return slot === position ? c.fitBonus : 0;
}

/** Pure scoring: rarity value + position fit + chemistry between every pair of picked cards. */
export function scoreSquad(lineup: SquadLineup, c: SquadConfig = SQUAD_CONFIG): SquadScore {
  let rarity = 0, fit = 0, sameTeam = 0, sameGroup = 0;
  const links: { a: SquadSlot; b: SquadSlot; kind: 'team' | 'group' }[] = [];
  const filled = SQUAD_SLOTS.filter((s) => lineup[s]);
  for (const slot of filled) {
    const card = lineup[slot]!;
    rarity += c.rarityValue[card.rarity];
    fit += fitFor(slot, card.position, c);
  }
  for (let i = 0; i < filled.length; i++) {
    for (let j = i + 1; j < filled.length; j++) {
      const a = lineup[filled[i]!]!, b = lineup[filled[j]!]!;
      if (a.teamId && a.teamId === b.teamId) {
        sameTeam += c.sameTeamBonus;
        links.push({ a: filled[i]!, b: filled[j]!, kind: 'team' });
      } else if (a.teamId && b.teamId && teamById(a.teamId)?.group === teamById(b.teamId)?.group) {
        sameGroup += c.sameGroupBonus;
        links.push({ a: filled[i]!, b: filled[j]!, kind: 'group' });
      }
    }
  }
  return { rarity, fit, sameTeam, sameGroup, total: rarity + fit + sameTeam + sameGroup, links };
}

/** Theoretical ceiling, used by the session to reject impossible submitted scores. */
export function squadMaxScore(c: SquadConfig = SQUAD_CONFIG): number {
  const slots = SQUAD_SLOTS.length;
  const pairs = (slots * (slots - 1)) / 2;
  return slots * c.rarityValue.legendary + (slots - 1) * c.fitBonus + c.flexFitBonus + pairs * Math.max(c.sameTeamBonus, c.sameGroupBonus);
}
