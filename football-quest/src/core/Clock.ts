export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

/** Manually advanced clock for deterministic tests. */
export class FakeClock implements Clock {
  constructor(private time = 0) {}
  now(): number { return this.time; }
  advance(ms: number): void { this.time += ms; }
  set(ms: number): void { this.time = ms; }
}

/** Local calendar day key (YYYY-MM-DD) used to rotate daily missions. */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
