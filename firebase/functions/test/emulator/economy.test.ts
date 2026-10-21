import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { handleOpenPack } from "../../src/economy/callables.js";
import { seedContent } from "../../src/content/seed.js";
import { rebuildSchedule } from "../../src/content/schedule.js";
import { admin, callFunction, callOk, clearFirestore, signUpAnonymous } from "./helpers.js";

const ADULT = new Date().getUTCFullYear() - 25;
let n = 0;
const rid = () => `req_${Date.now()}_${n++}`;

interface Balances {
  packs: number;
  epicPacks: number;
  fanPoints: number;
  xp: number;
  pityCount: number;
}
interface CardResult {
  status: string;
  card: { teamCode: string; variant: string; duplicate: boolean; fanPointsGained: number; newTeam: boolean };
  pityTriggered: boolean;
  achievements: Array<{ id: string; packs: number; epicPacks: number; xp: number }>;
  balances: Balances;
}

async function player(): Promise<{ uid: string; idToken: string }> {
  const p = await signUpAnonymous();
  await callOk("setAgeAndCity", { birthYear: ADULT, city: "RUH" }, p.idToken);
  return p;
}

function shape(value: unknown, path = ""): string[] {
  if (value === null || typeof value !== "object") return [`${path}:${value === null ? "null" : typeof value}`];
  if (Array.isArray(value)) return value.length === 0 ? [`${path}:[]`] : shape(value[0], `${path}[]`);
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k)).sort();
}
const sample = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, `../../../../shared/contracts/samples/${name}.json`), "utf8"));

beforeEach(async () => {
  await clearFirestore();
  admin();
  await seedContent();
});

describe("bootstrap daily login", () => {
  it("grants +10 XP and one pack once per game day", async () => {
    const { uid, idToken } = await player();
    const first = await callOk<{ dailyLogin: { granted: boolean }; profile: { balances: Balances } }>("bootstrap", null, idToken);
    expect(first.dailyLogin).toEqual({ granted: true, xp: 10, packs: 1 });
    const second = await callOk<{ dailyLogin: { granted: boolean }; profile: { balances: Balances } }>("bootstrap", null, idToken);
    expect(second.dailyLogin.granted).toBe(false);
    expect(second.profile.balances).toMatchObject({ packs: 1, xp: 10 });
    const doc = (await admin().db.doc(`users/${uid}`).get()).data()!;
    expect(doc.xpDay.value).toBe(10);
    expect(doc.daily).toMatchObject({ login: true });
  });
});

describe("openPack", () => {
  it("needs a pack, spends exactly one, stores the card, and is idempotent per requestId", async () => {
    const { uid, idToken } = await player();
    const none = await callFunction("openPack", { requestId: rid() }, idToken);
    expect(none.body.error?.message).toBe("NO_PACKS");

    await callOk("bootstrap", null, idToken); // +1 حزمة
    const requestId = rid();
    const first = await callOk<CardResult>("openPack", { requestId }, idToken);
    expect(first.balances.packs).toBe(0);
    const again = await callOk<CardResult>("openPack", { requestId }, idToken);
    expect(again).toEqual(first);
    expect((await admin().db.doc(`users/${uid}`).get()).get("packs")).toBe(0);
    const card = await admin().db.doc(`users/${uid}/teamCards/${first.card.teamCode}_${first.card.variant}`).get();
    expect(card.get("count")).toBe(1);
    // شكل الرد مطابق للعينة (عناصر achievements يتحقق منها اختبار الإنجازات).
    const expected = sample("openPack.ok");
    expect(shape({ result: { ...first, achievements: expected.result.achievements } })).toEqual(shape(expected));
  });

  it("parallel opens never spend more packs than owned", async () => {
    const { uid, idToken } = await player();
    await admin().db.doc(`users/${uid}`).update({ packs: 2 });
    const results = await Promise.all(Array.from({ length: 6 }, () => callFunction("openPack", { requestId: rid() }, idToken)));
    const ok = results.filter((r) => r.status === 200);
    expect(ok.length).toBe(2);
    expect(results.filter((r) => r.body.error?.message === "NO_PACKS").length).toBe(4);
    expect((await admin().db.doc(`users/${uid}`).get()).get("packs")).toBe(0);
  });

  it("converts duplicates to fan points (§3.4)", async () => {
    const { uid } = await player();
    const { db } = admin();
    await db.doc(`users/${uid}`).update({ packs: 1 });
    await db.doc(`users/${uid}/teamCards/KSA_common`).set({ teamCode: "KSA", variant: "common", count: 1 });
    // rng = 0 ← شائعة، وأول منتخب (KSA).
    const r = await handleOpenPack(uid, { requestId: rid() }, new Date(), () => 0);
    expect(r.card).toMatchObject({ teamCode: "KSA", variant: "common", duplicate: true, fanPointsGained: 10 });
    expect(r.balances.fanPoints).toBe(10);
    expect((await db.doc(`users/${uid}/teamCards/KSA_common`).get()).get("count")).toBe(2);
  });

  it("pity: the 15th pack after 14 without epic is epic or better and resets the counter", async () => {
    const { uid } = await player();
    await admin().db.doc(`users/${uid}`).update({ packs: 1, pityCount: 14 });
    const r = await handleOpenPack(uid, { requestId: rid() }, new Date(), () => 0);
    expect(r.pityTriggered).toBe(true);
    expect(r.card.variant).toBe("epic");
    expect(r.balances.pityCount).toBe(0);
  });

  it("awards collection achievements inside the same transaction", async () => {
    const { uid } = await player();
    await admin().db.doc(`users/${uid}`).update({ packs: 1, ownedTeams: ["AUS", "BHR", "CHN", "IDN", "IRN"] });
    const r = await handleOpenPack(uid, { requestId: rid() }, new Date(), () => 0); // KSA جديد = 6 منتخبات
    expect(r.achievements.map((a) => a.id)).toEqual(["teams_6"]);
    expect(shape(r.achievements[0])).toEqual(shape(sample("openPack.ok").result.achievements[0]));
    expect(r.balances.packs).toBe(2);
    expect((await admin().db.doc(`users/${uid}`).get()).get("achievements")).toEqual(["teams_6"]);
  });

  it("group achievement uses groups from the schedule and grants a guaranteed epic pack", async () => {
    const { uid } = await player();
    const { db } = admin();
    const base = { stage: "group", group: "A", stadiumId: null, status: "scheduled", score: null };
    await db.doc("matchResults/m01").set({ ...base, matchNo: 1, day: "2027-01-07", home: "KSA", away: "PLE" });
    await db.doc("matchResults/m02").set({ ...base, matchNo: 2, day: "2027-01-08", home: "JPN", away: "IRQ" });
    await rebuildSchedule();
    await db.doc(`users/${uid}`).update({ packs: 1, ownedTeams: ["IRQ", "JPN", "PLE"], achievements: [] });
    const r = await handleOpenPack(uid, { requestId: rid() }, new Date(), () => 0);
    expect(r.card.teamCode).toBe("KSA");
    expect(r.achievements.map((a) => a.id)).toEqual(["group_A"]);
    expect(r.balances.epicPacks).toBe(1);

    const epic = await handleOpenPack(uid, { requestId: rid(), kind: "epic" }, new Date(), () => 0);
    expect(epic.card.variant).toBe("epic");
    expect(epic.balances.epicPacks).toBe(0);
  });

  it("rejects bad request ids", async () => {
    const { idToken } = await player();
    const res = await callFunction("openPack", { requestId: "x" }, idToken);
    expect(res.body.error?.message).toBe("INVALID_REQUEST_ID");
  });
});

