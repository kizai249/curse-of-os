import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";
import { purgeDeletedAccounts } from "../../src/users/deleteAccount.js";
import { admin, callFunction, callOk, clearFirestore, signUpAnonymous } from "./helpers.js";

const THIS_YEAR = new Date(Date.now() + 3 * 3600_000).getUTCFullYear();
const ADULT = THIS_YEAR - 25;
const MINOR = THIS_YEAR - 16;
const CHILD = THIS_YEAR - 12;

interface OkResponse {
  status: "ok";
  profile: { ageBand: string; city: string; displayName: string; cityChangedAt: string };
}

beforeEach(async () => {
  await clearFirestore();
});

describe("setAgeAndCity", () => {
  it("creates a server-owned profile with zero balances", async () => {
    const { uid, idToken } = await signUpAnonymous();
    const res = await callOk<OkResponse>("setAgeAndCity", { birthYear: ADULT, city: "JED" }, idToken);
    expect(res.status).toBe("ok");
    expect(res.profile.ageBand).toBe("18_plus");
    expect(res.profile.displayName).toMatch(/_جدة_\d{2}$/);

    const doc = (await admin().db.doc(`users/${uid}`).get()).data()!;
    expect(doc).toMatchObject({
      authProvider: "anonymous",
      ageBand: "18_plus",
      city: "JED",
      level: 1,
      xp: 0,
      fanPoints: 0,
      packs: 0,
      pityCount: 0,
      marketingConsent: false,
      deletionRequestedAt: null,
    });
    // ما نخزن سنة الميلاد — الفئة فقط (AGE_GATE).
    expect(doc).not.toHaveProperty("birthYear");
  });

  it("marks 15–18 as minor with marketing consent off", async () => {
    const { uid, idToken } = await signUpAnonymous();
    const res = await callOk<OkResponse>("setAgeAndCity", { birthYear: MINOR, city: "RUH" }, idToken);
    expect(res.profile.ageBand).toBe("15_17");
    expect((await admin().db.doc(`users/${uid}`).get()).get("marketingConsent")).toBe(false);
  });

  it("under 15: no profile is stored and the auth user is removed", async () => {
    const { uid, idToken } = await signUpAnonymous();
    const res = await callOk<{ status: string }>("setAgeAndCity", { birthYear: CHILD, city: "KHB" }, idToken);
    expect(res.status).toBe("under_15");
    expect((await admin().db.doc(`users/${uid}`).get()).exists).toBe(false);
    await expect(admin().auth.getUser(uid)).rejects.toMatchObject({ code: "auth/user-not-found" });
  });

  it("rejects invalid birth years and cities", async () => {
    const { idToken } = await signUpAnonymous();
    const badYear = await callFunction("setAgeAndCity", { birthYear: THIS_YEAR + 1, city: "RUH" }, idToken);
    expect(badYear.body.error?.message).toBe("INVALID_BIRTH_YEAR");
    const badCity = await callFunction("setAgeAndCity", { birthYear: ADULT, city: "DXB" }, idToken);
    expect(badCity.body.error?.message).toBe("INVALID_CITY");
  });

  it("the age band is set once and cannot be changed later", async () => {
    const { uid, idToken } = await signUpAnonymous();
    await callOk("setAgeAndCity", { birthYear: MINOR, city: "RUH" }, idToken);
    const again = await callOk<OkResponse>("setAgeAndCity", { birthYear: ADULT, city: "RUH" }, idToken);
    expect(again.profile.ageBand).toBe("15_17");
    expect((await admin().db.doc(`users/${uid}`).get()).get("ageBand")).toBe("15_17");
  });

  it("city changes are locked for 30 days (CITY_CHANGE_LOCKED)", async () => {
    const { uid, idToken } = await signUpAnonymous();
    const first = await callOk<OkResponse>("setAgeAndCity", { birthYear: ADULT, city: "RUH" }, idToken);

    const locked = await callFunction("setAgeAndCity", { city: "JED" }, idToken);
    expect(locked.body.error?.status).toBe("FAILED_PRECONDITION");
    expect(locked.body.error?.message).toBe("CITY_CHANGE_LOCKED");
    const details = (locked.body.error as unknown as { details: { unlockAt: string } }).details;
    expect(Date.parse(details.unlockAt) - Date.parse(first.profile.cityChangedAt)).toBe(30 * 24 * 3600_000);

    await admin().db.doc(`users/${uid}`).update({
      cityChangedAt: Timestamp.fromMillis(Date.now() - 31 * 24 * 3600_000),
    });
    const moved = await callOk<OkResponse>("setAgeAndCity", { city: "JED" }, idToken);
    expect(moved.profile.city).toBe("JED");
  });

  it("parallel first calls create exactly one profile", async () => {
    const { uid, idToken } = await signUpAnonymous();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => callOk<OkResponse>("setAgeAndCity", { birthYear: ADULT, city: "KHB" }, idToken)),
    );
    const names = new Set(results.map((r) => r.profile.displayName));
    expect(names.size).toBe(1);
    expect((await admin().db.doc(`users/${uid}`).get()).get("city")).toBe("KHB");
  });
});

