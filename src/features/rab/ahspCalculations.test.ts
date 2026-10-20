import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAhspLineTotal, calculateAhspTotal } from './ahspCalculations';

test('calculates component cost from coefficient and catalog price', () => {
  assert.equal(calculateAhspLineTotal(0.75, 125_000), 93_750);
  assert.equal(calculateAhspLineTotal(1.234567, 100), 123.46);
});

test('rounds component costs to cents and sums rounded lines', () => {
  assert.equal(calculateAhspLineTotal(0.5, 1.01), 0.51);
  assert.equal(calculateAhspTotal([
    { coefficient: 0.5, unitPrice: 1.01 },
    { coefficient: 0.5, unitPrice: 1.01 },
  ]), 1.02);
});

test('rejects invalid coefficient or unit price values', () => {
  assert.throws(() => calculateAhspLineTotal(-1, 100), RangeError);
  assert.throws(() => calculateAhspLineTotal(1, Number.NaN), RangeError);
});
