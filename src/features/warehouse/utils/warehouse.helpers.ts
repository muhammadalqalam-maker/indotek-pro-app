import type { WarehouseInventoryItem } from '../types';

export type InventoryStatus = 'safe' | 'low' | 'out_of_stock';

export function getInventoryStatus(
  item: Pick<WarehouseInventoryItem, 'current_stock' | 'minimum_stock'>,
): InventoryStatus {
  if (item.current_stock <= 0) return 'out_of_stock';
  if (item.minimum_stock > 0 && item.current_stock <= item.minimum_stock) return 'low';
  return 'safe';
}

export function hasSufficientStock(
  item: Pick<WarehouseInventoryItem, 'current_stock'>,
  quantity: number,
): boolean {
  return quantity > 0 && item.current_stock >= quantity;
}
