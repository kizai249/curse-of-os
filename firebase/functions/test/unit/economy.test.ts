import { describe, expect, it } from "vitest";
import { groupsFromSchedule, newAchievements } from "../../src/economy/achievements.js";
import { drawPack, Rng } from "../../src/economy/packs.js";
import { addXp, levelFor, xpForLevel } from "../../src/economy/progression.js";
import { DAILY_XP_CAP, PITY_THRESHOLD, rank, Variant } from "../../src/economy/rules.js";

/** mulberry32 — عشوائية ذات بذرة للاختبارات. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEAMS = ["KSA", "AUS", "BHR", "CHN", "IDN", "IRN", "IRQ", "JPN", "JOR", "KUW", "KGZ", "PRK", "OMA", "PLE", "QAT", "SGP", "KOR", "SYR", "TJK", "THA", "UAE", "UZB", "VIE", "YEM"];

describe("progression (GAME_RULES §9.1–9.2)", () => {
  it("needs 100 × level XP for the next level, capped at 30", () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(levelFor(99)).toBe(1);
    expect(levelFor(100)).toBe(2);
    expect(levelFor(299)).toBe(2);
    expect(levelFor(300)).toBe(3);
    expect(levelFor(10_000_000)).toBe(30);
  });

  it("counts only 600 XP per day for the leaderboard but keeps everything for levels", () => {
    let state = { xp: 0, level: 1, xpDay: { day: "", value: 0 } };
    let counted = 0;
    for (let i = 0; i < 10; i++) {
      const r = addXp(state, 100, "2027-01-10");
      state = r.next;
      counted += r.leaderboardXp;
    }
    expect(state.xp).toBe(1000);
    expect(counted).toBe(DAILY_XP_CAP);
    expect(state.xpDay).toEqual({ day: "2027-01-10", value: 600 });
    const tomorrow = addXp(state, 50, "2027-01-11");
    expect(tomorrow.leaderboardXp).toBe(50);
    expect(tomorrow.next.xpDay).toEqual({ day: "2027-01-11", value: 50 });
    expect(() => addXp(state, -5, "2027-01-11")).toThrow();
  });
});

describe("drawPack (GAME_RULES §3.3)", () => {
  it("matches the declared odds 70/22/7/1", () => {
    const rng = seeded(42);
    const counts: Record<Variant, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    const n = 200_000;
    for (let i = 0; i < n; i++) {
      counts[drawPack({ kind: "standard", pityCount: 0, teams: TEAMS, todayTeams: new Set() }, rng).variant]++;
    }
    expect(counts.common / n).toBeCloseTo(0.7, 2);
    expect(counts.rare / n).toBeCloseTo(0.22, 2);
    expect(counts.epic / n).toBeCloseTo(0.07, 2);
    expect(counts.legendary / n).toBeCloseTo(0.01, 2);
  });

  it("never lets more than 14 packs in a row pass without epic or better", () => {
    const rng = seeded(7);
    let pity = 0;
    let streak = 0;
    let longest = 0;
    let triggered = 0;
    for (let i = 0; i < 50_000; i++) {
      const r = drawPack({ kind: "standard", pityCount: pity, teams: TEAMS, todayTeams: new Set() }, rng);
      if (r.pityTriggered) {
        triggered++;
        expect(rank(r.variant)).toBeGreaterThanOrEqual(rank("epic"));
      }
      streak = rank(r.variant) >= rank("epic") ? 0 : streak + 1;
      longest = Math.max(longest, streak);
      pity = r.pityCount;
      expect(pity).toBe(streak);
    }
    expect(longest).toBe(PITY_THRESHOLD);
    expect(triggered).toBeGreaterThan(0);
  });

  it("guaranteed packs respect their floor and keep the ratio above it", () => {
    const rng = seeded(3);
    let legendary = 0;
    for (let i = 0; i < 40_000; i++) {
      const epic = drawPack({ kind: "epic", pityCount: 3, teams: TEAMS, todayTeams: new Set() }, rng);
      expect(["epic", "legendary"]).toContain(epic.variant);
      expect(epic.pityCount).toBe(0);
      if (epic.variant === "legendary") legendary++;
      expect(drawPack({ kind: "legendary", pityCount: 0, teams: TEAMS, todayTeams: new Set() }, rng).variant).toBe("legendary");
    }
    expect(legendary / 40_000).toBeCloseTo(1 / 8, 2);
  });

  it("weights teams playing today ×3 and others equally", () => {
    const rng = seeded(11);
    const counts = new Map<string, number>();
    const today = new Set(["KSA", "PLE"]);
    const n = 260_000;
    for (let i = 0; i < n; i++) {
      const t = drawPack({ kind: "standard", pityCount: 0, teams: TEAMS, todayTeams: today }, rng).teamCode;
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const total = 22 + 2 * 3;
    expect(counts.get("KSA")! / n).toBeCloseTo(3 / total, 2);
    expect(counts.get("JPN")! / n).toBeCloseTo(1 / total, 2);
    expect(counts.size).toBe(24);
  });
});

describe("achievements (GAME_RULES §3.5)", () => {
  const schedule = [
    { stage: "group", group: "A", home: "KSA", away: "PLE" },
    { stage: "group", group: "A", home: "JPN", away: "IRQ" },
    { stage: "group", group: "B", home: "AUS", away: "UZB" },
    { stage: "r16", group: null, home: "1A", away: "2B" },
  ];
  const groups = groupsFromSchedule(schedule, new Set(TEAMS));

  it("derives groups from group-stage matches only", () => {
    expect([...groups.get("A")!].sort()).toEqual(["IRQ", "JPN", "KSA", "PLE"]);
    expect(groups.get("B")!.size).toBe(2);
    expect(groups.has("null")).toBe(false);
  });

  it("awards each threshold once with its reward", () => {
    const six = new Set(TEAMS.slice(0, 6));
    expect(newAchievements(six, new Set(), new Map())).toEqual([{ id: "teams_6", packs: 2, epicPacks: 0, xp: 0 }]);
    expect(newAchievements(six, new Set(["teams_6"]), new Map())).toEqual([]);
    expect(newAchievements(new Set(TEAMS.slice(0, 12)), new Set(["teams_6"]), new Map())).toEqual([{ id: "teams_12", packs: 3, epicPacks: 0, xp: 50 }]);
    const all = newAchievements(new Set(TEAMS), new Set(["teams_6", "teams_12"]), new Map());
    expect(all).toEqual([{ id: "teams_24", packs: 0, epicPacks: 0, xp: 300, badge: "asia_collector" }]);
  });

  it("gives a guaranteed epic pack for a complete group of 4 only", () => {
    const owned = new Set(["KSA", "PLE", "JPN", "IRQ", "AUS", "UZB"]);
    const rewards = newAchievements(owned, new Set(["teams_6"]), groups);
    expect(rewards).toEqual([{ id: "group_A", packs: 0, epicPacks: 1, xp: 0 }]);
  });
});
