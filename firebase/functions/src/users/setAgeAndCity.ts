import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { AuthedRequest, authedCallable } from "../shared/callable.js";
import { AgeBand, AuthProvider, CITY_CHANGE_COOLDOWN_MS, CityCode, isCityCode } from "../shared/contracts.js";
import { fail } from "../shared/errors.js";
import { ageBandFor } from "./ageBand.js";
import { generateAlias } from "./alias.js";

export interface SetAgeAndCityRequest {
  birthYear?: number;
  city: CityCode;
}

export interface PublicProfile {
  ageBand: AgeBand;
  city: CityCode;
  displayName: string;
  cityChangedAt: string;
}

export type SetAgeAndCityResponse = { status: "ok"; profile: PublicProfile } | { status: "under_15" };

/** مزوّد الدخول من رمز Firebase. حسابات البريد (موظفو اللوحة) مو لاعبين. */
export function providerOf(signInProvider: string | undefined): AuthProvider | null {
  switch (signInProvider) {
    case "anonymous":
      return "anonymous";
    case "apple.com":
      return "apple";
    case "google.com":
      return "google";
    default:
      return null;
  }
}

function toPublic(data: FirebaseFirestore.DocumentData): PublicProfile {
  return {
    ageBand: data.ageBand,
    city: data.city,
    displayName: data.displayName,
    cityChangedAt: (data.cityChangedAt as Timestamp).toDate().toISOString(),
  };
}

/**
 * بوابة العمر والمدينة — ARCHITECTURE §5: العمر مرة وحدة، والمدينة تتعدل مرة كل 30 يومًا.
 * أقل من 15: ما يُنشأ ملف، ويُحذف مستخدم Auth المجهول (GAME_RULES §9.5).
 */
export async function handleSetAgeAndCity(
  uid: string,
  signInProvider: string | undefined,
  input: SetAgeAndCityRequest,
  now: Date = new Date(),
): Promise<SetAgeAndCityResponse> {
  const provider = providerOf(signInProvider);
  if (!provider) fail("permission-denied", "NOT_A_PLAYER_ACCOUNT");
  if (!input || !isCityCode(input.city)) fail("invalid-argument", "INVALID_CITY");

  const db = getFirestore();
  const ref = db.doc(`users/${uid}`);

  const outcome = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      const band = ageBandFor(input.birthYear, now);
      if (band === "invalid") fail("invalid-argument", "INVALID_BIRTH_YEAR");
      if (band === "under_15") return { status: "under_15" as const };

      const nowTs = Timestamp.fromDate(now);
      const profile = {
        createdAt: nowTs,
        authProvider: provider,
        ageBand: band,
        city: input.city,
        cityChangedAt: nowTs,
        displayName: generateAlias(input.city),
        level: 1,
        xp: 0,
        xpDay: { day: "", value: 0 },
        fanPoints: 0,
        packs: 0,
        pityCount: 0,
        streaks: {},
        // ما تُعرض موافقات تسويق في R1، وللقاصر دائمًا false (PRODUCT_BRIEF ت8).
        marketingConsent: false,
        deletionRequestedAt: null,
      };
      tx.create(ref, profile);
      return { status: "ok" as const, profile: toPublic(profile) };
    }

    const data = snap.data()!;
    if (data.deletionRequestedAt) fail("failed-precondition", "ACCOUNT_DELETION_PENDING");
    if (data.city === input.city) return { status: "ok" as const, profile: toPublic(data) };

    const unlockAt = (data.cityChangedAt as Timestamp).toMillis() + CITY_CHANGE_COOLDOWN_MS;
    if (now.getTime() < unlockAt) {
      fail("failed-precondition", "CITY_CHANGE_LOCKED", { unlockAt: new Date(unlockAt).toISOString() });
    }
    const changedAt = Timestamp.fromDate(now);
    tx.update(ref, { city: input.city, cityChangedAt: changedAt, updatedAt: FieldValue.serverTimestamp() });
    return { status: "ok" as const, profile: toPublic({ ...data, city: input.city, cityChangedAt: changedAt }) };
  });

  if (outcome.status === "under_15") {
    // ما نحتفظ بأي هوية لمن هو أقل من 15. المستخدم المجهول ينحذف، والعميل يعرض AGE_UNDER_15.
    await getAuth().deleteUser(uid).catch(() => undefined);
  }
  return outcome;
}

export const setAgeAndCity = authedCallable<SetAgeAndCityRequest, SetAgeAndCityResponse>(
  async (request: AuthedRequest<SetAgeAndCityRequest>) =>
    handleSetAgeAndCity(request.auth.uid, request.auth.token.firebase?.sign_in_provider, request.data),
);
