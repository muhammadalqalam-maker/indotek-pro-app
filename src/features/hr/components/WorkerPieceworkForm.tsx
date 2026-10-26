import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Save } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { FieldWorker } from '../../../types/database';
import { formatRupiah } from '../../../utils/format';
import { workerPieceworkSchema, type WorkerPieceworkFormValues } from '../schemas/wage.schema';
import type { WeekRange } from '../utils/weeklyWageSummary';

const messages = getMessages().hrManpower;

type WorkerPieceworkFormProps = {
  projectId: string;
  workers: FieldWorker[];
  range: WeekRange;
  isOnline: boolean;
  isSaving: boolean;
  onSubmit: (values: WorkerPieceworkFormValues) => Promise<void>;
};

export function WorkerPieceworkForm({
  projectId,
  workers,
  range,
  isOnline,
  isSaving,
  onSubmit,
}: WorkerPieceworkFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const {
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<WorkerPieceworkFormValues>({
    defaultValues: {
      worker_id: workers[0]?.id ?? '',
      work_date: range.start,
      description: '',
      quantity: 1,
      unit: '',
      unit_rate: 0,
    },
  });
  const quantityValue = watch('quantity');
  const rateValue = watch('unit_rate');

  useEffect(() => {
    reset({
      worker_id: workers[0]?.id ?? '',
      work_date: range.start,
      description: '',
      quantity: 1,
      unit: '',
      unit_rate: 0,
    });
    setFormMessage('');
  }, [projectId, range.start, reset, workers]);

  const submit = handleSubmit(async (values) => {
    setFormMessage('');
    const result = workerPieceworkSchema.safeParse(values);
    if (
      !result.success
      || result.data.work_date < range.start
      || result.data.work_date > range.end
    ) {
      setFormMessage(messages.pieceworkValidationError);
      return;
    }

    try {
      await onSubmit(result.data);
      setFormMessage(messages.pieceworkSaved);
      reset({
        worker_id: result.data.worker_id,
        work_date: range.start,
        description: '',
        quantity: 1,
        unit: '',
        unit_rate: 0,
      });
      setShowForm(false);
    } catch {
      setFormMessage(messages.pieceworkSaveError);
    }
  });

  return (
    <section className="grid gap-3">
      <button
        type="button"
        onClick={() => {
          setShowForm((value) => !value);
          setFormMessage('');
        }}
        disabled={!isOnline || workers.length === 0}
        aria-expanded={showForm}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="size-4" aria-hidden="true" />
        {messages.pieceworkTitle}
      </button>
      {formMessage && !showForm && (
        <p role="status" aria-live="polite" className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success-foreground">
          {formMessage}
        </p>
      )}
      {showForm && (
        <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
          <div className="sm:col-span-2">
            <h3 className="font-semibold text-text">{messages.pieceworkTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{messages.pieceworkDescription}</p>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-text">
            {messages.pieceworkWorker}
            <select {...register('worker_id')} disabled={isSaving} className="min-h-11 rounded-md border border-border bg-surface px-3 text-base">
              {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.full_name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-text">
            {messages.pieceworkDate}
            <input
              type="date"
              min={range.start}
              max={range.end}
              {...register('work_date')}
              disabled={isSaving}
              className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
            {messages.pieceworkTask}
            <input {...register('description')} disabled={isSaving} className="min-h-11 rounded-md border border-border bg-surface px-3 text-base" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-text">
            {messages.pieceworkQuantity}
            <input type="number" min="0.001" step="0.001" inputMode="decimal" {...register('quantity', { valueAsNumber: true })} disabled={isSaving} className="min-h-11 rounded-md border border-border bg-surface px-3 text-base" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-text">
            {messages.pieceworkUnit}
            <input {...register('unit')} disabled={isSaving} className="min-h-11 rounded-md border border-border bg-surface px-3 text-base" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-text">
            {messages.pieceworkRate}
            <input type="number" min="0" step="100" inputMode="decimal" {...register('unit_rate', { valueAsNumber: true })} disabled={isSaving} className="min-h-11 rounded-md border border-border bg-surface px-3 text-base" />
          </label>
          <p className="flex items-end text-sm text-muted-foreground sm:pb-3">
            {messages.pieceworkAmount}: {formatRupiah(
              Number.isFinite(quantityValue) && Number.isFinite(rateValue)
                ? quantityValue * rateValue
                : 0,
            )}
          </p>
          {formMessage && (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">{formMessage}</p>
          )}
          <div className="flex justify-end sm:col-span-2">
            <button type="submit" disabled={isSaving} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60">
              <Save className="size-4" aria-hidden="true" />
              {isSaving ? messages.pieceworkSaving : messages.pieceworkSave}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
