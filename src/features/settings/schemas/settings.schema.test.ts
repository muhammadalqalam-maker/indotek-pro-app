import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  companyProfileSchema,
  documentPrefixSchema,
  measurementUnitSchema,
  priceItemSchema,
} from './settings.schema';

const validPriceItem = {
  category: 'bahan',
  code: 'MAT-001',
  name: 'Semen Portland',
  unit_id: '11111111-1111-4111-8111-111111111111',
  unit_price: 75_000,
  region: 'Jawa Barat',
  valid_from: '2026-01-01',
  valid_until: '',
  source: 'Survei pemasok',
};

describe('settings schemas', () => {
  it('validates normalized company details without imposing optional-field values', () => {
    const result = companyProfileSchema.safeParse({
      name: 'PT Contoh Konstruksi',
      company_code: 'ikn',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      phone: '',
      email: '',
      npwp: '',
      nib: '',
      timezone: 'WIB',
    });

    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.company_code, 'IKN');
    assert.equal(companyProfileSchema.safeParse({
      name: 'PT Contoh',
      company_code: 'IKN-01',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      phone: '',
      email: '',
      npwp: '',
      nib: '',
      timezone: 'WIB',
    }).success, false);
  });

  it('normalizes units and rejects malformed codes', () => {
    const result = measurementUnitSchema.safeParse({ code: ' m2 ', name: 'Meter persegi', symbol: 'm²' });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.code, 'M2');
    assert.equal(measurementUnitSchema.safeParse({ code: '', name: 'm', symbol: '' }).success, false);
  });

  it('validates price items, date ranges, and nonnegative prices', () => {
    assert.equal(priceItemSchema.safeParse(validPriceItem).success, true);
    assert.equal(priceItemSchema.safeParse({ ...validPriceItem, valid_from: '2026-02-30' }).success, false);
    assert.equal(priceItemSchema.safeParse({
      ...validPriceItem,
      valid_from: '2026-05-01',
      valid_until: '2026-04-30',
    }).success, false);
    assert.equal(priceItemSchema.safeParse({ ...validPriceItem, unit_price: -1 }).success, false);
  });

  it('uppercases allowed document prefixes and rejects unsupported characters', () => {
    const result = documentPrefixSchema.safeParse({ prefix: ' po/ikn ' });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.prefix, 'PO/IKN');
    assert.equal(documentPrefixSchema.safeParse({ prefix: 'PO #1' }).success, false);
  });
});
