import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DailyAttendance, FieldWorker } from '../../../types/database';
import type { WorkerPieceworkEntry } from '../types';
import { buildWeeklyWageSummary, getWeekRange } from './weeklyWageSummary';

const worker: FieldWorker = {
  id: '00000000-0000-4000-8000-000000000001',
  organization_id: '00000000-0000-4000-8000-000000000010',
  project_id: '00000000-0000-4000-8000-000000000020',
  nik: 'W-001',
  full_name: 'Pekerja Uji',
  role_trade: 'Tukang Besi',
  daily_wage_rate: 300000,
  overtime_hourly_rate: 25000,
  status: 'active',
};

function attendance(
  date: string,
  status: DailyAttendance['status'],
  overtime_hours: number,
): DailyAttendance {
  return {
    id: `attendance-${date}`,
    organization_id: worker.organization_id,
    project_id: worker.project_id,
    date,
    worker_id: worker.id,
    worker_name: worker.full_name,
    role_trade: worker.role_trade,
    status,
    work_hours: status === 'hadir' || status === 'lembur' ? 8 : 0,
    overtime_hours,
    daily_wage_rate_snapshot: 200000,
    overtime_hourly_rate_snapshot: 25000,
    daily_earnings: 0,
  };
}

const piecework: WorkerPieceworkEntry = {
  id: 'piecework-1',
  organization_id: worker.organization_id,
  project_id: worker.project_id,
  worker_id: worker.id,
  work_date: '2026-10-20',
  description: 'Pemasangan besi',
  quantity: 3.125,
  unit: 'm²',
  unit_rate: 8000,
  total_amount: 25000,
};

describe('weekly wage summary', () => {
  it('calculates Monday-to-Sunday weeks around year boundaries', () => {
    assert.deepEqual(getWeekRange('2026-10-25'), {
      start: '2026-10-19',
      end: '2026-10-25',
    });
    assert.deepEqual(getWeekRange('2027-01-01'), {
      start: '2026-12-28',
      end: '2027-01-03',
    });
    assert.equal(getWeekRange('2026-02-30'), null);
  });

  it('preserves recorded attendance rates after worker rates change', () => {
    const result = buildWeeklyWageSummary(
      [worker],
      [
        attendance('2026-10-19', 'hadir', 2),
        attendance('2026-10-20', 'lembur', 1),
        attendance('2026-10-21', 'sakit', 0),
      ],
      [piecework],
    );

    assert.deepEqual(result, [{
      worker_id: worker.id,
      worker_name: worker.full_name,
      role_trade: worker.role_trade,
      attendance_days: 2,
      base_wage: 400000,
      overtime_wage: 75000,
      piecework_wage: 25000,
      total_wage: 500000,
    }]);
  });

  it('ignores records for workers outside the selected project roster', () => {
    const result = buildWeeklyWageSummary(
      [worker],
      [attendance('2026-10-19', 'hadir', 0)],
      [{ ...piecework, worker_id: '00000000-0000-4000-8000-000000000099' }],
    );

    assert.equal(result.length, 1);
    assert.equal(result[0].piecework_wage, 0);
  });
});
