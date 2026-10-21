/**
 * أرقام الاقتصاد كما في GAME_RULES.md v1.0 — مصدرها الوحيد في الخادم.
 * `pack_odds` في Remote Config للعرض فقط (ARCHITECTURE §7)، والقيم هنا هي اللي تُطبَّق.
 */
export const VARIANTS = ["common", "rare", "epic", "legendary"] as const;
export type Variant = (typeof VARIANTS)[number];

/** §3.3 — بالنسبة المئوية. */
export const PACK_ODDS: Record<Variant, number> = { common: 70, rare: 22, epic: 7, legendary: 1 };

/** §3.3 — بعد 14 حزمة متتالية بدون ملحمية أو أعلى، الـ15 مضمونة ملحمية. */
export const PITY_THRESHOLD = 14;

/** §3.3 — وزن المنتخب اللي يلعب اليوم. */
export const MATCHDAY_WEIGHT = 3;

/** §3.4 — تحويل النسخة المكررة. */
export const DUPLICATE_FP: Record<Variant, number> = { common: 10, rare: 25, epic: 60, legendary: 150 };

/** §3.4 — الاستبدال (الملحمية والأسطورية ما تُستبدل). */
export const EXCHANGE_COST: Partial<Record<Variant, number>> = { common: 100, rare: 300 };

/** §9.1–9.2 */
export const MAX_LEVEL = 30;
export const DAILY_XP_CAP = 600;

/** §10 */
export const DAILY_LOGIN = { xp: 10, packs: 1 } as const;
export const DIGITAL_VISIT_XP = 5;

/** §3.5 */
export const ACHIEVEMENTS = {
  teams6: { id: "teams_6", teams: 6, packs: 2, xp: 0 },
  teams12: { id: "teams_12", teams: 12, packs: 3, xp: 50 },
  teams24: { id: "teams_24", teams: 24, packs: 0, xp: 300, badge: "asia_collector" },
} as const;
export const GROUP_ACHIEVEMENT_PREFIX = "group_";

export const isVariant = (v: unknown): v is Variant => typeof v === "string" && (VARIANTS as readonly string[]).includes(v);
export const rank = (v: Variant): number => VARIANTS.indexOf(v);
