import { describe, expect, it } from "vitest";
import { loadPlayers } from "../../src/content/catalog.js";
import { generatePuzzleFromSeed } from "../../src/coop/puzzle.js";
import { assignInfo, assignSlots, endsAtMs, nextHost, planReservation, redistribute } from "../../src/coop/rounds.js";
import { drawPlayerCard } from "../../src/coop/playerCards.js";
import { seededRng } from "../../src/coop/puzzle.js";

const content = loadPlayers();

describe("slot and info-card distribution (GAME_RULES §7.4)", () => {
  it.each([2, 3, 4, 5, 6])("with %i players: slots are even and no one holds the stats their own slots need", (n) => {
    const uids = Array.from({ length: n }, (_, i) => `u${i}`);
    const size = n === 2 ? 6 : n === 3 ? 8 : 11;
    for (let k = 0; k < 30; k++) {
      const puzzle = generatePuzzleFromSeed(content, size, `d${n}-${k}`);
      const owners = assignSlots(puzzle.slots.map((s) => s.slotId), uids);
      const counts = uids.map((u) => Object.values(owners).filter((o) => o === u).length);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      const info = assignInfo(puzzle, owners, uids);
      expect(Object.values(info).flat().sort()).toEqual([...puzzle.pieces].sort());
      for (const [slotId, playerId] of Object.entries(puzzle.solution)) {
        expect(info[owners[slotId]!]).not.toContain(playerId);
      }
    }
  });

  it("redistributes a leaver's slots and cards evenly and keeps the rule when two or more remain", () => {
    const uids = ["a", "b", "c", "d"];
    const puzzle = generatePuzzleFromSeed(content, 11, "leave");
    const owners = assignSlots(puzzle.slots.map((s) => s.slotId), uids);
    const moved = redistribute(puzzle, owners, ["b", "c", "d"]);
    expect(Object.values(moved.owners)).not.toContain("a");
    const counts = ["b", "c", "d"].map((u) => Object.values(moved.owners).filter((o) => o === u).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    for (const [slotId, playerId] of Object.entries(puzzle.solution)) expect(moved.info[moved.owners[slotId]!]).not.toContain(playerId);
    // لاعب واحد باقٍ: كل شي عنده.
    const last = redistribute(puzzle, moved.owners, ["d"]);
    expect(new Set(Object.values(last.owners))).toEqual(new Set(["d"]));
    expect(last.info.d).toHaveLength(puzzle.pieces.length);
  });
});

describe("room rules", () => {
  it("hands the host role to the oldest remaining member", () => {
    const members = [
      { uid: "a", alias: "", joinedAt: "2027-01-15T18:00:00Z", active: true },
      { uid: "c", alias: "", joinedAt: "2027-01-15T18:02:00Z", active: true },
      { uid: "b", alias: "", joinedAt: "2027-01-15T18:01:00Z", active: false },
    ];
    expect(nextHost(members, "a")).toBe("c");
    expect(nextHost(members.map((m) => ({ ...m, active: false })))).toBeNull();
  });

  it("all-or-nothing reservation (§8.4, AT-07, AT-08)", () => {
    expect(planReservation(false, ["a", "b"], 10)).toEqual({ mode: "no_campaign", reserveFor: [] });
    expect(planReservation(true, ["a", "b", "c"], 3)).toEqual({ mode: "with_coupons", reserveFor: ["a", "b", "c"] });
    expect(planReservation(true, ["a", "b", "c", "d"], 2)).toEqual({ mode: "no_coupons", reserveFor: [] });
    expect(planReservation(true, [], 5)).toEqual({ mode: "no_coupons", reserveFor: [] });
  });

  it("each wrong lineup takes 15 s off the 180 s round", () => {
    expect(endsAtMs(1000, 0)).toBe(181_000);
    expect(endsAtMs(1000, 30)).toBe(151_000);
  });

  it("player cards prefer characters the player does not own (GAME_RULES §4)", () => {
    const rng = seededRng("cards");
    const owned = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const card = drawPlayerCard(content.players, owned, rng);
      const rarity = content.players.find((p) => p.id === card.playerId)!.rarity;
      const unownedOfRarity = content.players.filter((p) => p.rarity === rarity && !owned.has(p.id));
      expect(card.duplicate).toBe(unownedOfRarity.length === 0);
      owned.add(card.playerId);
    }
    expect(owned.size).toBeGreaterThan(20);
  });
});
