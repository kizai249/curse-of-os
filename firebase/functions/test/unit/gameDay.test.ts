import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { gameDayId, nextRollover } from "../../src/shared/gameDay.js";
import { buildHealth } from "../../src/health.js";

interface Vector {
  instant: string;
  day: string;
  nextRollover: string;
}

const vectors: Vector[] = JSON.parse(
  readFileSync(resolve(__dirname, "../../../../shared/contracts/game-day.vectors.json"), "utf8"),
).vectors;

describe("gameDay (shared vectors with C#)", () => {
  it("loads the shared vectors", () => {
    expect(vectors.length).toBeGreaterThanOrEqual(7);
  });

  it.each(vectors)("$instant → $day", (v) => {
    const instant = new Date(v.instant);
    expect(gameDayId(instant)).toBe(v.day);
    expect(nextRollover(instant).toISOString()).toBe(new Date(v.nextRollover).toISOString());
  });

  it("the instant before the rollover belongs to the previous day", () => {
    const now = new Date("2027-01-15T18:20:00Z");
    const next = nextRollover(now);
    expect(gameDayId(next)).not.toBe(gameDayId(now));
    expect(gameDayId(new Date(next.getTime() - 1))).toBe(gameDayId(now));
  });
});

describe("buildHealth", () => {
  it("reports server time and game day", () => {
    const res = buildHealth("u1", new Date("2027-01-07T01:00:00Z"));
    expect(res).toEqual({
      ok: true,
      uid: "u1",
      serverTime: "2027-01-07T01:00:00.000Z",
      gameDay: "2027-01-07",
      nextRollover: "2027-01-08T01:00:00.000Z",
    });
  });
});
