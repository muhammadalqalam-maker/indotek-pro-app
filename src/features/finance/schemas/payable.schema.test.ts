import assert from 'node:assert/strict';
import test from 'node:test';
import { projectPayablePaymentSchema, projectPayableSchema } from './payable.schema';

const validPayable = {
  projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  counterpartyType: 'vendor',
  counterpartyId: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  supplierInvoiceNumber: 'INV-V-001',
  invoiceDate: '2026-10-01',
  dueDate: '2026-10-31',
  amount: '1250000.50',
  notes: '',
} as const;

test('project payable schema accepts a valid vendor or subcontractor bill', () => {
  assert.equal(projectPayableSchema.safeParse(validPayable).success, true);
  assert.equal(projectPayableSchema.safeParse({ ...validPayable, counterpartyType: 'subcontractor' }).success, true);
});

test('project payable schema rejects invalid identity, amount, reference, and due date', () => {
  assert.equal(projectPayableSchema.safeParse({ ...validPayable, projectId: 'project' }).success, false);
  assert.equal(projectPayableSchema.safeParse({ ...validPayable, amount: '0' }).success, false);
  assert.equal(projectPayableSchema.safeParse({ ...validPayable, amount: '12.345' }).success, false);
  assert.equal(projectPayableSchema.safeParse({ ...validPayable, supplierInvoiceNumber: '' }).success, false);
  assert.equal(projectPayableSchema.safeParse({ ...validPayable, dueDate: '2026-09-30' }).success, false);
  assert.equal(projectPayableSchema.safeParse({ ...validPayable, invoiceDate: '2026-02-30' }).success, false);
});

test('payable payment schema validates positive amount, date, and payment method', () => {
  const validPayment = {
    amount: '500000',
    paymentDate: '2026-10-22',
    paymentMethod: 'Transfer Bank',
    reference: 'TRX-001',
  };
  assert.equal(projectPayablePaymentSchema.safeParse(validPayment).success, true);
  assert.equal(projectPayablePaymentSchema.safeParse({ ...validPayment, amount: '0' }).success, false);
  assert.equal(projectPayablePaymentSchema.safeParse({ ...validPayment, paymentDate: '22-10-2026' }).success, false);
  assert.equal(projectPayablePaymentSchema.safeParse({ ...validPayment, paymentMethod: 'Cash' }).success, false);
});
