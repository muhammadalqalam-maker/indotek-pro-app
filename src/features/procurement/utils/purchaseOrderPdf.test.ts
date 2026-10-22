import assert from 'node:assert/strict';
import test from 'node:test';
import { createPurchaseOrderPdf, type PurchaseOrderPdfLabels } from './purchaseOrderPdf';
import type { Organization, PurchaseOrder } from '../../../types/database';

const labels: PurchaseOrderPdfLabels = {
  title: 'Purchase Order',
  continued: 'continued',
  project: 'Project',
  requestReference: 'PR reference',
  vendor: 'Vendor',
  orderDate: 'Order date',
  deliveryDeadline: 'Delivery deadline',
  deliveryAddress: 'Delivery address',
  status: 'PO status',
  subtotal: 'Subtotal',
  vat: 'VAT',
  grandTotal: 'PO total',
  item: 'Item / specification',
  specification: 'Specification',
  quantity: 'Quantity',
  unit: 'Unit',
  unitPrice: 'Unit price',
  lineTotal: 'Amount',
  approvedBy: 'Approved by',
  approvalDate: 'Approval date',
  approvalNotes: 'Approval notes',
  npwp: 'NPWP',
  nib: 'NIB',
  page: 'Page',
  statuses: {
    draft: 'Draft',
    pending_approval: 'Awaiting approval',
    approved: 'Approved',
    rejected: 'Rejected',
    ordered: 'Ordered',
    received: 'Received',
    closed: 'Closed',
  },
};

const organization: Organization = {
  id: 'org-1',
  name: 'PT Indotek Unit Test',
  slug: 'indotek-test',
  company_code: 'IKN',
  address: 'Jl. Contoh 1',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  postal_code: '12345',
  phone: '021123456',
  email: 'procurement@example.test',
  npwp: '00.000.000.0-000.000',
  nib: '1234567890',
  timezone: 'WIB',
  created_at: '2026-01-01T00:00:00Z',
};

const order: PurchaseOrder = {
  id: 'po-1',
  organization_id: organization.id,
  project_id: 'project-1',
  project_name: 'Project Test',
  po_number: 'PO/TEST/01',
  pr_number: 'PR/TEST/01',
  vendor_id: 'vendor-1',
  vendor_name: 'Vendor Test',
  vendor_contact: 'Contact Test',
  order_date: '2026-01-02',
  delivery_deadline: '2026-01-20',
  delivery_address: 'Jl. Proyek 2, Jakarta',
  subtotal: 1000000,
  ppn_percent: 11,
  ppn_amount: 110000,
  grand_total: 1110000,
  status: 'approved',
  approved_by_name: 'Approver Test',
  approved_at: '2026-01-03T00:00:00Z',
  approval_notes: 'Approved for procurement',
  items: [{
    id: 'item-1',
    item_code: 'MAT-01',
    item_name: 'Concrete',
    specification: 'K-250',
    unit: 'm3',
    quantity: 2,
    unit_price: 500000,
    total_price: 1000000,
    received_quantity: 0,
  }],
  created_at: '2026-01-02T00:00:00Z',
};

test('creates a printable PO PDF containing organization and order details', () => {
  const pdf = createPurchaseOrderPdf({ organization, order, labels });
  const output = pdf.output();

  assert.match(output, /^%PDF-/);
  assert.ok(output.includes(organization.name));
  assert.ok(output.includes(order.po_number));
  assert.ok(output.includes(order.vendor_name));
  assert.ok(output.includes('Concrete'));
  assert.ok(output.includes('1.000.000'));
  assert.ok(output.includes('110.000'));
  assert.equal(pdf.getNumberOfPages(), 1);
});

test('adds pages when PO item specifications exceed one page', () => {
  const longOrder = {
    ...order,
    items: [{
      ...order.items[0],
      specification: 'Long specification for pagination. '.repeat(700),
    }],
  };
  const pdf = createPurchaseOrderPdf({ organization, order: longOrder, labels });

  assert.match(pdf.output(), /^%PDF-/);
  assert.ok(pdf.getNumberOfPages() > 1);
});
