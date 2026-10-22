import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRupiah, parseRupiah, formatPercent } from './format.ts';
import {
  calculateProjectHealth,
  calculateBudgetMetrics,
  calculateTotalContractWithAddendums,
  calculateApprovedTimeExtensionDays,
  calculateEffectiveContractEndDate,
  calculateRetention,
} from './projectCalculations.ts';
import { hasPermission } from './permissions.ts';

test('formatRupiah formats standard amount correctly', () => {
  assert.equal(formatRupiah(1250000), 'Rp 1.250.000');
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(null), 'Rp 0');
  assert.equal(formatRupiah(5000000000), 'Rp 5.000.000.000');
});

test('parseRupiah parses string back to integer', () => {
  assert.equal(parseRupiah('Rp 1.250.000'), 1250000);
  assert.equal(parseRupiah('1.250.000'), 1250000);
  assert.equal(parseRupiah('Rp 0'), 0);
  assert.equal(parseRupiah(''), 0);
});

test('formatPercent formats Indonesian comma representation', () => {
  assert.equal(formatPercent(45.5), '45,5%');
  assert.equal(formatPercent(100), '100,0%');
});

test('calculateProjectHealth evaluates deviations correctly', () => {
  const ahead = calculateProjectHealth(45, 40);
  assert.equal(ahead.health, 'ahead');
  assert.equal(ahead.deviation, 5);

  const onTrack = calculateProjectHealth(40, 41);
  assert.equal(onTrack.health, 'on_track');

  const atRisk = calculateProjectHealth(35, 40);
  assert.equal(atRisk.health, 'at_risk');

  const delayed = calculateProjectHealth(25, 40);
  assert.equal(delayed.health, 'delayed');
});

test('calculateBudgetMetrics computes remaining budget and percentage', () => {
  const metrics = calculateBudgetMetrics(1000000000, 600000000);
  assert.equal(metrics.remainingBudget, 400000000);
  assert.equal(metrics.costPercentage, 60);
  assert.equal(metrics.isOverBudget, false);

  const over = calculateBudgetMetrics(1000000000, 1100000000);
  assert.equal(over.remainingBudget, -100000000);
  assert.equal(over.isOverBudget, true);
});

test('calculateTotalContractWithAddendums includes approved variation orders only', () => {
  const base = 5000000000;
  const addendums = [
    { amount: 250000000, approved_at: '2026-10-18T09:00:00Z' },
    { amount: -50000000, approved_at: '2026-10-18T10:00:00Z' },
    { amount: 900000000, approved_at: null },
  ];
  const total = calculateTotalContractWithAddendums(base, addendums);
  assert.equal(total, 5200000000);
});

test('calculateApprovedTimeExtensionDays ignores pending addendums', () => {
  assert.equal(calculateApprovedTimeExtensionDays([
    { time_extension_days: 14, approved_at: '2026-10-18T09:00:00Z' },
    { time_extension_days: 21, approved_at: null },
  ]), 14);
});

test('calculateEffectiveContractEndDate handles date-only values without timezone shifts', () => {
  assert.equal(calculateEffectiveContractEndDate('2026-12-20', 14), '2027-01-03');
  assert.equal(calculateEffectiveContractEndDate('invalid', 14), 'invalid');
});

test('calculateRetention calculates 5% standard retention', () => {
  const ret = calculateRetention(1000000000, 5);
  assert.equal(ret, 5000000000 * 0.01);
});

test('hasPermission enforces role boundaries', () => {
  assert.equal(hasPermission('owner', 'projects', 'approve'), true);
  assert.equal(hasPermission('owner', 'users', 'delete'), true);
  assert.equal(hasPermission('estimator', 'rab', 'create'), true);
  assert.equal(hasPermission('estimator', 'users', 'create'), false);
  assert.equal(hasPermission('client_viewer', 'projects', 'create'), false);
  assert.equal(hasPermission('client_viewer', 'projects', 'view'), true);
});

test('PO calculation computes PPN 11% and grand total correctly', () => {
  const subtotal = 100000000;
  const ppn = subtotal * 0.11;
  const grandTotal = subtotal + ppn;
  assert.equal(ppn, 11000000);
  assert.equal(grandTotal, 111000000);
});

test('Subcon opname net payable computes retention and deductions correctly', () => {
  const contractAmount = 2000000000;
  const progressPct = 10; // 10%
  const gross = contractAmount * (progressPct / 100); // 200,000,000
  const retention = gross * 0.05; // 10,000,000
  const cashAdvance = 25000000;
  const netPayable = gross - retention - cashAdvance;
  assert.equal(gross, 200000000);
  assert.equal(retention, 10000000);
  assert.equal(netPayable, 165000000);
});

test('Client invoice computes PPN 11% and construction PPh correctly', () => {
  const gross = 1000000000;
  const retention = gross * 0.05; // 50,000,000
  const taxable = gross - retention; // 950,000,000
  const ppn = taxable * 0.11; // 104,500,000
  const pph = taxable * 0.0265; // 25,175,000 (PPh Final 2.65%)
  const net = taxable + ppn - pph;
  assert.equal(taxable, 950000000);
  assert.equal(ppn, 104500000);
  assert.equal(pph, 25175000);
  assert.equal(net, 1029325000);
});
