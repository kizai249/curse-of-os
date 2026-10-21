/** أدوات جغرافية بدون مكتبات: Geohash ومسافة Haversine وشرط القبول (GAME_RULES §6.1). */

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const EARTH_RADIUS_M = 6_371_008.8;

export function encodeGeohash(lat: number, lng: number, precision = 5): string {
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  let hash = "";
  let bit = 0;
  let ch = 0;
  let even = true;
  while (hash.length < precision) {
    if (even) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { ch = (ch << 1) | 1; lngMin = mid; } else { ch <<= 1; lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { ch = (ch << 1) | 1; latMin = mid; } else { ch <<= 1; latMax = mid; }
    }
    even = !even;
    if (++bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/** أبعاد خلية geohash بالدرجات. */
export function cellSize(precision: number): { lat: number; lng: number } {
  const bits = precision * 5;
  const lngBits = Math.ceil(bits / 2);
  const latBits = Math.floor(bits / 2);
  return { lat: 180 / 2 ** latBits, lng: 360 / 2 ** lngBits };
}

/** الخلية ومجاوراتها الثمانية (لتصفية المناطق القريبة). خلية الدقة 5 ≈ 4.9 × 4.9 كم، أكبر من أي منطقة (≤ 2 كم + 50 م). */
export function neighborhood(lat: number, lng: number, precision = 5): string[] {
  const { lat: dLat, lng: dLng } = cellSize(precision);
  const cells = new Set<string>();
  for (const dy of [-1, 0, 1]) {
    for (const dx of [-1, 0, 1]) {
      const y = Math.max(-89.999999, Math.min(89.999999, lat + dy * dLat));
      let x = lng + dx * dLng;
      if (x > 180) x -= 360;
      if (x < -180) x += 360;
      cells.add(encodeGeohash(y, x, precision));
    }
  }
  return [...cells];
}

export function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const MAX_ACCURACY_M = 100;
export const ACCURACY_SLACK_CAP_M = 50;

/** §6.1: الدقة ≤ 100 م، والمسافة ≤ نصف القطر + الأقل من (الدقة، 50 م). */
export function isInside(distance: number, radiusM: number, accuracyM: number): boolean {
  return accuracyM <= MAX_ACCURACY_M && distance <= radiusM + Math.min(accuracyM, ACCURACY_SLACK_CAP_M);
}

/** نطاق الدقة للتحليلات (DATA_CONTRACTS §9.2) — بدل الرقم نفسه. */
export function accuracyBand(accuracyM: number): "<=25" | "26-50" | "51-100" | ">100" {
  if (accuracyM <= 25) return "<=25";
  if (accuracyM <= 50) return "26-50";
  if (accuracyM <= 100) return "51-100";
  return ">100";
}

export function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
