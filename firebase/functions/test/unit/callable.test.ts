import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";
import { asBusy } from "../../src/shared/callable.js";

describe("transaction contention → SRV_BUSY", () => {
  it("maps Firestore ABORTED to a retryable SRV_BUSY and keeps everything else", () => {
    const busy = asBusy(Object.assign(new Error("10 ABORTED: Transaction lock timeout."), { code: 10 })) as HttpsError;
    expect(busy).toBeInstanceOf(HttpsError);
    expect(busy.code).toBe("unavailable");
    expect(busy.message).toBe("SRV_BUSY");
    const own = new HttpsError("failed-precondition", "ROOM_FULL");
    expect(asBusy(own)).toBe(own);
    const other = new Error("boom");
    expect(asBusy(other)).toBe(other);
  });
});
