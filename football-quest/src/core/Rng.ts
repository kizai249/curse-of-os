/** Deterministic, seedable random source so gameplay rolls are reproducible in tests. */
export type Rng = () => number;

/** mulberry32 — small, fast, good enough for gameplay (not for security). */
export function createSeededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const mathRng: Rng = () => Math.random();

/** Picks a key proportionally to its (non-negative) weight. */
export function pickWeighted<K extends string>(weights: Readonly<Record<K, number>>, rng: Rng): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  if (total <= 0) throw new RangeError('pickWeighted: total weight must be positive');
  let roll = rng() * total;
  for (const [key, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll < 0) return key;
  }
  return entries[entries.length - 1]![0];
}

/** Stable 32-bit hash of a string (FNV-1a), used to derive seeds from ids/dates. */
export function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
