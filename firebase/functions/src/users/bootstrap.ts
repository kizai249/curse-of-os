import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { authedCallable } from "../shared/callable.js";
import { AgeBand, CityCode } from "../shared/contracts.js";
import { fail } from "../shared/errors.js";
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
}

export type BootstrapResponse = {
  serverTime: string;
  gameDay: string;
  nextRollover: string;
} & ({ status: "needs_onboarding" } | { status: "deletion_pending" } | { status: "ok"; profile: BootstrapProfile });

/**
 * `bootstrap` — ARCHITECTURE §5. في S2: يرجع الملف (أو الحاجة للـOnboarding) ويزامن مزوّد الدخول بعد الربط.
 * TODO(S4): الدخول اليومي (+10 XP وحزمة) ومطالبات اليوم داخل نفس المعاملة.
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

    // الضيف اللي ربط حسابه بـ Apple أو Google: المزوّد في الرمز يتغير، ونحدّث الحقل (خادم فقط).
    if (provider !== "anonymous" && data.authProvider !== provider) {
      tx.update(ref, { authProvider: provider });
    }
    return {
      ...clock,
      status: "ok" as const,
      profile: {
        ageBand: data.ageBand,
        city: data.city,
        displayName: data.displayName,
        cityChangedAt: (data.cityChangedAt as Timestamp).toDate().toISOString(),
        authProvider: provider !== "anonymous" ? provider : data.authProvider,
        level: data.level,
        xp: data.xp,
        fanPoints: data.fanPoints,
        packs: data.packs,
      },
    };
  });
}

export const bootstrap = authedCallable<void, BootstrapResponse>(async (request) =>
  handleBootstrap(request.auth.uid, request.auth.token.firebase?.sign_in_provider),
);
