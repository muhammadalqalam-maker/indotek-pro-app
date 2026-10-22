import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSCurve } from './sCurve.helpers';

const items = [
  { id: 'item-a', volume: 10, line_total: 100 },
  { id: 'item-b', volume: 20, line_total: 300 },
];

test('calculates S-shaped plan and BOQ-value-weighted approved progress by week', () => {
  const result = calculateSCurve(
    '2026-01-01',
    '2026-01-29',
    items,
    [
      { id: 'report-1', report_date: '2026-01-02' },
      { id: 'report-2', report_date: '2026-01-15' },
    ],
    [
      { boq_item_id: 'item-a', report_id: 'report-1', installed_volume: 5 },
      { boq_item_id: 'item-b', report_id: 'report-2', installed_volume: 10 },
      { boq_item_id: 'item-a', report_id: 'draft-report', installed_volume: 5 },
    ],
  );

  assert.equal(result.budget, 400);
  assert.equal(result.earnedValue, 200);
  assert.equal(result.latestReportDate, '2026-01-15');
  assert.equal(result.points.length, 5);
  assert.equal(result.points[0].actual_cumulative_percent, 12.5);
  assert.equal(result.points[1].actual_cumulative_percent, 12.5);
  assert.equal(result.points[2].actual_cumulative_percent, 50);
  assert.equal(result.points.at(-1)?.planned_cumulative_percent, 100);
  assert.ok(result.points[2].planned_cumulative_percent > result.points[1].planned_cumulative_percent);
});

test('extends the chart for approved progress reported after project finish', () => {
  const result = calculateSCurve(
    '2026-01-01',
    '2026-01-07',
    items,
    [{ id: 'report-1', report_date: '2026-01-15' }],
    [{ boq_item_id: 'item-a', report_id: 'report-1', installed_volume: 5 }],
  );

  assert.equal(result.points.length, 3);
  assert.equal(result.points.at(-1)?.end_date, '2026-01-15');
  assert.equal(result.points.at(-1)?.planned_cumulative_percent, 100);
  assert.equal(result.points.at(-1)?.actual_cumulative_percent, 12.5);
});

test('returns no curve when the approved BOQ has no weighted work value', () => {
  const result = calculateSCurve('2026-01-01', '2026-01-07', [], [], []);
  assert.deepEqual(result.points, []);
  assert.equal(result.budget, 0);
  assert.equal(result.earnedValue, 0);
});

test('rejects invalid project dates', () => {
  assert.throws(
    () => calculateSCurve('2026-02-30', '2026-03-10', items, [], []),
    /Tanggal Kurva S tidak valid/,
  );
});
