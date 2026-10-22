import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onCall } from "firebase-functions/v2/https";
import { REGION, isEmulator } from "../shared/config.js";
import { fail } from "../shared/errors.js";
import { ClientMeta, writeEvent } from "../shared/events.js";
import { gameDayId } from "../shared/gameDay.js";
import { balancesOf, Balances, grantXp, readWallet, walletPatch } from "../economy/wallet.js";
import { accuracyBand, distanceM, isInside, isValidCoordinate } from "../location/geo.js";
import { checkIssue, IssueBlock, IssuedCoupon, liveCampaigns, writeIssue } from "../coupons/issue.js";
import { verifyBranchCode } from "./codes.js";
import { streakReward, streakRewardsOn } from "./streak.js";
import { cryptoRng } from "../economy/wallet.js";
import { grantPlayerCard } from "../coop/playerCards.js";
import type { Rng } from "../economy/packs.js";

export const BRANCH_CODE_SECRET = defineSecret("BRANCH_CODE_SECRET");

/** مكافأة الزيارة المحققة — GAME_RULES §6.3. */
export const VERIFIED_VISIT_REWARD = { xp: 30, packs: 1 } as const;

export interface ScanInput extends ClientMeta {
  code?: string;
  lat?: number;
  lng?: number;
  accuracyM?: number;
  isMock?: boolean;
}

export interface CampaignNote {
  campaignId: string;
  title: { ar: string; en: string };
  reason: IssueBlock | "need_location";
}

export interface StreakResult {
  brandId: string;
  count: number;
  /** null إذا ما وصلت السلسلة يوم مكافأة اليوم. */
  reward: {
    day: number;
    packs: number;
    epicPacks: number;
    playerCardId: string | null;
    playerCardName: { ar: string; en: string } | null;
    couponIssued: boolean;
  } | null;
}

export interface ScanResult {
  status: "verified" | "checked_in" | "already";
  visitId: string;
  branch: { branchId: string; brandId: string; name: { ar: string; en: string }; brandName: { ar: string; en: string } };
  verified: boolean;
  rewards: { xp: number; packs: number };
  coupons: IssuedCoupon[];
  campaignNotes: CampaignNote[];
  /** سلسلة الزيارات للعلامة (الزيارة المحققة فقط) — GAME_RULES §6.4. */
  streak: StreakResult | null;
  balances: Balances;
}

