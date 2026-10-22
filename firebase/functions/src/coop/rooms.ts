import { DocumentReference, DocumentSnapshot, FieldValue, getFirestore, Timestamp, Transaction } from "firebase-admin/firestore";
import { loadPlayers, PlayerContent } from "../content/catalog.js";
import { CampaignRef, DEFAULT_VALIDITY_DAYS, liveCampaigns, MANUAL_CODE_LENGTH } from "../coupons/issue.js";
import type { Rng } from "../economy/packs.js";
import { cryptoRng, grantXp, readWallet, requestRef, walletPatch } from "../economy/wallet.js";
import { normalizeManual, randomCode, randomToken128, sha256 } from "../shared/codes.js";
import { fail } from "../shared/errors.js";
import { ClientMeta, writeEvent } from "../shared/events.js";
import { gameDayId } from "../shared/gameDay.js";
import { drawPlayerCard } from "./playerCards.js";
import { correctCount, generatePuzzleFromSeed, Puzzle, slotsCountFor } from "./puzzle.js";
import { assignInfo, assignSlots, COOP, CouponMode, endsAtMs, Member, nextHost, planReservation, redistribute, viewFor } from "./rounds.js";

/**
 * «منتخبنا يجمعنا» — GAME_RULES §7 و§8.4، وDATA_CONTRACTS §6. كل الحالة يكتبها الخادم:
 * - `rooms/{id}`: الحالة المشتركة (الأعضاء، والخانات وأصحابها، والقطع بالاسم والمركز فقط، والتشكيلة الموضوعة).
 * - `rooms/{id}/views/{uid}`: شروط خانات اللاعب وبطاقات معلوماته (يقرأها صاحبها فقط)، ونتيجته الخاصة.
 * - `rooms/{id}/private/solution`: اللغز والحل والحجوزات (خادم فقط).
 * - `rooms/{id}/presence/{uid}`: آخر نبض (يكتبه `roomHeartbeat` — Q33).
 */
export type RoomStatus = "open" | "playing" | "won" | "lost" | "closed";

export interface RoomDoc {
  code: string;
  branchId: string;
  brandId: string;
  hostUid: string;
  members: Member[];
  /** نسخة مسطحة لقواعد الأمان (القراءة للأعضاء فقط) — Q33. */
  memberUids: string[];
  status: RoomStatus;
  createdAt: Timestamp;
  lobbyExpiresAt: Timestamp;
  slotsCount: number | null;
  startAt: Timestamp | null;
  endsAt: Timestamp | null;
  penaltySec: number;
  attempts: number;
  placements: Record<string, string>;
  lastCheck: { correct: number; total: number; at: Timestamp } | null;
  couponMode: CouponMode | null;
  campaignId: string | null;
  reservedCouponIds: string[];
  /** الخانات العامة: المركز وصاحبها (الشرط في منظور صاحبها فقط). */
  slots: { slotId: string; position: string; ownerUid: string }[];
  /** القطع: الاسم والمركز فقط (§7.3) — الإحصاءات في بطاقات المعلومات. */
  pieces: { playerId: string; ar: string; en: string; position: string }[];
  closedAt: Timestamp | null;
}

interface PrivateDoc {
  seed: string;
  puzzle: Puzzle;
  owners: Record<string, string>;
  info: Record<string, string[]>;
  /** uid ← couponId المحجوزة (§8.4). */
  reservations: Record<string, string>;
  /** سبب عدم الأهلية لكل لاعب ما انحجز له (للبديل والرسالة). */
  notEligible: Record<string, "campaign_limit" | "daily_cap">;
  campaign: { id: string; validityDays: number; title: unknown; terms: unknown } | null;
}

export interface PlayerRoundResult {
  outcome: "won" | "lost" | "left";
  xp: number;
  packs: number;
  epicPacks: number;
  playerCardId: string | null;
  couponId: string | null;
  /** daily_cap: فاز بدون مكافآت (§7.8). */
  capped: boolean;
}

const db = () => getFirestore();
const roomRef = (id: string) => db().doc(`rooms/${id}`);
const privRef = (id: string) => db().doc(`rooms/${id}/private/solution`);
const viewRef = (id: string, uid: string) => db().doc(`rooms/${id}/views/${uid}`);
const presenceRef = (id: string, uid: string) => db().doc(`rooms/${id}/presence/${uid}`);
const codeRef = (branchId: string, code: string) => db().doc(`roomCodes/${branchId}_${code}`);

const ms = (t: Timestamp | null | undefined) => (t ? t.toMillis() : 0);
const iso = (t: Timestamp | null | undefined) => (t ? t.toDate().toISOString() : null);
const activeUids = (room: Pick<RoomDoc, "members">) => room.members.filter((m) => m.active).map((m) => m.uid);

let playersCache: { content: ReturnType<typeof loadPlayers>; byId: Map<string, PlayerContent> } | null = null;
function players() {
  if (!playersCache) {
    const content = loadPlayers();
    playersCache = { content, byId: new Map(content.players.map((p) => [p.id, p])) };
  }
  return playersCache;
}

