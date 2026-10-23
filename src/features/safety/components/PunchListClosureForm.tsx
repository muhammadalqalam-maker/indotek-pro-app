import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FileUploader } from '../../../components/ui/FileUploader';
import { getMessages } from '../../../i18n';
import {
  punchListClosureInputSchema,
  punchListClosureSchema,
  type PunchListClosureInput,
} from '../schemas/quality.schema';

const messages = getMessages().safety;

export function PunchListClosureForm({
  isSaving,
  onCancel,
  onClose,
}: {
  isSaving: boolean;
  onCancel: () => void;
  onClose: (photo: File) => Promise<void>;
}) {
  const form = useForm<PunchListClosureInput>({ defaultValues: { after_photo: null } });
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [serverError, setServerError] = useState('');
  const afterPhoto = form.watch('after_photo');
  const photoError = form.formState.errors.after_photo?.message;

  useEffect(() => {
    if (photoError || serverError) errorSummaryRef.current?.focus();
  }, [photoError, serverError]);

  const submit = form.handleSubmit(async (values) => {
    setServerError('');
    const parsed = punchListClosureInputSchema.safeParse(values);
    if (!parsed.success) {
      form.setError('after_photo', {
        type: 'manual',
        message: parsed.error.issues[0]?.message ?? messages.validation.photoRequired,
      });
      return;
    }
    const validatedPhoto = punchListClosureSchema.safeParse({ after_photo: parsed.data.after_photo });
    if (!validatedPhoto.success) {
      form.setError('after_photo', {
        type: 'manual',
        message: validatedPhoto.error.issues[0]?.message ?? messages.validation.photoRequired,
      });
      return;
    }
    try {
      await onClose(validatedPhoto.data.after_photo);
    } catch (error: unknown) {
      setServerError(error instanceof Error ? error.message : messages.saveError);
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 rounded-lg border border-border bg-surface-2 p-3">
      {(photoError || serverError) && (
        <div
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
        >
          {photoError || serverError}
        </div>
      )}
      <FileUploader
        label={messages.punchAfterPhoto}
        hint={messages.photoUploadHint}
        files={afterPhoto ? [afterPhoto] : []}
        onFilesChange={(files) => {
          form.setValue('after_photo', files[0] ?? null, { shouldDirty: true, shouldValidate: true });
          form.clearErrors('after_photo');
          setServerError('');
        }}
        acceptedMimeTypes={['image/jpeg', 'image/png', 'image/webp']}
        accept="image/jpeg,image/png,image/webp"
        maxFileSizeBytes={10 * 1024 * 1024}
        maxFiles={1}
        multiple={false}
        disabled={isSaving}
        compressImages
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">
          {messages.cancel}
        </button>
        <button type="submit" disabled={isSaving} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-60">
          {isSaving ? messages.saving : messages.punchCloseButton}
        </button>
      </div>
    </form>
  );
}
