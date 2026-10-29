import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Search, UserRound } from 'lucide-react';
import { getMessages } from '../../i18n';
import type { FieldWorker } from '../../types/database';
import { formatRupiah } from '../../utils/format';
import type { WorkerWageRateValues } from './schemas/wage.schema';
import {
  WORKER_TRADES,
  fieldWorkerSchema,
  type FieldWorkerFormValues,
} from './schemas/hr.schema';
import { WorkerWageRateForm } from './WorkerWageRateForm';

const messages = getMessages().hrManpower;

type WorkerDirectoryProps = {
  workers: FieldWorker[];
  canManageWorkers: boolean;
  isOnline: boolean;
  projectId: string;
  isSaving: boolean;
  updatingWorkerId: string | null;
  onCreate: (values: FieldWorkerFormValues) => Promise<void>;
  onUpdateRates: (workerId: string, values: WorkerWageRateValues) => Promise<void>;
};

export function WorkerDirectory({
  workers,
  canManageWorkers,
  isOnline,
  projectId,
  isSaving,
  updatingWorkerId,
  onCreate,
  onUpdateRates,
}: WorkerDirectoryProps) {
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const { handleSubmit, register, reset, setError, formState: { errors } } = useForm<FieldWorkerFormValues>({
    defaultValues: {
      project_id: projectId,
      nik: '',
      full_name: '',
      role_trade: 'Pekerja / Kenek',
      daily_wage_rate: 0,
      overtime_hourly_rate: 0,
      phone: '',
      origin_city: '',
    },
  });

  useEffect(() => {
    reset({
      project_id: projectId,
      nik: '',
      full_name: '',
      role_trade: 'Pekerja / Kenek',
      daily_wage_rate: 0,
      overtime_hourly_rate: 0,
      phone: '',
      origin_city: '',
    });
    setShowForm(false);
    setFormError('');
  }, [projectId, reset]);

  useEffect(() => {
    if (formError) errorSummaryRef.current?.focus();
  }, [formError]);

  const visibleWorkers = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    if (!normalized) return workers;
    return workers.filter((worker) => (
      worker.full_name.toLocaleLowerCase().includes(normalized)
      || worker.nik.toLocaleLowerCase().includes(normalized)
      || worker.role_trade.toLocaleLowerCase().includes(normalized)
    ));
  }, [search, workers]);

  const submit = handleSubmit(async (values) => {
    setFormError('');
    const result = fieldWorkerSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (
          field === 'full_name'
          || field === 'nik'
          || field === 'role_trade'
          || field === 'daily_wage_rate'
          || field === 'overtime_hourly_rate'
          || field === 'phone'
          || field === 'origin_city'
        ) {
          setError(field, { type: 'manual', message: messages.workerValidationError });
        }
      }
      setFormError(messages.workerValidationError);
      return;
    }
    try {
      await onCreate(result.data);
      reset({ ...values, nik: '', full_name: '', phone: '', origin_city: '' });
      setShowForm(false);
    } catch {
      setFormError(messages.workerSaveError);
    }
  });

  return (
    <section className="grid gap-4">
      {canManageWorkers ? (
        <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-text">{messages.workerCreatedTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{messages.workerCount(workers.length)}</p>
              {!isOnline && <p className="mt-1 text-sm text-warning-foreground">{messages.workerCreateOffline}</p>}
            </div>
            <button
              type="button"
              onClick={() => setShowForm((current) => !current)}
              disabled={!isOnline}
              aria-expanded={showForm}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-text hover:bg-surface-2"
            >
              <Plus className="size-4" aria-hidden="true" />
              {messages.addWorker}
            </button>
          </div>
          {showForm && (
            <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-text">
                {messages.workerName}
                <input
                  {...register('full_name')}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.full_name)}
                  aria-describedby={errors.full_name ? 'hr-worker-name-error' : undefined}
                  className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                />
                {errors.full_name && <span id="hr-worker-name-error" className="text-xs text-destructive">{errors.full_name.message}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-text">
                {messages.workerNik}
                <input
                  {...register('nik')}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.nik)}
                  aria-describedby={errors.nik ? 'hr-worker-nik-error' : undefined}
                  className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                />
                {errors.nik && <span id="hr-worker-nik-error" className="text-xs text-destructive">{errors.nik.message}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-text">
                {messages.workerTrade}
                <select
                  {...register('role_trade')}
                  aria-invalid={Boolean(errors.role_trade)}
                  aria-describedby={errors.role_trade ? 'hr-worker-trade-error' : undefined}
                  className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                >
                  {WORKER_TRADES.map((trade) => (
                    <option key={trade} value={trade}>{messages.trades[trade]}</option>
                  ))}
                </select>
                {errors.role_trade && <span id="hr-worker-trade-error" className="text-xs text-destructive">{errors.role_trade.message}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-text">
                {messages.dailyWageRate}
                <input
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="decimal"
                  {...register('daily_wage_rate', { valueAsNumber: true })}
                  aria-invalid={Boolean(errors.daily_wage_rate)}
                  className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                />
                {errors.daily_wage_rate && <span className="text-xs text-destructive">{messages.workerValidationError}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-text">
                {messages.overtimeHourlyRate}
                <input
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="decimal"
                  {...register('overtime_hourly_rate', { valueAsNumber: true })}
                  aria-invalid={Boolean(errors.overtime_hourly_rate)}
                  className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                />
                {errors.overtime_hourly_rate && <span className="text-xs text-destructive">{messages.workerValidationError}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-text">
                {messages.workerPhone}
                <input
                  {...register('phone')}
                  type="tel"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? 'hr-worker-phone-error' : undefined}
                  className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                />
                {errors.phone && <span id="hr-worker-phone-error" className="text-xs text-destructive">{errors.phone.message}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
                {messages.workerOrigin}
                <input
                  {...register('origin_city')}
                  autoComplete="address-level2"
                  aria-invalid={Boolean(errors.origin_city)}
                  aria-describedby={errors.origin_city ? 'hr-worker-origin-error' : undefined}
                  className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                />
                {errors.origin_city && <span id="hr-worker-origin-error" className="text-xs text-destructive">{errors.origin_city.message}</span>}
              </label>
              {formError && (
                <div ref={errorSummaryRef} role="alert" tabIndex={-1} className="text-sm text-destructive sm:col-span-2">
                  {formError}
                </div>
              )}
              <div className="flex justify-end sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSaving || !isOnline}
                  className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {isSaving ? messages.savingWorker : messages.saveWorker}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <p role="status" className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground">
          {messages.workerAccessDenied}
        </p>
      )}

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{messages.workerName}</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 w-full rounded-md border border-border bg-surface pl-10 pr-3 text-base text-text"
          placeholder={messages.workerSearch}
        />
      </label>

      {visibleWorkers.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-5 text-sm text-muted-foreground">{messages.workerEmpty}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleWorkers.map((worker) => (
            <article key={worker.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-border bg-surface p-4">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-500">
                <UserRound className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-text">{worker.full_name}</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">{messages.trades[worker.role_trade]}</p>
                <p className="mt-2 break-all text-xs text-muted-foreground">{messages.workerNik}: {worker.nik}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {worker.phone || messages.workerPhone} · {worker.origin_city || messages.originNotProvided}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{messages.dailyWageRate}: {formatRupiah(worker.daily_wage_rate)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{messages.overtimeHourlyRate}: {formatRupiah(worker.overtime_hourly_rate)}</p>
                {canManageWorkers && editingWorkerId !== worker.id && (
                  <button
                    type="button"
                    onClick={() => setEditingWorkerId(worker.id)}
                    className="mt-3 min-h-11 rounded-md border border-border px-3 text-sm font-semibold text-text hover:bg-surface-2"
                  >
                    {messages.editWorkerRates}
                  </button>
                )}
                {canManageWorkers && editingWorkerId === worker.id && (
                  <WorkerWageRateForm
                    worker={worker}
                    isSaving={updatingWorkerId === worker.id}
                    onCancel={() => setEditingWorkerId(null)}
                    onSubmit={(values) => onUpdateRates(worker.id, values)}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
