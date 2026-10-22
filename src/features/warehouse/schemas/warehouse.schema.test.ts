import assert from 'node:assert/strict';
import test from 'node:test';
import { inventoryItemSchema, warehouseMovementSchema } from './warehouse.schema';

const sourceItemId = '00000000-0000-4000-8000-000000000001';
const destinationItemId = '00000000-0000-4000-8000-000000000002';

const baseMovement = {
  movementDate: '2026-10-22',
  quantity: 2.5,
  sourceInventoryItemId: '',
  destinationInventoryItemId: '',
  adjustmentDirection: 'decrease' as const,
  referenceDoc: '',
  recipientOrSupplier: '',
  notes: '',
};

test('inventory item requires a project, location, and valid minimum quantity', () => {
  const item = {
    projectId: sourceItemId,
    itemCode: 'MAT-001',
    itemName: 'Semen',
    category: 'Bahan',
    unit: 'sak',
    locationName: 'Gudang Utama',
    minimumStock: 2.5,
  };
  assert.equal(inventoryItemSchema.safeParse(item).success, true);
  assert.equal(inventoryItemSchema.safeParse({ ...item, locationName: '' }).success, false);
  assert.equal(inventoryItemSchema.safeParse({ ...item, minimumStock: 1.2345 }).success, false);
});

test('stock movements validate their source and destination shapes', () => {
  assert.equal(warehouseMovementSchema.safeParse({
    ...baseMovement,
    movementType: 'in',
    destinationInventoryItemId: destinationItemId,
  }).success, true);
  assert.equal(warehouseMovementSchema.safeParse({
    ...baseMovement,
    movementType: 'out',
    sourceInventoryItemId: sourceItemId,
  }).success, true);
  assert.equal(warehouseMovementSchema.safeParse({
    ...baseMovement,
    movementType: 'transfer',
    sourceInventoryItemId: sourceItemId,
    destinationInventoryItemId: destinationItemId,
  }).success, true);
  assert.equal(warehouseMovementSchema.safeParse({
    ...baseMovement,
    movementType: 'transfer',
    sourceInventoryItemId: sourceItemId,
    destinationInventoryItemId: sourceItemId,
  }).success, false);
});

test('stock adjustments require one item and a reason', () => {
  const adjustment = {
    ...baseMovement,
    movementType: 'adjustment' as const,
    sourceInventoryItemId: sourceItemId,
    notes: 'Hasil hitung fisik',
  };
  assert.equal(warehouseMovementSchema.safeParse(adjustment).success, true);
  assert.equal(warehouseMovementSchema.safeParse({ ...adjustment, notes: '' }).success, false);
  assert.equal(warehouseMovementSchema.safeParse({
    ...adjustment,
    sourceInventoryItemId: '',
    destinationInventoryItemId: destinationItemId,
  }).success, false);
});
