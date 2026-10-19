import { describe, expect, it } from 'vitest';
import { ITEM_CATALOG } from '../src/config/items';
import { createSeededRng } from '../src/core/Rng';
import { ItemCatalog } from '../src/domain/catalog';
import { addItem, addShards, EMPTY_INVENTORY, uniqueOwnedCount } from '../src/domain/inventory';
import type { ItemDefinition } from '../src/domain/types';

const epic: ItemDefinition = { id: 'x', nameAr: 'x', nameEn: 'x', descriptionAr: '', rarity: 'epic', category: 'ball', modelKey: 'ball', color: '#fff' };

describe('inventory', () => {
  it('adds a new item without shards', () => {
    const out = addItem(EMPTY_INVENTORY, epic, 1000);
    expect(out.duplicate).toBe(false);
    expect(out.shardsAwarded).toBe(0);
    expect(out.inventory.items.x).toEqual({ count: 1, firstObtainedAt: 1000 });
  });

  it('converts duplicates into shards and keeps the first-obtained time', () => {
    const first = addItem(EMPTY_INVENTORY, epic, 1000).inventory;
    const out = addItem(first, epic, 2000, { common: 1, rare: 2, epic: 40, legendary: 4 });
    expect(out.duplicate).toBe(true);
    expect(out.shardsAwarded).toBe(40);
    expect(out.inventory.shards).toBe(40);
    expect(out.inventory.items.x).toEqual({ count: 2, firstObtainedAt: 1000 });
    expect(uniqueOwnedCount(out.inventory)).toBe(1);
  });

  it('does not mutate the previous state', () => {
    const before = EMPTY_INVENTORY;
    addItem(before, epic, 1);
    expect(before.items).toEqual({});
  });

  it('rejects invalid shard amounts', () => {
    expect(() => addShards(EMPTY_INVENTORY, -1)).toThrow(RangeError);
    expect(addShards(EMPTY_INVENTORY, 5).shards).toBe(5);
  });
});

describe('item catalog', () => {
  const catalog = new ItemCatalog(ITEM_CATALOG);

  it('rejects duplicate ids', () => {
    expect(() => new ItemCatalog([epic, epic])).toThrow(/Duplicate/);
  });

  it('every catalog item has Arabic name, valid colour and a rarity', () => {
    for (const item of ITEM_CATALOG) {
      expect(item.nameAr.length).toBeGreaterThan(0);
      expect(item.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('rolls only the rarity that has weight', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 50; i++) {
      expect(catalog.roll({ common: 0, rare: 0, epic: 0, legendary: 1 }, rng).rarity).toBe('legendary');
    }
  });

  it('roll distribution roughly follows weights (seeded)', () => {
    const rng = createSeededRng(123);
    const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
    const n = 5000;
    for (let i = 0; i < n; i++) counts[catalog.roll({ common: 60, rare: 30, epic: 10, legendary: 0 }, rng).rarity]++;
    expect(counts.legendary).toBe(0);
    expect(counts.common / n).toBeGreaterThan(0.55);
    expect(counts.common / n).toBeLessThan(0.65);
    expect(counts.epic / n).toBeGreaterThan(0.07);
  });

  it('skips rarities with no items instead of crashing', () => {
    const onlyCommon = new ItemCatalog([{ ...epic, rarity: 'common' }]);
    expect(onlyCommon.roll({ common: 1, rare: 99, epic: 99, legendary: 99 }, createSeededRng(1)).id).toBe('x');
  });
});
