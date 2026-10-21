import { CityCode } from "../shared/contracts.js";

/** كلمات أصلية عامة للاسم المستعار (بدون أسماء لاعبين أو أندية أو علامات). */
const NOUNS = [
  "صقر", "نجم", "موج", "ذيب", "سهم", "برق", "فهد", "رعد", "نسر", "شهاب",
  "بدر", "جبل", "سيف", "ريح", "ليث", "مدار", "هداف", "قائد", "حارس", "جناح",
] as const;

const CITY_WORD: Record<CityCode, string> = { RUH: "الرياض", JED: "جدة", KHB: "الخبر" };

/** يولّد اسمًا مستعارًا مثل «صقر_جدة_27» (DATA_CONTRACTS §1). `rng` يرجع [0، 1). */
export function generateAlias(city: CityCode, rng: () => number = Math.random): string {
  const noun = NOUNS[Math.floor(rng() * NOUNS.length)] ?? NOUNS[0];
  const number = 10 + Math.floor(rng() * 90);
  return `${noun}_${CITY_WORD[city]}_${number}`;
}

export const ALIAS_NOUNS: readonly string[] = NOUNS;
