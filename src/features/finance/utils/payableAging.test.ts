import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAgingTotals } from './payableAging';

test('aging buckets use outstanding balances and exact overdue day boundaries', () => {
  const totals = calculateAgingTotals([
    { amount: 120, paidAmount: 20, dueDate: '2026-10-22', status: 'sent' },
    { amount: 100, paidAmount: 25, dueDate: '2026-10-21', status: 'partially_paid' },
    { amount: 100, paidAmount: 0, dueDate: '2026-09-22', status: 'sent' },
    { amount: 100, paidAmount: 0, dueDate: '2026-09-21', status: 'sent' },
    { amount: 100, paidAmount: 0, dueDate: '2026-08-22', status: 'sent' },
    { amount: 100, paidAmount: 0, dueDate: '2026-07-24', status: 'sent' },
    { amount: 100, paidAmount: 0, dueDate: '2026-07-23', status: 'sent' },
  ], '2026-10-22');

  assert.deepEqual(totals, {
    not_due: 100,
    '1_30': 175,
    '31_60': 100,
    '61_90': 200,
    over_90: 100,
  });
});

test('aging excludes drafts, cancelled and fully paid records', () => {
  const totals = calculateAgingTotals([
    { amount: 100, paidAmount: 0, dueDate: '2026-01-01', status: 'draft' },
    { amount: 100, paidAmount: 0, dueDate: '2026-01-01', status: 'cancelled' },
    { amount: 100, paidAmount: 100, dueDate: '2026-01-01', status: 'paid' },
  ], '2026-10-22');
  assert.deepEqual(totals, { not_due: 0, '1_30': 0, '31_60': 0, '61_90': 0, over_90: 0 });
});

test('aging rejects invalid dates and inconsistent monetary totals', () => {
  assert.throws(
    () => calculateAgingTotals([{ amount: 1, paidAmount: 0, dueDate: '2026-02-30', status: 'sent' }], '2026-10-22'),
    /Tanggal aging tidak valid/,
  );
  assert.throws(
    () => calculateAgingTotals([{ amount: 1, paidAmount: 2, dueDate: '2026-10-22', status: 'sent' }], '2026-10-22'),
    /Nilai tagihan/,
  );
});
