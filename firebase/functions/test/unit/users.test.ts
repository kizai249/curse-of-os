import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ageBandFor } from "../../src/users/ageBand.js";
import { ALIAS_NOUNS, generateAlias } from "../../src/users/alias.js";
import { providerOf } from "../../src/users/setAgeAndCity.js";

interface AgeVector {
  instant: string;
  birthYear: number;
  band: string;
}

const vectors: AgeVector[] = JSON.parse(
  readFileSync(resolve(__dirname, "../../../../shared/contracts/age-band.vectors.json"), "utf8"),
).vectors;

describe("ageBandFor (shared vectors with C#)", () => {
  it("loads the shared vectors", () => expect(vectors.length).toBeGreaterThanOrEqual(10));

  it.each(vectors)("$birthYear at $instant → $band", (v) => {
    expect(ageBandFor(v.birthYear, new Date(v.instant))).toBe(v.band);
  });

  it.each([undefined, null, "2000", 2000.5, Number.NaN])("rejects non-integer input %s", (value) => {
    expect(ageBandFor(value, new Date("2027-01-10T12:00:00Z"))).toBe("invalid");
  });
});

describe("generateAlias", () => {
  it("follows the noun_city_NN shape for every city", () => {
    expect(generateAlias("JED", () => 0)).toBe(`${ALIAS_NOUNS[0]}_جدة_10`);
    expect(generateAlias("RUH", () => 0.999)).toBe(`${ALIAS_NOUNS[ALIAS_NOUNS.length - 1]}_الرياض_99`);
    expect(generateAlias("KHB")).toMatch(/^[؀-ۿ]+_الخبر_\d{2}$/);
  });
});

describe("providerOf", () => {
  it("maps player providers and rejects staff accounts", () => {
    expect(providerOf("anonymous")).toBe("anonymous");
    expect(providerOf("apple.com")).toBe("apple");
    expect(providerOf("google.com")).toBe("google");
    expect(providerOf("password")).toBeNull();
    expect(providerOf(undefined)).toBeNull();
  });
});
