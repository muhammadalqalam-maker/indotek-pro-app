import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cashAdvanceActionSchema,
  cashAdvanceRequestSchema,
  cashTransactionSchema,
} from './cashbook.schema';

test('cash transaction accepts valid, precise amounts and an existing project', () => {
  const result = cashTransactionSchema.safeParse({
    projectId: '88e39b31-13cc-4f7c-9db3-e23c4b7fc112',
    transactionDate: '2026-10-22',
    type: 'outflow',
    category: 'Material',
    amount: '125000.50',
    recipientOrPayer: 'Supplier Material',
    description: 'Pembelian kebutuhan proyek',
    paymentMethod: 'Transfer Bank',
    reference: '',
  });
  assert.equal(result.success, true);
});

test('cash transaction rejects zero, excess precision, and impossible dates', () => {
  const base = {
    projectId: '88e39b31-13cc-4f7c-9db3-e23c4b7fc112',
    transactionDate: '2026-10-22',
    type: 'outflow',
    category: 'Material',
    amount: '125000',
    recipientOrPayer: 'Supplier Material',
    description: 'Pembelian kebutuhan proyek',
    paymentMethod: 'Transfer Bank',
    reference: '',
  };
  assert.equal(cashTransactionSchema.safeParse({ ...base, amount: '0' }).success, false);
  assert.equal(cashTransactionSchema.safeParse({ ...base, amount: '1.234' }).success, false);
  assert.equal(cashTransactionSchema.safeParse({ ...base, transactionDate: '2026-02-30' }).success, false);
});

test('cash advance request requires a valid purpose and positive amount', () => {
  const base = {
    projectId: '88e39b31-13cc-4f7c-9db3-e23c4b7fc112',
    requestType: 'kasbon',
    employeeName: 'Ayu Proyek',
    employeeRole: 'Site Manager',
    requestDate: '2026-10-22',
    amount: '500000',
    purpose: 'Biaya operasional',
  };
  assert.equal(cashAdvanceRequestSchema.safeParse(base).success, true);
  assert.equal(cashAdvanceRequestSchema.safeParse({ ...base, amount: '-1' }).success, false);
  assert.equal(cashAdvanceRequestSchema.safeParse({ ...base, purpose: ' ' }).success, false);
});

test('cash advance actions require rejection reasons and validate settlement amounts', () => {
  const base = {
    action: 'reject',
    comment: ' ',
    paymentMethod: 'Transfer Bank',
    reference: '',
    settledAmount: '0',
    notes: '',
  };
  assert.equal(cashAdvanceActionSchema.safeParse(base).success, false);
  assert.equal(cashAdvanceActionSchema.safeParse({ ...base, comment: 'Dokumen tidak lengkap' }).success, true);
  assert.equal(cashAdvanceActionSchema.safeParse({ ...base, action: 'settle', settledAmount: '-1' }).success, false);
});
