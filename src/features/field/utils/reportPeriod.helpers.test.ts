import assert from 'node:assert/strict';
import test from 'node:test';
import { getReportPeriodRange } from './reportPeriod.helpers';

test('weekly period starts Monday and ends Sunday across a month boundary', () => {
  assert.deepEqual(getReportPeriodRange('weekly', '2026-11-01'), {
    startDate: '2026-10-26',
    endDate: '2026-11-01',
  });
});

test('weekly period handles a Monday anchor without shifting a week', () => {
  assert.deepEqual(getReportPeriodRange('weekly', '2026-11-02'), {
    startDate: '2026-11-02',
    endDate: '2026-11-08',
  });
});

test('monthly period uses the full leap-year month', () => {
  assert.deepEqual(getReportPeriodRange('monthly', '2024-02-12'), {
    startDate: '2024-02-01',
    endDate: '2024-02-29',
  });
});

test('invalid dates are rejected instead of producing an incorrect range', () => {
  assert.throws(() => getReportPeriodRange('monthly', '2026-02-30'), RangeError);
});