describe("deleteAccount", () => {
  it("requires explicit confirmation", async () => {
    const { idToken } = await signUpAnonymous();
    const res = await callFunction("deleteAccount", {}, idToken);
    expect(res.body.error?.message).toBe("CONFIRMATION_REQUIRED");
  });

  it("disables the account immediately and purges all data", async () => {
    const { uid, idToken } = await signUpAnonymous();
    await callOk("setAgeAndCity", { birthYear: ADULT, city: "RUH" }, idToken);
    const { db, auth } = admin();
    await db.doc(`users/${uid}/teamCards/KSA_common`).set({ teamCode: "KSA", variant: "common", count: 1 });

    const res = await callOk<{ status: string; purgeBy: string }>("deleteAccount", { confirm: true }, idToken);
    expect(res.status).toBe("scheduled");
    expect((await auth.getUser(uid)).disabled).toBe(true);
    expect((await db.doc(`users/${uid}`).get()).get("deletionRequestedAt")).toBeInstanceOf(Timestamp);

    expect(await purgeDeletedAccounts()).toBe(1);
    expect((await db.doc(`users/${uid}`).get()).exists).toBe(false);
    expect((await db.collection(`users/${uid}/teamCards`).get()).empty).toBe(true);
    await expect(auth.getUser(uid)).rejects.toMatchObject({ code: "auth/user-not-found" });
  });

  it("a guest who never passed the age gate is deleted at once", async () => {
    const { uid, idToken } = await signUpAnonymous();
    const res = await callOk<{ status: string }>("deleteAccount", { confirm: true }, idToken);
    expect(res.status).toBe("deleted");
    await expect(admin().auth.getUser(uid)).rejects.toMatchObject({ code: "auth/user-not-found" });
  });

  it("purge leaves accounts without a deletion request untouched", async () => {
    const { uid, idToken } = await signUpAnonymous();
    await callOk("setAgeAndCity", { birthYear: ADULT, city: "RUH" }, idToken);
    expect(await purgeDeletedAccounts()).toBe(0);
    expect((await admin().db.doc(`users/${uid}`).get()).exists).toBe(true);
  });
});

describe("bootstrap", () => {
  it("asks a new player to onboard, then returns the profile", async () => {
    const { idToken } = await signUpAnonymous();
    const before = await callOk<{ status: string; gameDay: string }>("bootstrap", null, idToken);
    expect(before.status).toBe("needs_onboarding");
    expect(before.gameDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await callOk("setAgeAndCity", { birthYear: ADULT, city: "JED" }, idToken);
    const after = await callOk<{ status: string; profile: Record<string, unknown> }>("bootstrap", null, idToken);
    expect(after.status).toBe("ok");
    expect(after.profile).toMatchObject({ city: "JED", ageBand: "18_plus", level: 1, xp: 0, packs: 0, fanPoints: 0 });
  });

  it("reports a pending deletion instead of the profile", async () => {
    const { uid, idToken } = await signUpAnonymous();
    await callOk("setAgeAndCity", { birthYear: ADULT, city: "JED" }, idToken);
    await admin().db.doc(`users/${uid}`).update({ deletionRequestedAt: Timestamp.now() });
    const res = await callOk<{ status: string }>("bootstrap", null, idToken);
    expect(res.status).toBe("deletion_pending");
  });
});

/** شكل الرد (المسارات وأنواعها) — يقارن الرد الفعلي بعينات shared/contracts/samples اللي يقرأها C#. */
function shape(value: unknown, path = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [`${path}:${value === null ? "null" : Array.isArray(value) ? "array" : typeof value}`];
  }
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k))
    .sort();
}

function sample(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(__dirname, `../../../../shared/contracts/samples/${name}.json`), "utf8"));
}

describe("contract samples (shared with the Unity client)", () => {
  it("bootstrap, setAgeAndCity and error envelopes match the samples", async () => {
    const { idToken } = await signUpAnonymous();
    const needs = await callFunction("bootstrap", null, idToken);
    expect(shape(needs.body)).toEqual(shape(sample("bootstrap.needs_onboarding")));

    const set = await callFunction("setAgeAndCity", { birthYear: MINOR, city: "RUH" }, idToken);
    expect(shape(set.body)).toEqual(shape(sample("setAgeAndCity.ok")));

    const ok = await callFunction("bootstrap", null, idToken);
    expect(shape(ok.body)).toEqual(shape(sample("bootstrap.ok")));

    const locked = await callFunction("setAgeAndCity", { city: "JED" }, idToken);
    expect(shape(locked.body)).toEqual(shape(sample("error.city_change_locked")));

    const child = await signUpAnonymous();
    const under = await callFunction("setAgeAndCity", { birthYear: CHILD, city: "RUH" }, child.idToken);
    expect(shape(under.body)).toEqual(shape(sample("setAgeAndCity.under_15")));
  });
});