function str(value: unknown, state = "INVALID_ARGUMENT"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 128 || value.includes("/")) fail("invalid-argument", state);
  return value as string;
}

function readRoom(snap: DocumentSnapshot): RoomDoc {
  if (!snap.exists) fail("not-found", "ROOM_NOT_FOUND");
  return snap.data() as RoomDoc;
}

function requireMember(room: RoomDoc, uid: string, active = true): Member {
  const m = room.members.find((x) => x.uid === uid);
  if (!m || (active && !m.active)) fail("permission-denied", "ROOM_NOT_MEMBER");
  return m!;
}

/** ملخص يرجع للعميل في كل ردّ (مع وقت الخادم لحساب العد — §7.6). */
export function summary(id: string, room: RoomDoc, now: Date) {
  return {
    roomId: id,
    code: room.code,
    status: room.status,
    hostUid: room.hostUid,
    members: room.members.filter((m) => m.active).map((m) => ({ uid: m.uid, alias: m.alias })),
    lobbyExpiresAt: iso(room.lobbyExpiresAt),
    startAt: iso(room.startAt),
    endsAt: iso(room.endsAt),
    couponMode: room.couponMode,
    serverNow: now.toISOString(),
  };
}

async function requireCheckIn(tx: Transaction, uid: string, branchId: string, now: Date): Promise<void> {
  const visit = await tx.get(db().doc(`visits/${uid}_${branchId}_${gameDayId(now)}`));
  if (!visit.exists) fail("failed-precondition", "ROOM_NEED_CHECKIN");
}

function requireProfile(snap: DocumentSnapshot) {
  if (!snap.exists) fail("failed-precondition", "NEEDS_ONBOARDING");
  if (snap.get("deletionRequestedAt")) fail("failed-precondition", "ACCOUNT_DELETION_PENDING");
  return snap.data()!;
}

// ───────────────────────────── الردهة ─────────────────────────────

/** createRoom — رمز من 4 أرقام فريد بين الغرف المفتوحة في نفس الفرع، صالح 10 دقائق (§7.2). */
export async function createRoom(uid: string, input: { branchId?: string } & ClientMeta, now = new Date()) {
  const branchId = str(input?.branchId);
  const branch = await db().doc(`branches/${branchId}`).get();
  if (!branch.exists || branch.get("active") !== true) fail("failed-precondition", "QR_BRANCH_INACTIVE");

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode(4, "0123456789");
    const created = await db().runTransaction(async (tx) => {
      const [codeSnap, userSnap] = await Promise.all([tx.get(codeRef(branchId, code)), tx.get(db().doc(`users/${uid}`))]);
      const user = requireProfile(userSnap);
      await requireCheckIn(tx, uid, branchId, now);
      if (codeSnap.exists && ms(codeSnap.get("expiresAt")) > now.getTime()) return null;

      const lobbyExpiresAt = Timestamp.fromMillis(now.getTime() + COOP.lobbyMinutes * 60_000);
      const ref = db().collection("rooms").doc(`room_${code}_${gameDayId(now).replace(/-/g, "")}_${randomCode(5).toLowerCase()}`);
      const room: RoomDoc = {
        code,
        branchId,
        brandId: branch.get("brandId"),
        hostUid: uid,
        members: [{ uid, alias: user.displayName ?? "", joinedAt: now.toISOString(), active: true }],
        memberUids: [uid],
        status: "open",
        createdAt: Timestamp.fromDate(now),
        lobbyExpiresAt,
        slotsCount: null,
        startAt: null,
        endsAt: null,
        penaltySec: 0,
        attempts: 0,
        placements: {},
        lastCheck: null,
        couponMode: null,
        campaignId: null,
        reservedCouponIds: [],
        slots: [],
        pieces: [],
        closedAt: null,
      };
      tx.create(ref, room);
      tx.set(codeRef(branchId, code), { roomId: ref.id, expiresAt: lobbyExpiresAt });
      tx.set(presenceRef(ref.id, uid), { lastSeen: Timestamp.fromDate(now) });
      writeEvent(tx, "co_op_room_created", uid, user.city ?? null, input, { roomId: ref.id, branchId, brandId: room.brandId }, now);
      return summary(ref.id, room, now);
    });
    if (created) return created;
  }
  fail("resource-exhausted", "SRV_BUSY");
}

