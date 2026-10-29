import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getMessages } from '../../i18n';
import type { FieldWorker } from '../../types/database';
import { workerWageRateSchema, type WorkerWageRateValues } from './schemas/wage.schema';

const messages = getMessages().hrManpower;

type WorkerWageRateFormProps = {
  worker: FieldWorker;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (values: WorkerWageRateValues) => Promise<void>;
};

export function WorkerWageRateForm({
  worker,
  isSaving,
  onCancel,
  onSubmit,
}: WorkerWageRateFormProps) {
  const [formError, setFormError] = useState('');
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const { handleSubmit, register, setError, formState: { errors } } = useForm<WorkerWageRateValues>({
    defaultValues: {
      daily_wage_rate: worker.daily_wage_rate,
      overtime_hourly_rate: worker.overtime_hourly_rate,
    },
  });

  const submit = handleSubmit(async (values) => {
    setFormError('');
    const result = workerWageRateSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === 'daily_wage_rate' || field === 'overtime_hourly_rate') {
          setError(field, { type: 'manual', message: messages.workerValidationError });
        }
      }
      setFormError(messages.workerValidationError);
      errorSummaryRef.current?.focus();
      return;
    }
    try {
      await onSubmit(result.data);
      onCancel();
    } catch {
      setFormError(messages.workerRatesSaveError);
      errorSummaryRef.current?.focus();
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-3 grid gap-3 border-t border-border pt-3">
      <label className="grid gap-1 text-xs font-medium text-text">
        {messages.dailyWageRate}
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          {...register('daily_wage_rate', { valueAsNumber: true })}
          disabled={isSaving}
          aria-invalid={Boolean(errors.daily_wage_rate)}
          className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
        />
        {errors.daily_wage_rate && <span className="text-xs text-destructive">{errors.daily_wage_rate.message}</span>}
      </label>
      <label className="grid gap-1 text-xs font-medium text-text">
        {messages.overtimeHourlyRate}
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          {...register('overtime_hourly_rate', { valueAsNumber: true })}
          disabled={isSaving}
          aria-invalid={Boolean(errors.overtime_hourly_rate)}
          className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
        />
        {errors.overtime_hourly_rate && <span className="text-xs text-destructive">{errors.overtime_hourly_rate.message}</span>}
      </label>
      {formError && (
        <div ref={errorSummaryRef} role="alert" tabIndex={-1} className="text-sm text-destructive">
          {formError}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-md border border-border px-3 text-sm font-semibold text-text hover:bg-surface-2">
          {messages.cancelWorkerRates}
        </button>
        <button type="submit" disabled={isSaving} className="min-h-11 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
          {messages.saveWorkerRates}
        </button>
      </div>
    </form>
  );
}
