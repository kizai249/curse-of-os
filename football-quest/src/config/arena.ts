import type { DiscoveryPointDefinition } from '../domain/types';

/** Discovery points of the virtual arena (works without GPS). Positions are world units on the XZ plane. */
export const ARENA_POINTS: readonly DiscoveryPointDefinition[] = [
  { id: 'p_center', x: 0, z: -6 },
  { id: 'p_left_wing', x: -14, z: -2 },
  { id: 'p_right_wing', x: 14, z: -3 },
  { id: 'p_north_goal', x: 0, z: -18 },
  { id: 'p_south_goal', x: 2, z: 15 },
  { id: 'p_corner_nw', x: -17, z: -16 },
  { id: 'p_corner_se', x: 17, z: 14 },
  { id: 'p_bench', x: -16, z: 12 },
];
