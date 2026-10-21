import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";
import { signBranchCode } from "../../src/branch/codes.js";
import { zoneDocument } from "../../src/location/zones.js";
import { expireCoupons } from "../../src/coupons/lifecycle.js";
import { gameDayId } from "../../src/shared/gameDay.js";
import { admin, callFunction, callOk, clearFirestore, devBranchSecret, signUpAnonymous, staffSignIn } from "./helpers.js";

const ADULT = new Date().getUTCFullYear() - 25;
const BRANCH = { lat: 21.55, lng: 39.17 };
const near = { lat: BRANCH.lat + 30 / 111_195, lng: BRANCH.lng, accuracyM: 15 };

interface Scan {
  status: string;
  verified: boolean;
  visitId: string;
  rewards: { xp: number; packs: number };
  coupons: Array<{ couponId: string; redeemToken: string; manualCode: string; expiresAt: string }>;
  campaignNotes: Array<{ campaignId: string; reason: string }>;
  balances: { xp: number; packs: number };
}
interface Redeem {
  status: string;
  stateId: string;
  redeemedAt?: string;
  redeemedBranchId?: string;
}

const todayCode = (branchId = "br_a") => signBranchCode(devBranchSecret(), branchId, gameDayId(new Date()));

async function player() {
  const p = await signUpAnonymous();
  await callOk("setAgeAndCity", { birthYear: ADULT, city: "JED" }, p.idToken);
  return p;
}

async function setupBranch(id: string, brandId = "brand_a", active = true) {
  const { db } = admin();
  await db.doc(`zones/zone_br_${id}`).set(zoneDocument({ type: "branch", refId: id, ...BRANCH, radiusM: 250 }));
  await db.doc(`branches/${id}`).set({
    brandId, brandName: { ar: "علامة", en: "Brand" }, name: { ar: "فرع " + id, en: "Branch " + id },
    city: "JED", zoneId: `zone_br_${id}`, active,
  });
}

async function campaign(id: string, trigger: string, stock: Record<string, number>, perUserLimit = 1) {
  const { db } = admin();
  const now = Date.now();
  await db.doc(`campaigns/${id}`).set({
    brandId: "brand_a", title: { ar: "قهوة اليوم", en: "Coffee" }, terms: { ar: "مشروب واحد", en: "One drink" },
    trigger, perUserLimit, startAt: Timestamp.fromMillis(now - 3600_000), endAt: Timestamp.fromMillis(now + 86400_000),
    couponValidityDays: 7, branchIds: Object.keys(stock), status: "active", totals: { issued: 0, redeemed: 0 },
  });
  for (const [branch, total] of Object.entries(stock)) {
    await db.doc(`campaigns/${id}/stock/${branch}`).set({ total, reserved: 0, issued: 0, remaining: total });
  }
}

beforeEach(async () => {
  await clearFirestore();
  await setupBranch("br_a");
  await setupBranch("br_b");
});

