import { describe, expect, it } from "vitest";
import { dayRange } from "../../src/analytics/aggregate.js";
import { sanitize } from "../../src/analytics/logEvents.js";
import { mask } from "../../src/analytics/report.js";

describe("report masking (ARCHITECTURE §8, AT-10)", () => {
  it("shows <10 for small non-zero cells and keeps zeros and ≥10", () => {
    const row = mask({ day: "2027-01-15", brandId: "b", branchId: "br", checkIns: 9, verifiedVisits: 10, couponsIssued: 0, couponsRedeemed: 1, roomsCreated: 25, roundsStarted: 0, roundsWon: 0, uniquePlayers: 3 });
    expect(row).toMatchObject({ checkIns: "<10", verifiedVisits: 10, couponsIssued: 0, couponsRedeemed: "<10", roomsCreated: 25, uniquePlayers: "<10" });
    expect(Object.keys(row)).not.toContain("uid");
  });
});

describe("client events (DATA_CONTRACTS §9)", () => {
  const good = { name: "branch_nearby_shown", props: { branchId: "br_a", brandId: "brand_a", zoneRadiusM: 250, accuracyBand: "26-50", activeCampaigns: 2 } };

  it("keeps whitelisted props only and drops forbidden ones", () => {
    const e = sanitize({ ...good, props: { ...good.props, lat: 21.5, lng: 39.1, email: "x@y.z", name: "Ali", adId: "abc" } });
    expect(e?.props).toEqual(good.props);
    expect(JSON.stringify(e)).not.toMatch(/lat|lng|email|Ali|adId/);
  });

  it("rejects server-only and unknown events and bad values", () => {
    expect(sanitize({ name: "branch_visit_verified", props: {} })).toBeNull();
    expect(sanitize({ name: "coupon_redeemed", props: {} })).toBeNull();
    expect(sanitize({ name: "whatever", props: {} })).toBeNull();
    expect(sanitize({ ...good, props: { ...good.props, accuracyBand: "12" } })).toBeNull();
    expect(sanitize({ ...good, props: { ...good.props, zoneRadiusM: "250" } })).toBeNull();
  });

  it("keeps a stable client eventId for dedupe", () => {
    expect(sanitize({ ...good, eventId: "abcd1234efgh" })?.eventId).toBe("ev_abcd1234efgh");
  });
});

describe("game-day range", () => {
  it("starts at 04:00 Riyadh (01:00 UTC)", () => {
    expect(dayRange("2027-01-15")).toEqual({ start: new Date("2027-01-15T01:00:00Z"), end: new Date("2027-01-16T01:00:00Z") });
  });
});
