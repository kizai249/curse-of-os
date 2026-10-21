import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { accuracyBand, cellSize, distanceM, encodeGeohash, isInside, MAX_ACCURACY_M, neighborhood } from "../../src/location/geo.js";
import { zoneDocument } from "../../src/location/zones.js";

interface Case {
  label: string;
  distanceM: number;
  radiusM: number;
  accuracyM: number;
  accepted: boolean;
}
const vectors: { maxAccuracyM: number; cases: Case[] } = JSON.parse(
  readFileSync(resolve(__dirname, "../../../../shared/contracts/presence.vectors.json"), "utf8"),
);

describe("acceptance rule (GAME_RULES §6.1, AT-02)", () => {
  it("uses the shared max accuracy", () => expect(MAX_ACCURACY_M).toBe(vectors.maxAccuracyM));
  it.each(vectors.cases)("$label", (c) => {
    expect(isInside(c.distanceM, c.radiusM, c.accuracyM)).toBe(c.accepted);
  });
});

describe("geohash", () => {
  it("matches reference hashes", () => {
    expect(encodeGeohash(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
    expect(encodeGeohash(42.6, -5.6, 5)).toBe("ezs42");
    expect(encodeGeohash(-25.382708, -49.265506, 12)).toBe("6gkzwgjzn820");
  });

  it("precision-5 cells are larger than any zone (2 km + 50 m), so 3×3 neighbours cover it", () => {
    const { lat, lng } = cellSize(5);
    const latMeters = lat * 111_320;
    const lngMetersAtRiyadh = lng * 111_320 * Math.cos((24.7 * Math.PI) / 180);
    expect(Math.min(latMeters, lngMetersAtRiyadh)).toBeGreaterThan(2050);
  });

  it("finds a zone centre from any point inside it, including across cell borders", () => {
    // نقاط عشوائية (بذرة) حول مركز، ضمن 2050 م: خلية المركز لازم تكون من الجيران.
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 2000; i++) {
      const center = { lat: 21 + rand() * 6, lng: 39 + rand() * 11 };
      const angle = rand() * 2 * Math.PI;
      const r = rand() * 2050;
      const lat = center.lat + (r * Math.cos(angle)) / 111_320;
      const lng = center.lng + (r * Math.sin(angle)) / (111_320 * Math.cos((center.lat * Math.PI) / 180));
      expect(distanceM(lat, lng, center.lat, center.lng)).toBeLessThan(2060);
      expect(neighborhood(lat, lng, 5)).toContain(encodeGeohash(center.lat, center.lng, 5));
    }
  });

  it("haversine distance is sane", () => {
    expect(distanceM(24.7, 46.7, 24.7, 46.7)).toBe(0);
    const oneKmNorth = 24.7 + 1000 / 111_195;
    expect(distanceM(24.7, 46.7, oneKmNorth, 46.7)).toBeCloseTo(1000, -1);
  });

  it("reports accuracy as a band, never the number", () => {
    expect(accuracyBand(10)).toBe("<=25");
    expect(accuracyBand(30)).toBe("26-50");
    expect(accuracyBand(100)).toBe("51-100");
    expect(accuracyBand(180)).toBe(">100");
  });
});

describe("zoneDocument", () => {
  it("validates radius limits per type and computes geohash5", () => {
    expect(zoneDocument({ type: "branch", refId: "br1", lat: 21.5, lng: 39.2 })).toMatchObject({ radiusM: 250, geohash5: encodeGeohash(21.5, 39.2, 5), active: true });
    expect(() => zoneDocument({ type: "branch", refId: "br1", lat: 21.5, lng: 39.2, radiusM: 600 })).toThrow();
    expect(() => zoneDocument({ type: "stadium", refId: "STD_RUH_KFS", lat: 24.7, lng: 46.8, radiusM: 900 })).toThrow();
    expect(() => zoneDocument({ type: "stadium", refId: "x", lat: 95, lng: 46.8 })).toThrow();
  });
});
