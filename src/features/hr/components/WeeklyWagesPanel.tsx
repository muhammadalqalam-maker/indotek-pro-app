import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState, Skeleton } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatRupiah, formatTanggal, formatVolume } from '../../../utils/format';
import type { FieldWorker } from '../../../types/database';
import type { WorkerPieceworkEntry } from '../types';
import { buildWeeklyWageSummary, getWeekRange } from '../utils/weeklyWageSummary';
import { useWeeklyWages } from '../hooks/useWeeklyWages';
import { WorkerPieceworkForm } from './WorkerPieceworkForm';

const messages = getMessages().hrManpower;

function getLocalDate(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function moveWeek(date: string, offset: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + offset * 7);
  return next.toISOString().slice(0, 10);
}

type WeeklyWagesPanelProps = {
  organizationId: string;
  projectId: string;
  userId: string;
  workers: FieldWorker[];
  isOnline: boolean;
  canManagePiecework: boolean;
};

export function WeeklyWagesPanel({
  organizationId,
  projectId,
  userId,
  workers,
  isOnline,
  canManagePiecework,
}: WeeklyWagesPanelProps) {
  const [anchorDate, setAnchorDate] = useState(getLocalDate);
  const range = useMemo(() => getWeekRange(anchorDate), [anchorDate]);
  const {
    createPiecework,
    query,
  } = useWeeklyWages(
    organizationId,
    projectId,
    userId,
    range?.start ?? '',
    range?.end ?? '',
    isOnline && range !== null,
  );

  const summary = useMemo(
    () => buildWeeklyWageSummary(
      query.data?.workers ?? workers,
      query.data?.attendance ?? [],
      query.data?.piecework ?? [],
    ),
    [query.data, workers],
  );
  const totalWage = summary.reduce((total, item) => total + item.total_wage, 0);
  const workerById = useMemo(
    () => new Map((query.data?.workers ?? workers).map((worker) => [worker.id, worker])),
    [query.data?.workers, workers],
  );
  const hasWageRecords = summary.some((item) => item.total_wage > 0 || item.attendance_days > 0);

  const renderPieceworkEntry = (entry: WorkerPieceworkEntry) => {
    const worker = workerById.get(entry.worker_id);
    return (
      <article key={entry.id} className="grid gap-2 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <div className="min-w-0">
          <h4 className="font-medium text-text">{entry.description}</h4>
          <p className="text-sm text-muted-foreground">
            {worker?.full_name ?? messages.unnamedWorker} · {formatTanggal(entry.work_date)}
          </p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          {formatVolume(entry.quantity)} {entry.unit} × {formatRupiah(entry.unit_rate)}
        </p>
        <p className="font-semibold tabular-nums text-text">{formatRupiah(entry.total_amount)}</p>
      </article>
    );
  };

  if (!range) {
    return <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{messages.pieceworkValidationError}</p>;
  }

  return (
    <section className="grid gap-4">
      <header className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-text">{messages.weeklyWagesTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{messages.weeklyWagesDescription}</p>
          <p className="mt-2 text-xs text-muted-foreground">{messages.accruedOnlyNotice}</p>
        </div>
        <div className="grid gap-2 sm:min-w-64">
          <label className="grid gap-1.5 text-sm font-medium text-text">
            {messages.weekAnchor}
            <span className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                type="date"
                value={anchorDate}
                onChange={(event) => setAnchorDate(event.target.value)}
                className="min-h-11 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-base"
              />
            </span>
          </label>
          <div className="flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              aria-label={messages.previousWeek}
              onClick={() => setAnchorDate((value) => moveWeek(value, -1))}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-text hover:bg-surface-2"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="text-center font-medium text-text">
              {messages.weekRange(formatTanggal(range.start), formatTanggal(range.end))}
            </span>
            <button
              type="button"
              aria-label={messages.nextWeek}
              onClick={() => setAnchorDate((value) => moveWeek(value, 1))}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border text-text hover:bg-surface-2"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {!isOnline ? (
        <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
          {messages.weeklyWagesOffline}
        </p>
      ) : query.isPending ? (
        <div className="grid gap-3" aria-label={messages.weeklyWagesLoading}>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : query.isError ? (
        <section role="alert" className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{messages.weeklyWagesLoadError}</p>
          <button type="button" onClick={() => void query.refetch()} className="min-h-11 w-fit rounded-md border border-current px-3 font-semibold">
            {messages.retry}
          </button>
        </section>
      ) : (
        <>
          <section className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{messages.weeklyTotal}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-text">{formatRupiah(totalWage)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{messages.workersCount(summary.filter((item) => item.total_wage > 0).length)}</p>
            </div>
          </section>

          {canManagePiecework && (
            <WorkerPieceworkForm
              projectId={projectId}
              workers={workers}
              range={range}
              isOnline={isOnline}
              isSaving={createPiecework.isPending}
              onSubmit={async (values) => {
                await createPiecework.mutateAsync(values);
              }}
            />
          )}

          {hasWageRecords ? (
            <section className="grid gap-3" aria-label={messages.weeklyWagesTitle}>
              {summary.filter((item) => item.total_wage > 0 || item.attendance_days > 0).map((item) => (
                <article key={item.worker_id} className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))] sm:items-center">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-text">{item.worker_name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{messages.trades[item.role_trade]}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{messages.attendanceDays}: {item.attendance_days}</p>
                  </div>
                  <WageAmount label={messages.baseWage} amount={item.base_wage} />
                  <WageAmount label={messages.overtimeWage} amount={item.overtime_wage} />
                  <WageAmount label={messages.pieceworkWage} amount={item.piecework_wage} />
                  <WageAmount label={messages.totalWage} amount={item.total_wage} emphasized />
                </article>
              ))}
            </section>
          ) : (
            <EmptyState title={messages.noWeeklyWages} description={messages.weeklyWagesDescription} />
          )}

          <section className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
            <h3 className="font-semibold text-text">{messages.pieceworkListTitle}</h3>
            {(query.data?.piecework.length ?? 0) > 0 ? (
              <div className="grid gap-2">{query.data?.piecework.map(renderPieceworkEntry)}</div>
            ) : (
              <p className="text-sm text-muted-foreground">{messages.noPiecework}</p>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function WageAmount({ label, amount, emphasized = false }: { label: string; amount: number; emphasized?: boolean }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${emphasized ? 'font-semibold text-text' : 'text-text'}`}>{formatRupiah(amount)}</span>
    </div>
  );
}
