import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it } from "vitest";
import { aggregateDay } from "../../src/analytics/aggregate.js";
import { gameDayId } from "../../src/shared/gameDay.js";
import { admin, callFunction, callOk, clearFirestore, signUpAnonymous, staffSignIn } from "./helpers.js";

const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();

async function asAdmin() {
  return staffSignIn({ role: "usersx_admin" });
}

async function seedBrand(brandId = "brand_a") {
  const a = await asAdmin();
  await callOk("upsertBrand", { brandId, name: { ar: "علامة " + brandId, en: "Brand " + brandId } }, a.idToken);
  return a;
}

const branchInput = (branchId: string) => ({
  branchId, name: { ar: "فرع " + branchId, en: "Branch " + branchId }, city: "JED", lat: 21.55, lng: 39.17, radiusM: 250,
});

const campaignInput = (campaignId: string, branchIds: string[], trigger = "verified_visit") => ({
  campaignId, title: { ar: "قهوة", en: "Coffee" }, terms: { ar: "مشروب واحد", en: "One drink" }, trigger,
  perUserLimit: 1, startAt: iso(now - 3600_000), endAt: iso(now + 86400_000), couponValidityDays: 7, branchIds, status: "active",
});

beforeEach(async () => {
  await clearFirestore();
});

describe("brands, branches and zones", () => {
  it("admin creates a brand; partner manages only their own branches", async () => {
    await seedBrand("brand_a");
    await seedBrand("brand_b");
    const partner = await staffSignIn({ role: "partner_admin", brandId: "brand_a" });
    const created = await callOk<{ branchId: string; geohash5: string }>("upsertBranch", branchInput("br_one"), partner.idToken);
    expect(created.geohash5).toHaveLength(5);
    const { db } = admin();
    expect((await db.doc("branches/br_one").get()).data()).toMatchObject({ brandId: "brand_a", brandName: { ar: "علامة brand_a" }, active: true });
    expect((await db.doc("zones/zone_br_br_one").get()).get("radiusM")).toBe(250);

    const tooBig = await callFunction("upsertBranch", { ...branchInput("br_two"), radiusM: 900 }, partner.idToken);
    expect(tooBig.body.error?.message).toBe("INVALID_ZONE");

    const otherPartner = await staffSignIn({ role: "partner_admin", brandId: "brand_b" });
    const hijack = await callFunction("upsertBranch", branchInput("br_one"), otherPartner.idToken);
    expect(hijack.body.error?.message).toBe("STAFF_ONLY");

    const scope = await callOk<{ brands: unknown[]; branches: Array<{ branchId: string }> }>("getMyScope", {}, otherPartner.idToken);
    expect(scope.branches).toEqual([]);
    expect(scope.brands).toHaveLength(1);

    const player = await signUpAnonymous();
    expect((await callFunction("getMyScope", {}, player.idToken)).body.error?.message).toBe("STAFF_ONLY");
    const staff = await staffSignIn({ role: "branch_staff", brandId: "brand_a", branchId: "br_one" });
    expect((await callFunction("upsertBranch", branchInput("br_x"), staff.idToken)).body.error?.message).toBe("STAFF_ONLY");
  });
});

describe("campaigns and stock", () => {
  it("validates campaigns, locks the trigger after activation, and keeps the stock invariant", async () => {
    await seedBrand("brand_a");
    await seedBrand("brand_b");
    const partner = await staffSignIn({ role: "partner_admin", brandId: "brand_a" });
    await callOk("upsertBranch", branchInput("br_one"), partner.idToken);
    const partnerB = await staffSignIn({ role: "partner_admin", brandId: "brand_b" });
    await callOk("upsertBranch", branchInput("br_bee"), partnerB.idToken);

    await callOk("upsertCampaign", campaignInput("cmp_one", ["br_one"]), partner.idToken);
    const foreign = await callFunction("upsertCampaign", campaignInput("cmp_two", ["br_bee"]), partner.idToken);
    expect(foreign.body.error?.message).toBe("BRANCH_NOT_IN_BRAND");
    const switchTrigger = await callFunction("upsertCampaign", { ...campaignInput("cmp_one", ["br_one"]), trigger: "invoice_code" }, partner.idToken);
    expect(switchTrigger.body.error?.message).toBe("TRIGGER_LOCKED");
    const badDates = await callFunction("upsertCampaign", { ...campaignInput("cmp_three", ["br_one"]), endAt: iso(now - 7200_000) }, partner.idToken);
    expect(badDates.body.error?.message).toBe("INVALID_FIELD");

    const stock = await callOk<{ total: number; remaining: number }>("setStock", { campaignId: "cmp_one", branchId: "br_one", total: 100 }, partner.idToken);
    expect(stock).toMatchObject({ total: 100, remaining: 100 });
    const { db } = admin();
    await db.doc("campaigns/cmp_one/stock/br_one").update({ issued: 30, reserved: 5, remaining: 65 });
    const below = await callFunction("setStock", { campaignId: "cmp_one", branchId: "br_one", total: 20 }, partner.idToken);
    expect(below.body.error?.message).toBe("STOCK_BELOW_USED");
    expect(await callOk("setStock", { campaignId: "cmp_one", branchId: "br_one", total: 50 }, partner.idToken))
      .toEqual({ branchId: "br_one", total: 50, reserved: 5, issued: 30, remaining: 15 });

    const scope = await callOk<{ campaigns: Array<{ campaignId: string; stock: unknown[]; totals: unknown }> }>("getMyScope", {}, partner.idToken);
    expect(scope.campaigns.map((c) => c.campaignId)).toEqual(["cmp_one"]);
    expect(scope.campaigns[0]!.stock).toHaveLength(1);
    const otherScope = await callOk<{ campaigns: unknown[] }>("getMyScope", {}, partnerB.idToken);
    expect(otherScope.campaigns).toEqual([]);
  });
});

