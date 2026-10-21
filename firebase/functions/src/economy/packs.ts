import { MATCHDAY_WEIGHT, PACK_ODDS, PITY_THRESHOLD, Variant, VARIANTS, rank } from "./rules.js";

/** مصدر عشوائية بقيمة في [0، 1). الإنتاج: crypto (randomUnit)، والاختبارات: بذرة. */
export type Rng = () => number;

export type PackKind = "standard" | "epic" | "legendary";

export interface DrawContext {
  kind: PackKind;
  pityCount: number;
  teams: readonly string[];
  /** منتخبات تلعب اليوم (وزن ×3). */
  todayTeams: ReadonlySet<string>;
}

export interface DrawResult {
  teamCode: string;
  variant: Variant;
  pityCount: number;
  pityTriggered: boolean;
}

/** يختار عنصرًا بالأوزان. */
export function weighted<T>(items: readonly T[], weight: (t: T) => number, rng: Rng): T {
  const total = items.reduce((sum, t) => sum + weight(t), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll < 0) return item;
  }
  return items[items.length - 1]!;
}

/**
 * سحب بطاقة منتخب — GAME_RULES §3.2–3.3.
 * - الندرة بالاحتمالات المعلنة 70/22/7/1.
 * - حماية سوء الحظ: إذا مرت 14 حزمة بدون ملحمية أو أعلى، هذي (الـ15) ملحمية أو أعلى.
 * - «حزمة ملحمية/أسطورية مضمونة»: الحد الأدنى للندرة، والسحب فوقه بنفس النسب.
 *   TODO(owner) Q16: تأكيد إن «ملحمية مضمونة» تعني «ملحمية أو أعلى» (7:1) وليست ملحمية بالضبط.
 * - المنتخب بالتساوي، والمنتخبات اللي تلعب اليوم ×3.
 */
export function drawPack(ctx: DrawContext, rng: Rng): DrawResult {
  if (ctx.teams.length === 0) throw new Error("no teams to draw from");
  const pityTriggered = ctx.kind === "standard" && ctx.pityCount >= PITY_THRESHOLD;
  const floor: Variant = ctx.kind === "legendary" ? "legendary" : ctx.kind === "epic" || pityTriggered ? "epic" : "common";
  const eligible = VARIANTS.filter((v) => rank(v) >= rank(floor));
  const variant = weighted(eligible, (v) => PACK_ODDS[v], rng);
  const teamCode = weighted(ctx.teams, (t) => (ctx.todayTeams.has(t) ? MATCHDAY_WEIGHT : 1), rng);
  const isEpicPlus = rank(variant) >= rank("epic");
  return { teamCode, variant, pityCount: isEpicPlus ? 0 : ctx.pityCount + 1, pityTriggered };
}