/** joinRoom — بالرمز داخل نفس الفرع، وبتسجيل حضور اليوم فيه (§7.2). الرجوع لنفس الغرفة في الردهة مسموح. */
export async function joinRoom(uid: string, input: { branchId?: string; code?: string }, now = new Date()) {
  const branchId = str(input?.branchId);
  const code = typeof input?.code === "string" && /^\d{4}$/.test(input.code) ? input.code : fail("invalid-argument", "ROOM_NOT_FOUND");
  return db().runTransaction(async (tx) => {
    const codeSnap = await tx.get(codeRef(branchId, code));
    if (!codeSnap.exists) fail("not-found", "ROOM_NOT_FOUND");
    const id = codeSnap.get("roomId") as string;
    const [roomSnap, userSnap] = await Promise.all([tx.get(roomRef(id)), tx.get(db().doc(`users/${uid}`))]);
    const user = requireProfile(userSnap);
    await requireCheckIn(tx, uid, branchId, now);
    const room = readRoom(roomSnap);
    if (room.status !== "open") fail("failed-precondition", "ROOM_STARTED");
    if (ms(room.lobbyExpiresAt) <= now.getTime()) fail("failed-precondition", "ROOM_LOBBY_EXPIRED");

    const existing = room.members.find((m) => m.uid === uid);
    if (!existing && activeUids(room).length >= COOP.maxPlayers) fail("failed-precondition", "ROOM_FULL");
    const members = existing
      ? room.members.map((m) => (m.uid === uid ? { ...m, active: true } : m))
      : [...room.members, { uid, alias: user.displayName ?? "", joinedAt: now.toISOString(), active: true }];
    const next = { ...room, members, memberUids: members.map((m) => m.uid) };
    tx.update(roomRef(id), { members, memberUids: next.memberUids });
    tx.set(presenceRef(id, uid), { lastSeen: Timestamp.fromDate(now) });
    return summary(id, next, now);
  });
}

// ───────────────────────────── بدء الجولة ─────────────────────────────

/**
 * startRound — المضيف فقط، ولاعبان على الأقل (§7.6). في معاملة وحدة: الحجز الجماعي كله أو لا شيء (§8.4)،
 * وتوليد اللغز وتوزيع الخانات والبطاقات، والانتقال إلى `playing` مع عد تنازلي 5 ث يُعلن فيه وضع القسائم.
 */
export async function startRound(uid: string, input: { roomId?: string; requestId?: string } & ClientMeta, now = new Date()) {
  const id = str(input?.roomId);
  const reqRef = requestRef(db(), uid, input?.requestId);
  const pre = readRoom(await roomRef(id).get());
  const campaigns = await liveCampaigns(pre.branchId, "co_op_win", now);
  const campaign: CampaignRef | null = campaigns.sort((a, b) => ms(a.data.startAt) - ms(b.data.startAt))[0] ?? null;
  const day = gameDayId(now);

  const result = await db().runTransaction(async (tx) => {
    const [reqSnap, roomSnap] = await Promise.all([tx.get(reqRef), tx.get(roomRef(id))]);
    if (reqSnap.exists) return reqSnap.get("result") as ReturnType<typeof summary>;
    const room = readRoom(roomSnap);
    requireMember(room, uid);
    if (room.status !== "open") fail("failed-precondition", "ROOM_STARTED");
    if (ms(room.lobbyExpiresAt) <= now.getTime()) fail("failed-precondition", "ROOM_LOBBY_EXPIRED");
    if (room.hostUid !== uid) fail("permission-denied", "ROOM_NOT_HOST");
    const team = activeUids(room);
    if (team.length < COOP.minPlayers) fail("failed-precondition", "ROOM_NEED_TWO");

    // كل القراءات قبل أي كتابة.
    const userSnaps = await Promise.all(team.map((u) => tx.get(db().doc(`users/${u}`))));
    const stockRef = campaign ? db().doc(`campaigns/${campaign.id}/stock/${room.branchId}`) : null;
    const stockSnap = stockRef ? await tx.get(stockRef) : null;
    const claimSnaps = campaign ? await Promise.all(team.map((u) => tx.get(db().doc(`campaigns/${campaign.id}/claims/${u}`)))) : [];

    const notEligible: PrivateDoc["notEligible"] = {};
    const eligible: string[] = [];
    team.forEach((u, i) => {
      const wins = userSnaps[i]!.get("coopWins") as { day: string; count: number } | undefined;
      if (wins?.day === day && wins.count >= COOP.dailyWinRewards) notEligible[u] = "daily_cap";
      else if (campaign && ((claimSnaps[i]?.get("count") as number | undefined) ?? 0) >= (campaign.data.perUserLimit ?? 1)) notEligible[u] = "campaign_limit";
      else eligible.push(u);
    });
    const stock = stockSnap?.exists ? (stockSnap.data() as { total: number; reserved: number; issued: number; remaining: number }) : null;
    const plan = planReservation(Boolean(campaign && stock), eligible, stock?.remaining ?? 0);

    const reservations: Record<string, string> = {};
    if (plan.mode === "with_coupons" && stock && campaign && stockRef) {
      const next = { ...stock, reserved: stock.reserved + plan.reserveFor.length, remaining: stock.remaining - plan.reserveFor.length };
      if (next.remaining < 0 || next.remaining !== next.total - next.reserved - next.issued) throw new Error(`stock invariant violated for ${campaign.id}/${room.branchId}`);
      tx.set(stockRef, next);
      for (const u of plan.reserveFor) {
        const couponRef = db().collection("coupons").doc();
        reservations[u] = couponRef.id;
        tx.create(couponRef, {
          campaignId: campaign.id,
          brandId: campaign.data.brandId,
          title: campaign.data.title,
          terms: campaign.data.terms,
          uid: u,
          issuedBranchId: room.branchId,
          status: "reserved",
          source: { trigger: "co_op_win", roomId: id },
          reservedAt: Timestamp.fromDate(now),
          redeemedAt: null,
          redeemedBranchId: null,
          redeemedBy: null,
        });
      }
    }

    const slotsCount = slotsCountFor(team.length);
    const seed = `${id}:${now.getTime()}`;
    const { content, byId } = players();
    const puzzle = generatePuzzleFromSeed(content, slotsCount, seed);
    const owners = assignSlots(puzzle.slots.map((s) => s.slotId), team);
    const info = assignInfo(puzzle, owners, team);
    const startAt = Timestamp.fromMillis(now.getTime() + COOP.countdownSec * 1000);
    const members = room.members.filter((m) => m.active);
    const update: Partial<RoomDoc> = {
      status: "playing",
      members,
      memberUids: members.map((m) => m.uid),
      slotsCount,
      startAt,
      endsAt: Timestamp.fromMillis(endsAtMs(startAt.toMillis(), 0)),
      penaltySec: 0,
      attempts: 0,
      placements: {},
      lastCheck: null,
      couponMode: plan.mode,
      campaignId: campaign?.id ?? null,
      reservedCouponIds: Object.values(reservations),
      slots: puzzle.slots.map((s) => ({ slotId: s.slotId, position: s.position, ownerUid: owners[s.slotId]! })),
      pieces: puzzle.pieces.map((p) => ({ playerId: p, ar: byId.get(p)!.ar, en: byId.get(p)!.en, position: byId.get(p)!.position })),
    };
    tx.update(roomRef(id), update);
    tx.delete(codeRef(room.branchId, room.code));
    const priv: PrivateDoc = {
      seed,
      puzzle,
      owners,
      info,
      reservations,
      notEligible,
      campaign: campaign ? { id: campaign.id, validityDays: campaign.data.couponValidityDays ?? DEFAULT_VALIDITY_DAYS, title: campaign.data.title, terms: campaign.data.terms } : null,
    };
    tx.set(privRef(id), priv);
    for (const u of team) {
      tx.set(viewRef(id, u), { ...viewFor(u, puzzle, owners, info, (p) => byId.get(p)!.stats), notEligible: notEligible[u] ?? null, result: null });
    }
    writeEvent(tx, "co_op_round_started", uid, userSnaps[0]!.get("city") ?? null, input, {
      roomId: id, branchId: room.branchId, brandId: room.brandId, teamSize: team.length, slotsCount, couponMode: plan.mode,
    }, now);
    const out = summary(id, { ...room, ...update } as RoomDoc, now);
    tx.create(reqRef, { fn: "startRound", result: out, at: Timestamp.fromDate(now) });
    return out;
  });
  if (result.endsAt) await scheduleClose(id, new Date(result.endsAt));
  return result;
}

