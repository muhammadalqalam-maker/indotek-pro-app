import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClientInvoice, ProjectCashTransaction, ProjectPayable } from '../../../types/database';
import { buildCashFlowForecast } from './cashFlowForecast';

const asOfDate = new Date('2026-10-22T12:00:00.000Z');

function makeTransaction(
  overrides: Partial<ProjectCashTransaction> = {},
): ProjectCashTransaction {
  return {
    id: 'transaction-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    project_name: 'Proyek Uji',
    transaction_number: 'BKM-1',
    transaction_date: '2026-10-10',
    type: 'inflow',
    category: 'Termin Klien',
    amount: 100,
    recipient_or_payer: 'Klien',
    description: 'Pembayaran',
    payment_method: 'Transfer Bank',
    status: 'verified',
    ...overrides,
  };
}

function makeInvoice(
  overrides: Partial<ClientInvoice> = {},
): ClientInvoice {
  return {
    id: 'invoice-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    project_name: 'Proyek Uji',
    client_name: 'Klien Uji',
    invoice_number: 'INV-1',
    term_label: 'Termin 1',
    invoice_date: '2026-10-01',
    due_date: '2026-10-31',
    progress_basis_percent: 0,
    gross_amount: 1000,
    retention_deduction: 0,
    dp_deduction: 0,
    subtotal_taxable: 1000,
    ppn_amount: 0,
    pph_amount: 0,
    net_receivable: 1000,
    paid_amount: 200,
    status: 'partially_paid',
    created_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function makePayable(
  overrides: Partial<ProjectPayable> = {},
): ProjectPayable {
  return {
    id: 'payable-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    project_name: 'Proyek Uji',
    vendor_id: 'vendor-1',
    subcontractor_id: null,
    counterparty_type: 'vendor',
    counterparty_name: 'Vendor Uji',
    payable_number: 'HUT-1',
    supplier_invoice_number: 'INV-V-1',
    invoice_date: '2026-10-01',
    due_date: '2026-11-15',
    amount: 600,
    paid_amount: 100,
    status: 'partially_paid',
    notes: '',
    created_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

test('aggregates verified historical cash and remaining scheduled items by month', () => {
  const forecast = buildCashFlowForecast(
    [
      makeTransaction(),
      makeTransaction({ id: 'transaction-2', type: 'outflow', amount: 40 }),
      makeTransaction({ id: 'transaction-3', status: 'pending', amount: 500 }),
    ],
    [makeInvoice()],
    [makePayable()],
    asOfDate,
  );

  assert.deepEqual(forecast.months.map(({ month }) => month), [
    '2026-08',
    '2026-09',
    '2026-10',
    '2026-11',
    '2026-12',
  ]);
  assert.equal(forecast.months[2].actualInflow, 100);
  assert.equal(forecast.months[2].actualOutflow, 40);
  assert.equal(forecast.months[2].scheduledInflow, 800);
  assert.equal(forecast.months[3].scheduledOutflow, 500);
  assert.equal(forecast.scheduledInflow, 800);
  assert.equal(forecast.scheduledOutflow, 500);
  assert.equal(forecast.scheduledNet, 300);
});

test('moves overdue balances into the current month and excludes closed or invalid balances', () => {
  const forecast = buildCashFlowForecast(
    [],
    [
      makeInvoice({ due_date: '2026-08-10', net_receivable: 100, paid_amount: 0, status: 'overdue' }),
      makeInvoice({ id: 'draft', status: 'draft', net_receivable: 200 }),
      makeInvoice({ id: 'paid', status: 'paid', net_receivable: 300 }),
      makeInvoice({ id: 'cancelled', status: 'cancelled', net_receivable: 400 }),
      makeInvoice({ id: 'empty', net_receivable: 100, paid_amount: 150 }),
      makeInvoice({ id: 'invalid', due_date: 'not-a-date', net_receivable: 500 }),
    ],
    [
      makePayable({ due_date: '2026-09-15', amount: 75, paid_amount: 0, status: 'overdue' }),
      makePayable({ id: 'paid', status: 'paid', amount: 200 }),
      makePayable({ id: 'outside-horizon', due_date: '2027-01-01', amount: 900 }),
    ],
    asOfDate,
  );

  assert.equal(forecast.months[2].scheduledInflow, 100);
  assert.equal(forecast.months[2].scheduledOutflow, 75);
  assert.equal(forecast.scheduledInflow, 100);
  assert.equal(forecast.scheduledOutflow, 75);
});

test('ignores future-dated actual transactions and returns zero forecast for empty inputs', () => {
  const forecast = buildCashFlowForecast(
    [makeTransaction({ transaction_date: '2026-10-23', amount: 100 })],
    [],
    [],
    asOfDate,
  );

  assert.equal(forecast.months[2].actualInflow, 0);
  assert.equal(forecast.scheduledNet, 0);
});
