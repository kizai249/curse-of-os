import { CityCode, isCityCode } from "../shared/contracts.js";
import { fail } from "../shared/errors.js";

export interface Localized {
  ar: string;
  en: string;
}

export function localized(value: unknown, field: string, max = 200): Localized {
  const v = value as Partial<Localized> | undefined;
  if (!v || typeof v.ar !== "string" || typeof v.en !== "string") fail("invalid-argument", "INVALID_FIELD", { field });
  const ar = v!.ar!.trim();
  const en = v!.en!.trim();
  if (ar.length === 0 || en.length === 0 || ar.length > max || en.length > max) fail("invalid-argument", "INVALID_FIELD", { field });
  return { ar, en };
}

export function id(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[a-z0-9_]{3,64}$/.test(value)) fail("invalid-argument", "INVALID_FIELD", { field });
  return value as string;
}

export function int(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) fail("invalid-argument", "INVALID_FIELD", { field });
  return value as number;
}

export function date(value: unknown, field: string): Date {
  const d = typeof value === "string" ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) fail("invalid-argument", "INVALID_FIELD", { field });
  return d!;
}

export function city(value: unknown): CityCode {
  if (!isCityCode(value)) fail("invalid-argument", "INVALID_FIELD", { field: "city" });
  return value as CityCode;
}

/** معرّف جديد مقروء: brand_x / br_x / cmp_x + لاحقة عشوائية. */
export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
