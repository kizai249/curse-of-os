import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { rebuildSchedule } from "../../src/content/schedule.js";
import { seedContent } from "../../src/content/seed.js";
import { admin, clearFirestore } from "./helpers.js";

function shape(value: unknown, path = ""): string[] {
  if (value === null || typeof value !== "object") return [`${path}:${value === null ? "null" : typeof value}`];
  if (Array.isArray(value)) return value.length === 0 ? [`${path}:[]`] : shape(value[0], `${path}[]`);
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k)).sort();
}

async function waitFor<T>(read: () => Promise<T>, done: (v: T) => boolean, timeoutMs = 10000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = await read();
    if (done(value) || Date.now() - start > timeoutMs) return value;
    await new Promise((r) => setTimeout(r, 200));
  }
}

beforeEach(async () => {
  await clearFirestore();
});

describe("content seeding and schedule", () => {
  it("seeds teams and stadiums", async () => {
    admin();
    await seedContent();
    const { db } = admin();
    expect(((await db.doc("content/teams").get()).get("teams") as unknown[]).length).toBe(24);
    expect(((await db.doc("content/stadiums").get()).get("stadiums") as unknown[]).length).toBe(8);
  });

  it("rebuilds content/schedule with public fields only, matching the client sample shape", async () => {
    const { db } = admin();
    await seedContent({ devSampleMatch: true });
    await db.doc("matchResults/m02").set({ matchNo: 2, stage: "group", group: "A", day: "2027-01-08", stadiumId: "STD_JED_KAS", home: "JPN", away: "IRQ", status: "finished", score: { home: 1, away: 1 }, updatedBy: "x" });
    await db.doc("matchResults/bad").set({ matchNo: 99, stage: "group", day: "x", home: "BRA", away: "KSA", status: "scheduled" });

    const result = await rebuildSchedule(new Date("2027-01-08T20:00:00Z"));
    expect(result).toEqual({ matches: 2, skipped: ["bad"] });

    const schedule = (await db.doc("content/schedule").get()).data()!;
    expect(schedule.matches.map((m: { matchId: string }) => m.matchId)).toEqual(["m01", "m02"]);
    expect(JSON.stringify(schedule)).not.toContain("updatedBy");

    const sample = JSON.parse(readFileSync(resolve(__dirname, "../../../../shared/contracts/samples/content.schedule.json"), "utf8"));
    const actual = { matches: schedule.matches as unknown[], updatedAt: (schedule.updatedAt as FirebaseFirestore.Timestamp).toDate().toISOString() };
    // نقارن شكل مباراة مجدولة (score = null) مثل العينة.
    expect(shape({ ...actual, matches: [actual.matches[0]] })).toEqual(shape({ ...sample, matches: [sample.matches[0]] }));
  });

  it("the Firestore trigger rebuilds the schedule when a match result changes", async () => {
    const { db } = admin();
    await seedContent();
    await db.doc("matchResults/m05").set({ matchNo: 5, stage: "group", group: "B", day: "2027-01-09", stadiumId: "STD_KHB_ARM", home: "AUS", away: "UZB", status: "scheduled", score: null });
    const schedule = await waitFor(
      async () => (await db.doc("content/schedule").get()).data(),
      (d) => Array.isArray(d?.matches) && d.matches.some((m: { matchId: string }) => m.matchId === "m05"),
    );
    expect(schedule?.matches.find((m: { matchId: string }) => m.matchId === "m05")).toMatchObject({ home: "AUS", stadiumId: "STD_KHB_ARM" });
  });
});
