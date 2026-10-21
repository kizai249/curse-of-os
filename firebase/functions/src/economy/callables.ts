import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { authedCallable } from "../shared/callable.js";
import { fail } from "../shared/errors.js";
import { gameDayId } from "../shared/gameDay.js";
import { loadStadiums } from "../content/catalog.js";
import { AchievementReward } from "./achievements.js";
import { loadEconomyContent } from "./content.js";
import { drawPack, PackKind, Rng } from "./packs.js";
import { DIGITAL_VISIT_XP, EXCHANGE_COST, isVariant, Variant } from "./rules.js";
import {
  applyCard,
  Balances,
  balancesOf,
  CardGain,
  cryptoRng,
  dailyFor,
  grantXp,
  readWallet,
  requestRef,
  walletPatch,
} from "./wallet.js";

export interface CardResult {
  status: "ok";
  card: CardGain;
  pityTriggered: boolean;
  achievements: AchievementReward[];
  balances: Balances;
}

function userDoc(uid: string) {
  return getFirestore().doc(`users/${uid}`);
}

function requireProfile(snap: FirebaseFirestore.DocumentSnapshot): FirebaseFirestore.DocumentData {
  if (!snap.exists) fail("failed-precondition", "NEEDS_ONBOARDING");
  const data = snap.data()!;
  if (data.deletionRequestedAt) fail("failed-precondition", "ACCOUNT_DELETION_PENDING");
  return data;
}

/** openPack — GAME_RULES §3.2–3.5. `kind`: standard (packs)، أو epic/legendary (packsGuaranteed). */
export async function handleOpenPack(
  uid: string,
  input: { requestId?: string; kind?: PackKind },
  now: Date = new Date(),
  rng: Rng = cryptoRng,
): Promise<CardResult> {
  const db = getFirestore();
  const kind: PackKind = input?.kind ?? "standard";
  if (!["standard", "epic", "legendary"].includes(kind)) fail("invalid-argument", "INVALID_PACK_KIND");
  const reqRef = requestRef(db, uid, input?.requestId);
  const day = gameDayId(now);
  const content = await loadEconomyContent(day);

  return db.runTransaction(async (tx) => {
    const [userSnap, reqSnap] = await Promise.all([tx.get(userDoc(uid)), tx.get(reqRef)]);
    if (reqSnap.exists) return reqSnap.get("result") as CardResult;
    let wallet = readWallet(requireProfile(userSnap));

    const available = kind === "standard" ? wallet.packs : wallet.packsGuaranteed[kind];
    if (available <= 0) fail("failed-precondition", "NO_PACKS");

    const draw = drawPack({ kind, pityCount: wallet.pityCount, teams: content.teams, todayTeams: content.todayTeams }, rng);
    const cardSnap = await tx.get(db.doc(`users/${uid}/teamCards/${draw.teamCode}_${draw.variant}`));

    if (kind === "standard") wallet = { ...wallet, packs: wallet.packs - 1 };
    else wallet = { ...wallet, packsGuaranteed: { ...wallet.packsGuaranteed, [kind]: wallet.packsGuaranteed[kind] - 1 } };
    wallet = { ...wallet, pityCount: draw.pityCount };

    const applied = applyCard(tx, cardSnap, wallet, draw.teamCode, draw.variant, day, content.groups, now);
    const result: CardResult = {
      status: "ok",
      card: applied.gain,
      pityTriggered: draw.pityTriggered,
      achievements: applied.rewards,
      balances: balancesOf(applied.wallet),
    };
    tx.update(userSnap.ref, walletPatch(applied.wallet));
    tx.create(reqRef, { fn: "openPack", result, at: Timestamp.fromDate(now) });
    return result;
  });
}

