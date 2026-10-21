/**
 * يوم اللعبة: يبدأ 04:00 بتوقيت الرياض (UTC+3، بدون توقيت صيفي) — GAME_RULES.md §1.
 * نسخة C# في unity/.../Scripts/Core/GameDay.cs، وكلاهما يُختبر بـ shared/contracts/game-day.vectors.json.
 */
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
const ROLLOVER_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** معرّف اليوم بصيغة YYYY-MM-DD. */
export function gameDayId(instant: Date): string {
  const shifted = new Date(instant.getTime() + RIYADH_OFFSET_MS - ROLLOVER_MS);
  return shifted.toISOString().slice(0, 10);
}

/** اللحظة اللي يبدأ فيها يوم اللعبة التالي. */
export function nextRollover(instant: Date): Date {
  const shifted = instant.getTime() + RIYADH_OFFSET_MS - ROLLOVER_MS;
  const nextDayStartShifted = Math.floor(shifted / DAY_MS) * DAY_MS + DAY_MS;
  return new Date(nextDayStartShifted - RIYADH_OFFSET_MS + ROLLOVER_MS);
}
