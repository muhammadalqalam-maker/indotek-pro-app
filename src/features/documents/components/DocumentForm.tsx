import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Input, Select } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import {
  DEFAULT_DOCUMENT_ACCESS_ROLES,
  DOCUMENT_ACCESS_ROLES,
  DOCUMENT_CATEGORIES,
  documentFormSchema,
  documentVersionFileSchema,
} from '../schemas/documents.schema';
import type { DocumentFormValues } from '../schemas/documents.schema';
import type { CreateProjectDocumentInput } from '../types';

const messages = getMessages().documents;

interface DocumentFormProps {
  projects: Project[];
  defaultProjectId: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (input: CreateProjectDocumentInput) => Promise<void>;
}

export function DocumentForm({
  projects,
  defaultProjectId,
  isSaving,
  onCancel,
  onSave,
}: DocumentFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    defaultValues: {
      project_id: defaultProjectId || '',
      document_number: '',
      title: '',
      category: DOCUMENT_CATEGORIES[0],
      access_roles: [...DEFAULT_DOCUMENT_ACCESS_ROLES],
      expires_on: null,
    },
  });
  const selectedRoles = watch('access_roles');

  const submit = handleSubmit(async (values) => {
    clearErrors();
    setFileError('');
    if (!file) {
      setFileError(messages.validation.fileRequired);
      return;
    }
    const parsedFile = documentVersionFileSchema.safeParse(file);
    if (!parsedFile.success) {
      setFileError(parsedFile.error.issues[0]?.message ?? messages.validation.fileInvalid);
      return;
    }
    const parsed = documentFormSchema.safeParse({
      ...values,
      expires_on: values.expires_on || null,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === 'project_id'
          || field === 'document_number'
          || field === 'title'
          || field === 'category'
          || field === 'access_roles'
          || field === 'expires_on'
        ) {
          setError(field, { message: issue.message });
        }
      }
      return;
    }
    await onSave({ ...parsed.data, file });
  });

  const toggleRole = (role: (typeof DOCUMENT_ACCESS_ROLES)[number], checked: boolean) => {
    const nextRoles = checked
      ? [...selectedRoles, role]
      : selectedRoles.filter((selectedRole) => selectedRole !== role);
    setValue('access_roles', nextRoles, { shouldValidate: true });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div>
        <h3 className="text-base font-semibold text-text">{messages.newDocument}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{messages.newDocumentDescription}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={messages.project}
          error={errors.project_id?.message}
          {...register('project_id')}
        >
          <option value="">{messages.selectProject}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </Select>
        <Select
          label={messages.categoryLabel}
          error={errors.category?.message}
          {...register('category')}
        >
          {DOCUMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>{messages.categories[category]}</option>
          ))}
        </Select>
        <Input
          label={messages.documentNumber}
          maxLength={80}
          error={errors.document_number?.message}
          {...register('document_number')}
        />
        <Input
          label={messages.titleLabel}
          maxLength={180}
          error={errors.title?.message}
          {...register('title')}
        />
        <Input
          type="date"
          label={messages.expiryDate}
          hint={messages.expiryHint}
          error={errors.expires_on?.message}
          {...register('expires_on')}
        />
        <div className="grid gap-1.5">
          <label htmlFor="document-file" className="text-sm font-medium text-text">{messages.file}</label>
          <input
            id="document-file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => {
              setFile(event.currentTarget.files?.[0] ?? null);
              setFileError('');
            }}
            className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-text file:mr-3 file:min-h-8 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:font-semibold file:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-describedby="document-file-hint"
            aria-invalid={Boolean(fileError)}
          />
          <p id="document-file-hint" className="text-xs text-muted-foreground">
            {file ? file.name : messages.fileHint}
          </p>
          {fileError && <p role="alert" className="text-xs text-danger">{fileError}</p>}
        </div>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium text-text">{messages.readerRoles}</legend>
        <p className="text-xs text-muted-foreground">{messages.readerRolesHint}</p>
        <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_ACCESS_ROLES.map((role) => (
            <Checkbox
              key={role}
              id={`document-role-${role}`}
              label={messages.roles[role]}
              checked={selectedRoles.includes(role)}
              onChange={(event) => toggleRole(role, event.currentTarget.checked)}
            />
          ))}
        </div>
        {errors.access_roles?.message && (
          <p role="alert" className="text-xs text-danger">{errors.access_roles.message}</p>
        )}
      </fieldset>
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>{messages.cancel}</Button>
        <Button type="submit" loading={isSaving} disabled={projects.length === 0}>
          {messages.saveDocument}
        </Button>
      </div>
    </form>
  );
}
