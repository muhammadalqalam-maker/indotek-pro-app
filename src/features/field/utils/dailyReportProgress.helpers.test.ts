import assert from 'node:assert/strict';
import test from 'node:test';
import { sumProgressEntries } from './dailyReportProgress.helpers';
import type { DailyReportProgressEntry } from '../services/dailyReportProgress.service';

function entry(
  id: string,
  reportId: string,
  itemId: string,
  volume: number,
): DailyReportProgressEntry {
  return {
    id,
    boq_item_id: itemId,
    boq_version_id: '9c787c93-25ae-4b11-8c5e-8430f789cbcc',
    report_id: reportId,
    installed_volume: volume,
    remarks: '',
    report_status: 'draft',
  };
}

test('cumulative progress sums other reports for the selected BOQ item only', () => {
  const entries = [
    entry('1', 'report-a', 'item-a', 2.5),
    entry('2', 'report-b', 'item-a', 3.25),
    entry('3', 'report-b', 'item-b', 40),
  ];

  assert.equal(sumProgressEntries(entries, 'item-a'), 5.75);
  assert.equal(sumProgressEntries(entries, 'item-a', 'report-a'), 3.25);
  assert.equal(sumProgressEntries(entries, 'item-c'), 0);
});

test('rejected reports do not consume the active cumulative BOQ volume', () => {
  const rejected = { ...entry('1', 'report-a', 'item-a', 4), report_status: 'rejected' };
  assert.equal(sumProgressEntries([rejected], 'item-a'), 0);
});