// ───────────────────────────── الحركات ─────────────────────────────

/** placePiece — صاحب الخانة فقط، والقطعة غير مستخدمة في خانة ثانية. `playerId: null` يرفعها (§7.5). */
export async function placePiece(uid: string, input: { roomId?: string; slotId?: string; playerId?: string | null }, now = new Date()) {
  const id = str(input?.roomId);
  const slotId = str(input?.slotId);
  const playerId = input?.playerId === null ? null : str(input?.playerId);
  return db().runTransaction(async (tx) => {
    const room = readRoom(await tx.get(roomRef(id)));
    requireMember(room, uid);
    if (room.status !== "playing") fail("failed-precondition", "ROUND_NOT_PLAYING");
    if (now.getTime() >= ms(room.endsAt)) {
      const closed = await finishLoss(tx, id, room, now);
      return summary(id, closed, now);
    }
    if (now.getTime() < ms(room.startAt)) fail("failed-precondition", "ROUND_NOT_STARTED");
    const slot = room.slots.find((s) => s.slotId === slotId);
    if (!slot || slot.ownerUid !== uid) fail("permission-denied", "SLOT_NOT_YOURS");
    const placements = { ...room.placements };
    if (playerId === null) delete placements[slotId];
    else {
      if (!room.pieces.some((p) => p.playerId === playerId)) fail("invalid-argument", "PIECE_UNKNOWN");
      const usedIn = Object.entries(placements).find(([s, p]) => p === playerId && s !== slotId);
      if (usedIn) fail("failed-precondition", "PIECE_IN_USE");
      placements[slotId] = playerId;
    }
    tx.update(roomRef(id), { placements });
    return { ...summary(id, room, now), placements };
  });
}

/**
 * submitLineup — أي لاعب عند امتلاء كل الخانات (§7.5). صحيحة ← `won` والمكافآت لكل الأعضاء الباقين.
 * خاطئة ← عدد الصحيحة فقط، و−15 ث. `requestId` يمنع تكرار التأكيد من نفس الضغطة.
 */
