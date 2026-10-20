import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateBoqDraftTotals } from './boqCalculations.ts';

test('calculates line amounts and separate overhead and profit before PPN', () => {
  const totals = calculateBoqDraftTotals(
    [{ volume: '2.5', unit_price: '10000' }],
    '10',
    '5',
    '11',
  );

  assert.deepEqual(totals, {
    directCost: 25_000,
    overheadAmount: 2_500,
    profitAmount: 1_250,
    beforeTax: 28_750,
    ppnAmount: 3_162.5,
    grandTotal: 31_912.5,
  });
});

test('rounds each line and percentage amount to two decimal places', () => {
  const totals = calculateBoqDraftTotals(
    [
      { volume: '0.3333', unit_price: '10' },
      { volume: '0.3333', unit_price: '10' },
      { volume: '0.3333', unit_price: '10' },
    ],
    '0',
    '0',
    '11',
  );

  assert.equal(totals.directCost, 9.99);
  assert.equal(totals.ppnAmount, 1.1);
  assert.equal(totals.grandTotal, 11.09);
});

test('returns zero totals for empty or invalid draft values', () => {
  const totals = calculateBoqDraftTotals(
    [{ volume: '-1', unit_price: '10' }, { volume: '1', unit_price: 'not-a-number' }],
    '10',
    '5',
    '11',
  );

  assert.equal(totals.directCost, 0);
  assert.equal(totals.grandTotal, 0);
});