describe("scanBranchCode", () => {
  it("AT-03: six players scan the same code at once; all verified, retries change nothing", async () => {
    const players = await Promise.all(Array.from({ length: 6 }, () => player()));
    const code = todayCode();
    const started = Date.now();
    const results = await Promise.all(players.map((p) => callOk<Scan>("scanBranchCode", { code, ...near, platform: "android" }, p.idToken)));
    const elapsed = Date.now() - started;
    for (const r of results) expect(r).toMatchObject({ status: "verified", verified: true, rewards: { xp: 30, packs: 1 } });
    expect(elapsed).toBeLessThan(6 * 1500); // محاكي محلي — المرجع الفعلي p95 ≤ 1.5 ث على fq-dev

    const { db } = admin();
    const visits = await db.collection("visits").get();
    expect(visits.size).toBe(6);
    for (const p of players) expect((await db.doc(`visits/${p.uid}_br_a_${gameDayId(new Date())}`).get()).get("verified")).toBe(true);

    for (let i = 0; i < 3; i++) {
      const again = await callOk<Scan>("scanBranchCode", { code, ...near }, players[0]!.idToken);
      expect(again).toMatchObject({ status: "already", rewards: { xp: 0, packs: 0 }, balances: { xp: 30 } });
    }
    const events = await db.collection("events").where("name", "==", "branch_visit_verified").get();
    expect(events.size).toBe(6);
    expect(events.docs[0]!.data()).toMatchObject({ source: "server", branchId: "br_a", accuracyBand: "<=25", streakCount: 1, firstVisitToBrand: true });
  });

  it("AT-03: yesterday's code and a tampered code are rejected and create nothing", async () => {
    const { idToken } = await player();
    const yesterday = signBranchCode(devBranchSecret(), "br_a", gameDayId(new Date(Date.now() - 86400_000)));
    const tampered = todayCode().slice(0, -3) + "xyz";
    for (const code of [yesterday, tampered, "random text"]) {
      const res = await callFunction("scanBranchCode", { code, ...near }, idToken);
      expect(res.body.error?.message).toBe("QR_INVALID");
    }
    expect((await admin().db.collection("visits").get()).size).toBe(0);
  });

  it("AT-01: without location the scan is a check-in only (no verified rewards, no event), and verified_visit campaigns ask for location", async () => {
    await campaign("cmp_visit", "verified_visit", { br_a: 10 });
    const { uid, idToken } = await player();
    const r = await callOk<Scan>("scanBranchCode", { code: todayCode() }, idToken);
    expect(r).toMatchObject({ status: "checked_in", verified: false, rewards: { xp: 0, packs: 0 }, coupons: [] });
    expect(r.campaignNotes).toEqual([{ campaignId: "cmp_visit", title: { ar: "قهوة اليوم", en: "Coffee" }, reason: "need_location" }]);
    const { db } = admin();
    expect((await db.doc(`visits/${uid}_br_a_${gameDayId(new Date())}`).get()).get("verified")).toBe(false);
    expect((await db.collection("events").where("name", "==", "branch_visit_verified").get()).size).toBe(0);
  });

  it("inactive branch → QR_BRANCH_INACTIVE; mock location → unverified", async () => {
    await setupBranch("br_off", "brand_a", false);
    const { idToken } = await player();
    const off = await callFunction("scanBranchCode", { code: todayCode("br_off"), ...near }, idToken);
    expect(off.body.error?.message).toBe("QR_BRANCH_INACTIVE");
    const mock = await callOk<Scan>("scanBranchCode", { code: todayCode(), ...near, isMock: true }, idToken);
    expect(mock.verified).toBe(false);
  });

  it("verified visit issues a verified_visit coupon with one-time codes stored as hashes only", async () => {
    await campaign("cmp_visit", "verified_visit", { br_a: 10 });
    const { uid, idToken } = await player();
    const r = await callOk<Scan>("scanBranchCode", { code: todayCode(), ...near }, idToken);
    expect(r.coupons).toHaveLength(1);
    const c = r.coupons[0]!;
    expect(c.manualCode).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
    const { db } = admin();
    const doc = (await db.doc(`coupons/${c.couponId}`).get()).data()!;
    expect(doc).toMatchObject({ uid, status: "issued", issuedBranchId: "br_a", campaignId: "cmp_visit" });
    expect(JSON.stringify(doc)).not.toContain(c.redeemToken);
    expect(JSON.stringify(doc)).not.toContain(c.manualCode);
    expect((await db.doc("campaigns/cmp_visit/stock/br_a").get()).data()).toEqual({ total: 10, reserved: 0, issued: 1, remaining: 9 });
    expect((await db.doc("campaigns/cmp_visit").get()).get("totals.issued")).toBe(1);
    const visitDoc = JSON.stringify((await db.doc(`visits/${r.visitId}`).get()).data());
    expect(visitDoc).not.toContain(c.redeemToken);
  });
});

describe("AT-05: two players race for the last unit", () => {
  it("exactly one coupon; the other sees sold out but keeps the visit rewards (×50)", { timeout: 300_000 }, async () => {
    const { db } = admin();
    for (let round = 0; round < 50; round++) {
      await campaign("cmp_last", "verified_visit", { br_a: 1 });
      await db.doc(`branches/br_a`).update({ active: true });
      const [a, b] = await Promise.all([player(), player()]);
      const code = todayCode();
      const [ra, rb] = await Promise.all([
        callOk<Scan>("scanBranchCode", { code, ...near }, a.idToken),
        callOk<Scan>("scanBranchCode", { code, ...near }, b.idToken),
      ]);
      const winners = [ra, rb].filter((r) => r.coupons.length === 1);
      const losers = [ra, rb].filter((r) => r.coupons.length === 0);
      expect(winners).toHaveLength(1);
      expect(losers[0]!.campaignNotes).toEqual([expect.objectContaining({ campaignId: "cmp_last", reason: "sold_out" })]);
      expect(losers[0]!).toMatchObject({ verified: true, rewards: { xp: 30, packs: 1 } });
      expect((await db.doc("campaigns/cmp_last/stock/br_a").get()).data()).toEqual({ total: 1, reserved: 0, issued: 1, remaining: 0 });
      await clearFirestore();
      await setupBranch("br_a");
    }
  });
});