export async function submitLineup(uid: string, input: { roomId?: string; requestId?: string } & ClientMeta, now = new Date(), rng: Rng = cryptoRng) {
  const id = str(input?.roomId);
  const reqRef = requestRef(db(), uid, input?.requestId);
  return db().runTransaction(async (tx) => {
    const [reqSnap, roomSnap, privSnap] = await Promise.all([tx.get(reqRef), tx.get(roomRef(id)), tx.get(privRef(id))]);
    if (reqSnap.exists) return reqSnap.get("result");
    const room = readRoom(roomSnap);
    requireMember(room, uid);
    if (room.status !== "playing") fail("failed-precondition", "ROUND_NOT_PLAYING");
    if (now.getTime() < ms(room.startAt)) fail("failed-precondition", "ROUND_NOT_STARTED");
    if (now.getTime() >= ms(room.endsAt)) {
      const closed = await finishLoss(tx, id, room, now, privSnap);
      return { ...summary(id, closed, now), correct: null };
    }
    if (room.slots.some((s) => !room.placements[s.slotId])) fail("failed-precondition", "LINEUP_INCOMPLETE");
    const priv = privSnap.data() as PrivateDoc;
    const total = room.slots.length;
    const correct = correctCount(room.placements, priv.puzzle.solution);

    if (correct === total) {
      const { room: won, mine } = await finishWin(tx, id, room, priv, uid, input, now, rng);
      const out = { ...summary(id, won, now), correct, total, result: mine };
      tx.create(reqRef, { fn: "submitLineup", result: { ...out, result: { ...mine, codes: null } }, at: Timestamp.fromDate(now) });
      return out;
    }

    const penaltySec = room.penaltySec + COOP.penaltySec;
    const endsAt = Timestamp.fromMillis(endsAtMs(ms(room.startAt), penaltySec));
    const lastCheck = { correct, total, at: Timestamp.fromDate(now) };
    if (endsAt.toMillis() <= now.getTime()) {
      const closed = await finishLoss(tx, id, { ...room, penaltySec, endsAt, attempts: room.attempts + 1, lastCheck }, now, privSnap);
      return { ...summary(id, closed, now), correct, total };
    }
    tx.update(roomRef(id), { penaltySec, endsAt, attempts: room.attempts + 1, lastCheck });
    const out = { ...summary(id, { ...room, endsAt }, now), correct, total };
    tx.create(reqRef, { fn: "submitLineup", result: out, at: Timestamp.fromDate(now) });
    return out;
  }).then(async (out) => {
    // العقوبة قرّبت النهاية: مهمة إغلاق جديدة عند endsAt الجديد (المهمة القديمة ما تسوي شي).
    if (out && (out as { status?: string }).status === "playing" && (out as { endsAt?: string }).endsAt) await scheduleClose(id, new Date((out as { endsAt: string }).endsAt));
    return out;
  });
}

// ───────────────────────────── الخروج والنبض ─────────────────────────────

/** leaveRoom — في الردهة: يطلع من القائمة. أثناء اللعب: غير نشط، وخاناته وبطاقاته للباقين، وحجزه يُحرر (§7.7). */
export async function leaveRoom(uid: string, input: { roomId?: string }, now = new Date()) {
  const id = str(input?.roomId);
  return db().runTransaction(async (tx) => {
    const [roomSnap, privSnap] = await Promise.all([tx.get(roomRef(id)), tx.get(privRef(id))]);
    const room = readRoom(roomSnap);
    requireMember(room, uid, false);
    if (room.status !== "open" && room.status !== "playing") return summary(id, room, now);
    const next = await depart(tx, id, room, privSnap, [uid], now);
    return summary(id, next, now);
  });
}

/**
 * roomHeartbeat — كل 5 ث من كل لاعب. يسجّل النبض، ويطلّع أي عضو انقطع نبضه أكثر من 30 ث (§7.7، AT-06)،
 * وينهي الجولة إذا خلص وقتها، أو الردهة إذا انتهت مهلتها.
 */
export async function heartbeat(uid: string, input: { roomId?: string }, now = new Date()) {
  const id = str(input?.roomId);
  const pre = readRoom(await roomRef(id).get());
  requireMember(pre, uid, false);
  if (pre.members.some((m) => m.uid === uid && m.active)) await presenceRef(id, uid).set({ lastSeen: Timestamp.fromDate(now) });

  const stale = await staleMembers(id, pre, now);
  const due =
    (pre.status === "playing" && now.getTime() >= ms(pre.endsAt)) ||
    (pre.status === "open" && now.getTime() >= ms(pre.lobbyExpiresAt));
  if (stale.length === 0 && !due) return summary(id, pre, now);

  return db().runTransaction(async (tx) => {
    const [roomSnap, privSnap] = await Promise.all([tx.get(roomRef(id)), tx.get(privRef(id))]);
    let room = readRoom(roomSnap);
    if (room.status === "playing" && now.getTime() >= ms(room.endsAt)) room = await finishLoss(tx, id, room, now, privSnap);
    else if (room.status === "open" && now.getTime() >= ms(room.lobbyExpiresAt)) room = expireLobby(tx, id, room, now);
    else {
      const confirmed = stale.filter((u) => room.members.some((m) => m.uid === u && m.active));
      if (confirmed.length > 0) room = await depart(tx, id, room, privSnap, confirmed, now);
    }
    return summary(id, room, now);
  });
}

