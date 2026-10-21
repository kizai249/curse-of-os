import { describe, expect, it } from "vitest";
import { callFunction, signUpAnonymous } from "./helpers.js";

describe("health callable (emulator)", () => {
  it("rejects unauthenticated callers", async () => {
    const res = await callFunction("health", null);
    expect(res.status).toBe(401);
    expect(res.body.error?.status).toBe("UNAUTHENTICATED");
  });

  it("returns server time and game day for an anonymous player", async () => {
    const { uid, idToken } = await signUpAnonymous();
    const res = await callFunction("health", null, idToken);
    expect(res.status).toBe(200);
    const result = res.body.result as { ok: boolean; uid: string; gameDay: string; serverTime: string };
    expect(result.ok).toBe(true);
    expect(result.uid).toBe(uid);
    expect(result.gameDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Math.abs(Date.parse(result.serverTime) - Date.now())).toBeLessThan(60_000);
  });
});
