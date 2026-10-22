import { describe, expect, it } from "vitest";
import { isMfaRequired, isTotpCode, mfaStep } from "../src/lib/mfa.js";

describe("admin MFA (Q27)", () => {
  it("detects the server MFA_REQUIRED state", () => {
    expect(isMfaRequired({ message: "MFA_REQUIRED" })).toBe(true);
    expect(isMfaRequired({ message: "ADMIN_ONLY" })).toBe(false);
    expect(isMfaRequired(null)).toBe(false);
  });

  it("enrolls when no factor exists, otherwise asks to sign in again", () => {
    expect(mfaStep(0)).toBe("enroll");
    expect(mfaStep(1)).toBe("relogin");
  });

  it("accepts only 6-digit codes", () => {
    expect(isTotpCode("123456")).toBe(true);
    expect(isTotpCode(" 123456 ")).toBe(true);
    expect(isTotpCode("12345")).toBe(false);
    expect(isTotpCode("12a456")).toBe(false);
  });
});
