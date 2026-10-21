import { describe, expect, it } from "vitest";
import { cellText, toCsv, total, type ReportRow } from "../src/lib/report.js";
import { fill, STAFF_STATES } from "../src/lib/text.js";

const rows: ReportRow[] = [
  { day: "2027-01-15", brandId: "b", branchId: "br_a", checkIns: 12, verifiedVisits: "<10", couponsIssued: 0, couponsRedeemed: "<10", roomsCreated: 0, roundsStarted: 0, roundsWon: 0, uniquePlayers: 12 },
  { day: "2027-01-15", brandId: "b", branchId: "br_b", checkIns: 30, verifiedVisits: 14, couponsIssued: 11, couponsRedeemed: 10, roomsCreated: 0, roundsStarted: 0, roundsWon: 0, uniquePlayers: 25 },
];

describe("report (AT-10)", () => {
  it("shows masked cells as «أقل من 10»", () => {
    expect(cellText("<10")).toBe("أقل من 10");
    expect(cellText(0)).toBe("0");
  });

  it("exports CSV with masked cells, branch names, BOM, and no player ids", () => {
    const csv = toCsv(rows, (id) => (id === "br_a" ? "فرع التحلية, جدة" : "فرع الروضة"));
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"فرع التحلية, جدة"');
    expect(lines[1]).toContain("أقل من 10");
    expect(csv).not.toMatch(/uid|lat|lng|u_\w+/);
  });

  it("totals skip masked cells and flag partial sums", () => {
    expect(total(rows, "checkIns")).toEqual({ value: 42, partial: false });
    expect(total(rows, "verifiedVisits")).toEqual({ value: 14, partial: true });
  });
});

describe("staff states (PERMISSION_AND_ERROR_STATES §4.1)", () => {
  it("keeps the document wording", () => {
    expect(fill(STAFF_STATES.STAFF_REDEEM_USED!, { branch: "فرع التحلية", time: "18:22" })).toBe("✗ القسيمة مستخدمة — استُردت في فرع التحلية الساعة 18:22.");
    expect(STAFF_STATES.STAFF_RATE_LIMIT).toBe("محاولات كثيرة — انتظر دقيقة.");
    expect(Object.keys(STAFF_STATES).sort()).toEqual([
      "STAFF_RATE_LIMIT", "STAFF_REDEEM_EXPIRED", "STAFF_REDEEM_NOT_FOUND", "STAFF_REDEEM_OK", "STAFF_REDEEM_USED", "STAFF_REDEEM_WRONG_BRANCH",
    ]);
  });
});
