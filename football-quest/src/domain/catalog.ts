import type { Rng } from '../core/Rng';
import { pickWeighted } from '../core/Rng';
import type { ItemDefinition, Rarity } from './types';

/** Read-only lookup over the item catalog plus the discovery drop roll. */
export class ItemCatalog {
  private readonly byId: ReadonlyMap<string, ItemDefinition>;

  constructor(readonly items: readonly ItemDefinition[]) {
    const map = new Map<string, ItemDefinition>();
    for (const item of items) {
      if (map.has(item.id)) throw new Error(`Duplicate item id in catalog: ${item.id}`);
      map.set(item.id, item);
    }
    this.byId = map;
  }

  get(id: string): ItemDefinition | undefined {
    return this.byId.get(id);
  }

  /** Rolls a rarity by weight, then an item of that rarity. Empty rarities are skipped. */
  roll(weights: Readonly<Record<Rarity, number>>, rng: Rng): ItemDefinition {
    const available = { ...weights };
    for (const rarity of Object.keys(available) as Rarity[]) {
      if (!this.items.some((i) => i.rarity === rarity)) available[rarity] = 0;
    }
    const rarity = pickWeighted(available, rng);
    const pool = this.items.filter((i) => i.rarity === rarity);
    return pool[Math.floor(rng() * pool.length)]!;
  }
}
