import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";
import { signBranchCode } from "../../src/branch/codes.js";
import { sweepRooms } from "../../src/coop/rooms.js";
import { gameDayId } from "../../src/shared/gameDay.js";
import { admin, callFunction, callOk, clearFirestore, devBranchSecret, signUpAnonymous } from "./helpers.js";

const ADULT = new Date().getUTCFullYear() - 25;

interface RoomSummary {
  roomId: string;
  code: string;
  status: string;
  hostUid: string;
  members: { uid: string; alias: string }[];
  startAt: string | null;
  endsAt: string | null;
  couponMode: string | null;
  serverNow: string;
}
interface Player {
  uid: string;
  idToken: string;
}

let req = 0;
const requestId = () => `req_${Date.now()}_${req++}`;

async function player(checkIn = true): Promise<Player> {
  const p = await signUpAnonymous();
  await callOk("setAgeAndCity", { birthYear: ADULT, city: "JED" }, p.idToken);
  if (checkIn) await callOk("scanBranchCode", { code: signBranchCode(devBranchSecret(), "br_a", gameDayId(new Date())) }, p.idToken);
  return p;
}

async function setupBranch(id: string) {
  await admin().db.doc(`branches/${id}`).set({
    brandId: "brand_a", brandName: { ar: "علامة", en: "Brand" }, name: { ar: "فرع", en: "Branch" }, city: "JED", active: true,
  });
}

async function coopCampaign(remaining: number, perUserLimit = 1) {
  const { db } = admin();
  const now = Date.now();
  await db.doc("campaigns/cmp_coop").set({
    brandId: "brand_a", title: { ar: "قهوة الفريق", en: "Team Coffee" }, terms: { ar: "مشروب", en: "Drink" },
    trigger: "co_op_win", perUserLimit, startAt: Timestamp.fromMillis(now - 3600_000), endAt: Timestamp.fromMillis(now + 86400_000),
    couponValidityDays: 7, branchIds: ["br_a"], status: "active", totals: { issued: 0, redeemed: 0 },
  });
  await db.doc("campaigns/cmp_coop/stock/br_a").set({ total: remaining, reserved: 0, issued: 0, remaining });
}

const stock = async () => (await admin().db.doc("campaigns/cmp_coop/stock/br_a").get()).data()!;
const room = async (id: string) => (await admin().db.doc(`rooms/${id}`).get()).data()!;

/** فريق في غرفة: الأول ينشئ والباقي ينضمون بالرمز. */
async function team(size: number): Promise<{ players: Player[]; roomId: string }> {
  const players = await Promise.all(Array.from({ length: size }, () => player()));
  const created = await callOk<RoomSummary>("createRoom", { branchId: "br_a" }, players[0]!.idToken);
  for (const p of players.slice(1)) await callOk("joinRoom", { branchId: "br_a", code: created.code }, p.idToken);
  return { players, roomId: created.roomId };
}

/** يقدّم البداية للحاضر (بدل انتظار العد التنازلي 5 ث). */
async function skipCountdown(roomId: string) {
  const r = await room(roomId);
  const shift = r.startAt.toMillis() - Date.now() + 1000;
  await admin().db.doc(`rooms/${roomId}`).update({
    startAt: Timestamp.fromMillis(r.startAt.toMillis() - shift),
    endsAt: Timestamp.fromMillis(r.endsAt.toMillis() - shift),
  });
}

/** كل لاعب يضع قطع خاناته من الحل (أو قطعة خاطئة لخانة وحدة إذا wrong). */
async function placeAll(roomId: string, players: Player[], wrong = false) {
  const { db } = admin();
  const solution = (await db.doc(`rooms/${roomId}/private/solution`).get()).get("puzzle.solution") as Record<string, string>;
  const r = await room(roomId);
  const token = (uid: string) => players.find((p) => p.uid === uid)!.idToken;
  const entries = Object.entries(solution);
  if (wrong) {
    // تبديل قطعتين بين خانتين لنفس المالك ونفس المركز إن وجد، وإلا خانة بقطعة تمويه.
    const decoy = (r.pieces as { playerId: string }[]).map((p) => p.playerId).find((p) => !Object.values(solution).includes(p))!;
    entries[0] = [entries[0]![0], decoy];
  }
  // بالتسلسل مثل اللعب الفعلي (الضغطات المتزامنة على نفس الغرفة تُختبر في AT-07 وفي ردّ SRV_BUSY).
  for (const [slotId, playerId] of entries) {
    const owner = (r.slots as { slotId: string; ownerUid: string }[]).find((s) => s.slotId === slotId)!.ownerUid;
    await callOk("placePiece", { roomId, slotId, playerId }, token(owner));
  }
}

