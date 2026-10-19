import { DUPLICATE_SHARDS } from '../config/balance';
import type { ItemDefinition, Rarity } from './types';

export interface OwnedItem {
  readonly count: number;
  readonly firstObtainedAt: number;
}

export interface InventoryState {
  readonly items: Readonly<Record<string, OwnedItem>>;
  /** Currency earned from duplicates and rewards. */
  readonly shards: number;
}

export const EMPTY_INVENTORY: InventoryState = { items: {}, shards: 0 };

export interface AddItemOutcome {
  readonly inventory: InventoryState;
  readonly duplicate: boolean;
  readonly shardsAwarded: number;
}

/**
 * Adds an item. A duplicate still increments the owned count (for future trading/upgrades)
 * and converts into shards according to its rarity.
 */
export function addItem(
  inventory: InventoryState,
  item: ItemDefinition,
  now: number,
  duplicateShards: Readonly<Record<Rarity, number>> = DUPLICATE_SHARDS,
): AddItemOutcome {
  const owned = inventory.items[item.id];
  const duplicate = owned !== undefined;
  const shardsAwarded = duplicate ? duplicateShards[item.rarity] : 0;
  const nextOwned: OwnedItem = duplicate
    ? { count: owned.count + 1, firstObtainedAt: owned.firstObtainedAt }
    : { count: 1, firstObtainedAt: now };
  return {
    duplicate,
    shardsAwarded,
    inventory: {
      items: { ...inventory.items, [item.id]: nextOwned },
      shards: inventory.shards + shardsAwarded,
    },
  };
}

export function addShards(inventory: InventoryState, amount: number): InventoryState {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError(`Shard amount must be a non-negative integer, got ${amount}`);
  return { ...inventory, shards: inventory.shards + amount };
}

export function uniqueOwnedCount(inventory: InventoryState): number {
  return Object.keys(inventory.items).length;
}

export function ownsItem(inventory: InventoryState, itemId: string): boolean {
  return inventory.items[itemId] !== undefined;
}
