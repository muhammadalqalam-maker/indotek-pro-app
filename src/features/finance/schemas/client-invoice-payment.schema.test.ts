import assert from 'node:assert/strict';
import test from 'node:test';
import { clientInvoicePaymentSchema } from './client-invoice-payment.schema';

test('client invoice payment schema accepts positive payment', () => {
  assert.equal(clientInvoicePaymentSchema.safeParse({ amount: 1000, reference: 'TRF-01' }).success, true);
});

test('client invoice payment schema rejects zero payment', () => {
  assert.equal(clientInvoicePaymentSchema.safeParse({ amount: 0, reference: '' }).success, false);
});