/** آخر نبض لكل عضو نشط (بدون نبض ← وقت الانضمام). */
async function staleMembers(id: string, room: RoomDoc, now: Date): Promise<string[]> {
  const active = room.members.filter((m) => m.active);
  if (active.length === 0) return [];
  const snaps = await db().getAll(...active.map((m) => presenceRef(id, m.uid)));
  const cutoff = now.getTime() - COOP.heartbeatTimeoutSec * 1000;
  return active.filter((m, i) => (ms(snaps[i]!.get("lastSeen")) || Date.parse(m.joinedAt)) < cutoff).map((m) => m.uid);
}

/**
 * خروج لاعب أو أكثر. لازم تكون قراءات الغرفة والملف الخاص تمت قبلها (تقرأ هنا المخزون فقط إذا فيه حجز يتحرر).
 */
async function depart(tx: Transaction, id: string, room: RoomDoc, privSnap: DocumentSnapshot, leavers: string[], now: Date): Promise<RoomDoc> {
  if (room.status === "open") {
    const members = room.members.filter((m) => !leavers.includes(m.uid));
    if (members.length === 0) return expireLobby(tx, id, { ...room, members, memberUids: [] }, now);
    const hostUid = leavers.includes(room.hostUid) ? nextHost(members)! : room.hostUid;
    const next = { ...room, members, memberUids: members.map((m) => m.uid), hostUid };
    tx.update(roomRef(id), { members: next.members, memberUids: next.memberUids, hostUid });
    return next;
  }

  // أثناء اللعب: يبقى عضوًا (يقرأ النتيجة) لكن غير نشط.
  const priv = privSnap.data() as PrivateDoc;
  const released = leavers.filter((u) => priv.reservations[u]);
  const stock = released.length > 0 && priv.campaign ? await readStock(tx, priv.campaign.id, room.branchId) : null;

  const members = room.members.map((m) => (leavers.includes(m.uid) ? { ...m, active: false } : m));
  const remaining = members.filter((m) => m.active).map((m) => m.uid);
  const hostUid = leavers.includes(room.hostUid) ? (nextHost(members) ?? room.hostUid) : room.hostUid;
  const moved = redistribute(priv.puzzle, priv.owners, remaining);
  const reservations = { ...priv.reservations };
  if (stock) releaseCoupons(tx, stock, released.map((u) => reservations[u]!), now);
  for (const u of released) delete reservations[u];

  const slots = room.slots.map((s) => ({ ...s, ownerUid: moved.owners[s.slotId] ?? s.ownerUid }));
  tx.update(roomRef(id), { members, hostUid, slots, reservedCouponIds: Object.values(reservations) });
  tx.update(privRef(id), { owners: moved.owners, info: moved.info, reservations });
  const { byId } = players();
  for (const u of remaining) tx.update(viewRef(id, u), viewFor(u, priv.puzzle, moved.owners, moved.info, (p) => byId.get(p)!.stats));
  for (const u of leavers) tx.update(viewRef(id, u), { result: leftResult() });
  return { ...room, members, hostUid, slots, reservedCouponIds: Object.values(reservations) };
}

const leftResult = (): PlayerRoundResult => ({ outcome: "left", xp: 0, packs: 0, epicPacks: 0, playerCardId: null, couponId: null, capped: false });

function expireLobby(tx: Transaction, id: string, room: RoomDoc, now: Date): RoomDoc {
  tx.update(roomRef(id), { status: "closed", closedAt: Timestamp.fromDate(now), members: room.members, memberUids: room.memberUids });
  tx.delete(codeRef(room.branchId, room.code));
  return { ...room, status: "closed" };
}

// ───────────────────────────── النهاية ─────────────────────────────

interface StockRead {
  ref: DocumentReference;
  data: { total: number; reserved: number; issued: number; remaining: number };
}

async function readStock(tx: Transaction, campaignId: string, branchId: string): Promise<StockRead | null> {
  const ref = db().doc(`campaigns/${campaignId}/stock/${branchId}`);
  const snap = await tx.get(ref);
  return snap.exists ? { ref, data: snap.data() as StockRead["data"] } : null;
}

function writeStock(tx: Transaction, stock: StockRead, next: StockRead["data"]) {
  if (next.reserved < 0 || next.remaining < 0 || next.remaining !== next.total - next.reserved - next.issued) {
    throw new Error(`stock invariant violated at ${stock.ref.path}`);
  }
  tx.set(stock.ref, next);
  stock.data = next;
}