describe("redeemCoupon (AT-04)", () => {
  async function twoCoupons() {
    await campaign("cmp_visit", "verified_visit", { br_a: 10, br_b: 10 }, 5);
    const p = await player();
    const first = await callOk<Scan>("scanBranchCode", { code: todayCode("br_a"), ...near }, p.idToken);
    const second = await callOk<Scan>("scanBranchCode", { code: todayCode("br_b"), ...near }, p.idToken);
    return { player: p, q1: first.coupons[0]!, q2: second.coupons[0]! };
  }

  it("the same screenshot on two staff devices at once: exactly one redemption", async () => {
    const { q1, q2 } = await twoCoupons();
    const b1 = await staffSignIn({ role: "branch_staff", branchId: "br_a", brandId: "brand_a" });
    const b2 = await staffSignIn({ role: "branch_staff", branchId: "br_b", brandId: "brand_a" });

    const [r1, r2] = await Promise.all([
      callOk<Redeem>("redeemCoupon", { token: q1.redeemToken }, b1.idToken),
      callOk<Redeem>("redeemCoupon", { token: q1.redeemToken }, b2.idToken),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual(["ok", "used"]);
    const used = [r1, r2].find((r) => r.status === "used")!;
    expect(used.stateId).toBe("STAFF_REDEEM_USED");
    expect(used.redeemedAt).toBeTruthy();
    expect(["br_a", "br_b"]).toContain(used.redeemedBranchId);

    const again = await callOk<Redeem>("redeemCoupon", { token: q1.redeemToken }, b1.idToken);
    expect(again.status).toBe("used");
    const q2r = await callOk<Redeem>("redeemCoupon", { manualCode: q2.manualCode.toLowerCase() }, b1.idToken);
    expect(q2r.status).toBe("ok");

    const { db } = admin();
    expect((await db.doc(`coupons/${q1.couponId}`).get()).get("status")).toBe("redeemed");
    expect((await db.collection("events").where("name", "==", "coupon_redeemed").get()).size).toBe(2);
    expect((await db.doc("campaigns/cmp_visit").get()).get("totals.redeemed")).toBe(2);
  });

  it("wrong branch, unknown code, expired, players can't redeem, and the manual rate limit", async () => {
    await setupBranch("br_c", "brand_a");
    const { q1, q2, player: p } = await twoCoupons();
    const other = await staffSignIn({ role: "branch_staff", branchId: "br_c", brandId: "brand_a" });
    expect((await callOk<Redeem>("redeemCoupon", { token: q1.redeemToken }, other.idToken)).stateId).toBe("STAFF_REDEEM_WRONG_BRANCH");
    expect((await callOk<Redeem>("redeemCoupon", { token: "nope-nope-nope-nope" }, other.idToken)).stateId).toBe("STAFF_REDEEM_NOT_FOUND");
    const asPlayer = await callFunction("redeemCoupon", { token: q1.redeemToken }, p.idToken);
    expect(asPlayer.body.error?.message).toBe("STAFF_ONLY");

    await admin().db.doc(`coupons/${q2.couponId}`).update({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) });
    const staffB = await staffSignIn({ role: "branch_staff", branchId: "br_b", brandId: "brand_a" });
    expect((await callOk<Redeem>("redeemCoupon", { token: q2.redeemToken }, staffB.idToken)).stateId).toBe("STAFF_REDEEM_EXPIRED");
    expect(await expireCoupons()).toBe(1);

    for (let i = 0; i < 10; i++) await callOk<Redeem>("redeemCoupon", { manualCode: "ZZZZZZZZ" }, staffB.idToken);
    expect((await callOk<Redeem>("redeemCoupon", { manualCode: "ZZZZZZZZ" }, staffB.idToken)).stateId).toBe("STAFF_RATE_LIMIT");
  });

  it("reissue replaces the codes; the old screenshot stops working", async () => {
    const { q1, player: p } = await twoCoupons();
    const fresh = await callOk<{ redeemToken: string; manualCode: string }>("reissueRedeemCode", { couponId: q1.couponId }, p.idToken);
    expect(fresh.redeemToken).not.toBe(q1.redeemToken);
    const staff = await staffSignIn({ role: "branch_staff", branchId: "br_a", brandId: "brand_a" });
    expect((await callOk<Redeem>("redeemCoupon", { token: q1.redeemToken }, staff.idToken)).status).toBe("not_found");
    expect((await callOk<Redeem>("redeemCoupon", { token: fresh.redeemToken }, staff.idToken)).status).toBe("ok");
    const stranger = await player();
    const denied = await callFunction("reissueRedeemCode", { couponId: q1.couponId }, stranger.idToken);
    expect(denied.body.error?.message).toBe("COUPON_NOT_FOUND");
  });
});

describe("invoice codes (GAME_RULES §8.6)", () => {
  it("staff issue a 6-char single-use code; the player gets a coupon without location; reuse is rejected", async () => {
    await campaign("cmp_inv", "invoice_code", { br_a: 5 });
    const staff = await staffSignIn({ role: "branch_staff", branchId: "br_a", brandId: "brand_a" });
    const { code } = await callOk<{ code: string; expiresAt: string }>("issueInvoiceCode", { campaignId: "cmp_inv" }, staff.idToken);
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{6}$/);

    const p = await player();
    const ok = await callOk<{ status: string; coupon: { couponId: string } }>("submitInvoiceCode", { code: code.toLowerCase() }, p.idToken);
    expect(ok.status).toBe("issued");
    const second = await player();
    expect(await callOk("submitInvoiceCode", { code }, second.idToken)).toEqual({ status: "rejected", stateId: "INV_USED" });
    expect(await callOk("submitInvoiceCode", { code: "ABCDEF" }, second.idToken)).toEqual({ status: "rejected", stateId: "INV_INVALID" });

    const { code: old } = await callOk<{ code: string }>("issueInvoiceCode", { campaignId: "cmp_inv" }, staff.idToken);
    const { db } = admin();
    const hashed = (await db.collection("invoiceCodes").where("usedBy", "==", null).get()).docs[0]!;
    await hashed.ref.update({ expiresAt: Timestamp.fromMillis(Date.now() - 1) });
    expect(await callOk("submitInvoiceCode", { code: old }, second.idToken)).toEqual({ status: "rejected", stateId: "INV_EXPIRED" });
  });

  it("per-account limit keeps the invoice code unused", async () => {
    await campaign("cmp_inv", "invoice_code", { br_a: 5 }, 1);
    const staff = await staffSignIn({ role: "branch_staff", branchId: "br_a", brandId: "brand_a" });
    const p = await player();
    const first = await callOk<{ code: string }>("issueInvoiceCode", { campaignId: "cmp_inv" }, staff.idToken);
    await callOk("submitInvoiceCode", { code: first.code }, p.idToken);
    const second = await callOk<{ code: string }>("issueInvoiceCode", { campaignId: "cmp_inv" }, staff.idToken);
    expect(await callOk("submitInvoiceCode", { code: second.code }, p.idToken)).toEqual({ status: "rejected", stateId: "CPN_USER_LIMIT" });
    const other = await player();
    expect((await callOk<{ status: string }>("submitInvoiceCode", { code: second.code }, other.idToken)).status).toBe("issued");
  });
});

