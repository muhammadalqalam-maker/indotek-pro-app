import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import {
  safetyIncidentActionSchema,
  type SafetyIncidentActionValues,
} from '../schemas/safety.schema';

const messages = getMessages().safety;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';

export function SafetyIncidentActionForm({
  isSaving,
  onCancel,
  onSave,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onSave: (values: SafetyIncidentActionValues) => Promise<void>;
}) {
  const form = useForm<SafetyIncidentActionValues>({
    defaultValues: { corrective_action: '' },
  });
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const validationSummary = form.formState.errors.root?.validation?.message;

  useEffect(() => {
    if (validationSummary) errorSummaryRef.current?.focus();
  }, [validationSummary]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    const result = safetyIncidentActionSchema.safeParse(values);
    if (!result.success) {
      const issue = result.error.issues[0];
      if (issue) form.setError('corrective_action', { type: 'manual', message: issue.message });
      form.setError('root.validation', { message: messages.validationSummary });
      return;
    }
    try {
      await onSave(result.data);
    } catch {
      form.setError('root.serverError', { message: messages.saveError });
    }
  });
  const fieldError = form.formState.errors.corrective_action?.message;

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 rounded-lg border border-border bg-surface-2 p-3">
      {(validationSummary || form.formState.errors.root?.serverError?.message) && (
        <div ref={errorSummaryRef} role="alert" tabIndex={-1} className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {validationSummary || form.formState.errors.root?.serverError?.message}
        </div>
      )}
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.correctiveAction}
        <textarea
          id="corrective_action"
          aria-invalid={Boolean(fieldError)}
          {...form.register('corrective_action')}
          disabled={isSaving}
          rows={3}
          className={fieldClassName}
        />
        {fieldError && <span className="text-xs text-danger">{fieldError}</span>}
      </label>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">
          {messages.cancel}
        </button>
        <button type="submit" disabled={isSaving} className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {isSaving ? messages.saving : messages.statusActionButton}
        </button>
      </div>
    </form>
  );
}
