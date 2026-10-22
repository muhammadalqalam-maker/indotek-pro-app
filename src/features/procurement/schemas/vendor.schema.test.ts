import assert from 'node:assert/strict';
import test from 'node:test';
import {
  vendorEvaluationSchema,
  vendorSchema,
} from './vendor.schema';

const validVendor = {
  code: 'SUP-001',
  name: 'PT Pemasok Beton',
  category: 'Beton',
  contact_person: 'Budi Santoso',
  phone: '+62 812-3456-7890',
  email: 'vendor@example.test',
  address: 'Jakarta',
  npwp: '',
  payment_terms_days: 30,
} as const;

test('vendor schema normalizes codes and accepts optional contact details', () => {
  const result = vendorSchema.safeParse({ ...validVendor, code: ' sup-001 ', email: '' });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.code, 'SUP-001');
});

test('vendor schema rejects malformed email and payment terms outside range', () => {
  assert.equal(vendorSchema.safeParse({ ...validVendor, email: 'invalid' }).success, false);
  assert.equal(vendorSchema.safeParse({ ...validVendor, payment_terms_days: 366 }).success, false);
});

test('vendor evaluation requires four integer scores from one through five', () => {
  const validEvaluation = {
    transaction_reference: 'PO-2026-001',
    quality_score: 5,
    price_score: 4,
    delivery_score: 3,
    service_score: 4,
    comment: '',
  };
  assert.equal(vendorEvaluationSchema.safeParse(validEvaluation).success, true);
  assert.equal(vendorEvaluationSchema.safeParse({ ...validEvaluation, quality_score: 6 }).success, false);
  assert.equal(vendorEvaluationSchema.safeParse({ ...validEvaluation, service_score: 2.5 }).success, false);
  assert.equal(vendorEvaluationSchema.safeParse({ ...validEvaluation, transaction_reference: '' }).success, false);
});
