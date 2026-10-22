import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateProjectBudgetActual,
  type BudgetActualBoqItem,
} from './projectBudgetActual.helpers';

const items: BudgetActualBoqItem[] = [
  {
    id: 'division-a',
    parent_id: null,
    item_type: 'division',
    item_code: 'I',
    description: 'Pekerjaan persiapan',
    line_total: 0,
    sort_order: 0,
  },
  {
    id: 'item-a',
    parent_id: 'division-a',
    item_type: 'work_item',
    item_code: 'I.1',
    description: 'Pembersihan lahan',
    line_total: '1000000.00',
    sort_order: 1,
  },
  {
    id: 'division-b',
    parent_id: null,
    item_type: 'division',
    item_code: 'II',
    description: 'Pekerjaan tanah',
    line_total: 0,
    sort_order: 1,
  },
  {
    id: 'item-b',
    parent_id: 'division-b',
    item_type: 'work_item',
    item_code: 'II.1',
    description: 'Galian tanah',
    line_total: 2000000,
    sort_order: 0,
  },
];

test('budget vs actual groups by BOQ division and excludes pending payments', () => {
  const result = calculateProjectBudgetActual(items, [
    { boq_item_id: 'item-a', amount: 600000, status: 'verified' },
    { boq_item_id: 'item-a', amount: 100000, status: 'pending' },
    { boq_item_id: 'item-b', amount: 2200000, status: 'verified' },
  ]);

  assert.deepEqual(result.map(({ division }) => division.id), ['division-a', 'division-b']);
  assert.deepEqual(result.map(({ budget, actual, pending, variance }) => (
    { budget, actual, pending, variance }
  )), [
    { budget: 1000000, actual: 600000, pending: 100000, variance: -400000 },
    { budget: 2000000, actual: 2200000, pending: 0, variance: 200000 },
  ]);
});

test('budget vs actual returns an empty list when no BOQ divisions exist', () => {
  assert.deepEqual(calculateProjectBudgetActual([], []), []);
});

test('budget vs actual rejects work items that are not attached to an active division', () => {
  assert.throws(
    () => calculateProjectBudgetActual([items[1]], []),
    /tidak terhubung ke divisi aktif/,
  );
});

test('budget vs actual rejects invalid stored expense amounts', () => {
  assert.throws(
    () => calculateProjectBudgetActual(items, [
      { boq_item_id: 'item-a', amount: -1, status: 'verified' },
    ]),
    /tidak valid/,
  );
});

test('budget vs actual rejects expenses for work items outside the active BOQ version', () => {
  assert.throws(
    () => calculateProjectBudgetActual(items, [
      { boq_item_id: 'archived-item', amount: 1, status: 'verified' },
    ]),
    /tidak terhubung ke item pekerjaan aktif/,
  );
});
