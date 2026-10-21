import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { authedCallable } from "../shared/callable.js";
import { fail } from "../shared/errors.js";
import { gameDayId } from "../shared/gameDay.js";
import { balancesOf, Balances, dailyFor, grantXp, readWallet, walletPatch } from "../economy/wallet.js";
import { accuracyBand, distanceM, isInside, isValidCoordinate, MAX_ACCURACY_M, neighborhood } from "./geo.js";

/** مكافآت القرب — GAME_RULES §6.2. */
export const STADIUM_ZONE_REWARD = { xp: 20, packs: 1 } as const;
export const BRANCH_ZONE_REWARD = { xp: 10 } as const;

export interface PresenceInput {
  lat?: number;
  lng?: number;
  accuracyM?: number;
  isMock?: boolean;
  platform?: "ios" | "android";
}

export interface StadiumHit {
  stadiumId: string;
  rewarded: boolean;
  xp: number;
  packs: number;
}

export interface BranchHit {
  branchId: string;
  brandId: string;
  name: { ar: string; en: string };
  brandName: { ar: string; en: string };
  zoneRadiusM: number;
  activeCampaigns: number;
  rewarded: boolean;
  xp: number;
}

export interface PresenceResult {
  status: "ok" | "weak_signal" | "unverifiable";
  accuracyBand: string;
  stadiums: StadiumHit[];
  branches: BranchHit[];
  balances: Balances | null;
}

/**
 * verifyPresence — ARCHITECTURE §2.1 و§5. يقارن القراءة بالمناطق القريبة ويحفظ **النتيجة فقط**
 * (أي ملعب/فرع ومُنحت المكافأة أم لا). الإحداثيات ما تُكتب في أي مستند ولا سجل (PRODUCT_BRIEF ت6، AT-10).
 */
export async function handleVerifyPresence(uid: string, input: PresenceInput, now: Date = new Date()): Promise<PresenceResult> {
  const { lat, lng, accuracyM } = input ?? {};
  if (!isValidCoordinate(lat, lng) || typeof accuracyM !== "number" || !Number.isFinite(accuracyM) || accuracyM < 0) {
    fail("invalid-argument", "INVALID_READING");
  }
  const band = accuracyBand(accuracyM!);
  const db = getFirestore();

  if (input.isMock === true) {
    // LOC_MOCK: رفض عادي بدون اتهام، والحدث يُسجل في الخادم فقط (بدون إحداثيات).
    await db.collection("events").add({
      name: "location_unverifiable",
      ts: Timestamp.fromDate(now),
      uid,
      platform: input.platform ?? null,
      source: "server",
      reason: "mock_flag",
      expireAt: Timestamp.fromMillis(now.getTime() + 395 * 24 * 3600_000),
    });
    return { status: "unverifiable", accuracyBand: band, stadiums: [], branches: [], balances: null };
  }
  if (accuracyM! > MAX_ACCURACY_M) {
    return { status: "weak_signal", accuracyBand: band, stadiums: [], branches: [], balances: null };
  }

  const cells = neighborhood(lat!, lng!, 5);
  const zonesSnap = await db.collection("zones").where("geohash5", "in", cells).get();
  const inside = zonesSnap.docs
    .map((d) => d.data())
    .filter((z) => z.active === true && isInside(distanceM(lat!, lng!, z.center.lat, z.center.lng), z.radiusM, accuracyM!));

  const stadiumIds = [...new Set(inside.filter((z) => z.type === "stadium").map((z) => z.refId as string))];
  const branchZones = inside.filter((z) => z.type === "branch");

  // معلومات الفروع وحملاتها النشطة (قراءة عامة للخادم، خارج المعاملة).
  const branches: Omit<BranchHit, "rewarded" | "xp">[] = [];
  for (const z of branchZones) {
    const branch = await db.doc(`branches/${z.refId}`).get();
    if (!branch.exists || branch.get("active") !== true) continue;
    const campaigns = await db.collection("campaigns").where("branchIds", "array-contains", z.refId).get();
    const activeCampaigns = campaigns.docs.filter((c) => {
      const d = c.data();
      return d.status === "active" && (!d.startAt || d.startAt.toMillis() <= now.getTime()) && (!d.endAt || d.endAt.toMillis() > now.getTime());
    }).length;
    branches.push({
      branchId: z.refId,
      brandId: branch.get("brandId"),
      name: branch.get("name"),
      brandName: branch.get("brandName"),
      zoneRadiusM: z.radiusM,
      activeCampaigns,
    });
  }

  const day = gameDayId(now);
  return db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`);
    const snap = await tx.get(userRef);
    if (!snap.exists) fail("failed-precondition", "NEEDS_ONBOARDING");
    if (snap.get("deletionRequestedAt")) fail("failed-precondition", "ACCOUNT_DELETION_PENDING");
    let wallet = readWallet(snap.data()!);
    const daily = dailyFor(wallet, day);
    const claimed = new Set(daily.proximity);
    const stadiums: StadiumHit[] = [];
    const branchHits: BranchHit[] = [];

    for (const stadiumId of stadiumIds) {
      const key = `stadium:${stadiumId}`;
      if (claimed.has(key)) {
        stadiums.push({ stadiumId, rewarded: false, xp: 0, packs: 0 });
        continue;
      }
      claimed.add(key);
      wallet = grantXp({ ...wallet, packs: wallet.packs + STADIUM_ZONE_REWARD.packs }, STADIUM_ZONE_REWARD.xp, day);
      stadiums.push({ stadiumId, rewarded: true, ...STADIUM_ZONE_REWARD });
    }
    for (const b of branches) {
      const key = `branch:${b.branchId}`;
      const rewarded = !claimed.has(key);
      if (rewarded) {
        claimed.add(key);
        wallet = grantXp(wallet, BRANCH_ZONE_REWARD.xp, day);
      }
      branchHits.push({ ...b, rewarded, xp: rewarded ? BRANCH_ZONE_REWARD.xp : 0 });
    }

    wallet = { ...wallet, daily: { ...daily, proximity: [...claimed].sort() } };
    tx.update(userRef, walletPatch(wallet));
    return { status: "ok" as const, accuracyBand: band, stadiums, branches: branchHits, balances: balancesOf(wallet) };
  });
}

export const verifyPresence = authedCallable<PresenceInput, PresenceResult>(async (req) =>
  handleVerifyPresence(req.auth.uid, req.data),
);
