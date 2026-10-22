import { describe, expect, it } from "vitest";
import { requireSecondFactor } from "../../src/shared/staffCallable.js";

const admin = { role: "partner_admin" as const, uid: "a", brandId: "b" };
const staff = { role: "branch_staff" as const, uid: "s", brandId: "b", branchId: "br" };
const withTotp = { firebase: { sign_in_provider: "password", sign_in_second_factor: "totp" } };
const withoutTotp = { firebase: { sign_in_provider: "password" } };

describe("admin MFA gate (ARCHITECTURE §8, Q27)", () => {
  it("rejects admins without a second factor when required", () => {
    expect(() => requireSecondFactor(admin, withoutTotp, true)).toThrow("MFA_REQUIRED");
    expect(() => requireSecondFactor({ ...admin, role: "usersx_admin" }, undefined, true)).toThrow("MFA_REQUIRED");
  });

  it("accepts admins with TOTP, branch staff, and everyone when not required", () => {
    expect(() => requireSecondFactor(admin, withTotp, true)).not.toThrow();
    expect(() => requireSecondFactor(staff, withoutTotp, true)).not.toThrow();
    expect(() => requireSecondFactor(admin, withoutTotp, false)).not.toThrow();
  });
});