describe("exchangeFanPoints", () => {
  it("buys a chosen common for 100 FP and a rare for 300 FP; epic is not exchangeable", async () => {
    const { uid, idToken } = await player();
    const { db } = admin();
    const poor = await callFunction("exchangeFanPoints", { requestId: rid(), teamCode: "JPN", variant: "common" }, idToken);
    expect(poor.body.error?.message).toBe("NOT_ENOUGH_FP");

    await db.doc(`users/${uid}`).update({ fanPoints: 400 });
    const common = await callOk<CardResult>("exchangeFanPoints", { requestId: rid(), teamCode: "JPN", variant: "common" }, idToken);
    expect(common.balances.fanPoints).toBe(300);
    const rare = await callOk<CardResult>("exchangeFanPoints", { requestId: rid(), teamCode: "JPN", variant: "rare" }, idToken);
    expect(rare.balances.fanPoints).toBe(0);
    expect(rare.card).toMatchObject({ teamCode: "JPN", variant: "rare", newTeam: false });

    await db.doc(`users/${uid}`).update({ fanPoints: 1000 });
    const owned = await callFunction("exchangeFanPoints", { requestId: rid(), teamCode: "JPN", variant: "common" }, idToken);
    expect(owned.body.error?.message).toBe("ALREADY_OWNED");
    const epic = await callFunction("exchangeFanPoints", { requestId: rid(), teamCode: "KSA", variant: "epic" }, idToken);
    expect(epic.body.error?.message).toBe("VARIANT_NOT_EXCHANGEABLE");
    expect((await db.doc(`users/${uid}`).get()).get("fanPoints")).toBe(1000);
  });
});

describe("stadiumVisit", () => {
  it("gives +5 XP once per stadium per day", async () => {
    const { idToken } = await player();
    const first = await callOk<{ status: string; xpGained: number; balances: Balances }>("stadiumVisit", { stadiumId: "STD_RUH_KFS" }, idToken);
    expect(first).toMatchObject({ status: "ok", xpGained: 5 });
    expect(shape({ result: first })).toEqual(shape(sample("stadiumVisit.ok")));
    const again = await callOk<{ status: string; xpGained: number }>("stadiumVisit", { stadiumId: "STD_RUH_KFS" }, idToken);
    expect(again).toMatchObject({ status: "already_visited", xpGained: 0 });
    const other = await callOk<{ xpGained: number; visitedToday: string[] }>("stadiumVisit", { stadiumId: "STD_KHB_ARM" }, idToken);
    expect(other.visitedToday).toEqual(["STD_RUH_KFS", "STD_KHB_ARM"]);
    const bad = await callFunction("stadiumVisit", { stadiumId: "STD_NOPE" }, idToken);
    expect(bad.body.error?.message).toBe("INVALID_STADIUM");
  });
});
