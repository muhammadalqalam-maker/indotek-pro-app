import { useEffect, useRef, useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import { toolboxMeetingSchema, type ToolboxMeetingFormInput, type ToolboxMeetingFormValues } from '../schemas/safety.schema';
import { getSafetyDate } from '../utils/safetyDate';

const messages = getMessages().safety;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';

export function ToolboxMeetingForm({
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
  onSave: (values: ToolboxMeetingFormValues) => Promise<void>;
}) {
  const form = useForm<ToolboxMeetingFormInput>({
    defaultValues: {
      project_id: defaultProjectId,
      meeting_date: getSafetyDate(),
      topic: '',
      presenter_name: '',
      attendees_count: 1,
      key_points: '',
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
    const result = toolboxMeetingSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        form.setError(issue.path.join('.') as FieldPath<ToolboxMeetingFormInput>, {
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
  const fieldError = (name: keyof ToolboxMeetingFormInput) => form.formState.errors[name]?.message;

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-text">{messages.addToolbox}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{messages.toolboxDescription}</p>
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
        <input id="meeting_date" aria-invalid={Boolean(fieldError('meeting_date'))} type="date" {...form.register('meeting_date')} disabled={isSaving} className={fieldClassName} />
        {fieldError('meeting_date') && <span className="text-xs text-danger">{fieldError('meeting_date')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.topic}
        <input id="topic" aria-invalid={Boolean(fieldError('topic'))} {...form.register('topic')} disabled={isSaving} className={fieldClassName} />
        {fieldError('topic') && <span className="text-xs text-danger">{fieldError('topic')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.presenter}
        <input id="presenter_name" aria-invalid={Boolean(fieldError('presenter_name'))} {...form.register('presenter_name')} disabled={isSaving} className={fieldClassName} />
        {fieldError('presenter_name') && <span className="text-xs text-danger">{fieldError('presenter_name')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.attendees}
        <input id="attendees_count" aria-invalid={Boolean(fieldError('attendees_count'))} type="number" min="1" max="10000" step="1" inputMode="numeric" {...form.register('attendees_count', { valueAsNumber: true })} disabled={isSaving} className={fieldClassName} />
        {fieldError('attendees_count') && <span className="text-xs text-danger">{fieldError('attendees_count')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.keyPoints}
        <textarea id="key_points" aria-invalid={Boolean(fieldError('key_points'))} {...form.register('key_points')} disabled={isSaving} rows={5} className={fieldClassName} />
        {fieldError('key_points') && <span className="text-xs text-danger">{fieldError('key_points')}</span>}
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
