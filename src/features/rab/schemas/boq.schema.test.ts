import assert from 'node:assert/strict';
import test from 'node:test';
import { boqDraftSchema } from './boq.schema.ts';

const validDraft = {
  title: 'RAB Pekerjaan Struktur',
  overhead_percent: '10',
  profit_percent: '5',
  ppn_percent: '11',
  divisions: [{
    id: '28b99e93-4119-4ad7-ab64-03542c6e41b1',
    item_code: 'DIV-1',
    description: 'Pekerjaan Persiapan',
    sort_order: 0,
    work_items: [{
      id: '830d6dbd-e0fb-48a9-8403-f5c37d1ac82b',
      item_code: '1.1',
      description: 'Pembersihan lahan',
      unit_id: '668769b6-07ed-47bf-b9a5-44dd1a63f310',
      ahsp_id: null,
      volume: '12.5',
      unit_price: '25000',
      sort_order: 0,
    }],
  }],
};

test('normalizes valid BOQ draft values', () => {
  const parsed = boqDraftSchema.parse(validDraft);
  assert.equal(parsed.overhead_percent, 10);
  assert.equal(parsed.divisions[0].work_items[0].volume, 12.5);
});

test('rejects duplicate codes, invalid hierarchy values, and out-of-range rates', () => {
  const duplicate = structuredClone(validDraft);
  duplicate.divisions.push({ ...duplicate.divisions[0], id: 'facfa821-7c2d-4dc6-9042-cf350ecff659' });
  assert.equal(boqDraftSchema.safeParse(duplicate).success, false);

  const invalidRate = { ...validDraft, ppn_percent: '101' };
  assert.equal(boqDraftSchema.safeParse(invalidRate).success, false);
});

test('requires tenant catalog references and nonnegative numeric values', () => {
  const invalidUnit = structuredClone(validDraft);
  invalidUnit.divisions[0].work_items[0].unit_id = '';
  assert.equal(boqDraftSchema.safeParse(invalidUnit).success, false);

  const negativeVolume = structuredClone(validDraft);
  negativeVolume.divisions[0].work_items[0].volume = '-1';
  assert.equal(boqDraftSchema.safeParse(negativeVolume).success, false);
});

test('limits total item count to the amount accepted by the database RPC', () => {
  const oversized = structuredClone(validDraft);
  oversized.divisions = Array.from({ length: 251 }, (_, index) => ({
    ...validDraft.divisions[0],
    id: `28b99e93-4119-4ad7-ab64-${String(index).padStart(12, '0')}`,
    item_code: `DIV-${index}`,
    work_items: [],
  }));

  assert.equal(boqDraftSchema.safeParse(oversized).success, false);
});
