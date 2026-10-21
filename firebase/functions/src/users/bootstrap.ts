import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { authedCallable } from "../shared/callable.js";
import { AgeBand, CityCode } from "../shared/contracts.js";
import { fail } from "../shared/errors.js";
import { balancesOf, Balances, dailyFor, grantXp, readWallet, walletPatch } from "../economy/wallet.js";
import { DAILY_LOGIN } from "../economy/rules.js";
import { gameDayId, nextRollover } from "../shared/gameDay.js";
import { providerOf } from "./setAgeAndCity.js";

export interface BootstrapProfile {
  ageBand: AgeBand;
  city: CityCode;
  displayName: string;
  cityChangedAt: string;
  authProvider: string;
  level: number;
  xp: number;
  fanPoints: number;
  packs: number;
  balances: Balances;
  ownedTeams: string[];
  achievements: string[];
  badges: string[];
  visitedToday: string[];
}

export interface DailyLogin {
  granted: boolean;
  xp: number;
  packs: number;
}

export type BootstrapResponse = {
  serverTime: string;
  gameDay: string;
  nextRollover: string;
} & (
  | { status: "needs_onboarding" }
  | { status: "deletion_pending" }
  | { status: "ok"; profile: BootstrapProfile; dailyLogin: DailyLogin }
);

/**
 * `bootstrap` — ARCHITECTURE §5: الملف والأرصدة، والدخول اليومي (+10 XP وحزمة مرة لكل يوم لعبة — GAME_RULES §10)
 * داخل نفس المعاملة، ومزامنة مزوّد الدخول بعد الربط.
 */
export async function handleBootstrap(
  uid: string,
  signInProvider: string | undefined,
  now: Date = new Date(),
): Promise<BootstrapResponse> {
  const provider = providerOf(signInProvider);
  if (!provider) fail("permission-denied", "NOT_A_PLAYER_ACCOUNT");

  const clock = { serverTime: now.toISOString(), gameDay: gameDayId(now), nextRollover: nextRollover(now).toISOString() };
  const db = getFirestore();
  const ref = db.doc(`users/${uid}`);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ...clock, status: "needs_onboarding" as const };
    const data = snap.data()!;
    if (data.deletionRequestedAt) return { ...clock, status: "deletion_pending" as const };

    const patch: Record<string, unknown> = {};
    // الضيف اللي ربط حسابه بـ Apple أو Google: المزوّد في الرمز يتغير، ونحدّث الحقل (خادم فقط).
    if (provider !== "anonymous" && data.authProvider !== provider) patch.authProvider = provider;

    let wallet = readWallet(data);
    const daily = dailyFor(wallet, clock.gameDay);
    const dailyLogin: DailyLogin = { granted: false, xp: 0, packs: 0 };
    if (!daily.login) {
      wallet = grantXp({ ...wallet, packs: wallet.packs + DAILY_LOGIN.packs, daily: { ...daily, login: true } }, DAILY_LOGIN.xp, clock.gameDay);
      Object.assign(patch, walletPatch(wallet));
      Object.assign(dailyLogin, { granted: true, xp: DAILY_LOGIN.xp, packs: DAILY_LOGIN.packs });
    }
    if (Object.keys(patch).length > 0) tx.update(ref, patch);

    return {
      ...clock,
      status: "ok" as const,
      dailyLogin,
      profile: {
        ageBand: data.ageBand,
        city: data.city,
        displayName: data.displayName,
        cityChangedAt: (data.cityChangedAt as Timestamp).toDate().toISOString(),
        authProvider: (patch.authProvider as string) ?? data.authProvider,
        level: wallet.level,
        xp: wallet.xp,
        fanPoints: wallet.fanPoints,
        packs: wallet.packs,
        balances: balancesOf(wallet),
        ownedTeams: wallet.ownedTeams,
        achievements: wallet.achievements,
        badges: wallet.badges,
        visitedToday: dailyFor(wallet, clock.gameDay).stadiums,
      },
    };
  });
}

export const bootstrap = authedCallable<void, BootstrapResponse>(async (request) =>
  handleBootstrap(request.auth.uid, request.auth.token.firebase?.sign_in_provider),
);
