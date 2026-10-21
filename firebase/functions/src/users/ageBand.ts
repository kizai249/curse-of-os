import { AgeBand } from "../shared/contracts.js";
import { riyadhYear } from "../shared/riyadh.js";

export type AgeGateResult = AgeBand | "under_15" | "invalid";

export const MIN_AGE = 15;
export const ADULT_AGE = 18;
const OLDEST_BIRTH_YEAR = 1900;

/**
 * بوابة العمر بسنة الميلاد فقط (GAME_RULES §9.4–9.5، PRODUCT_BRIEF ت8).
 * العمر = سنة اليوم (الرياض) − سنة الميلاد، وهو العمر اللي يبلغه اللاعب هذي السنة:
 * - أقل من 15 ← رفض.
 * - من 15 إلى 18 ← قاصر `15_17`: من يبلغ 18 هذي السنة ممكن يكون للحين 17، فنطبق قيود القاصر (حماية).
 * TODO(legal): مراجعة قانونية — من يبلغ 15 هذي السنة ممكن يكون للحين 14 (§5 في RIGHTS_REGISTER: مراجعة PDPL والقاصرين).
 */
export function ageBandFor(birthYear: unknown, now: Date): AgeGateResult {
  const year = riyadhYear(now);
  if (typeof birthYear !== "number" || !Number.isInteger(birthYear)) return "invalid";
  if (birthYear < OLDEST_BIRTH_YEAR || birthYear > year) return "invalid";
  const ageThisYear = year - birthYear;
  if (ageThisYear < MIN_AGE) return "under_15";
  if (ageThisYear <= ADULT_AGE) return "15_17";
  return "18_plus";
}
