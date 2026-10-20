import assert from 'node:assert/strict';
import test from 'node:test';
import { ahspSchema } from './ahsp.schema';

const validAhsp = {
  code: 'ahsp-01',
  title: 'Pekerjaan beton',
  division: 'Struktur',
  unit_id: '7d9c3a1e-d0f3-4f0e-89b4-d77c123a5a10',
  components: [{
    price_item_id: 'b8b5e8d1-0b2b-4d8b-b64f-62e31beed05b',
    coefficient: 0.125,
  }],
};

test('normalizes and accepts a valid AHSP form', () => {
  const result = ahspSchema.safeParse(validAhsp);

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.code, 'AHSP-01');
});

test('requires valid catalog components and coefficient precision', () => {
  assert.equal(ahspSchema.safeParse({ ...validAhsp, components: [] }).success, false);
  assert.equal(ahspSchema.safeParse({
    ...validAhsp,
    components: [{ ...validAhsp.components[0], coefficient: 1.0000001 }],
  }).success, false);
});

test('rejects duplicate persisted component identifiers', () => {
  const componentId = 'ea2b54db-c6ab-4e6c-926a-a0a6f43d0bb3';
  const result = ahspSchema.safeParse({
    ...validAhsp,
    components: [
      { ...validAhsp.components[0], component_id: componentId },
      { ...validAhsp.components[0], component_id: componentId },
    ],
  });

  assert.equal(result.success, false);
});
