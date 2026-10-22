import { PlayerContent, PlayersContent, Position, STAT_KEYS, StatKey } from "../content/catalog.js";
import type { Rng } from "../economy/packs.js";

/**
 * لغز «منتخبنا يجمعنا» — GAME_RULES §7.3–7.4.
 * اللوحة خانات بمراكز، ولكل خانة شرط واحد على إحصاءات القطعة. القطع = قطعة لكل خانة + 3 قطع تمويه.
 * المولّد يضمن **حلًا وحيدًا** (عدد التطابقات الكاملة بين الخانات والقطع = 1) قبل ما يرجع اللغز.
 * «بنك القوالب» (40 في R2) = أنواع الشروط × الإحصاءات الخمس (6 × 5 = 30 قالبًا بقيم متغيرة، و20 قالب «أعلى من»).
 */
export type Requirement =
  | { kind: "atLeast"; stat: StatKey; value: number }
  | { kind: "atMost"; stat: StatKey; value: number }
  | { kind: "greater"; stat: StatKey; than: StatKey }
  | { kind: "highest"; stat: StatKey }
  | { kind: "lowest"; stat: StatKey }
  | { kind: "best"; stat: StatKey };

export const REQUIREMENT_KINDS: readonly Requirement["kind"][] = ["atLeast", "atMost", "greater", "highest", "lowest", "best"];

export interface PuzzleSlot {
  slotId: string;
  position: Position;
  requirement: Requirement;
  text: { ar: string; en: string };
}

export interface Puzzle {
  slots: PuzzleSlot[];
  /** معرّفات القطع (الحل + التمويه) بترتيب عشوائي. */
  pieces: string[];
  solution: Record<string, string>;
}

export const DECOYS = 3;

/** §7.3: 2 ← 6 خانات، و3 ← 8، ومن 4 إلى 6 ← 11. */
export function slotsCountFor(teamSize: number): 6 | 8 | 11 {
  if (teamSize <= 2) return 6;
  if (teamSize === 3) return 8;
  return 11;
}

/** التشكيلة لكل عدد خانات (حارس واحد دائمًا). */
export const FORMATIONS: Record<6 | 8 | 11, Position[]> = {
  6: ["GK", "DEF", "DEF", "MID", "MID", "FWD"],
  8: ["GK", "DEF", "DEF", "DEF", "MID", "MID", "FWD", "FWD"],
  11: ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD"],
};

/** عشوائية من بذرة (mulberry32) — نفس البذرة تعطي نفس اللغز (إعادة الإنتاج في الاختبارات والتحقيق). */
export function seededRng(seed: string): Rng {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)]!;

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** هل القطعة تحقق الشرط؟ «الأعلى/الأقل» تُقارن بقطع نفس المركز في هذي الجولة فقط. */
export function satisfies(req: Requirement, piece: PlayerContent, pool: readonly PlayerContent[]): boolean {
  const v = piece.stats[req.stat];
  const peers = pool.filter((p) => p.position === piece.position && p.id !== piece.id);
  switch (req.kind) {
    case "atLeast": return v >= req.value;
    case "atMost": return v <= req.value;
    case "greater": return v > piece.stats[req.than];
    case "highest": return peers.every((p) => p.stats[req.stat] < v);
    case "lowest": return peers.every((p) => p.stats[req.stat] > v);
    case "best": return STAT_KEYS.every((k) => k === req.stat || piece.stats[k] < v);
  }
}

export function candidatesFor(slot: Pick<PuzzleSlot, "position" | "requirement">, pool: readonly PlayerContent[]): PlayerContent[] {
  return pool.filter((p) => p.position === slot.position && satisfies(slot.requirement, p, pool));
}

/** عدد التطابقات الكاملة (كل خانة قطعة مختلفة)، ويتوقف عند `limit`. */
export function countSolutions(candidates: readonly (readonly string[])[], limit = 2): number {
  const order = candidates.map((c, i) => ({ c, i })).sort((a, b) => a.c.length - b.c.length);
  const used = new Set<string>();
  let count = 0;
  const walk = (k: number): void => {
    if (count >= limit) return;
    if (k === order.length) {
      count++;
      return;
    }
    for (const id of order[k]!.c) {
      if (used.has(id)) continue;
      used.add(id);
      walk(k + 1);
      used.delete(id);
    }
  };
  walk(0);
  return count;
}

/** شرط عشوائي تحققه القطعة الصحيحة (null إذا النوع المختار ما ينطبق عليها). */
function randomRequirement(piece: PlayerContent, pool: readonly PlayerContent[], rng: Rng): Requirement | null {
  const kind = pick(REQUIREMENT_KINDS, rng);
  const stat = pick(STAT_KEYS, rng);
  const v = piece.stats[stat];
  let req: Requirement;
  switch (kind) {
    case "atLeast": req = { kind, stat, value: Math.max(40, Math.floor(v / 5) * 5) }; break;
    case "atMost": req = { kind, stat, value: Math.min(90, Math.ceil(v / 5) * 5) }; break;
    case "greater": {
      const lower = STAT_KEYS.filter((k) => piece.stats[k] < v);
      if (lower.length === 0) return null;
      req = { kind, stat, than: pick(lower, rng) };
      break;
    }
    default: req = { kind, stat };
  }
  return satisfies(req, piece, pool) ? req : null;
}

