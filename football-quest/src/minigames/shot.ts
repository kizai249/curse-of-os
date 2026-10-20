/** Shooting rules shared by the solo timing shot and the party shootout. */

export type ShotGrade = 'perfect' | 'good' | 'saved';

export interface ShotWindows {
  readonly perfectWindow: number;
  readonly goodWindow: number;
}

/** Triangle wave in [0, 1]: the power needle sweeping 0→1→0 over `sweepMs`. */
export function meterPosition(elapsedMs: number, sweepMs: number): number {
  const t = (elapsedMs % sweepMs) / sweepMs;
  return t < 0.5 ? t * 2 : 2 - t * 2;
}

export function gradeShot(meterValue: number, target: number, w: ShotWindows): ShotGrade {
  const distance = Math.abs(meterValue - target);
  if (distance <= w.perfectWindow) return 'perfect';
  if (distance <= w.goodWindow) return 'good';
  return 'saved';
}
