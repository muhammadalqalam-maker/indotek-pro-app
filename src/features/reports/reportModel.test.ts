import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterReportRows,
  getExcelReportValue,
  getCurrentMonthDateRange,
  getDisplayReportRow,
  isValidReportDateRange,
} from './reportModel';
import type { ReportColumn, ReportRow } from './reportData.service';

const rows: ReportRow[] = [
  { id: 'one', projectIds: ['project-a'], date: '2026-10-02', status: 'approved', values: { quantity: 3 } },
  { id: 'two', projectIds: ['project-a'], date: '2026-10-03', status: 'draft', values: { quantity: 5 } },
];

test('keeps all report rows or filters by exact status', () => {
  assert.equal(filterReportRows(rows, 'all').length, 2);
  assert.deepEqual(filterReportRows(rows, 'approved').map((row) => row.id), ['one']);
  assert.deepEqual(filterReportRows(rows, 'unknown'), []);
});

test('builds the current month range using local calendar dates', () => {
  assert.deepEqual(
    getCurrentMonthDateRange(new Date(2026, 1, 10)),
    { startDate: '2026-02-01', endDate: '2026-02-28' },
  );
  assert.deepEqual(
    getCurrentMonthDateRange(new Date(2024, 1, 10)),
    { startDate: '2024-02-01', endDate: '2024-02-29' },
  );
});

test('validates inclusive date ranges and rejects missing or reversed bounds', () => {
  assert.equal(isValidReportDateRange({ startDate: '2026-10-01', endDate: '2026-10-01' }), true);
  assert.equal(isValidReportDateRange({ startDate: '2026-10-02', endDate: '2026-10-01' }), false);
  assert.equal(isValidReportDateRange({ startDate: '', endDate: '2026-10-01' }), false);
});

test('formats status, date, and project cells for report output', () => {
  const columns: ReportColumn[] = [
    { key: 'project', format: 'text' },
    { key: 'date', format: 'date' },
    { key: 'status', format: 'status' },
    { key: 'quantity', format: 'number' },
  ];
  assert.deepEqual(
    getDisplayReportRow(
      rows[0],
      columns,
      new Map([['project-a', 'Proyek A']]),
      { approved: 'Disetujui' },
      'Proyek tidak tersedia',
    ),
    ['Proyek A', '2 Okt 2026', 'Disetujui', '3'],
  );
});

test('keeps Excel date and numeric cells as typed values', () => {
  const date = getExcelReportValue('2026-10-23', 'date', {});
  assert.ok(date instanceof Date);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 23);
  assert.equal(getExcelReportValue(1.2345, 'number', {}), 1.2345);
  assert.equal(getExcelReportValue('bad-date', 'date', {}), null);
  assert.equal(getExcelReportValue('2026-02-31', 'date', {}), null);
});
