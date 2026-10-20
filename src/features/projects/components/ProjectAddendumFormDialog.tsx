import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  CurrencyInput,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  useToast,
} from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { useApp } from '../../../context/AppContext';
import type { ProjectAddendum } from '../../../types/database';
import {
  projectAddendumSchema,
  type ProjectAddendumFormValues,
} from '../schemas/projectAddendumSchema';

const messages = getMessages('id').projects;

function nextAddendumNumber(projectCode: string, addendums: ProjectAddendum[]): string {
  let sequence = addendums.length + 1;
  const existingNumbers = new Set(addendums.map(({ addendum_number }) => (
    addendum_number.trim().toLocaleUpperCase('id-ID')
  )));
  let number = '';

  do {
    number = `ADD-${String(sequence).padStart(2, '0')}/${projectCode}`;
    sequence += 1;
  } while (existingNumbers.has(number.toLocaleUpperCase('id-ID')));

  return number;
}

export function ProjectAddendumFormDialog({
  open,
  onClose,
  projectId,
  projectCode,
  addendums,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectCode: string;
  addendums: ProjectAddendum[];
}) {
  const { handleAddAddendum } = useApp();
  const { toast } = useToast();
  const [saveError, setSaveError] = useState('');
  const existingNumbers = useMemo(
    () => new Set(addendums.map(({ addendum_number }) => addendum_number.trim().toLocaleUpperCase('id-ID'))),
    [addendums],
  );
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectAddendumFormValues>({
    defaultValues: {
      addendum_number: '',
      title: '',
      description: '',
      amount: 0,
      time_extension_days: 0,
    },
  });

  useEffect(() => {
    if (!open) return;
    setSaveError('');
    reset({
      addendum_number: nextAddendumNumber(projectCode, addendums),
      title: '',
      description: '',
      amount: 0,
      time_extension_days: 0,
    });
  }, [open, projectCode, addendums, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const result = projectAddendumSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        switch (issue.path[0]) {
          case 'addendum_number':
            setError('addendum_number', { type: 'schema', message: issue.message });
            break;
          case 'title':
            setError('title', { type: 'schema', message: issue.message });
            break;
          case 'description':
            setError('description', { type: 'schema', message: issue.message });
            break;
          case 'amount':
            setError('amount', { type: 'schema', message: issue.message });
            break;
          case 'time_extension_days':
            setError('time_extension_days', { type: 'schema', message: issue.message });
            break;
        }
      }
      return;
    }

    if (existingNumbers.has(values.addendum_number.trim().toLocaleUpperCase('id-ID'))) {
      setError('addendum_number', { type: 'validate', message: messages.addendumDuplicateNumber });
      return;
    }

    setSaveError('');
    try {
      await handleAddAddendum(projectId, {
        ...result.data,
        addendum_number: result.data.addendum_number.trim(),
        title: result.data.title.trim(),
        description: result.data.description.trim(),
      });
      toast({ title: messages.addendumCreated, variant: 'success' });
      onClose();
    } catch (error) {
      const detail = error instanceof Error ? error.message : messages.addendumSaveFailed;
      setSaveError(detail);
      toast({ title: messages.addendumSaveFailed, description: detail, variant: 'error' });
    }
  });

  const amount = watch('amount');
  const daysField = register('time_extension_days', { valueAsNumber: true });

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSubmitting) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.addendumCreateTitle}</DialogTitle>
          <DialogDescription>{messages.addendumCreateDescription}</DialogDescription>
        </DialogHeader>

        {saveError && (
          <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">
            {saveError}
          </p>
        )}

        <form id="project-addendum-form" onSubmit={(event) => void onSubmit(event)} className="space-y-4">
          <Input
            label={messages.addendumNumber}
            required
            maxLength={80}
            error={errors.addendum_number?.message}
            {...register('addendum_number')}
          />
          <Input
            label={messages.addendumTitle}
            required
            maxLength={160}
            error={errors.title?.message}
            {...register('title')}
          />
          <CurrencyInput
            label={messages.addendumAmount}
            value={amount}
            onValueChange={(value) => setValue('amount', value, { shouldDirty: true, shouldValidate: true })}
            error={errors.amount?.message}
            hint={messages.addendumAmountHint}
          />
          <Input
            label={messages.addendumTimeExtension}
            type="number"
            min={0}
            max={3650}
            step={1}
            inputMode="numeric"
            error={errors.time_extension_days?.message}
            {...daysField}
          />
          <Textarea
            label={messages.addendumDescription}
            rows={4}
            maxLength={2000}
            error={errors.description?.message}
            {...register('description')}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={onClose}>
            {messages.cancel}
          </Button>
          <Button type="submit" form="project-addendum-form" loading={isSubmitting}>
            {messages.addendumSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