describe("branch screen and staff scope", () => {
  it("staff see today's code for their own branch only; players are refused", async () => {
    const staff = await staffSignIn({ role: "branch_staff", branchId: "br_a", brandId: "brand_a" });
    const screen = await callOk<{ token: string; day: string; validUntil: string }>("getBranchScreen", {}, staff.idToken);
    expect(screen.token).toBe(todayCode("br_a"));
    expect(Date.parse(screen.validUntil)).toBeGreaterThan(Date.now());
    const partner = await staffSignIn({ role: "partner_admin", brandId: "brand_other" });
    expect((await callFunction("getBranchScreen", { branchId: "br_a" }, partner.idToken)).body.error?.message).toBe("STAFF_ONLY");
    const p = await player();
    expect((await callFunction("getBranchScreen", {}, p.idToken)).body.error?.message).toBe("STAFF_ONLY");
  });
});

describe("account deletion cancels open coupons", () => {
  it("issued coupons become expired immediately", async () => {
    await campaign("cmp_visit", "verified_visit", { br_a: 10 });
    const p = await player();
    const scan = await callOk<Scan>("scanBranchCode", { code: todayCode(), ...near }, p.idToken);
    await callOk("deleteAccount", { confirm: true }, p.idToken);
    const coupon = (await admin().db.doc(`coupons/${scan.coupons[0]!.couponId}`).get()).data()!;
    expect(coupon).toMatchObject({ status: "expired", cancelledReason: "account_deleted" });
  });
});
