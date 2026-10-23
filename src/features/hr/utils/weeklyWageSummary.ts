import type { DailyAttendance, FieldWorker } from '../../../types/database';
import { WAGE_EARNING_ATTENDANCE_STATUSES } from '../schemas/hr.schema';
import type { WorkerPieceworkEntry, WeeklyWageRecord } from '../types';

export interface WeekRange {
  start: string;
  end: string;
}

const wageEarningStatuses: ReadonlySet<string> = new Set(WAGE_EARNING_ATTENDANCE_STATUSES);

function formatUtcDate(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function parseUtcDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  if (formatUtcDate(date) !== value) return null;
  return date;
}

export function getWeekRange(anchorDate: string): WeekRange | null {
  const date = parseUtcDate(anchorDate);
  if (!date) return null;
  const day = date.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  const start = formatUtcDate(date);
  date.setUTCDate(date.getUTCDate() + 6);
  return { start, end: formatUtcDate(date) };
}

function toCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round((amount + Number.EPSILON) * 100);
}

function fromCents(amount: number): number {
  return amount / 100;
}

export function buildWeeklyWageSummary(
  workers: FieldWorker[],
  attendance: DailyAttendance[],
  piecework: WorkerPieceworkEntry[],
): WeeklyWageRecord[] {
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));
  const summaryByWorker = new Map<string, {
    record: WeeklyWageRecord;
    baseCents: number;
    overtimeCents: number;
    pieceworkCents: number;
  }>();

  for (const worker of workers) {
    summaryByWorker.set(worker.id, {
      record: {
        worker_id: worker.id,
        worker_name: worker.full_name,
        role_trade: worker.role_trade,
        attendance_days: 0,
        base_wage: 0,
        overtime_wage: 0,
        piecework_wage: 0,
        total_wage: 0,
      },
      baseCents: 0,
      overtimeCents: 0,
      pieceworkCents: 0,
    });
  }

  for (const item of attendance) {
    if (!wageEarningStatuses.has(item.status)) {
      continue;
    }
    const worker = workerById.get(item.worker_id);
    const summary = summaryByWorker.get(item.worker_id);
    if (!worker || !summary) continue;
    summary.record.attendance_days += 1;
    summary.baseCents += toCents(item.daily_wage_rate_snapshot ?? worker.daily_wage_rate);
    summary.overtimeCents += toCents(
      (item.overtime_hourly_rate_snapshot ?? worker.overtime_hourly_rate) * item.overtime_hours,
    );
  }

  for (const item of piecework) {
    const summary = summaryByWorker.get(item.worker_id);
    if (!summary) continue;
    summary.pieceworkCents += toCents(item.total_amount);
  }

  return [...summaryByWorker.values()].map(({ record, baseCents, overtimeCents, pieceworkCents }) => {
    record.base_wage = fromCents(baseCents);
    record.overtime_wage = fromCents(overtimeCents);
    record.piecework_wage = fromCents(pieceworkCents);
    record.total_wage = fromCents(baseCents + overtimeCents + pieceworkCents);
    return record;
  });
}
