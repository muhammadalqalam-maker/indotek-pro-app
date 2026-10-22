import assert from 'node:assert/strict';
import test from 'node:test';
import { clientInvoiceSchema } from './client-invoice.schema';

const validInvoice = {
  projectId: 'project-1',
  invoiceType: 'progress' as const,
  invoiceNumber: '',
  termLabel: 'Termin progres 1',
  invoiceDate: '2026-10-22',
  dueDate: '2026-11-05',
  progressBasisPercent: 25,
  grossAmount: 100_000_000,
  advanceDeduction: 5_000_000,
  retentionDeduction: 5_000_000,
  vatPercent: 11,
  pphPercent: 2.65,
  notes: '',
};

test('client invoice schema accepts valid invoice values', () => {
  assert.equal(clientInvoiceSchema.safeParse(validInvoice).success, true);
});

test('client invoice schema rejects due date before invoice date', () => {
  const result = clientInvoiceSchema.safeParse({ ...validInvoice, dueDate: '2026-10-20' });
  assert.equal(result.success, false);
});

test('client invoice schema rejects deductions above gross amount', () => {
  const result = clientInvoiceSchema.safeParse({ ...validInvoice, advanceDeduction: 60_000_000, retentionDeduction: 50_000_000 });
  assert.equal(result.success, false);
});
