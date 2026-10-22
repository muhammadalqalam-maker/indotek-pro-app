import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Textarea,
} from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatTanggal } from '../../../utils/format';
import { wbsTaskSchema, type WbsTaskFormValues } from '../schemas/wbsTask.schema';
import type { TaskDependency, WbsTask } from '../services/projectSchedule.service';
import {
  flattenWbsTasks,
  getScheduleConflict,
  getTaskDurationDays,
  getWbsDescendantIds,
} from '../utils/projectSchedule.helpers';

const messages = getMessages('id').projects.schedule;

type WbsTaskDialogProps = {
  open: boolean;
  task: WbsTask | null;
  initialParentId: string | null;
  tasks: WbsTask[];
  dependencies: TaskDependency[];
  saving: boolean;
  saveError: string;
  onClose: () => void;
  onSave: (values: WbsTaskFormValues) => void | Promise<void>;
};

export function WbsTaskDialog({
  open,
  task,
  initialParentId,
  tasks,
  dependencies,
  saving,
  saveError,
  onClose,
  onSave,
}: WbsTaskDialogProps) {
  const form = useForm<WbsTaskFormValues>({
    defaultValues: {
      title: '',
      description: '',
      parent_task_id: initialParentId ?? '',
      start_date: '',
      end_date: '',
      is_milestone: false,
      predecessor_task_ids: [],
    },
  });
  const milestone = form.watch('is_milestone');
  const startDate = form.watch('start_date');
  const predecessorTaskIds = form.watch('predecessor_task_ids');
  const rows = flattenWbsTasks(tasks);
  const excludedParentIds = task ? getWbsDescendantIds(tasks, task.id) : new Set<string>();
  if (task) excludedParentIds.add(task.id);
  const allowedParents = rows.filter((row) => !excludedParentIds.has(row.id));
  const allowedPredecessors = rows.filter((row) => row.id !== task?.id);
  const existingPredecessorIds = task
    ? dependencies
      .filter((dependency) => dependency.successor_task_id === task.id)
      .map((dependency) => dependency.predecessor_task_id)
    : [];

  useEffect(() => {
    if (!open) return;
    form.clearErrors();
    form.reset({
      title: task?.title ?? '',
      description: task?.description ?? '',
      parent_task_id: task?.parent_task_id ?? initialParentId ?? '',
      start_date: task?.start_date ?? '',
      end_date: task?.end_date ?? '',
      is_milestone: task?.is_milestone ?? false,
      predecessor_task_ids: existingPredecessorIds,
    });
  }, [open, task, initialParentId, existingPredecessorIds.join(','), form]);

  useEffect(() => {
    if (milestone && startDate && form.getValues('end_date') !== startDate) {
      form.setValue('end_date', startDate, { shouldDirty: true, shouldValidate: true });
    }
  }, [form, milestone, startDate]);

  const submit = form.handleSubmit(async (values) => {
    const parsed = wbsTaskSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'title' || field === 'description' || field === 'parent_task_id'
          || field === 'start_date' || field === 'end_date' || field === 'is_milestone'
          || field === 'predecessor_task_ids') {
          form.setError(field, { type: 'schema', message: issue.message });
        }
      }
      return;
    }

    const conflict = getScheduleConflict(
      parsed.data,
      parsed.data.predecessor_task_ids,
      tasks,
      dependencies,
      task?.id ?? null,
      {
        predecessor: messages.previousTaskConflict,
        successor: messages.nextTaskConflict,
      },
    );
    if (conflict) {
      form.setError(conflict.field, { type: 'validate', message: conflict.message });
      return;
    }
    await onSave(parsed.data);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !saving) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? messages.editTask : messages.addTask}</DialogTitle>
          <DialogDescription>{messages.description}</DialogDescription>
        </DialogHeader>

        {saveError && (
          <p className="rounded-md border border-danger bg-surface p-3 text-sm text-danger" role="alert">
            {saveError}
          </p>
        )}

        <form id="wbs-task-form" onSubmit={(event) => void submit(event)} className="space-y-4">
          <Input
            label={messages.taskTitle}
            maxLength={160}
            required
            error={form.formState.errors.title?.message}
            {...form.register('title')}
          />
          <Textarea
            label={messages.taskDescription}
            rows={3}
            maxLength={2000}
            hint={messages.descriptionHint}
            error={form.formState.errors.description?.message}
            {...form.register('description')}
          />

          <Select
            label={messages.hierarchy}
            value={form.watch('parent_task_id')}
            error={form.formState.errors.parent_task_id?.message}
            onChange={(event) => form.setValue('parent_task_id', event.currentTarget.value, { shouldDirty: true })}
          >
            <option value="">{messages.rootTask}</option>
            {allowedParents.map((row) => (
              <option key={row.id} value={row.id}>
                {row.code} · {row.title}
              </option>
            ))}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={messages.startDate}
              type="date"
              required
              error={form.formState.errors.start_date?.message}
              {...form.register('start_date')}
            />
            <Input
              label={messages.endDate}
              type="date"
              required
              disabled={milestone}
              error={form.formState.errors.end_date?.message}
              {...form.register('end_date')}
            />
          </div>
          {startDate && form.watch('end_date') && form.formState.errors.end_date?.message === undefined && (
            <p className="text-xs text-muted">
              {messages.duration}: {getTaskDurationDays({
                start_date: startDate,
                end_date: form.watch('end_date'),
              })} {messages.days}
              {' · '}
              {formatTanggal(startDate)} – {formatTanggal(form.watch('end_date'))}
            </p>
          )}
          <div className="space-y-1">
            <Checkbox
              label={messages.milestone}
              checked={milestone}
              onChange={(event) => form.setValue('is_milestone', event.currentTarget.checked, {
                shouldDirty: true,
                shouldValidate: true,
              })}
            />
            <p className="text-xs text-muted">{messages.milestoneHint}</p>
          </div>

          <fieldset className="space-y-2 rounded-md border border-border p-3">
            <legend className="px-1 text-sm font-medium text-text">{messages.predecessor}</legend>
            <p className="text-xs text-muted">{messages.dependencyHint}</p>
            {allowedPredecessors.length === 0 ? (
              <p className="text-sm text-muted">{messages.emptyPredecessors}</p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {allowedPredecessors.map((row) => {
                  return (
                    <Checkbox
                      key={row.id}
                      id={`wbs-predecessor-${row.id}`}
                      label={`${row.code} · ${row.title} (${formatTanggal(row.end_date)})`}
                      checked={predecessorTaskIds.includes(row.id)}
                      onChange={(event) => {
                        const updated = event.currentTarget.checked
                          ? [...new Set([...predecessorTaskIds, row.id])]
                          : predecessorTaskIds.filter((id) => id !== row.id);
                        form.setValue('predecessor_task_ids', updated, { shouldDirty: true });
                      }}
                    />
                  );
                })}
              </div>
            )}
            {form.formState.errors.predecessor_task_ids?.message && (
              <p className="text-xs text-danger" role="alert">
                {form.formState.errors.predecessor_task_ids.message}
              </p>
            )}
          </fieldset>
        </form>

        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            {messages.cancel}
          </Button>
          <Button type="submit" form="wbs-task-form" loading={saving}>
            {messages.saveTask}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