beforeEach(async () => {
  await clearFirestore();
  await setupBranch("br_a");
});

describe("lobby (GAME_RULES §7.2, §7.6)", () => {
  it("needs today's check-in at the branch, a valid code, room for 6, and two players to start", async () => {
    const outsider = await player(false);
    expect((await callFunction("createRoom", { branchId: "br_a" }, outsider.idToken)).body.error?.message).toBe("ROOM_NEED_CHECKIN");

    const { players, roomId } = await team(6);
    const r = await room(roomId);
    expect(r).toMatchObject({ status: "open", hostUid: players[0]!.uid, branchId: "br_a" });
    expect(r.code).toMatch(/^\d{4}$/);
    expect(r.memberUids).toHaveLength(6);
    expect(r.members[1].alias).toMatch(/_جدة_/);

    const seventh = await player();
    expect((await callFunction("joinRoom", { branchId: "br_a", code: r.code }, seventh.idToken)).body.error?.message).toBe("ROOM_FULL");
    const wrong = r.code === "0000" ? "0001" : "0000";
    expect((await callFunction("joinRoom", { branchId: "br_a", code: wrong }, seventh.idToken)).body.error?.message).toBe("ROOM_NOT_FOUND");
    expect((await callFunction("joinRoom", { branchId: "br_a", code: r.code }, outsider.idToken)).body.error?.message).toBe("ROOM_NEED_CHECKIN");
    expect((await callFunction("startRound", { roomId, requestId: requestId() }, players[1]!.idToken)).body.error?.message).toBe("ROOM_NOT_HOST");

    const events = await admin().db.collection("events").where("name", "==", "co_op_room_created").get();
    expect(events.size).toBe(1);
  });

  it("a lone host cannot start; the lobby expires after 10 minutes and frees the code", async () => {
    const solo = await player();
    const created = await callOk<RoomSummary>("createRoom", { branchId: "br_a" }, solo.idToken);
    expect((await callFunction("startRound", { roomId: created.roomId, requestId: requestId() }, solo.idToken)).body.error?.message).toBe("ROOM_NEED_TWO");

    await admin().db.doc(`rooms/${created.roomId}`).update({ lobbyExpiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    const late = await player();
    expect((await callFunction("joinRoom", { branchId: "br_a", code: created.code }, late.idToken)).body.error?.message).toBe("ROOM_LOBBY_EXPIRED");
    expect(await sweepRooms()).toBe(1);
    expect((await room(created.roomId)).status).toBe("closed");
    expect((await admin().db.doc(`roomCodes/br_a_${created.code}`).get()).exists).toBe(false);
  });

  it("host leaving the lobby hands over to the oldest member", async () => {
    const { players, roomId } = await team(3);
    const after = await callOk<RoomSummary>("leaveRoom", { roomId }, players[0]!.idToken);
    expect(after.hostUid).toBe(players[1]!.uid);
    expect(after.members.map((m) => m.uid)).toEqual([players[1]!.uid, players[2]!.uid]);
  });
});

describe("round (GAME_RULES §7.3–7.6)", () => {
  it("distributes slots and info cards, enforces ownership and timing, penalises wrong lineups, and rewards a win", async () => {
    await coopCampaign(10);
    const { players, roomId } = await team(3);
    const started = await callOk<RoomSummary>("startRound", { roomId, requestId: requestId(), platform: "ios" }, players[0]!.idToken);
    expect(started).toMatchObject({ status: "playing", couponMode: "with_coupons" });
    expect(Date.parse(started.endsAt!) - Date.parse(started.startAt!)).toBe(180_000);
    expect(Date.parse(started.startAt!) - Date.parse(started.serverNow)).toBe(5000);
    expect(await stock()).toEqual({ total: 10, reserved: 3, issued: 0, remaining: 7 });

    const { db } = admin();
    const r = await room(roomId);
    expect(r.slotsCount).toBe(8);
    expect(r.pieces).toHaveLength(11);
    expect(Object.keys(r.pieces[0]).sort()).toEqual(["ar", "en", "playerId", "position"]);
    const priv = (await db.doc(`rooms/${roomId}/private/solution`).get()).data()!;
    // §7.4: كل لاعب يشوف شروط خاناته فقط، وإحصاءات قطع خاناته عند غيره.
    for (const p of players) {
      const view = (await db.doc(`rooms/${roomId}/views/${p.uid}`).get()).data()!;
      const mine = (r.slots as { slotId: string; ownerUid: string }[]).filter((s) => s.ownerUid === p.uid).map((s) => s.slotId);
      expect(view.slots.map((s: { slotId: string }) => s.slotId)).toEqual(mine);
      expect(mine.length).toBeGreaterThanOrEqual(2);
      const needed = mine.map((s) => priv.puzzle.solution[s]);
      for (const card of view.infoCards) expect(needed).not.toContain(card.playerId);
    }

    const first = (r.slots as { slotId: string; ownerUid: string }[])[0]!;
    const notOwner = players.find((p) => p.uid !== first.ownerUid)!;
    expect((await callFunction("placePiece", { roomId, slotId: first.slotId, playerId: r.pieces[0].playerId }, players.find((p) => p.uid === first.ownerUid)!.idToken)).body.error?.message).toBe("ROUND_NOT_STARTED");
    await skipCountdown(roomId);
    expect((await callFunction("placePiece", { roomId, slotId: first.slotId, playerId: r.pieces[0].playerId }, notOwner.idToken)).body.error?.message).toBe("SLOT_NOT_YOURS");
    expect((await callFunction("submitLineup", { roomId, requestId: requestId() }, players[0]!.idToken)).body.error?.message).toBe("LINEUP_INCOMPLETE");

    await placeAll(roomId, players, true);
    const endsBefore = (await room(roomId)).endsAt.toMillis();
    const wrong = await callOk<{ correct: number; total: number; status: string; endsAt: string }>("submitLineup", { roomId, requestId: requestId() }, players[1]!.idToken);
    expect(wrong).toMatchObject({ status: "playing", correct: 7, total: 8 });
    expect(Date.parse(wrong.endsAt)).toBe(endsBefore - 15_000);
    expect(await room(roomId)).toMatchObject({ attempts: 1, penaltySec: 15, lastCheck: { correct: 7, total: 8 } });

    await placeAll(roomId, players);
    const winId = requestId();
    const won = await callOk<{ status: string; result: { couponId: string; xp: number; playerCardId: string; codes: { redeemToken: string } } }>(
      "submitLineup", { roomId, requestId: winId, platform: "ios" }, players[2]!.idToken);
    expect(won.status).toBe("won");
    expect(won.result).toMatchObject({ xp: 50, outcome: "won" });
    expect(won.result.codes.redeemToken.length).toBeGreaterThan(10);
    expect(won.result.playerCardId).toMatch(/^p\d{2}$/);
    // نفس الطلب ما يكرر المكافأة، والرمز الصريح ما يُخزن.
    const again = await callOk<{ result: { codes: unknown } }>("submitLineup", { roomId, requestId: winId }, players[2]!.idToken);
    expect(again.result.codes).toBeNull();

    expect(await stock()).toEqual({ total: 10, reserved: 0, issued: 3, remaining: 7 });
    for (const p of players) {
      const user = (await db.doc(`users/${p.uid}`).get()).data()!;
      expect(user.coopWins.count).toBe(1);
      expect(user.ownedPlayers).toHaveLength(1);
      expect((await db.doc(`users/${p.uid}/playerCards/${user.ownedPlayers[0]}`).get()).get("count")).toBe(1);
      const view = (await db.doc(`rooms/${roomId}/views/${p.uid}`).get()).data()!;
      expect(view.result).toMatchObject({ outcome: "won", xp: 50, packs: 1 });
      const coupon = (await db.doc(`coupons/${view.result.couponId}`).get()).data()!;
      expect(coupon).toMatchObject({ uid: p.uid, status: "issued", source: { trigger: "co_op_win", roomId } });
      expect((await db.doc(`campaigns/cmp_coop/claims/${p.uid}`).get()).get("count")).toBe(1);
    }
    expect((await db.doc("campaigns/cmp_coop").get()).get("totals.issued")).toBe(3);
    const win = (await db.collection("events").where("name", "==", "co_op_win").get()).docs.map((d) => d.data());
    expect(win).toHaveLength(1);
    expect(win[0]).toMatchObject({ uid: players[2]!.uid, teamSize: 3, slotsCount: 8, attempts: 2, couponMode: "with_coupons", couponsIssued: 3, platform: "ios" });
    expect((await db.collection("events").where("name", "==", "co_op_round_started").get()).size).toBe(1);
  }, 60_000);

  it("rejects using the same piece twice and lets the owner lift it", async () => {
    const { players, roomId } = await team(2);
    await callOk("startRound", { roomId, requestId: requestId() }, players[0]!.idToken);
    await skipCountdown(roomId);
    const r = await room(roomId);
    const [a, b] = (r.slots as { slotId: string; ownerUid: string }[]).filter((s) => s.ownerUid === players[0]!.uid);
    const piece = r.pieces[0].playerId;
    await callOk("placePiece", { roomId, slotId: a!.slotId, playerId: piece }, players[0]!.idToken);
    expect((await callFunction("placePiece", { roomId, slotId: b!.slotId, playerId: piece }, players[0]!.idToken)).body.error?.message).toBe("PIECE_IN_USE");
    await callOk("placePiece", { roomId, slotId: a!.slotId, playerId: null }, players[0]!.idToken);
    await callOk("placePiece", { roomId, slotId: b!.slotId, playerId: piece }, players[0]!.idToken);
    expect((await room(roomId)).placements).toEqual({ [b!.slotId]: piece });
  });
});

describe("AT-06 — host leaves mid-round", () => {
  it("hands over to the oldest member within the heartbeat timeout, moves slots and cards, releases the host's reservation", async () => {
    await coopCampaign(10);
    const { players, roomId } = await team(4);
    const [host, second] = players;
    await callOk("startRound", { roomId, requestId: requestId() }, host!.idToken);
    await skipCountdown(roomId);
    const { db } = admin();
    const before = await room(roomId);
    const pieceSlot = (before.slots as { slotId: string; ownerUid: string }[]).find((s) => s.ownerUid === second!.uid)!;
    const priv = (await db.doc(`rooms/${roomId}/private/solution`).get()).data()!;
    await callOk("placePiece", { roomId, slotId: pieceSlot.slotId, playerId: priv.puzzle.solution[pieceSlot.slotId] }, second!.idToken);

    // آخر نبض للمضيف قبل 31 ث، والباقين الحين.
    for (const p of players) await callOk("roomHeartbeat", { roomId }, p.idToken);
    await db.doc(`rooms/${roomId}/presence/${host!.uid}`).set({ lastSeen: Timestamp.fromMillis(Date.now() - 31_000) });
    const after = await callOk<RoomSummary>("roomHeartbeat", { roomId }, players[3]!.idToken);
    expect(after.hostUid).toBe(second!.uid);
    expect(after.members.map((m) => m.uid)).not.toContain(host!.uid);

    const r = await room(roomId);
    expect(r.endsAt.toMillis()).toBe(before.endsAt.toMillis());
    expect(r.placements).toEqual({ [pieceSlot.slotId]: priv.puzzle.solution[pieceSlot.slotId] });
    const owners = (r.slots as { ownerUid: string }[]).map((s) => s.ownerUid);
    expect(owners).not.toContain(host!.uid);
    const counts = players.slice(1).map((p) => owners.filter((o) => o === p.uid).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    expect(r.reservedCouponIds).toHaveLength(3);
    expect(await stock()).toEqual({ total: 10, reserved: 3, issued: 0, remaining: 7 });
    const hostCoupon = priv.reservations[host!.uid];
    expect((await db.doc(`coupons/${hostCoupon}`).get()).get("status")).toBe("released");
    // كل البطاقات صارت عند الباقين.
    let cards = 0;
    for (const p of players.slice(1)) cards += (await db.doc(`rooms/${roomId}/views/${p.uid}`).get()).get("infoCards").length;
    expect(cards).toBe(r.pieces.length);

    await placeAll(roomId, players.slice(1));
    const won = await callOk<{ status: string }>("submitLineup", { roomId, requestId: requestId() }, second!.idToken);
    expect(won.status).toBe("won");
    expect((await db.doc(`rooms/${roomId}/views/${host!.uid}`).get()).get("result.outcome")).toBe("left");
    expect((await db.doc(`users/${host!.uid}`).get()).get("coopWins")).toBeUndefined();
    expect(await stock()).toEqual({ total: 10, reserved: 0, issued: 3, remaining: 7 });
  }, 60_000);

  it("if everyone leaves, closeRound makes it lost at endsAt and releases everything", async () => {
    await coopCampaign(10);
    const { players, roomId } = await team(2);
    await callOk("startRound", { roomId, requestId: requestId() }, players[0]!.idToken);
    for (const p of players) await callOk("leaveRoom", { roomId }, p.idToken);
    expect(await stock()).toEqual({ total: 10, reserved: 0, issued: 0, remaining: 10 });
    expect(await sweepRooms()).toBe(0);
    await admin().db.doc(`rooms/${roomId}`).update({ endsAt: Timestamp.fromMillis(Date.now() - 1000) });
    expect(await sweepRooms()).toBe(1);
    expect((await room(roomId)).status).toBe("lost");
  });
});

describe("AT-07 — two teams race for the last coupons", () => {
  it("serialises the group reservation: one room with coupons, the other without; a loss releases within the sweep", async () => {
    await coopCampaign(3);
    const [a, b] = [await team(3), await team(3)];
    const [ra, rb] = await Promise.all([
      callOk<RoomSummary>("startRound", { roomId: a.roomId, requestId: requestId() }, a.players[0]!.idToken),
      callOk<RoomSummary>("startRound", { roomId: b.roomId, requestId: requestId() }, b.players[0]!.idToken),
    ]);
    expect([ra.couponMode, rb.couponMode].sort()).toEqual(["no_coupons", "with_coupons"]);
    expect(await stock()).toEqual({ total: 3, reserved: 3, issued: 0, remaining: 0 });

    const winner = ra.couponMode === "with_coupons" ? a : b;
    await admin().db.doc(`rooms/${winner.roomId}`).update({ endsAt: Timestamp.fromMillis(Date.now() - 1000) });
    await sweepRooms();
    expect((await room(winner.roomId)).status).toBe("lost");
    expect(await stock()).toEqual({ total: 3, reserved: 0, issued: 0, remaining: 3 });
    for (const p of winner.players) {
      expect((await admin().db.doc(`rooms/${winner.roomId}/views/${p.uid}`).get()).get("result")).toMatchObject({ outcome: "lost", xp: 10 });
    }
  });
});

describe("AT-08 — not enough stock for the whole team", () => {
  it("reserves nothing and gives everyone the epic-pack alternative on a win", async () => {
    await coopCampaign(2);
    const { players, roomId } = await team(4);
    const started = await callOk<RoomSummary>("startRound", { roomId, requestId: requestId() }, players[0]!.idToken);
    expect(started.couponMode).toBe("no_coupons");
    expect(await stock()).toEqual({ total: 2, reserved: 0, issued: 0, remaining: 2 });
    await skipCountdown(roomId);
    await placeAll(roomId, players);
    await callOk("submitLineup", { roomId, requestId: requestId() }, players[0]!.idToken);
    const { db } = admin();
    for (const p of players) {
      expect((await db.doc(`rooms/${roomId}/views/${p.uid}`).get()).get("result")).toMatchObject({ outcome: "won", xp: 50, packs: 0, epicPacks: 1, couponId: null });
      expect((await db.doc(`users/${p.uid}`).get()).get("packsGuaranteed.epic")).toBe(1);
    }
    expect((await db.collection("coupons").get()).size).toBe(0);
    expect(await stock()).toEqual({ total: 2, reserved: 0, issued: 0, remaining: 2 });
  });

  it("a player at the campaign limit is not counted: three reserved, the fourth gets the alternative", async () => {
    await coopCampaign(3);
    const { players, roomId } = await team(4);
    await admin().db.doc(`campaigns/cmp_coop/claims/${players[3]!.uid}`).set({ count: 1, lastAt: Timestamp.now() });
    const started = await callOk<RoomSummary>("startRound", { roomId, requestId: requestId() }, players[0]!.idToken);
    expect(started.couponMode).toBe("with_coupons");
    expect(await stock()).toEqual({ total: 3, reserved: 3, issued: 0, remaining: 0 });
    const { db } = admin();
    expect((await db.doc(`rooms/${roomId}/views/${players[3]!.uid}`).get()).get("notEligible")).toBe("campaign_limit");
    await skipCountdown(roomId);
    await placeAll(roomId, players);
    await callOk("submitLineup", { roomId, requestId: requestId() }, players[1]!.idToken);
    expect((await db.doc(`rooms/${roomId}/views/${players[3]!.uid}`).get()).get("result")).toMatchObject({ epicPacks: 1, couponId: null });
    expect((await db.doc(`rooms/${roomId}/views/${players[0]!.uid}`).get()).get("result.couponId")).toBeTruthy();
    expect(await stock()).toEqual({ total: 3, reserved: 0, issued: 3, remaining: 0 });
  });
});

describe("daily win-reward cap (GAME_RULES §7.8)", () => {
  it("a player with 5 rewarded wins today plays for fun and is not counted for coupons", async () => {
    await coopCampaign(5);
    const { players, roomId } = await team(2);
    const { db } = admin();
    await db.doc(`users/${players[1]!.uid}`).update({ coopWins: { day: gameDayId(new Date()), count: 5 } });
    await callOk("startRound", { roomId, requestId: requestId() }, players[0]!.idToken);
    expect(await stock()).toEqual({ total: 5, reserved: 1, issued: 0, remaining: 4 });
    expect((await db.doc(`rooms/${roomId}/views/${players[1]!.uid}`).get()).get("notEligible")).toBe("daily_cap");
    await skipCountdown(roomId);
    await placeAll(roomId, players);
    await callOk("submitLineup", { roomId, requestId: requestId() }, players[0]!.idToken);
    expect((await db.doc(`rooms/${roomId}/views/${players[1]!.uid}`).get()).get("result")).toMatchObject({ capped: true, xp: 0, playerCardId: null });
    expect((await db.doc(`users/${players[1]!.uid}`).get()).get("coopWins.count")).toBe(5);
  });
});

function plain(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plain(v)]));
  return value;
}
function shape(value: unknown, path = ""): string[] {
  if (value === null || typeof value !== "object") return [`${path}:${value === null ? "null" : typeof value}`];
  if (Array.isArray(value)) return value.length === 0 ? [`${path}:[]`] : shape(value[0], `${path}[]`);
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k)).sort();
}
const sample = (name: string) => JSON.parse(readFileSync(resolve(__dirname, `../../../../shared/contracts/samples/${name}.json`), "utf8"));

