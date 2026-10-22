import assert from 'node:assert/strict';
import test from 'node:test';
import { materialRequestSchema } from './material-request.schema';

const projectId = '9a21776f-c12f-4f0f-8645-ef0bb6a3921c';
const itemId = '46d0a379-492e-4122-9e4b-ff036fe5c2a2';

test('material request accepts valid inventory request', () => {
  assert.equal(materialRequestSchema.safeParse({
    projectId,
    requiredDate: '2026-11-10',
    locationName: 'Zona Cor',
    purpose: 'Pengecoran lantai dua',
    items: [{ inventoryItemId: itemId, quantity: 20, notes: '' }],
  }).success, true);
});

test('material request rejects duplicate material and invalid quantity', () => {
  const request = {
    projectId,
    requiredDate: '2026-11-10',
    locationName: 'Zona Cor',
    purpose: 'Pengecoran lantai dua',
    items: [{ inventoryItemId: itemId, quantity: 20, notes: '' }],
  };
  assert.equal(materialRequestSchema.safeParse({ ...request, items: [request.items[0], request.items[0]] }).success, false);
  assert.equal(materialRequestSchema.safeParse({ ...request, items: [{ ...request.items[0], quantity: 0 }] }).success, false);
});
