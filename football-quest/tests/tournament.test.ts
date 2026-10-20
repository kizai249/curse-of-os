import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG, RANDOM_DROP_POOL } from '../src/config/items';
import { ALL_POINTS, LOCATIONS } from '../src/config/locations';
import { CITIES, GROUP_IDS, LANDMARKS, TEAMS, TOURNAMENT, VENUES } from '../src/config/tournament';
import { ItemCatalog } from '../src/domain/catalog';

describe('tournament data integrity', () => {
  it('has 24 unique teams, 4 per group, exactly one host', () => {
    expect(TEAMS).toHaveLength(TOURNAMENT.teamCount);
    expect(new Set(TEAMS.map((t) => t.id)).size).toBe(TEAMS.length);
    for (const g of GROUP_IDS) expect(TEAMS.filter((t) => t.group === g)).toHaveLength(4);
    expect(TEAMS.filter((t) => t.isHost).map((t) => t.id)).toEqual(['ksa']);
  });

  it('records the draw facts used in the quiz', () => {
    const group = (id: string) => TEAMS.find((t) => t.id === id)!.group;
    expect(['ksa', 'kuw', 'oma', 'ple'].map(group)).toEqual(['A', 'A', 'A', 'A']);
    expect(group('jpn')).toBe('F');
    expect(group('qat')).toBe('F');
    expect(TEAMS.find((t) => t.id === 'jpn')!.titles).toBe(4);
    expect(TEAMS.find((t) => t.id === 'ksa')!.titles).toBe(3);
  });

  it('has 8 venues across exactly the 3 host cities', () => {
    expect(VENUES).toHaveLength(TOURNAMENT.venueCount);
    expect(new Set(VENUES.map((v) => v.cityId))).toEqual(new Set(CITIES.map((c) => c.id)));
    expect(CITIES.map((c) => c.id)).toEqual(['riyadh', 'jeddah', 'khobar']);
  });

  it('every city has landmarks and at least one venue', () => {
    for (const c of CITIES) {
      expect(LANDMARKS.filter((l) => l.cityId === c.id).length).toBeGreaterThanOrEqual(3);
      expect(VENUES.filter((v) => v.cityId === c.id).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('colours are valid hex', () => {
    for (const t of TEAMS) for (const c of t.colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    for (const v of VENUES) for (const c of v.palette) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('generated catalogue & locations', () => {
  it('builds 24 badges, 96 cards, a postcard per landmark and a stamp per venue, with unique ids', () => {
    const count = (k: string) => ITEM_CATALOG.filter((i) => i.kind === k).length;
    expect(count('team_badge')).toBe(24);
    expect(count('player_card')).toBe(96);
    expect(count('landmark')).toBe(LANDMARKS.length);
    expect(count('venue_stamp')).toBe(VENUES.length);
    expect(() => new ItemCatalog(ITEM_CATALOG)).not.toThrow();
  });

  it('player cards are explicitly fictional (no real player names)', () => {
    for (const c of ITEM_CATALOG.filter((i) => i.kind === 'player_card')) expect(c.descriptionAr).toContain('خيالية');
  });

  it('random drops never include landmark postcards or venue stamps', () => {
    expect(RANDOM_DROP_POOL.every((i) => i.kind === 'team_badge' || i.kind === 'player_card')).toBe(true);
  });

  it('one fan zone per city plus one stadium per venue, with unique point ids', () => {
    expect(LOCATIONS.filter((l) => l.kind === 'fanzone')).toHaveLength(CITIES.length);
    expect(LOCATIONS.filter((l) => l.kind === 'stadium')).toHaveLength(VENUES.length);
    expect(new Set(ALL_POINTS.map((p) => p.id)).size).toBe(ALL_POINTS.length);
  });

  it('every fixed point grants an existing item, and every landmark/stamp is reachable', () => {
    const catalog = new ItemCatalog(ITEM_CATALOG);
    const granted = new Set(ALL_POINTS.filter((p) => p.grantItemId).map((p) => p.grantItemId!));
    for (const id of granted) expect(catalog.get(id)).toBeDefined();
    for (const item of ITEM_CATALOG.filter((i) => i.kind === 'landmark' || i.kind === 'venue_stamp')) expect(granted.has(item.id)).toBe(true);
  });

  it('points are inside the walkable area', () => {
    for (const p of ALL_POINTS) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(22);
      expect(Math.abs(p.z)).toBeLessThanOrEqual(22);
    }
  });
});
