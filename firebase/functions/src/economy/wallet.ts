import { randomInt } from "node:crypto";
import { FieldValue, Timestamp, Transaction } from "firebase-admin/firestore";
import { fail } from "../shared/errors.js";
import { AchievementReward, newAchievements } from "./achievements.js";
import { addXp, XpState } from "./progression.js";
import { DUPLICATE_FP, Variant } from "./rules.js";
import type { Rng } from "./packs.js";

/** عشوائية الإنتاج (crypto) بقيمة في [0، 1). */
export const cryptoRng: Rng = () => randomInt(0, 2 ** 47) / 2 ** 47;

/**
 * حالة اللاعب الاقتصادية كما تُقرأ من users/{uid}. الحقول الإضافية على DATA_CONTRACTS §1 (Q15):
 * `packsGuaranteed`، و`ownedTeams`، و`achievements`، و`badges`، و`daily`.
 */
export interface Wallet extends XpState {
  packs: number;
  packsGuaranteed: { epic: number; legendary: number };
  fanPoints: number;
  pityCount: number;
  ownedTeams: string[];
  achievements: string[];
  badges: string[];
  daily: { day: string; login: boolean; stadiums: string[] };
}

export function readWallet(data: FirebaseFirestore.DocumentData): Wallet {
  return {
    xp: data.xp ?? 0,
    level: data.level ?? 1,
    xpDay: data.xpDay ?? { day: "", value: 0 },
    packs: data.packs ?? 0,
    packsGuaranteed: { epic: data.packsGuaranteed?.epic ?? 0, legendary: data.packsGuaranteed?.legendary ?? 0 },
    fanPoints: data.fanPoints ?? 0,
    pityCount: data.pityCount ?? 0,
    ownedTeams: data.ownedTeams ?? [],
    achievements: data.achievements ?? [],
    badges: data.badges ?? [],
    daily: data.daily ?? { day: "", login: false, stadiums: [] },
  };
}

/** يعيد ضبط مطالبات اليوم عند بداية يوم لعبة جديد (04:00 الرياض). */
export function dailyFor(wallet: Wallet, day: string): Wallet["daily"] {
  return wallet.daily.day === day ? wallet.daily : { day, login: false, stadiums: [] };
}

export function grantXp(wallet: Wallet, amount: number, day: string): Wallet {
  if (amount === 0) return wallet;
  const { next } = addXp(wallet, amount, day);
  return { ...wallet, ...next };
}

export interface Balances {
  packs: number;
  epicPacks: number;
  legendaryPacks: number;
  fanPoints: number;
  xp: number;
  level: number;
  pityCount: number;
}

export const balancesOf = (w: Wallet): Balances => ({
  packs: w.packs,
  epicPacks: w.packsGuaranteed.epic,
  legendaryPacks: w.packsGuaranteed.legendary,
  fanPoints: w.fanPoints,
  xp: w.xp,
  level: w.level,
  pityCount: w.pityCount,
});

export const walletPatch = (w: Wallet) => ({
  xp: w.xp,
  level: w.level,
  xpDay: w.xpDay,
  packs: w.packs,
  packsGuaranteed: w.packsGuaranteed,
  fanPoints: w.fanPoints,
  pityCount: w.pityCount,
  ownedTeams: w.ownedTeams,
  achievements: w.achievements,
  badges: w.badges,
  daily: w.daily,
});

export interface CardGain {
  teamCode: string;
  variant: Variant;
  duplicate: boolean;
  fanPointsGained: number;
  newTeam: boolean;
}

/**
 * يضيف بطاقة منتخب داخل المعاملة: نسخة جديدة ← teamCards، ومكررة ← نقاط مشجع (§3.4).
 * ثم يقيّم الإنجازات (§3.5) ويمنح مكافآتها. لازم `cardSnap` يُقرأ قبل أي كتابة في نفس المعاملة.
 */
export function applyCard(
  tx: Transaction,
  cardSnap: FirebaseFirestore.DocumentSnapshot,
  wallet: Wallet,
  teamCode: string,
  variant: Variant,
  day: string,
  groups: ReadonlyMap<string, ReadonlySet<string>>,
  now: Date,
): { wallet: Wallet; gain: CardGain; rewards: AchievementReward[] } {
  let next = { ...wallet };
  const duplicate = cardSnap.exists;
  if (duplicate) {
    tx.update(cardSnap.ref, { count: FieldValue.increment(1), lastAt: Timestamp.fromDate(now) });
    next.fanPoints += DUPLICATE_FP[variant];
  } else {
    tx.create(cardSnap.ref, { teamCode, variant, count: 1, firstAt: Timestamp.fromDate(now) });
  }
  const newTeam = !next.ownedTeams.includes(teamCode);
  if (newTeam) next.ownedTeams = [...next.ownedTeams, teamCode].sort();

  const rewards = newAchievements(new Set(next.ownedTeams), new Set(next.achievements), groups);
  for (const r of rewards) {
    next.achievements = [...next.achievements, r.id];
    next.packs += r.packs;
    next.packsGuaranteed = { ...next.packsGuaranteed, epic: next.packsGuaranteed.epic + r.epicPacks };
    if (r.badge) next.badges = [...next.badges, r.badge];
    next = grantXp(next, r.xp, day);
  }
  return {
    wallet: next,
    gain: { teamCode, variant, duplicate, fanPointsGained: duplicate ? DUPLICATE_FP[variant] : 0, newTeam },
    rewards,
  };
}

const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** مرجع منع التكرار لطلب يغير رصيدًا (ARCHITECTURE §5: requestId + Transaction). */
export function requestRef(db: FirebaseFirestore.Firestore, uid: string, requestId: unknown): FirebaseFirestore.DocumentReference {
  if (typeof requestId !== "string" || !REQUEST_ID.test(requestId)) fail("invalid-argument", "INVALID_REQUEST_ID");
  return db.doc(`users/${uid}/requests/${requestId}`);
}
