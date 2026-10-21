import { encodeGeohash, isValidCoordinate } from "./geo.js";

export type ZoneType = "stadium" | "branch";

/** حدود نصف القطر — DATA_CONTRACTS §3 وGAME_RULES §6.2. */
export const RADIUS_LIMITS: Record<ZoneType, { min: number; max: number; default: number }> = {
  stadium: { min: 1000, max: 2000, default: 1500 },
  branch: { min: 150, max: 500, default: 250 },
};

export interface ZoneInput {
  type: ZoneType;
  refId: string;
  lat: number;
  lng: number;
  radiusM?: number;
  active?: boolean;
}

/**
 * يبني مستند `zones/{zoneId}` بعد التحقق (مركز منشأة، مو لاعب). يُستخدم في سكربت التطوير الحين،
 * وفي `upsertBranch` من لوحة الشركاء (S9).
 */
export function zoneDocument(input: ZoneInput): { center: { lat: number; lng: number }; radiusM: number; geohash5: string; type: ZoneType; refId: string; active: boolean } {
  if (input.type !== "stadium" && input.type !== "branch") throw new Error("invalid zone type");
  if (typeof input.refId !== "string" || input.refId.length === 0) throw new Error("refId required");
  if (!isValidCoordinate(input.lat, input.lng)) throw new Error("invalid coordinates");
  const limits = RADIUS_LIMITS[input.type];
  const radiusM = input.radiusM ?? limits.default;
  if (!Number.isFinite(radiusM) || radiusM < limits.min || radiusM > limits.max) {
    throw new Error(`radius for ${input.type} must be ${limits.min}–${limits.max} m`);
  }
  return {
    type: input.type,
    refId: input.refId,
    center: { lat: input.lat, lng: input.lng },
    radiusM,
    geohash5: encodeGeohash(input.lat, input.lng, 5),
    active: input.active ?? true,
  };
}
