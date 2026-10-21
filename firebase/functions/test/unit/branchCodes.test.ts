import { describe, expect, it } from "vitest";
import { signBranchCode, verifyBranchCode } from "../../src/branch/codes.js";
import { normalizeManual, randomCode, sha256, UNAMBIGUOUS } from "../../src/shared/codes.js";

const SECRET = "unit-test-secret";

describe("daily branch code (ARCHITECTURE §6.1)", () => {
  const today = "2027-01-15";
  const code = signBranchCode(SECRET, "br_hm_jed_tahlia", today);

  it("verifies today's code for any number of players (stateless)", () => {
    expect(code.startsWith("FQB1:br_hm_jed_tahlia:2027-01-15:")).toBe(true);
    for (let i = 0; i < 3; i++) expect(verifyBranchCode(SECRET, code, today)).toEqual({ ok: true, branchId: "br_hm_jed_tahlia", day: today });
  });

  it("rejects yesterday's code, a tampered signature, another branch and garbage", () => {
    expect(verifyBranchCode(SECRET, signBranchCode(SECRET, "br_hm_jed_tahlia", "2027-01-14"), today)).toEqual({ ok: false, reason: "not_today" });
    const tampered = code.slice(0, -2) + (code.endsWith("AA") ? "BB" : "AA");
    expect(verifyBranchCode(SECRET, tampered, today)).toMatchObject({ ok: false, reason: "signature" });
    const otherBranch = code.replace("br_hm_jed_tahlia", "br_other");
    expect(verifyBranchCode(SECRET, otherBranch, today)).toMatchObject({ ok: false, reason: "signature" });
    expect(verifyBranchCode("other-secret", code, today)).toMatchObject({ ok: false, reason: "signature" });
    for (const bad of [null, "", "hello", "FQB1:a:b", "FQB2:br:2027-01-15:x", "x".repeat(500)]) {
      expect(verifyBranchCode(SECRET, bad, today).ok).toBe(false);
    }
  });

  it("refuses to sign without a secret", () => {
    expect(() => signBranchCode("", "br", today)).toThrow();
  });
});

describe("codes", () => {
  it("manual and invoice codes use the unambiguous alphabet only", () => {
    expect(UNAMBIGUOUS).not.toMatch(/[01ILO]/);
    for (let i = 0; i < 200; i++) expect(randomCode(8)).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
  });

  it("hashes normalized manual input", () => {
    expect(sha256(normalizeManual("ab2c-d3ef "))).toBe(sha256("AB2CD3EF"));
    expect(sha256("x")).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});
