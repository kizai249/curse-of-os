import type { PlayerContent } from "../content/catalog.js";
import { weighted, type Rng } from "../economy/packs.js";
import { PACK_ODDS, VARIANTS } from "../economy/rules.js";

/**
 * بطاقة لاعب افتراضي عند الفوز (GAME_RULES §4): الندرة بنفس احتمالات §3.3، ومن الشخصيات اللي
 * ما يملكها اللاعب أولًا داخل نفس الندرة. إذا كلها مملوكة ← نسخة مكررة (count + 1).
 */
export function drawPlayerCard(players: readonly PlayerContent[], owned: ReadonlySet<string>, rng: Rng): { playerId: string; duplicate: boolean } {
  const rarity = weighted(VARIANTS, (v) => PACK_ODDS[v], rng);
  const ofRarity = players.filter((p) => p.rarity === rarity);
  const fresh = ofRarity.filter((p) => !owned.has(p.id));
  const from = fresh.length > 0 ? fresh : ofRarity;
  const chosen = from[Math.floor(rng() * from.length)]!;
  return { playerId: chosen.id, duplicate: owned.has(chosen.id) };
}
