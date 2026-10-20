import type { DiscoveryPointDefinition, LocationDefinition } from '../domain/types';
import { CITIES, LANDMARKS, VENUES } from './tournament';

/** Random-drop spots inside every stadium (pitch coordinates, world units). */
const STADIUM_SPOTS: readonly [string, number, number][] = [
  ['left_wing', -14, -2], ['right_wing', 14, -3], ['north_box', 0, -17], ['south_box', 2, 15],
  ['corner_nw', -17, -16], ['corner_se', 17, 14], ['bench', -16, 12],
];

/** Landmarks sit on a ring around the fan-zone plaza; their points are in front of each replica. */
export const FANZONE_RING_RADIUS = 15;
const FANZONE_POINT_INSET = 5;
const FANZONE_EXTRA_SPOTS: readonly [string, number, number][] = [['screen', 0, -6], ['flags', -6, 6], ['stage', 6, 6]];

export function landmarkAngle(index: number, count: number): number {
  return (index / count) * Math.PI * 2 + Math.PI / 4;
}

export function buildLocations(): LocationDefinition[] {
  const out: LocationDefinition[] = [];
  for (const city of CITIES) {
    const id = `fanzone_${city.id}`;
    const landmarks = LANDMARKS.filter((l) => l.cityId === city.id);
    const points: DiscoveryPointDefinition[] = landmarks.map((l, i) => {
      const a = landmarkAngle(i, landmarks.length);
      const r = FANZONE_RING_RADIUS - FANZONE_POINT_INSET;
      return { id: `${id}:${l.id}`, locationId: id, x: Math.cos(a) * r, z: Math.sin(a) * r, grantItemId: `landmark_${l.id}` };
    });
    for (const [name, x, z] of FANZONE_EXTRA_SPOTS) points.push({ id: `${id}:${name}`, locationId: id, x, z });
    out.push({ id, kind: 'fanzone', cityId: city.id, nameAr: `منطقة المشجعين – ${city.nameAr}`, points });
  }
  for (const v of VENUES) {
    const id = `stadium_${v.id}`;
    const points: DiscoveryPointDefinition[] = [{ id: `${id}:center`, locationId: id, x: 0, z: -6, grantItemId: `stamp_${v.id}` }];
    for (const [name, x, z] of STADIUM_SPOTS) points.push({ id: `${id}:${name}`, locationId: id, x, z });
    out.push({ id, kind: 'stadium', cityId: v.cityId, venueId: v.id, nameAr: v.nameAr, points });
  }
  return out;
}

export const LOCATIONS: readonly LocationDefinition[] = buildLocations();
export const ALL_POINTS: readonly DiscoveryPointDefinition[] = LOCATIONS.flatMap((l) => l.points);
export const locationById = (id: string): LocationDefinition | undefined => LOCATIONS.find((l) => l.id === id);
