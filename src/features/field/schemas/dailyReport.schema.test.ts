import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmptyDailyReportValues,
  dailyReportDraftSchema,
  dailyReportSubmissionSchema,
} from './dailyReport.schema';

test('daily report draft accepts an empty draft with a valid date', () => {
  const values = createEmptyDailyReportValues('2026-10-20');
  assert.equal(dailyReportDraftSchema.safeParse(values).success, true);
});

test('daily report draft rejects impossible dates and invalid detail rows', () => {
  const values = createEmptyDailyReportValues('2026-02-30');
  values.manpower.push({
    id: 'not-a-uuid',
    trade_type: '',
    headcount: 0,
    work_hours: 25,
    remarks: '',
  });
  assert.equal(dailyReportDraftSchema.safeParse(values).success, false);
});

test('submission requires the site manager name', () => {
  assert.equal(dailyReportSubmissionSchema.safeParse({ site_manager_name: 'A' }).success, false);
  assert.equal(dailyReportSubmissionSchema.safeParse({ site_manager_name: 'Budi' }).success, true);
});