/** تحرير حجوزات (§8.4): القسيمة `released`، والمخزون reserved − n، وremaining + n. */
function releaseCoupons(tx: Transaction, stock: StockRead, couponIds: string[], now: Date) {
  if (couponIds.length === 0) return;
  for (const c of couponIds) tx.update(db().doc(`coupons/${c}`), { status: "released", releasedAt: Timestamp.fromDate(now) });
  writeStock(tx, stock, { ...stock.data, reserved: stock.data.reserved - couponIds.length, remaining: stock.data.remaining + couponIds.length });
}

/** خسارة (انتهاء الوقت): 10 XP لكل عضو باقٍ (ضمن الحد اليومي)، وتحرير كل الحجوزات. */
async function finishLoss(tx: Transaction, id: string, room: RoomDoc, now: Date, privSnap?: DocumentSnapshot): Promise<RoomDoc> {
  const ps = privSnap ?? (await tx.get(privRef(id)));
  const priv = ps.data() as PrivateDoc;
  const team = activeUids(room);
  const userSnaps = await Promise.all(team.map((u) => tx.get(db().doc(`users/${u}`))));
  const reserved = Object.values(priv.reservations);
  const stock = reserved.length > 0 && priv.campaign ? await readStock(tx, priv.campaign.id, room.branchId) : null;

  const day = gameDayId(now);
  team.forEach((u, i) => {
    const snap = userSnaps[i]!;
    if (!snap.exists) return;
    const wallet = grantXp(readWallet(snap.data()!), COOP.lossReward.xp, day);
    tx.update(snap.ref, walletPatch(wallet));
    tx.update(viewRef(id, u), { result: { ...leftResult(), outcome: "lost", xp: wallet.xp - (snap.get("xp") ?? 0) } satisfies PlayerRoundResult });
  });
  if (stock) releaseCoupons(tx, stock, reserved, now);
  const update = {
    status: "lost" as const,
    closedAt: Timestamp.fromDate(now),
    reservedCouponIds: [],
    penaltySec: room.penaltySec,
    endsAt: room.endsAt,
    attempts: room.attempts,
    lastCheck: room.lastCheck,
  };
  tx.update(roomRef(id), update);
  if (reserved.length > 0) tx.update(privRef(id), { reservations: {} });
  return { ...room, ...update };
}

/**
 * فوز (§7.6، §8.4، §10): لكل عضو باقٍ لم يصل حد 5 فوزات اليوم — 50 XP + بطاقة لاعب، ثم:
 * قسيمة محجوزة ← تُمنح + حزمة. حملة موجودة بدون حجز له ← حزمة ملحمية مضمونة بدل الحزمة. بدون حملة ← حزمة.
 */
