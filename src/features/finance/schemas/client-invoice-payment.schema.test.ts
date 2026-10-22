import assert from 'node:assert/strict';
import test from 'node:test';
import { clientInvoicePaymentSchema } from './client-invoice-payment.schema';

test('client invoice payment schema accepts positive payment', () => {
  assert.equal(clientInvoicePaymentSchema.safeParse({
    amount: 1000,
    reference: 'TRF-01',
    paymentMethod: 'Transfer Bank',
  }).success, true);
});

test('client invoice payment schema rejects zero payment', () => {
  assert.equal(clientInvoicePaymentSchema.safeParse({
    amount: 0,
    reference: '',
    paymentMethod: 'Transfer Bank',
  }).success, false);
});
