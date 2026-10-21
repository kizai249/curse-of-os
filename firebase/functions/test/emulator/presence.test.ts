import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";
import { zoneDocument } from "../../src/location/zones.js";
import { admin, callFunction, callOk, clearFirestore, signUpAnonymous } from "./helpers.js";

const ADULT = new Date().getUTCFullYear() - 25;
// مراكز توضيحية للاختبار فقط (مو مواقع حقيقية).
const STADIUM = { lat: 24.75, lng: 46.85 };
const BRANCH = { lat: 21.55, lng: 39.17 };
const metersNorth = (p: { lat: number; lng: number }, m: number) => ({ lat: p.lat + m / 111_195, lng: p.lng });

interface Presence {
  status: string;
  accuracyBand: string;
  stadiums: Array<{ stadiumId: string; rewarded: boolean; xp: number; packs: number }>;
  branches: Array<{ branchId: string; rewarded: boolean; xp: number; activeCampaigns: number; zoneRadiusM: number }>;
  balances: { xp: number; packs: number } | null;
}

async function player() {
  const p = await signUpAnonymous();
  await callOk("setAgeAndCity", { birthYear: ADULT, city: "RUH" }, p.idToken);
  return p;
}

function shape(value: unknown, path = ""): string[] {
  if (value === null || typeof value !== "object") return [`${path}:${value === null ? "null" : typeof value}`];
  if (Array.isArray(value)) return value.length === 0 ? [`${path}:[]`] : shape(value[0], `${path}[]`);
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k)).sort();
}

beforeEach(async () => {
  await clearFirestore();
  const { db } = admin();
  await db.doc("zones/zone_std_STD_RUH_KFS").set(zoneDocument({ type: "stadium", refId: "STD_RUH_KFS", ...STADIUM, radiusM: 2000 }));
  await db.doc("zones/zone_br_br_test").set(zoneDocument({ type: "branch", refId: "br_test", ...BRANCH, radiusM: 250 }));
  await db.doc("branches/br_test").set({
    brandId: "brand_test", brandName: { ar: "علامة", en: "Brand" }, name: { ar: "فرع الاختبار", en: "Test branch" },
    city: "JED", zoneId: "zone_br_br_test", active: true,
  });
  const now = Date.now();
  await db.doc("campaigns/c_active").set({ brandId: "brand_test", branchIds: ["br_test"], status: "active", startAt: Timestamp.fromMillis(now - 3600_000), endAt: Timestamp.fromMillis(now + 3600_000) });
  await db.doc("campaigns/c_draft").set({ brandId: "brand_test", branchIds: ["br_test"], status: "draft" });
  await db.doc("campaigns/c_ended").set({ brandId: "brand_test", branchIds: ["br_test"], status: "active", startAt: Timestamp.fromMillis(now - 7200_000), endAt: Timestamp.fromMillis(now - 3600_000) });
});

describe("verifyPresence", () => {
  it("stadium zone: +1 pack and 20 XP once per day", async () => {
    const { idToken } = await player();
    const reading = { ...metersNorth(STADIUM, 1500), accuracyM: 20 };
    const first = await callOk<Presence>("verifyPresence", reading, idToken);
    expect(first.status).toBe("ok");
    expect(first.stadiums).toEqual([{ stadiumId: "STD_RUH_KFS", rewarded: true, xp: 20, packs: 1 }]);
    expect(first.balances).toMatchObject({ xp: 20, packs: 1 });
    const again = await callOk<Presence>("verifyPresence", reading, idToken);
    expect(again.stadiums[0]).toMatchObject({ rewarded: false, xp: 0 });
    expect(again.balances).toMatchObject({ xp: 20, packs: 1 });
  });

  it("AT-02a: accuracy 180 m next to a branch is rejected as weak signal", async () => {
    const { idToken } = await player();
    const r = await callOk<Presence>("verifyPresence", { ...metersNorth(BRANCH, 40), accuracyM: 180 }, idToken);
    expect(r).toMatchObject({ status: "weak_signal", branches: [], stadiums: [], balances: null });
  });

  it("AT-02b: 600 m from a 250 m branch is outside", async () => {
    const { idToken } = await player();
    const r = await callOk<Presence>("verifyPresence", { ...metersNorth(BRANCH, 600), accuracyM: 20 }, idToken);
    expect(r.status).toBe("ok");
    expect(r.branches).toEqual([]);
  });

  it("AT-02c: 270 m with 30 m accuracy is accepted; branch card data + 10 XP once", async () => {
    const { idToken } = await player();
    const r = await callOk<Presence>("verifyPresence", { ...metersNorth(BRANCH, 270), accuracyM: 30 }, idToken);
    expect(r.accuracyBand).toBe("26-50");
    expect(r.branches).toHaveLength(1);
    expect(r.branches[0]).toMatchObject({ branchId: "br_test", rewarded: true, xp: 10, activeCampaigns: 1, zoneRadiusM: 250 });
    const sample = JSON.parse(readFileSync(resolve(__dirname, "../../../../shared/contracts/samples/verifyPresence.ok.json"), "utf8"));
    expect(shape({ result: { ...r, stadiums: sample.result.stadiums } })).toEqual(shape(sample));
    const again = await callOk<Presence>("verifyPresence", { ...metersNorth(BRANCH, 10), accuracyM: 5 }, idToken);
    expect(again.branches[0]).toMatchObject({ rewarded: false, xp: 0 });
  });

  it("mock locations are treated as unverifiable without accusing the player", async () => {
    const { uid, idToken } = await player();
    const r = await callOk<Presence>("verifyPresence", { ...STADIUM, accuracyM: 5, isMock: true, platform: "android" }, idToken);
    expect(r.status).toBe("unverifiable");
    expect(r.stadiums).toEqual([]);
    const events = await admin().db.collection("events").where("uid", "==", uid).get();
    expect(events.size).toBe(1);
    expect(events.docs[0]!.data()).toMatchObject({ name: "location_unverifiable", source: "server" });
  });

  it("never stores coordinates (AT-02, AT-10)", async () => {
    const { uid, idToken } = await player();
    const reading = { ...metersNorth(STADIUM, 100), accuracyM: 12 };
    await callOk("verifyPresence", reading, idToken);
    await callOk("verifyPresence", { ...STADIUM, accuracyM: 5, isMock: true }, idToken);
    await callOk("verifyPresence", { ...BRANCH, accuracyM: 150 }, idToken);
    const { db } = admin();
    const dumps: string[] = [JSON.stringify((await db.doc(`users/${uid}`).get()).data())];
    for (const col of ["events", "visits"]) {
      for (const d of (await db.collection(col).get()).docs) dumps.push(JSON.stringify(d.data()));
    }
    const all = dumps.join("\n");
    for (const value of [reading.lat, reading.lng, STADIUM.lat, STADIUM.lng, BRANCH.lat, BRANCH.lng]) {
      expect(all).not.toContain(String(value).slice(0, 7));
    }
    expect(all).not.toMatch(/"(lat|lng|latitude|longitude|accuracyM)"/);
  });

  it("validates the reading", async () => {
    const { idToken } = await player();
    for (const bad of [{}, { lat: 95, lng: 46, accuracyM: 5 }, { lat: 24, lng: 46 }, { lat: 24, lng: 46, accuracyM: -1 }]) {
      const res = await callFunction("verifyPresence", bad, idToken);
      expect(res.body.error?.message).toBe("INVALID_READING");
    }
  });
});
