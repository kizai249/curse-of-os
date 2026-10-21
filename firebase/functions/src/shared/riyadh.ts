const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

/** السنة التقويمية بتوقيت الرياض (للعمر). */
export function riyadhYear(instant: Date): number {
  return new Date(instant.getTime() + RIYADH_OFFSET_MS).getUTCFullYear();
}