/** exchangeFanPoints — §3.4: 100 FP ← شائعة مختارة، و300 FP ← نادرة مختارة. للنسخ غير المملوكة فقط. */
export async function handleExchange(
  uid: string,
  input: { requestId?: string; teamCode?: string; variant?: string },
  now: Date = new Date(),
): Promise<CardResult> {
  const db = getFirestore();
  const reqRef = requestRef(db, uid, input?.requestId);
  const variant = input?.variant;
  if (!isVariant(variant) || EXCHANGE_COST[variant] === undefined) fail("invalid-argument", "VARIANT_NOT_EXCHANGEABLE");
  const cost = EXCHANGE_COST[variant as Variant]!;
  const day = gameDayId(now);
  const content = await loadEconomyContent(day);
  const teamCode = input.teamCode;
  if (typeof teamCode !== "string" || !content.teams.includes(teamCode)) fail("invalid-argument", "INVALID_TEAM");

  return db.runTransaction(async (tx) => {
    const [userSnap, reqSnap] = await Promise.all([tx.get(userDoc(uid)), tx.get(reqRef)]);
    if (reqSnap.exists) return reqSnap.get("result") as CardResult;
    const wallet = readWallet(requireProfile(userSnap));
    const cardSnap = await tx.get(db.doc(`users/${uid}/teamCards/${teamCode}_${variant}`));
    if (cardSnap.exists) fail("failed-precondition", "ALREADY_OWNED");
    if (wallet.fanPoints < cost) fail("failed-precondition", "NOT_ENOUGH_FP", { cost, fanPoints: wallet.fanPoints });

    const applied = applyCard(tx, cardSnap, { ...wallet, fanPoints: wallet.fanPoints - cost },
      teamCode, variant as Variant, day, content.groups, now);
    const result: CardResult = {
      status: "ok",
      card: applied.gain,
      pityTriggered: false,
      achievements: applied.rewards,
      balances: balancesOf(applied.wallet),
    };
    tx.update(userSnap.ref, walletPatch(applied.wallet));
    tx.create(reqRef, { fn: "exchangeFanPoints", result, at: Timestamp.fromDate(now) });
    return result;
  });
}

export interface VisitResult {
  status: "ok" | "already_visited";
  xpGained: number;
  visitedToday: string[];
  balances: Balances;
}

/** stadiumVisit — §2.2: +5 XP لكل ملعب مرة يوميًا (حد 8 = 40 XP). Idempotent بطبيعته (مرة لكل يوم). */
export async function handleStadiumVisit(uid: string, input: { stadiumId?: string }, now: Date = new Date()): Promise<VisitResult> {
  const stadiumId = input?.stadiumId;
  if (typeof stadiumId !== "string" || !loadStadiums().some((s) => s.id === stadiumId)) fail("invalid-argument", "INVALID_STADIUM");
  const day = gameDayId(now);
  const db = getFirestore();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userDoc(uid));
    let wallet = readWallet(requireProfile(snap));
    const daily = dailyFor(wallet, day);
    if (daily.stadiums.includes(stadiumId)) {
      return { status: "already_visited" as const, xpGained: 0, visitedToday: daily.stadiums, balances: balancesOf(wallet) };
    }
    wallet = grantXp({ ...wallet, daily: { ...daily, stadiums: [...daily.stadiums, stadiumId] } }, DIGITAL_VISIT_XP, day);
    tx.update(snap.ref, walletPatch(wallet));
    return { status: "ok" as const, xpGained: DIGITAL_VISIT_XP, visitedToday: wallet.daily.stadiums, balances: balancesOf(wallet) };
  });
}

export const openPack = authedCallable<{ requestId?: string; kind?: PackKind }, CardResult>(async (req) =>
  handleOpenPack(req.auth.uid, req.data),
);

export const exchangeFanPoints = authedCallable<{ requestId?: string; teamCode?: string; variant?: string }, CardResult>(
  async (req) => handleExchange(req.auth.uid, req.data),
);

export const stadiumVisit = authedCallable<{ stadiumId?: string }, VisitResult>(async (req) =>
  handleStadiumVisit(req.auth.uid, req.data),
);