async function finishWin(
  tx: Transaction,
  id: string,
  room: RoomDoc,
  priv: PrivateDoc,
  submitter: string,
  meta: ClientMeta,
  now: Date,
  rng: Rng,
): Promise<{ room: RoomDoc; mine: PlayerRoundResult & { codes: { redeemToken: string; manualCode: string } | null } }> {
  const team = activeUids(room);
  const userSnaps = await Promise.all(team.map((u) => tx.get(db().doc(`users/${u}`))));
  const reservedIds = Object.values(priv.reservations);
  const stock = reservedIds.length > 0 && priv.campaign ? await readStock(tx, priv.campaign.id, room.branchId) : null;

  const day = gameDayId(now);
  const { content } = players();
  let mine: PlayerRoundResult & { codes: { redeemToken: string; manualCode: string } | null } = { ...leftResult(), outcome: "won", codes: null };
  const capped: string[] = [];
  let couponsIssued = 0;

  team.forEach((u, i) => {
    const snap = userSnaps[i]!;
    if (!snap.exists) return;
    const data = snap.data()!;
    const wins = data.coopWins as { day: string; count: number } | undefined;
    const count = wins?.day === day ? wins.count : 0;
    const result: PlayerRoundResult = { outcome: "won", xp: 0, packs: 0, epicPacks: 0, playerCardId: null, couponId: null, capped: false };
    let codes: { redeemToken: string; manualCode: string } | null = null;

    if (count >= COOP.dailyWinRewards) {
      result.capped = true;
      capped.push(u);
    } else {
      let wallet = readWallet(data);
      const xpBefore = wallet.xp;
      wallet = grantXp(wallet, COOP.winReward.xp, day);
      result.xp = wallet.xp - xpBefore;

      const owned = new Set<string>((data.ownedPlayers as string[] | undefined) ?? []);
      const card = drawPlayerCard(content.players, owned, rng);
      result.playerCardId = card.playerId;
      const cardRef = db().doc(`users/${u}/playerCards/${card.playerId}`);
      if (card.duplicate) tx.update(cardRef, { count: FieldValue.increment(1), lastAt: Timestamp.fromDate(now) });
      else tx.set(cardRef, { playerId: card.playerId, count: 1, firstAt: Timestamp.fromDate(now) });
      owned.add(card.playerId);

      const couponId = priv.reservations[u];
      if (couponId && stock && priv.campaign) {
        codes = { redeemToken: randomToken128(), manualCode: randomCode(MANUAL_CODE_LENGTH) };
        tx.update(db().doc(`coupons/${couponId}`), {
          status: "issued",
          issuedAt: Timestamp.fromDate(now),
          expiresAt: Timestamp.fromMillis(now.getTime() + priv.campaign.validityDays * 24 * 3600_000),
          redeemTokenHash: sha256(codes.redeemToken),
          manualCodeHash: sha256(normalizeManual(codes.manualCode)),
        });
        writeStock(tx, stock, { ...stock.data, reserved: stock.data.reserved - 1, issued: stock.data.issued + 1 });
        tx.set(db().doc(`campaigns/${priv.campaign.id}/claims/${u}`), { count: FieldValue.increment(1), lastAt: Timestamp.fromDate(now) }, { merge: true });
        result.couponId = couponId;
        result.packs = COOP.winReward.packs;
        wallet = { ...wallet, packs: wallet.packs + COOP.winReward.packs };
        couponsIssued++;
      } else if (priv.campaign) {
        result.epicPacks = 1;
        wallet = { ...wallet, packsGuaranteed: { ...wallet.packsGuaranteed, epic: wallet.packsGuaranteed.epic + 1 } };
      } else {
        result.packs = COOP.winReward.packs;
        wallet = { ...wallet, packs: wallet.packs + COOP.winReward.packs };
      }
      tx.update(snap.ref, { ...walletPatch(wallet), ownedPlayers: [...owned].sort(), coopWins: { day, count: count + 1 } });
    }
    tx.update(viewRef(id, u), { result });
    if (u === submitter) mine = { ...result, codes };
  });

  // من وصل الحد بعد البدء (فاز في غرفة ثانية) ← حجزه يتحرر.
  const leftovers = capped.map((u) => priv.reservations[u]).filter((c): c is string => Boolean(c));
  if (stock) releaseCoupons(tx, stock, leftovers, now);
  if (couponsIssued > 0 && priv.campaign) tx.update(db().doc(`campaigns/${priv.campaign.id}`), { "totals.issued": FieldValue.increment(couponsIssued) });

  const update = { status: "won" as const, closedAt: Timestamp.fromDate(now), lastCheck: { correct: room.slots.length, total: room.slots.length, at: Timestamp.fromDate(now) } };
  tx.update(roomRef(id), update);
  const submitterSnap = userSnaps[team.indexOf(submitter)];
  writeEvent(tx, "co_op_win", submitter, submitterSnap?.get("city") ?? null, meta, {
    roomId: id,
    branchId: room.branchId,
    brandId: room.brandId,
    teamSize: team.length,
    slotsCount: room.slots.length,
    durationSec: Math.round((now.getTime() - ms(room.startAt)) / 1000),
    attempts: room.attempts + 1,
    couponMode: room.couponMode,
    couponsIssued,
  }, now);
  return { room: { ...room, ...update }, mine };
}

/** closeRound — عند `endsAt` (Cloud Task، أو الكنس كل دقيقة، أو أول طلب بعد الوقت). آمن للتكرار. */
export async function closeRound(id: string, now = new Date()): Promise<RoomStatus | null> {
  return db().runTransaction(async (tx) => {
    const [roomSnap, privSnap] = await Promise.all([tx.get(roomRef(id)), tx.get(privRef(id))]);
    if (!roomSnap.exists) return null;
    const room = roomSnap.data() as RoomDoc;
    if (room.status === "playing" && now.getTime() >= ms(room.endsAt)) return (await finishLoss(tx, id, room, now, privSnap)).status;
    if (room.status === "open" && now.getTime() >= ms(room.lobbyExpiresAt)) return expireLobby(tx, id, room, now).status;
    return room.status;
  });
}

/** كنس احتياطي كل دقيقة (Q5): جولات انتهى وقتها، وردهات انتهت مهلتها. */
export async function sweepRooms(now = new Date()): Promise<number> {
  const cutoff = Timestamp.fromDate(now);
  const [playing, open] = await Promise.all([
    db().collection("rooms").where("status", "==", "playing").where("endsAt", "<=", cutoff).limit(200).get(),
    db().collection("rooms").where("status", "==", "open").where("lobbyExpiresAt", "<=", cutoff).limit(200).get(),
  ]);
  const ids = [...playing.docs, ...open.docs].map((d) => d.id);
  await Promise.all(ids.map((id) => closeRound(id, now)));
  return ids.length;
}

/** جدولة closeRound عبر Cloud Tasks. فشل الجدولة ما يوقف الجولة — الكنس كل دقيقة يغطيه. */
export let scheduleClose = async (roomId: string, at: Date): Promise<void> => {
  try {
    const { getFunctions } = await import("firebase-admin/functions");
    const { REGION } = await import("../shared/config.js");
    await getFunctions().taskQueue(`locations/${REGION}/functions/closeRound`).enqueue({ roomId }, { scheduleTime: at });
  } catch (err) {
    console.warn("closeRound scheduling failed; sweepRooms will close it", (err as Error).message);
  }
};

/** للاختبارات فقط. */
export function setScheduleClose(fn: typeof scheduleClose) {
  scheduleClose = fn;
}
