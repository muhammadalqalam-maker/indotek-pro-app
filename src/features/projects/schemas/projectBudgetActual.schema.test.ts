import assert from 'node:assert/strict';
import test from 'node:test';
import { projectBoqExpenseSchema } from './projectBudgetActual.schema';

const validValues = {
  boq_item_id: 'b9b3f7bb-a9aa-4e70-a0af-38b7491c99da',
  expense_date: '2026-10-21',
  amount: '125000.50',
  description: 'Pembelian material',
};

test('project expense schema accepts valid amounts and calendar dates', () => {
  assert.equal(projectBoqExpenseSchema.safeParse(validValues).success, true);
});

test('project expense schema rejects zero, over-precision, and oversized amounts', () => {
  for (const amount of ['0', '1.234', '10000000000000000']) {
    assert.equal(projectBoqExpenseSchema.safeParse({ ...validValues, amount }).success, false);
  }
});

test('project expense schema rejects impossible dates and empty descriptions', () => {
  assert.equal(
    projectBoqExpenseSchema.safeParse({ ...validValues, expense_date: '2026-02-30' }).success,
    false,
  );
  assert.equal(
    projectBoqExpenseSchema.safeParse({ ...validValues, description: ' ' }).success,
    false,
  );
});
