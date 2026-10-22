import { describe, expect, it } from "vitest";
import { loadPlayers } from "../../src/content/catalog.js";
import {
  candidatesFor,
  correctCount,
  countSolutions,
  FORMATIONS,
  generatePuzzleFromSeed,
  satisfies,
  slotsCountFor,
} from "../../src/coop/puzzle.js";

const content = loadPlayers();
const byId = new Map(content.players.map((p) => [p.id, p]));

describe("player content (GAME_RULES §4)", () => {
  it("has 30 original characters with the rule distribution and stat sums", () => {
    const { players } = content;
    expect(players).toHaveLength(30);
    const count = (key: "position" | "rarity", value: string) => players.filter((p) => p[key] === value).length;
    expect([count("position", "GK"), count("position", "DEF"), count("position", "MID"), count("position", "FWD")]).toEqual([3, 9, 9, 9]);
    expect([count("rarity", "common"), count("rarity", "rare"), count("rarity", "epic"), count("rarity", "legendary")]).toEqual([14, 9, 5, 2]);
    const sums = { common: 300, rare: 330, epic: 360, legendary: 390 };
    for (const p of players) {
      const values = Object.values(p.stats);
      expect(values.every((v) => v >= 40 && v <= 90)).toBe(true);
      expect(values.reduce((a, b) => a + b, 0)).toBe(sums[p.rarity]);
    }
    expect(new Set(players.map((p) => p.ar)).size).toBe(30);
  });
});

describe("co-op puzzle (GAME_RULES §7.3–7.4)", () => {
  it("maps team size to slots", () => {
    expect([2, 3, 4, 5, 6].map(slotsCountFor)).toEqual([6, 8, 11, 11, 11]);
  });

  it.each([6, 8, 11] as const)("generates %i-slot puzzles with exactly one solution across 200 seeds", (n) => {
    for (let i = 0; i < 200; i++) {
      const puzzle = generatePuzzleFromSeed(content, n, `seed-${n}-${i}`);
      expect(puzzle.slots.map((s) => s.position)).toEqual(FORMATIONS[n]);
      expect(puzzle.pieces).toHaveLength(n + 3);
      expect(new Set(puzzle.pieces).size).toBe(n + 3);
      const pool = puzzle.pieces.map((id) => byId.get(id)!);
      const cands = puzzle.slots.map((s) => candidatesFor(s, pool).map((p) => p.id));
      expect(countSolutions(cands)).toBe(1);
      for (const s of puzzle.slots) {
        const piece = byId.get(puzzle.solution[s.slotId]!)!;
        expect(piece.position).toBe(s.position);
        expect(satisfies(s.requirement, piece, pool)).toBe(true);
        expect(s.text.ar.length).toBeGreaterThan(5);
      }
      expect(correctCount(puzzle.solution, puzzle.solution)).toBe(n);
    }
  });

  it("is reproducible from its seed", () => {
    expect(generatePuzzleFromSeed(content, 8, "room_x")).toEqual(generatePuzzleFromSeed(content, 8, "room_x"));
  });

  it("counts only correct slots", () => {
    expect(correctCount({ s1: "p01", s2: "p05" }, { s1: "p01", s2: "p04", s3: "p10" })).toBe(1);
  });
});
