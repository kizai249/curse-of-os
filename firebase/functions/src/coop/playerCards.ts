import { FieldValue, getFirestore, Timestamp, Transaction } from "firebase-admin/firestore";
import { loadPlayers, type PlayerContent } from "../content/catalog.js";
import { weighted, type Rng } from "../economy/packs.js";
import { PACK_ODDS, rank, Variant, VARIANTS } from "../economy/rules.js";

/**
 * بطاقة لاعب افتراضي (GAME_RULES §4): الندرة بنفس احتمالات §3.3 فوق حد أدنى اختياري (`floor` —
 * «نادرة أو أعلى» في اليوم 5 من السلسلة)، ومن الشخصيات اللي ما يملكها اللاعب أولًا داخل الندرة.
 * إذا كلها مملوكة ← نسخة مكررة (count + 1).
 */
export function drawPlayerCard(players: readonly PlayerContent[], owned: ReadonlySet<string>, rng: Rng, floor: Variant = "common"): { playerId: string; duplicate: boolean } {
  const rarity = weighted(VARIANTS.filter((v) => rank(v) >= rank(floor)), (v) => PACK_ODDS[v], rng);
  const ofRarity = players.filter((p) => p.rarity === rarity);
  const fresh = ofRarity.filter((p) => !owned.has(p.id));
  const from = fresh.length > 0 ? fresh : ofRarity;
  const chosen = from[Math.floor(rng() * from.length)]!;
  return { playerId: chosen.id, duplicate: owned.has(chosen.id) };
}

let cache: PlayerContent[] | null = null;
const allPlayers = () => (cache ??= loadPlayers().players);

export interface GrantedPlayerCard {
  playerId: string;
  name: { ar: string; en: string };
  duplicate: boolean;
  /** القيمة الجديدة لـ `users/{uid}.ownedPlayers` (يكتبها المستدعي مع باقي تحديث الملف). */
  ownedPlayers: string[];
}

/** يكتب البطاقة في `users/{uid}/playerCards/{playerId}` داخل المعاملة (بدون قراءة — المملوك من ownedPlayers). */
export function grantPlayerCard(tx: Transaction, uid: string, ownedPlayers: readonly string[] | undefined, rng: Rng, now: Date, floor: Variant = "common"): GrantedPlayerCard {
  const owned = new Set(ownedPlayers ?? []);
  const card = drawPlayerCard(allPlayers(), owned, rng, floor);
  const ref = getFirestore().doc(`users/${uid}/playerCards/${card.playerId}`);
  if (card.duplicate) tx.update(ref, { count: FieldValue.increment(1), lastAt: Timestamp.fromDate(now) });
  else tx.set(ref, { playerId: card.playerId, count: 1, firstAt: Timestamp.fromDate(now) });
  owned.add(card.playerId);
  const character = allPlayers().find((p) => p.id === card.playerId)!;
  return { playerId: card.playerId, name: { ar: character.ar, en: character.en }, duplicate: card.duplicate, ownedPlayers: [...owned].sort() };
}