describe("match results and staff accounts", () => {
  it("only usersx_admin enters results; invalid matches are rejected", async () => {
    const a = await asAdmin();
    await callOk("upsertMatchResult", { matchNo: 1, stage: "group", group: "A", day: "2027-01-07", stadiumId: "STD_RUH_KFS", home: "KSA", away: "PLE" }, a.idToken);
    expect((await admin().db.doc("matchResults/m01").get()).get("home")).toBe("KSA");
    const bad = await callFunction("upsertMatchResult", { matchNo: 2, stage: "group", day: "2027-01-07", home: "BRA", away: "KSA" }, a.idToken);
    expect(bad.body.error?.message).toBe("INVALID_MATCH");
    const partner = await staffSignIn({ role: "partner_admin", brandId: "brand_a" });
    expect((await callFunction("upsertMatchResult", { matchNo: 3 }, partner.idToken)).body.error?.message).toBe("STAFF_ONLY");
  });

  it("partners create branch staff for their own branches only", async () => {
    await seedBrand("brand_a");
    const partner = await staffSignIn({ role: "partner_admin", brandId: "brand_a" });
    await callOk("upsertBranch", branchInput("br_one"), partner.idToken);
    const res = await callOk<{ claims: Record<string, string>; resetLink: string }>(
      "createStaffAccount", { email: "cashier@example.test", role: "branch_staff", branchId: "br_one" }, partner.idToken);
    expect(res.claims).toEqual({ role: "branch_staff", brandId: "brand_a", branchId: "br_one" });
    expect(res.resetLink).toContain("oobCode");
    const escalate = await callFunction("createStaffAccount", { email: "boss@example.test", role: "usersx_admin" }, partner.idToken);
    expect(escalate.body.error?.message).toBe("ADMIN_ONLY");
  });
});

describe("events and reports", () => {
  it("logEvents keeps whitelisted client events, drops the rest, dedupes by eventId", async () => {
    const p = await signUpAnonymous();
    await callOk("setAgeAndCity", { birthYear: new Date().getUTCFullYear() - 25, city: "JED" }, p.idToken);
    const event = { eventId: "abcd1234efgh", name: "branch_nearby_shown", props: { branchId: "br_a", brandId: "brand_a", zoneRadiusM: 250, accuracyBand: "<=25", activeCampaigns: 1, lat: 21.5 } };
    const res = await callOk<{ accepted: number; rejected: number }>("logEvents", {
      platform: "ios", appVersion: "1.0.0", events: [event, { name: "coupon_redeemed", props: {} }, { name: "nope" }],
    }, p.idToken);
    expect(res).toEqual({ accepted: 1, rejected: 2 });
    await callOk("logEvents", { events: [event] }, p.idToken);
    const docs = await admin().db.collection("events").get();
    expect(docs.size).toBe(1);
    expect(docs.docs[0]!.data()).toMatchObject({ name: "branch_nearby_shown", source: "client", city: "JED", platform: "ios", branchId: "br_a" });
    expect(docs.docs[0]!.data()).not.toHaveProperty("lat");
  });

  it("aggregateDaily + getReport: per branch and day, masked under 10, scoped to the brand, no player ids", async () => {
    const { db } = admin();
    const day = gameDayId(new Date());
    for (let i = 0; i < 12; i++) {
      await db.doc(`visits/u${i}_br_one_${day}`).set({ uid: `u${i}`, branchId: "br_one", brandId: "brand_a", day, verified: i < 4, accuracyBand: "<=25", scannedAt: Timestamp.now() });
    }
    await db.doc(`visits/u1_br_bee_${day}`).set({ uid: "u1", branchId: "br_bee", brandId: "brand_b", day, verified: true, scannedAt: Timestamp.now() });
    for (let i = 0; i < 3; i++) {
      await db.collection("coupons").add({ brandId: "brand_a", issuedBranchId: "br_one", uid: `u${i}`, status: i === 0 ? "redeemed" : "issued",
        issuedAt: Timestamp.now(), redeemedAt: i === 0 ? Timestamp.now() : null, redeemedBranchId: i === 0 ? "br_one" : null });
    }
    const rows = await aggregateDay(day);
    expect(rows.find((r) => r.branchId === "br_one")).toMatchObject({ checkIns: 12, verifiedVisits: 4, couponsIssued: 3, couponsRedeemed: 1, uniquePlayers: 12 });

    const partner = await staffSignIn({ role: "partner_admin", brandId: "brand_a" });
    const report = await callOk<{ rows: Array<Record<string, unknown>> }>("getReport", { from: day, to: day }, partner.idToken);
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({ branchId: "br_one", checkIns: 12, verifiedVisits: "<10", couponsIssued: "<10", couponsRedeemed: "<10", uniquePlayers: 12 });
    expect(JSON.stringify(report)).not.toMatch(/"u\d+"|uid|lat|lng/);

    const staff = await staffSignIn({ role: "branch_staff", brandId: "brand_a", branchId: "br_one" });
    expect((await callFunction("getReport", { from: day, to: day }, staff.idToken)).body.error?.message).toBe("STAFF_ONLY");
  });
});
