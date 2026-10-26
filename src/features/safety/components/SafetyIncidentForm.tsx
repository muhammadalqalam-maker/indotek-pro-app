import { useEffect, useRef, useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import { safetyIncidentSchema, type SafetyIncidentFormValues } from '../schemas/safety.schema';
import { SAFETY_INCIDENT_CATEGORIES, SAFETY_INCIDENT_SEVERITIES, type SafetyIncidentCategory } from '../types';
import { getSafetyDate } from '../utils/safetyDate';

const messages = getMessages().safety;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';
const categoryLabels: Record<SafetyIncidentCategory, string> = {
  'Near Miss (Hampir Celaka)': messages.categoryNearMiss,
  'First Aid (P3K)': messages.categoryFirstAid,
  'Medical Treatment': messages.categoryMedicalTreatment,
  'Lost Time Injury (LTI)': messages.categoryLostTimeInjury,
  'Kerusakan Alat': messages.categoryEquipmentDamage,
};
const severityLabels = {
  Rendah: messages.severityLow,
  Sedang: messages.severityMedium,
  Tinggi: messages.severityHigh,
  Kritis: messages.severityCritical,
} as const;

export function SafetyIncidentForm({
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
  onSave: (values: SafetyIncidentFormValues) => Promise<void>;
}) {
  const form = useForm<SafetyIncidentFormValues>({
    defaultValues: {
      project_id: defaultProjectId,
      incident_date: getSafetyDate(),
      category: SAFETY_INCIDENT_CATEGORIES[0],
      severity: 'Rendah',
      location: '',
      description: '',
      immediate_action: '',
      corrective_action: '',
      reporter_name: '',
    },
  });
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [validationIssues, setValidationIssues] = useState<Array<{ id: string; message: string }>>([]);
  const validationSummary = form.formState.errors.root?.validation?.message;

  useEffect(() => {
    if (validationSummary) errorSummaryRef.current?.focus();
  }, [validationSummary]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setValidationIssues([]);
    const result = safetyIncidentSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path.join('.') as FieldPath<SafetyIncidentFormValues>, {
          type: 'manual',
          message: issue.message,
        });
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
    } catch {
      form.setError('root.serverError', { message: messages.saveError });
    }
  });
  const fieldError = (name: keyof SafetyIncidentFormValues) => form.formState.errors[name]?.message;

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-text">{messages.addIncident}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{messages.incidentDescription}</p>
      </div>
      {(validationSummary || form.formState.errors.root?.serverError?.message) && (
        <div ref={errorSummaryRef} role="alert" tabIndex={-1} className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger sm:col-span-2">
          <p>{validationSummary || form.formState.errors.root?.serverError?.message}</p>
          {validationSummary && validationIssues.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
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
        <input id="incident_date" aria-invalid={Boolean(fieldError('incident_date'))} type="date" {...form.register('incident_date')} disabled={isSaving} className={fieldClassName} />
        {fieldError('incident_date') && <span className="text-xs text-danger">{fieldError('incident_date')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.category}
        <select id="category" {...form.register('category')} disabled={isSaving} className={fieldClassName}>
          {SAFETY_INCIDENT_CATEGORIES.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.severity}
        <select id="severity" {...form.register('severity')} disabled={isSaving} className={fieldClassName}>
          {SAFETY_INCIDENT_SEVERITIES.map((severity) => <option key={severity} value={severity}>{severityLabels[severity]}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.location}
        <input id="location" aria-invalid={Boolean(fieldError('location'))} {...form.register('location')} disabled={isSaving} className={fieldClassName} />
        {fieldError('location') && <span className="text-xs text-danger">{fieldError('location')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.descriptionField}
        <textarea id="description" aria-invalid={Boolean(fieldError('description'))} {...form.register('description')} disabled={isSaving} rows={3} className={fieldClassName} />
        {fieldError('description') && <span className="text-xs text-danger">{fieldError('description')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.immediateAction}
        <textarea id="immediate_action" aria-invalid={Boolean(fieldError('immediate_action'))} {...form.register('immediate_action')} disabled={isSaving} rows={3} className={fieldClassName} />
        {fieldError('immediate_action') && <span className="text-xs text-danger">{fieldError('immediate_action')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.correctiveAction}
        <textarea id="corrective_action" aria-invalid={Boolean(fieldError('corrective_action'))} {...form.register('corrective_action')} disabled={isSaving} rows={3} className={fieldClassName} />
        {fieldError('corrective_action') && <span className="text-xs text-danger">{fieldError('corrective_action')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.reporter}
        <input id="reporter_name" aria-invalid={Boolean(fieldError('reporter_name'))} {...form.register('reporter_name')} disabled={isSaving} className={fieldClassName} />
        {fieldError('reporter_name') && <span className="text-xs text-danger">{fieldError('reporter_name')}</span>}
      </label>
      <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">
          {messages.cancel}
        </button>
        <button type="submit" disabled={isSaving || projects.length === 0} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {isSaving ? messages.saving : messages.save}
        </button>
      </div>
    </form>
  );
}
