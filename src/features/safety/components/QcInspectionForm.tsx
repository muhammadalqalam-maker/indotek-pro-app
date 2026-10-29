import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, type FieldPath } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import { getSafetyDate } from '../utils/safetyDate';
import { qcInspectionSchema, type QcInspectionFormValues } from '../schemas/quality.schema';
import { QC_CHECK_RESULTS, type QcCheckResult } from '../types';

const messages = getMessages().safety;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';
const resultLabels: Record<QcCheckResult, string> = {
  pass: messages.qcPass,
  fail: messages.qcFail,
  not_applicable: messages.qcNotApplicable,
};

export function QcInspectionForm({
  projects,
  defaultProjectId,
  isSaving,
  onCancel,
  onSave,
}: {
  projects: Project[];
  defaultProjectId: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (values: QcInspectionFormValues) => Promise<void>;
}) {
  const form = useForm<QcInspectionFormValues>({
    defaultValues: {
      project_id: defaultProjectId,
      inspection_date: getSafetyDate(),
      title: '',
      inspector_name: '',
      location: '',
      items: [{ label: '', result: 'pass', notes: '' }],
      overall_notes: '',
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [validationIssues, setValidationIssues] = useState<Array<{ id: string; message: string }>>([]);
  const validationSummary = form.formState.errors.root?.validation?.message;

  useEffect(() => {
    if (validationSummary || form.formState.errors.root?.serverError?.message) {
      errorSummaryRef.current?.focus();
    }
  }, [form.formState.errors.root?.serverError?.message, validationSummary]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setValidationIssues([]);
    const result = qcInspectionSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.map(String).join('.') as FieldPath<QcInspectionFormValues>;
        form.setError(path, { type: 'manual', message: issue.message });
      }
      setValidationIssues([...new Map(result.error.issues.map((issue) => {
        const id = issue.path.map(String).join('-');
        return [`${id}:${issue.message}`, { id, message: issue.message }];
      }))].map(([, issue]) => issue));
      form.setError('root.validation', { message: messages.validationSummary });
      return;
    }
    try {
      await onSave(result.data);
    } catch (error: unknown) {
      form.setError('root.serverError', {
        message: error instanceof Error ? error.message : messages.saveError,
      });
    }
  });
  const fieldError = (name: keyof QcInspectionFormValues) => form.formState.errors[name]?.message;
  const serverError = form.formState.errors.root?.serverError?.message;

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-text">{messages.addQcInspection}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{messages.qualityInspectionDescription}</p>
      </div>
      {(validationSummary || serverError) && (
        <div
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="grid gap-1 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger sm:col-span-2"
        >
          <p>{validationSummary || serverError}</p>
          {validationSummary && validationIssues.length > 0 && (
            <ul className="list-inside list-disc">
              {validationIssues.map((issue) => (
                <li key={`${issue.id}:${issue.message}`}>
                  <a
                    href={`#${issue.id}`}
                    className="underline underline-offset-2"
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById(issue.id)?.focus();
                    }}
                  >
                    {issue.message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.project}
        <select id="project_id" aria-invalid={Boolean(fieldError('project_id'))} {...form.register('project_id')} disabled={isSaving} className={fieldClassName}>
          <option value="">{messages.chooseProject}</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        {fieldError('project_id') && <span className="text-xs text-danger">{fieldError('project_id')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.date}
        <input id="inspection_date" aria-invalid={Boolean(fieldError('inspection_date'))} type="date" {...form.register('inspection_date')} disabled={isSaving} className={fieldClassName} />
        {fieldError('inspection_date') && <span className="text-xs text-danger">{fieldError('inspection_date')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.inspectionTitle}
        <input id="title" aria-invalid={Boolean(fieldError('title'))} {...form.register('title')} disabled={isSaving} className={fieldClassName} />
        {fieldError('title') && <span className="text-xs text-danger">{fieldError('title')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.inspector}
        <input id="inspector_name" aria-invalid={Boolean(fieldError('inspector_name'))} {...form.register('inspector_name')} disabled={isSaving} className={fieldClassName} />
        {fieldError('inspector_name') && <span className="text-xs text-danger">{fieldError('inspector_name')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.location}
        <input id="location" aria-invalid={Boolean(fieldError('location'))} {...form.register('location')} disabled={isSaving} className={fieldClassName} />
        {fieldError('location') && <span className="text-xs text-danger">{fieldError('location')}</span>}
      </label>

      <fieldset className="grid gap-3 sm:col-span-2">
        <legend className="text-sm font-semibold text-text">{messages.checklist}</legend>
        {fields.map((field, index) => {
          const itemErrors = form.formState.errors.items?.[index];
          return (
            <div key={field.id} className="grid gap-3 rounded-lg border border-border bg-surface-2 p-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-text">
                {messages.itemLabel}
                <input
                  id={`items-${index}-label`}
                  aria-invalid={Boolean(itemErrors?.label)}
                  {...form.register(`items.${index}.label` as FieldPath<QcInspectionFormValues>)}
                  disabled={isSaving}
                  className={fieldClassName}
                />
                {itemErrors?.label?.message && <span className="text-xs text-danger">{itemErrors.label.message}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-text">
                {messages.result}
                <select
                  id={`items-${index}-result`}
                  {...form.register(`items.${index}.result` as FieldPath<QcInspectionFormValues>)}
                  disabled={isSaving}
                  className={fieldClassName}
                >
                  {QC_CHECK_RESULTS.map((value) => <option key={value} value={value}>{resultLabels[value]}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
                {messages.itemNotes}
                <textarea
                  id={`items-${index}-notes`}
                  aria-invalid={Boolean(itemErrors?.notes)}
                  {...form.register(`items.${index}.notes` as FieldPath<QcInspectionFormValues>)}
                  disabled={isSaving}
                  rows={2}
                  className={fieldClassName}
                />
                {itemErrors?.notes?.message && <span className="text-xs text-danger">{itemErrors.notes.message}</span>}
              </label>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={isSaving || fields.length === 1}
                aria-label={`${messages.removeChecklistItem} ${index + 1}`}
                className="min-h-11 w-fit rounded-md px-3 text-sm font-semibold text-danger underline disabled:opacity-50"
              >
                {messages.removeChecklistItem}
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => append({ label: '', result: 'pass', notes: '' })}
          disabled={isSaving || fields.length >= 100}
          className="min-h-11 w-fit rounded-md border border-border px-3 text-sm font-semibold text-text disabled:opacity-50"
        >
          {messages.addChecklistItem}
        </button>
      </fieldset>

      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.overallNotes}
        <textarea id="overall_notes" aria-invalid={Boolean(fieldError('overall_notes'))} {...form.register('overall_notes')} disabled={isSaving} rows={3} className={fieldClassName} />
        {fieldError('overall_notes') && <span className="text-xs text-danger">{fieldError('overall_notes')}</span>}
      </label>
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">
          {messages.cancel}
        </button>
        <button type="submit" disabled={isSaving || projects.length === 0} className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {isSaving ? messages.saving : messages.save}
        </button>
      </div>
    </form>
  );
}