/** أدق شرط من عدة محاولات (أقل عدد مرشحين) — يقرّب اللغز من الحل الوحيد بدون ما يفقد التنوع. */
function sharpRequirement(slot: { position: Position }, piece: PlayerContent, pool: readonly PlayerContent[], rng: Rng, tries = 10): Requirement {
  let best: Requirement | null = null;
  let bestCount = Infinity;
  for (let i = 0; i < tries * 4 && (best === null || i < tries); i++) {
    const req = randomRequirement(piece, pool, rng);
    if (!req) continue;
    const n = candidatesFor({ position: slot.position, requirement: req }, pool).length;
    if (n < bestCount || (n === bestCount && rng() < 0.5)) {
      best = req;
      bestCount = n;
    }
  }
  // «أعلى إحصائية» مضمونة تقريبًا؛ وإذا ما انطبق شي، شرط حد أدنى على أعلى إحصائية.
  if (!best) {
    const stat = STAT_KEYS.reduce((a, b) => (piece.stats[b] > piece.stats[a] ? b : a));
    best = { kind: "atLeast", stat, value: Math.max(40, Math.floor(piece.stats[stat] / 5) * 5) };
  }
  return best;
}

export function requirementText(req: Requirement, position: Position, content: Pick<PlayersContent, "stats" | "positions">): { ar: string; en: string } {
  const pos = content.positions[position];
  const s = content.stats[req.stat];
  const plural: Record<Position, { ar: string; en: string }> = {
    GK: { ar: "الحراس", en: "goalkeepers" },
    DEF: { ar: "المدافعين", en: "defenders" },
    MID: { ar: "لاعبي الوسط", en: "midfielders" },
    FWD: { ar: "المهاجمين", en: "forwards" },
  };
  switch (req.kind) {
    case "atLeast": return { ar: `${pos.ar}: ${s.ar} ${req.value} أو أكثر`, en: `${pos.en} with ${s.en} ${req.value}+` };
    case "atMost": return { ar: `${pos.ar}: ${s.ar} ${req.value} أو أقل`, en: `${pos.en} with ${s.en} ${req.value} or less` };
    case "greater": {
      const t = content.stats[req.than];
      return { ar: `${pos.ar}: ${s.ar} أعلى من ${t.ar}`, en: `${pos.en} whose ${s.en} is higher than ${t.en}` };
    }
    case "highest": return { ar: `${pos.ar}: الأعلى في ${s.ar} بين ${plural[position].ar}`, en: `${pos.en} with the highest ${s.en} of all ${plural[position].en}` };
    case "lowest": return { ar: `${pos.ar}: الأقل في ${s.ar} بين ${plural[position].ar}`, en: `${pos.en} with the lowest ${s.en} of all ${plural[position].en}` };
    case "best": return { ar: `${pos.ar}: أعلى إحصائية عنده ${s.ar}`, en: `${pos.en} whose best stat is ${s.en}` };
  }
}

const MAX_REFINES = 300;

/** يولّد لغزًا بحل وحيد. يرمي إذا ما قدر خلال المحاولات (المستدعي يعيد ببذرة ثانية). */
export function generatePuzzle(content: PlayersContent, slotsCount: 6 | 8 | 11, rng: Rng): Puzzle {
  const formation = FORMATIONS[slotsCount];
  const byPosition = new Map<Position, PlayerContent[]>();
  for (const p of content.players) byPosition.set(p.position, [...(byPosition.get(p.position) ?? []), p]);

  const need = new Map<Position, number>();
  for (const pos of formation) need.set(pos, (need.get(pos) ?? 0) + 1);
  const chosen = new Map<Position, PlayerContent[]>();
  for (const [pos, n] of need) chosen.set(pos, shuffle(byPosition.get(pos) ?? [], rng).slice(0, n));

  // التمويه من مراكز موجودة في التشكيلة، ومن غير القطع المختارة.
  const pool: PlayerContent[] = [...chosen.values()].flat();
  const spare = shuffle(content.players.filter((p) => need.has(p.position) && !pool.includes(p)), rng);
  pool.push(...spare.slice(0, DECOYS));

  const counters = new Map<Position, number>();
  const slots = formation.map((position) => {
    const i = counters.get(position) ?? 0;
    counters.set(position, i + 1);
    return { slotId: "", position, piece: chosen.get(position)![i]! };
  });
  slots.forEach((s, i) => (s.slotId = `s${i + 1}`));
  const reqs = slots.map((s) => sharpRequirement(s, s.piece, pool, rng));

  for (let iter = 0; iter < MAX_REFINES; iter++) {
    const cands = slots.map((s, i) => candidatesFor({ position: s.position, requirement: reqs[i]! }, pool).map((p) => p.id));
    if (countSolutions(cands) === 1) {
      return {
        slots: slots.map((s, i) => ({ slotId: s.slotId, position: s.position, requirement: reqs[i]!, text: requirementText(reqs[i]!, s.position, content) })),
        pieces: shuffle(pool.map((p) => p.id), rng),
        solution: Object.fromEntries(slots.map((s) => [s.slotId, s.piece.id])),
      };
    }
    const loose = slots.map((_, i) => i).filter((i) => cands[i]!.length > 1);
    const i = pick(loose.length > 0 ? loose : slots.map((_, k) => k), rng);
    reqs[i] = sharpRequirement(slots[i]!, slots[i]!.piece, pool, rng);
  }
  throw new Error("puzzle generation did not converge");
}

/** يحاول ببذور مشتقة لين ينجح (نادرًا يحتاج أكثر من وحدة). */
export function generatePuzzleFromSeed(content: PlayersContent, slotsCount: 6 | 8 | 11, seed: string): Puzzle {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      return generatePuzzle(content, slotsCount, seededRng(`${seed}#${attempt}`));
    } catch {
      // بذرة ثانية.
    }
  }
  throw new Error("puzzle generation failed for seed " + seed);
}

/** عدد الخانات الصحيحة في التشكيلة الموضوعة (§7.5 — يظهر العدد فقط). */
export function correctCount(placements: Record<string, string>, solution: Record<string, string>): number {
  return Object.entries(solution).filter(([slotId, playerId]) => placements[slotId] === playerId).length;
}
