import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyReportProgressFormSchema } from './dailyReportProgress.schema';

const itemId = '5ed889a1-d3d3-4cd6-a871-3d0e86a20e62';

function formValue(installedVolume: string, maximumVolume = 10) {
  return {
    entries: [{
      boq_item_id: itemId,
      installed_volume: installedVolume,
      maximum_volume: maximumVolume,
      remarks: '',
    }],
  };
}

test('daily report progress accepts empty, zero, and precise volume inputs within the remaining BOQ volume', () => {
  for (const value of ['', '0', '9.9999', '10']) {
    assert.equal(dailyReportProgressFormSchema.safeParse(formValue(value)).success, true);
  }
});

test('daily report progress rejects values above remaining volume', () => {
  const result = dailyReportProgressFormSchema.safeParse(formValue('10.0001'));
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues[0].path, ['entries', 0, 'installed_volume']);
  }
});

test('daily report progress rejects negative, non-numeric, and over-precision values', () => {
  for (const value of ['-0.1', 'abc', '1.00001']) {
    assert.equal(dailyReportProgressFormSchema.safeParse(formValue(value)).success, false);
  }
});

test('daily report progress requires a volume before accepting a note', () => {
  const result = dailyReportProgressFormSchema.safeParse({
    entries: [{
      boq_item_id: itemId,
      installed_volume: '',
      maximum_volume: 10,
      remarks: 'Pekerjaan tertunda',
    }],
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.issues[0].path, ['entries', 0, 'remarks']);
  }
});
