import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  attendanceBatchSchema,
  fieldWorkerSchema,
} from './hr.schema';

const projectId = '00000000-0000-4000-8000-000000000001';
const workerId = '00000000-0000-4000-8000-000000000002';

describe('HR form schemas', () => {
  it('accepts a complete worker record with optional contact details', () => {
    const result = fieldWorkerSchema.safeParse({
      project_id: projectId,
      nik: '3171000000000001',
      full_name: 'Pekerja Uji',
      role_trade: 'Tukang Besi',
      daily_wage_rate: 180000,
      overtime_hourly_rate: 25000,
      phone: '',
      origin_city: '',
    });

    assert.equal(result.success, true);
  });

  it('rejects an attendance record with invalid working hours', () => {
    const result = attendanceBatchSchema.safeParse({
      attendance_date: '2026-10-22',
      records: [{
        worker_id: workerId,
        status: 'hadir',
        work_hours: 25,
        overtime_hours: 0,
      }],
    });

    assert.equal(result.success, false);
  });

  it('requires zero hours for non-working attendance statuses', () => {
    const result = attendanceBatchSchema.safeParse({
      attendance_date: '2026-10-22',
      records: [{
        worker_id: workerId,
        status: 'sakit',
        work_hours: 8,
        overtime_hours: 0,
      }],
    });

    assert.equal(result.success, false);
  });

  it('rejects attendance dates that do not use the ISO date shape', () => {
    const result = attendanceBatchSchema.safeParse({
      attendance_date: '22-10-2026',
      records: [{
        worker_id: workerId,
        status: 'hadir',
        work_hours: 8,
        overtime_hours: 0,
      }],
    });

    assert.equal(result.success, false);
  });
});
