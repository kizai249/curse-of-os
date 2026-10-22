import { describe, expect, it } from "vitest";
import { streakReward } from "../../src/branch/streak.js";
import { drawPlayerCard } from "../../src/coop/playerCards.js";
import { seededRng } from "../../src/coop/puzzle.js";
import { loadPlayers } from "../../src/content/catalog.js";
import { rank } from "../../src/economy/rules.js";

describe("visit streak rewards (GAME_RULES §6.4)", () => {
  it("rewards days 3, 5 and 7 once, and nothing else", () => {
    expect(streakReward(2, 3)).toMatchObject({ day: 3, packs: 2, epicPacks: 0, playerCard: false, coupon: false });
    expect(streakReward(4, 5)).toMatchObject({ day: 5, playerCard: true });
    expect(streakReward(6, 7)).toMatchObject({ day: 7, epicPacks: 1, coupon: true });
    expect(streakReward(3, 3)).toBeNull(); // زيارة ثانية لنفس العلامة في نفس اليوم
    for (const n of [1, 2, 4, 6, 8, 10, 14]) expect(streakReward(n - 1, n)).toBeNull();
  });

  it("day-5 player cards are rare or higher", () => {
    const players = loadPlayers().players;
    const rng = seededRng("streak5");
    for (let i = 0; i < 300; i++) {
      const card = drawPlayerCard(players, new Set(), rng, "rare");
      expect(rank(players.find((p) => p.id === card.playerId)!.rarity)).toBeGreaterThanOrEqual(rank("rare"));
    }
  });
});
