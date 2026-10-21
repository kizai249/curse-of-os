import { describe, expect, it } from "vitest";
import { loadStadiums, loadTeams } from "../../src/content/catalog.js";
import { toScheduleEntry } from "../../src/content/schedule.js";

const teams = new Set(loadTeams().map((t) => t.code));
const stadiums = new Set(loadStadiums().map((s) => s.id));

const base = {
  matchNo: 1,
  stage: "group",
  group: "A",
  day: "2027-01-07",
  stadiumId: "STD_RUH_KFS",
  home: "KSA",
  away: "PLE",
  status: "scheduled",
  score: null,
  updatedBy: "admin_khalid",
};

describe("content catalog", () => {
  it("has the 24 teams and 8 stadiums from the documents", () => {
    expect(teams.size).toBe(24);
    expect(loadTeams().find((t) => t.code === "KSA")).toMatchObject({ ar: "السعودية", host: true });
    expect(stadiums.size).toBe(8);
    const byCity = loadStadiums().reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.city]: (acc[s.city] ?? 0) + 1 }), {});
    expect(byCity).toEqual({ RUH: 5, JED: 2, KHB: 1 });
    // أسماء الرعاية ممنوعة داخل اللعبة (RIGHTS_REGISTER الصف 8).
    const names = loadStadiums().map((s) => `${s.ar} ${s.en}`).join(" ");
    expect(names).not.toMatch(/الأول بارك|الإنماء|Alinma|AlAwwal|Al Awwal/);
  });
});

describe("toScheduleEntry", () => {
  it("keeps the public fields and drops the admin identity", () => {
    const entry = toScheduleEntry("m01", base, teams, stadiums);
    expect(entry).toEqual({
      matchId: "m01",
      matchNo: 1,
      stage: "group",
      group: "A",
      day: "2027-01-07",
      stadiumId: "STD_RUH_KFS",
      home: "KSA",
      away: "PLE",
      status: "scheduled",
      score: null,
    });
    expect(entry).not.toHaveProperty("updatedBy");
  });

  it("accepts placeholder slots and unassigned stadiums for knockout matches", () => {
    const entry = toScheduleEntry("m37", { ...base, matchNo: 37, stage: "r16", group: null, stadiumId: null, home: "1A", away: "W36" }, teams, stadiums);
    expect(entry?.stadiumId).toBeNull();
    expect(entry?.home).toBe("1A");
  });

  it("requires a score for finished matches", () => {
    expect(toScheduleEntry("m01", { ...base, status: "finished" }, teams, stadiums)).toBeNull();
    expect(toScheduleEntry("m01", { ...base, status: "finished", score: { home: 2, away: 1 } }, teams, stadiums)?.score).toEqual({ home: 2, away: 1 });
  });

  it.each([
    ["unknown team", { home: "BRA" }],
    ["unknown stadium", { stadiumId: "STD_XXX" }],
    ["bad day", { day: "7/1/2027" }],
    ["bad match number", { matchNo: 52 }],
    ["bad stage", { stage: "semi" }],
  ])("rejects %s", (_, patch) => {
    expect(toScheduleEntry("m01", { ...base, ...patch }, teams, stadiums)).toBeNull();
  });
});
