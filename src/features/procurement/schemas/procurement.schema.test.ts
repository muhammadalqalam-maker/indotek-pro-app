import assert from 'node:assert/strict';
import test from 'node:test';
import {
  purchaseOrderFromQuoteSchema,
  purchaseRequestSchema,
  goodsReceiptSchema,
  vendorQuoteSchema,
} from './procurement.schema';

const projectId = '9a21776f-c12f-4f0f-8645-ef0bb6a3921c';
const requestItemId = '46d0a379-492e-4122-9e4b-ff036fe5c2a2';

test('purchase request accepts multiple valid line items', () => {
  const result = purchaseRequestSchema.safeParse({
    projectId,
    requiredDate: '2026-11-10',
    department: 'Lapangan',
    urgency: 'normal',
    comment: '',
    items: [
      { item_name: 'Semen', specification: 'PCC', unit: 'sak', quantity: 20, estimated_price: 65000 },
      { item_name: 'Pasir', specification: '', unit: 'm3', quantity: 2.5, estimated_price: 250000 },
    ],
  });
  assert.equal(result.success, true);
});

test('purchase request rejects invalid project, empty items, and non-positive quantity', () => {
  const request = {
    projectId,
    requiredDate: '2026-11-10',
    department: 'Lapangan',
    urgency: 'normal',
    comment: '',
    items: [{ item_name: 'Semen', specification: '', unit: 'sak', quantity: 1, estimated_price: 65000 }],
  };
  assert.equal(purchaseRequestSchema.safeParse({ ...request, projectId: 'invalid' }).success, false);
  assert.equal(purchaseRequestSchema.safeParse({ ...request, items: [] }).success, false);
  assert.equal(purchaseRequestSchema.safeParse({
    ...request,
    items: [{ ...request.items[0], quantity: 0 }],
  }).success, false);
});

test('vendor quote validates tax, item price, and expiry date ordering', () => {
  const quote = {
    vendorId: projectId,
    quoteDate: '2026-10-22',
    validUntil: '2026-11-22',
    ppnPercent: 11,
    notes: '',
    items: [{ purchaseRequestItemId: requestItemId, unitPrice: 125000 }],
  };
  assert.equal(vendorQuoteSchema.safeParse(quote).success, true);
  assert.equal(vendorQuoteSchema.safeParse({ ...quote, ppnPercent: 101 }).success, false);
  assert.equal(vendorQuoteSchema.safeParse({
    ...quote,
    validUntil: '2026-10-21',
  }).success, false);
  assert.equal(vendorQuoteSchema.safeParse({
    ...quote,
    items: [{ ...quote.items[0], unitPrice: -1 }],
  }).success, false);
});

test('purchase order from quote requires a selected quote and delivery data', () => {
  assert.equal(purchaseOrderFromQuoteSchema.safeParse({
    quoteId: requestItemId,
    deliveryDeadline: '2026-11-30',
    deliveryAddress: 'Proyek Indotek, Jakarta',
  }).success, true);
  assert.equal(purchaseOrderFromQuoteSchema.safeParse({
    quoteId: '',
    deliveryDeadline: '2026-11-30',
    deliveryAddress: 'x',
  }).success, false);
});

test('goods receipt accepts inspected quantities within delivery quantity', () => {
  const receipt = {
    deliveryNoteNumber: 'SJ-001',
    receivingLocation: 'Gudang Utama',
    receivedDate: '2026-10-22',
    receiverName: 'Budi Site',
    driverName: '',
    vehicleNumber: '',
    notes: '',
    items: [{
      purchaseOrderItemId: requestItemId,
      receivedQuantity: 10,
      acceptedQuantity: 8,
      conditionNotes: '2 sak rusak',
    }],
  };
  assert.equal(goodsReceiptSchema.safeParse(receipt).success, true);
  assert.equal(goodsReceiptSchema.safeParse({
    ...receipt,
    receivingLocation: '',
  }).success, false);
  assert.equal(goodsReceiptSchema.safeParse({
    ...receipt,
    items: [{ ...receipt.items[0], acceptedQuantity: 11 }],
  }).success, false);
  assert.equal(goodsReceiptSchema.safeParse({
    ...receipt,
    items: [{ ...receipt.items[0], receivedQuantity: 0, acceptedQuantity: 0 }],
  }).success, false);
  assert.equal(goodsReceiptSchema.safeParse({
    ...receipt,
    items: [receipt.items[0], receipt.items[0]],
  }).success, false);
});
