import assert from 'node:assert/strict';
import test from 'node:test';
import { getInventoryStatus, hasSufficientStock } from './warehouse.helpers';

test('inventory status follows zero and minimum thresholds', () => {
  assert.equal(getInventoryStatus({ current_stock: 0, minimum_stock: 0 }), 'out_of_stock');
  assert.equal(getInventoryStatus({ current_stock: 3, minimum_stock: 5 }), 'low');
  assert.equal(getInventoryStatus({ current_stock: 5, minimum_stock: 5 }), 'low');
  assert.equal(getInventoryStatus({ current_stock: 6, minimum_stock: 5 }), 'safe');
  assert.equal(getInventoryStatus({ current_stock: 3, minimum_stock: 0 }), 'safe');
});

test('outbound movements cannot exceed the available stock', () => {
  const item = { current_stock: 5 };
  assert.equal(hasSufficientStock(item, 5), true);
  assert.equal(hasSufficientStock(item, 5.001), false);
  assert.equal(hasSufficientStock(item, 0), false);
});
