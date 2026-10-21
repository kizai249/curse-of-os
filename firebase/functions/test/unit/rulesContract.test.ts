import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as rules from "../../src/economy/rules.js";

const shared = JSON.parse(readFileSync(resolve(__dirname, "../../../../shared/contracts/economy.json"), "utf8"));

describe("economy rules match shared/contracts/economy.json (same numbers the client displays)", () => {
  it("matches", () => {
    expect(rules.PACK_ODDS).toEqual(shared.packOdds);
    expect(rules.PITY_THRESHOLD).toBe(shared.pityThreshold);
    expect(rules.MATCHDAY_WEIGHT).toBe(shared.matchdayWeight);
    expect(rules.DUPLICATE_FP).toEqual(shared.duplicateFp);
    expect(rules.EXCHANGE_COST).toEqual(shared.exchangeCost);
    expect(rules.MAX_LEVEL).toBe(shared.maxLevel);
    expect(rules.DAILY_XP_CAP).toBe(shared.dailyXpCap);
    expect(rules.DAILY_LOGIN).toEqual(shared.dailyLogin);
    expect(rules.DIGITAL_VISIT_XP).toBe(shared.digitalVisitXp);
    expect(Object.values(rules.PACK_ODDS).reduce((a, b) => a + b, 0)).toBe(100);
  });
});
