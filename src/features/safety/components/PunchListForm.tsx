import { useEffect, useRef, useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { FileUploader } from '../../../components/ui/FileUploader';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import { getSafetyDate } from '../utils/safetyDate';
import { punchListSchema, qualityPhotoSchema, type PunchListFormValues } from '../schemas/quality.schema';
import { PUNCH_LIST_CATEGORIES, PUNCH_LIST_SEVERITIES, type PunchListSeverity } from '../types';

const messages = getMessages().safety;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';
const severityLabels: Record<PunchListSeverity, string> = {
  minor: messages.punchSeverityMinor,
  major: messages.punchSeverityMajor,
  critical: messages.punchSeverityCritical,
};

export function PunchListForm({
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
  onSave: (values: PunchListFormValues, beforePhoto: File) => Promise<void>;
}) {
  const form = useForm<PunchListFormValues>({
    defaultValues: {
      project_id: defaultProjectId,
      location_zone: '',
      category: 'Arsitektur',
      defect_description: '',
      assigned_to_subcon: '',
      due_date: getSafetyDate(),
      severity: 'major',
      reported_by: '',
    },
  });
  const [beforePhotos, setBeforePhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState('');
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [validationIssues, setValidationIssues] = useState<Array<{ id: string; message: string }>>([]);
  const validationSummary = form.formState.errors.root?.validation?.message;
  const serverError = form.formState.errors.root?.serverError?.message;

  useEffect(() => {
    if (validationSummary || serverError || photoError) errorSummaryRef.current?.focus();
  }, [photoError, serverError, validationSummary]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors();
    setPhotoError('');
    setValidationIssues([]);
    const result = punchListSchema.safeParse(values);
    const photoResult = qualityPhotoSchema.safeParse(beforePhotos[0]);
    if (!result.success || !photoResult.success) {
      if (!result.success) {
        for (const issue of result.error.issues) {
          const path = issue.path.map(String).join('.') as FieldPath<PunchListFormValues>;
          form.setError(path, { type: 'manual', message: issue.message });
        }
        setValidationIssues([...new Map(result.error.issues.map((issue) => {
          const id = issue.path.map(String).join('-');
          return [`${id}:${issue.message}`, { id, message: issue.message }];
        }))].map(([, issue]) => issue));
        form.setError('root.validation', { message: messages.validationSummary });
      }
      if (!photoResult.success) setPhotoError(photoResult.error.issues[0]?.message ?? messages.validation.photoRequired);
      return;
    }

    try {
      await onSave(result.data, photoResult.data);
    } catch (error: unknown) {
      form.setError('root.serverError', {
        message: error instanceof Error ? error.message : messages.saveError,
      });
    }
  });
  const fieldError = (name: keyof PunchListFormValues) => form.formState.errors[name]?.message;

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-text">{messages.addPunchList}</h2>
        <p className="mt-1 text-sm text-muted">{messages.qualityPunchListDescription}</p>
      </div>
      {(validationSummary || serverError || photoError) && (
        <div
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="grid gap-1 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger sm:col-span-2"
        >
          <p>{validationSummary || serverError || photoError}</p>
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
        {messages.punchCategory}
        <select id="category" {...form.register('category')} disabled={isSaving} className={fieldClassName}>
          {PUNCH_LIST_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.location}
        <input id="location_zone" aria-invalid={Boolean(fieldError('location_zone'))} {...form.register('location_zone')} disabled={isSaving} className={fieldClassName} />
        {fieldError('location_zone') && <span className="text-xs text-danger">{fieldError('location_zone')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.descriptionField}
        <textarea id="defect_description" aria-invalid={Boolean(fieldError('defect_description'))} {...form.register('defect_description')} disabled={isSaving} rows={3} className={fieldClassName} />
        {fieldError('defect_description') && <span className="text-xs text-danger">{fieldError('defect_description')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.punchOwner}
        <input id="assigned_to_subcon" aria-invalid={Boolean(fieldError('assigned_to_subcon'))} {...form.register('assigned_to_subcon')} disabled={isSaving} className={fieldClassName} />
        {fieldError('assigned_to_subcon') && <span className="text-xs text-danger">{fieldError('assigned_to_subcon')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.punchDueDate}
        <input id="due_date" type="date" aria-invalid={Boolean(fieldError('due_date'))} {...form.register('due_date')} disabled={isSaving} className={fieldClassName} />
        {fieldError('due_date') && <span className="text-xs text-danger">{fieldError('due_date')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.punchSeverity}
        <select id="severity" {...form.register('severity')} disabled={isSaving} className={fieldClassName}>
          {PUNCH_LIST_SEVERITIES.map((severity) => <option key={severity} value={severity}>{severityLabels[severity]}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.punchReporter}
        <input id="reported_by" aria-invalid={Boolean(fieldError('reported_by'))} {...form.register('reported_by')} disabled={isSaving} className={fieldClassName} />
        {fieldError('reported_by') && <span className="text-xs text-danger">{fieldError('reported_by')}</span>}
      </label>
      <div className="sm:col-span-2">
        <FileUploader
          label={messages.punchBeforePhoto}
          hint={messages.photoUploadHint}
          files={beforePhotos}
          onFilesChange={(files) => {
            setBeforePhotos(files.slice(0, 1));
            setPhotoError('');
          }}
          acceptedMimeTypes={['image/jpeg', 'image/png', 'image/webp']}
          accept="image/jpeg,image/png,image/webp"
          maxFileSizeBytes={10 * 1024 * 1024}
          maxFiles={1}
          multiple={false}
          disabled={isSaving}
          compressImages
        />
        {photoError && <p className="mt-1 text-xs text-danger">{photoError}</p>}
      </div>
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