function dayBefore(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * scanBranchCode — ARCHITECTURE §6.1 وGAME_RULES §6.3:
 * - رمز صالح لليوم + فرع نشط ← تسجيل حضور يفتح الغرف والمهام.
 * - مع موقع Foreground مقبول داخل منطقة الفرع وقت المسح ← زيارة محققة: حزمة + 30 XP، وحدث
 *   `branch_visit_verified`، وأهلية حملات `verified_visit`.
 * - النتيجة مخزنة بمفتاح uid_branchId_day: إعادة المسح ترجع نفس النتيجة بدون مكافأة ولا حدث إضافي.
 * - الإحداثيات تُستخدم للمقارنة فقط وما تُخزن.
 */
export async function handleScan(uid: string, input: ScanInput, secret: string, now: Date = new Date(), rng: Rng = cryptoRng): Promise<ScanResult> {
  const day = gameDayId(now);
  const check = verifyBranchCode(secret, input?.code, day);
  if (!check.ok) fail("failed-precondition", "QR_INVALID");
  const branchId = check.branchId;
  const db = getFirestore();
  const branchSnap = await db.doc(`branches/${branchId}`).get();
  if (!branchSnap.exists) fail("failed-precondition", "QR_INVALID");
  if (branchSnap.get("active") !== true) fail("failed-precondition", "QR_BRANCH_INACTIVE");
  const branch = branchSnap.data()!;
  const branchInfo = { branchId, brandId: branch.brandId, name: branch.name, brandName: branch.brandName };

  // التحقق من الموقع (اختياري): داخل منطقة الفرع وقت المسح.
  let verified = false;
  let band: string | null = null;
  if (isValidCoordinate(input.lat, input.lng) && typeof input.accuracyM === "number" && input.isMock !== true) {
    band = accuracyBand(input.accuracyM);
    const zone = branch.zoneId ? await db.doc(`zones/${branch.zoneId}`).get() : null;
    if (zone?.exists && zone.get("active") === true) {
      const z = zone.data()!;
      verified = isInside(distanceM(input.lat!, input.lng!, z.center.lat, z.center.lng), z.radiusM, input.accuracyM);
    }
  }

  const campaigns = verified ? await liveCampaigns(branchId, "verified_visit", now) : [];
  const pendingNotes = verified ? [] : await liveCampaigns(branchId, "verified_visit", now);
  const streakCampaigns = verified && streakRewardsOn() ? await liveCampaigns(branchId, "visit_streak", now) : [];
  const visitId = `${uid}_${branchId}_${day}`;

  return db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`);
    const visitRef = db.doc(`visits/${visitId}`);
    const [userSnap, visitSnap] = await Promise.all([tx.get(userRef), tx.get(visitRef)]);
    if (!userSnap.exists) fail("failed-precondition", "NEEDS_ONBOARDING");
    if (userSnap.get("deletionRequestedAt")) fail("failed-precondition", "ACCOUNT_DELETION_PENDING");

    if (visitSnap.exists) {
      // QR_ALREADY_TODAY: نفس النتيجة، بدون مكافأة أو حدث إضافي (AT-03).
      const stored = visitSnap.get("result") as ScanResult;
      return { ...stored, status: "already" as const, rewards: { xp: 0, packs: 0 }, coupons: [], balances: balancesOf(readWallet(userSnap.data()!)) };
    }

    const issueChecks = await Promise.all(campaigns.map((c) => checkIssue(tx, c, branchId, uid)));

    let wallet = readWallet(userSnap.data()!);
    const user = userSnap.data()!;
    const rewards = { xp: 0, packs: 0 };
    let streakCount = 0;
    let firstVisitToBrand = false;
    let streak: StreakResult | null = null;
    const streaks = { ...(user.streaks ?? {}) } as Record<string, { count: number; lastDay: string }>;
    let previousCount = 0;
    if (verified) {
      // سلسلة الزيارات لكل علامة (GAME_RULES §6.4): أيام متتالية بزيارة محققة لأي فرع من نفس العلامة.
      const previous = streaks[branch.brandId];
      firstVisitToBrand = !previous;
      if (previous?.lastDay === day) streakCount = previous.count;
      else streakCount = previous?.lastDay === dayBefore(day) ? previous.count + 1 : 1;
      previousCount = previous?.lastDay === day ? previous.count : streakCount - 1;
      streaks[branch.brandId] = { count: streakCount, lastDay: day };
    }
    const reward = verified && streakRewardsOn() ? streakReward(previousCount, streakCount) : null;
    // قسيمة اليوم 7: قراءات المخزون والحد قبل أي كتابة في المعاملة.
    const streakChecks = reward?.coupon ? await Promise.all(streakCampaigns.map((c) => checkIssue(tx, c, branchId, uid))) : [];

    if (verified) {
      wallet = grantXp({ ...wallet, packs: wallet.packs + VERIFIED_VISIT_REWARD.packs }, VERIFIED_VISIT_REWARD.xp, day);
      rewards.xp = VERIFIED_VISIT_REWARD.xp;
      rewards.packs = VERIFIED_VISIT_REWARD.packs;
      streak = { brandId: branch.brandId, count: streakCount, reward: null };
    }
    let ownedPlayers = user.ownedPlayers as string[] | undefined;
    if (reward && streak) {
      wallet = {
        ...wallet,
        packs: wallet.packs + reward.packs,
        packsGuaranteed: { ...wallet.packsGuaranteed, epic: wallet.packsGuaranteed.epic + reward.epicPacks },
      };
      const card = reward.playerCard ? grantPlayerCard(tx, uid, ownedPlayers, rng, now, "rare") : null;
      if (card) ownedPlayers = card.ownedPlayers;
      streak.reward = {
        day: reward.day,
        packs: reward.packs,
        epicPacks: reward.epicPacks,
        playerCardId: card?.playerId ?? null,
        playerCardName: card?.name ?? null,
        couponIssued: false,
      };
    }

    const coupons: IssuedCoupon[] = [];
    const notes: CampaignNote[] = pendingNotes.map((c) => ({ campaignId: c.id, title: c.data.title, reason: "need_location" as const }));
    for (const ic of issueChecks) {
      if (ic.block) notes.push({ campaignId: ic.campaign.id, title: ic.campaign.data.title, reason: ic.block });
      else coupons.push(writeIssue(tx, ic, uid, branchId, { trigger: "verified_visit", visitId }, now));
    }
    for (const ic of streakChecks) {
      if (ic.block) notes.push({ campaignId: ic.campaign.id, title: ic.campaign.data.title, reason: ic.block });
      else {
        coupons.push(writeIssue(tx, ic, uid, branchId, { trigger: "visit_streak", visitId, streakCount }, now));
        if (streak?.reward) streak.reward.couponIssued = true;
      }
    }

    const result: ScanResult = {
      status: verified ? "verified" : "checked_in",
      visitId,
      branch: branchInfo,
      verified,
      rewards,
      // الرموز الصريحة ما تُخزن في مستند الزيارة.
      coupons: [],
      campaignNotes: notes,
      streak,
      balances: balancesOf(wallet),
    };
    tx.create(visitRef, {
      uid,
      branchId,
      brandId: branch.brandId,
      day,
      verified,
      accuracyBand: band,
      scannedAt: Timestamp.fromDate(now),
      result,
    });
    tx.update(userRef, { ...walletPatch(wallet), streaks, ...(ownedPlayers ? { ownedPlayers } : {}) });
    if (verified) {
      writeEvent(tx, "branch_visit_verified", uid, user.city ?? null, input, {
        branchId,
        brandId: branch.brandId,
        visitId,
        accuracyBand: band,
        streakCount,
        firstVisitToBrand,
      }, now);
    }
    return { ...result, coupons };
  });
}

export const scanBranchCode = onCall<ScanInput>(
  { region: REGION, enforceAppCheck: !isEmulator(), secrets: [BRANCH_CODE_SECRET] },
  async (request) => {
    if (!request.auth) fail("unauthenticated", "AUTH_REQUIRED");
    return handleScan(request.auth!.uid, request.data, BRANCH_CODE_SECRET.value());
  },
);