describe("contract samples (Unity client)", () => {
  it("startRound, room, view and a winning submitLineup match the samples", async () => {
    await coopCampaign(10);
    const { players, roomId } = await team(2);
    const start = await callFunction("startRound", { roomId, requestId: requestId() }, players[0]!.idToken);
    expect(shape(start.body)).toEqual(shape(sample("startRound.ok")));
    await skipCountdown(roomId);
    const { db } = admin();
    const solution = (await db.doc(`rooms/${roomId}/private/solution`).get()).get("puzzle.solution") as Record<string, string>;
    const wrongSlot = Object.keys(solution)[0]!;
    const r = await room(roomId);
    const owner = (r.slots as { slotId: string; ownerUid: string }[]).find((s) => s.slotId === wrongSlot)!.ownerUid;
    const decoy = (r.pieces as { playerId: string }[]).map((p) => p.playerId).find((p) => !Object.values(solution).includes(p))!;
    await placeAll(roomId, players);
    await callOk("placePiece", { roomId, slotId: wrongSlot, playerId: decoy }, players.find((p) => p.uid === owner)!.idToken);
    await callOk("submitLineup", { roomId, requestId: requestId() }, players[0]!.idToken);
    // placements خريطة بمفاتيح متغيرة (s1..sN): نقارن شكل مدخل واحد.
    const live = plain(await room(roomId)) as Record<string, unknown>;
    live.placements = { s1: "p01" };
    expect(shape(live)).toEqual(shape(sample("room.playing")));
    expect(shape(plain((await db.doc(`rooms/${roomId}/views/${players[0]!.uid}`).get()).data()))).toEqual(shape(sample("room.view")));

    await callOk("placePiece", { roomId, slotId: wrongSlot, playerId: solution[wrongSlot] }, players.find((p) => p.uid === owner)!.idToken);
    const won = await callFunction("submitLineup", { roomId, requestId: requestId() }, players[1]!.idToken);
    expect(shape(won.body)).toEqual(shape(sample("submitLineup.won")));
  }, 60_000);
});
