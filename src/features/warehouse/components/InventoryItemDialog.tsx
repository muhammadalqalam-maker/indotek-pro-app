import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import {
  inventoryItemSchema,
  type InventoryItemFormValues,
} from '../schemas/warehouse.schema';

const messages = getMessages().warehouse;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';

export function InventoryItemDialog({
  projects,
  defaultProjectId,
  onClose,
  onSave,
}: {
  projects: Project[];
  defaultProjectId: string;
  onClose: () => void;
  onSave: (values: InventoryItemFormValues) => Promise<void>;
}) {
  const form = useForm<InventoryItemFormValues>({
    defaultValues: {
      projectId: defaultProjectId,
      itemCode: '',
      itemName: '',
      category: '',
      unit: '',
      locationName: '',
      minimumStock: 0,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const parsed = inventoryItemSchema.safeParse(values);
    if (!parsed.success) {
      form.setError('root', { message: parsed.error.issues[0]?.message ?? messages.itemFailed });
      return;
    }
    try {
      await onSave(parsed.data);
      onClose();
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : messages.itemFailed,
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouse-item-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6"
      >
        <header className="mb-5 flex items-start justify-between gap-3">
          <h2 id="warehouse-item-title" className="text-lg font-semibold text-text">
            {messages.itemFormTitle}
          </h2>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-md p-2 text-muted hover:bg-surface-2" aria-label={messages.close}>
            <X className="mx-auto h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {projects.length === 0 ? (
          <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            {messages.noProjects}
          </p>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-text">
              {messages.project}
              <select className={fieldClassName} {...form.register('projectId')}>
                <option value="">{messages.project}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              {form.formState.errors.projectId?.message && <span className="text-xs text-danger">{form.formState.errors.projectId.message}</span>}
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.itemCode}
              <input maxLength={64} className={fieldClassName} {...form.register('itemCode')} />
              {form.formState.errors.itemCode?.message && <span className="text-xs text-danger">{form.formState.errors.itemCode.message}</span>}
            </label>
            <label className="grid gap-1 text-sm text-text sm:col-span-2">
              {messages.itemName}
              <input maxLength={180} className={fieldClassName} {...form.register('itemName')} />
              {form.formState.errors.itemName?.message && <span className="text-xs text-danger">{form.formState.errors.itemName.message}</span>}
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.category}
              <input maxLength={80} className={fieldClassName} {...form.register('category')} />
              {form.formState.errors.category?.message && <span className="text-xs text-danger">{form.formState.errors.category.message}</span>}
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.unit}
              <input maxLength={24} className={fieldClassName} {...form.register('unit')} />
              {form.formState.errors.unit?.message && <span className="text-xs text-danger">{form.formState.errors.unit.message}</span>}
            </label>
            <label className="grid gap-1 text-sm text-text sm:col-span-2">
              {messages.location}
              <input maxLength={180} className={fieldClassName} {...form.register('locationName')} />
              {form.formState.errors.locationName?.message && <span className="text-xs text-danger">{form.formState.errors.locationName.message}</span>}
            </label>
            <label className="grid gap-1 text-sm text-text sm:col-span-2">
              {messages.minimumStock}
              <input
                type="number"
                min="0"
                max="1000000"
                step="0.001"
                inputMode="decimal"
                className={fieldClassName}
                {...form.register('minimumStock', { valueAsNumber: true })}
              />
              {form.formState.errors.minimumStock?.message && <span className="text-xs text-danger">{form.formState.errors.minimumStock.message}</span>}
            </label>
            {form.formState.errors.root?.message && (
              <p role="alert" className="text-sm text-danger sm:col-span-2">{form.formState.errors.root.message}</p>
            )}
            <footer className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:col-span-2 sm:flex-row">
              <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm text-text">
                {messages.cancel}
              </button>
              <button type="submit" disabled={form.formState.isSubmitting} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
                {form.formState.isSubmitting ? messages.loading : messages.saveItem}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
