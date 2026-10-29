import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2, X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import { purchaseRequestSchema } from '../schemas/procurement.schema';
import { createPurchaseRequest } from '../services/procurement.service';
import type { CreatePurchaseRequestInput } from '../types';

const messages = getMessages().procurementWorkflow;
type FormValues = {
  projectId: string;
  requiredDate: string;
  department: string;
  urgency: 'normal' | 'urgent' | 'critical';
  comment: string;
  items: CreatePurchaseRequestInput['items'];
};

function dateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function PurchaseRequestDialog({
  organizationId,
  projects,
  onClose,
  onCreated,
}: {
  organizationId: string;
  projects: Project[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const form = useForm<FormValues>({
    defaultValues: {
      projectId: projects[0]?.id ?? '',
      requiredDate: dateAfterDays(7),
      department: '',
      urgency: 'normal',
      comment: '',
      items: [{ item_name: '', specification: '', unit: 'pcs', quantity: 1, estimated_price: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  const submit = form.handleSubmit(async (values) => {
    const parsed = purchaseRequestSchema.safeParse(values);
    if (!parsed.success) {
      form.setError('root', { message: parsed.error.issues[0]?.message ?? messages.requestFailed });
      return;
    }
    try {
      await createPurchaseRequest({ organizationId, ...parsed.data });
      await onCreated();
      onClose();
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : messages.requestFailed,
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-request-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6"
      >
        <header className="mb-5 flex items-start justify-between gap-3">
          <h2 id="purchase-request-title" className="text-lg font-semibold text-text">
            {messages.requestFormTitle}
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-surface-2" aria-label={messages.close}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-text">
              {messages.project}
              <select className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('projectId')}>
                <option value="">{messages.chooseProject}</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              <span className="text-xs text-danger">{form.formState.errors.projectId?.message}</span>
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.requiredDate}
              <input type="date" min={dateAfterDays(0)} className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('requiredDate')} />
              <span className="text-xs text-danger">{form.formState.errors.requiredDate?.message}</span>
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.department}
              <input className="min-h-11 rounded-md border border-border bg-surface px-3" maxLength={120} {...form.register('department')} />
              <span className="text-xs text-danger">{form.formState.errors.department?.message}</span>
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.urgency}
              <select className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('urgency')}>
                <option value="normal">{messages.normal}</option>
                <option value="urgent">{messages.urgent}</option>
                <option value="critical">{messages.critical}</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-text">{messages.items}</h3>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm text-text hover:bg-surface-2"
                onClick={() => append({ item_name: '', specification: '', unit: 'pcs', quantity: 1, estimated_price: 0 })}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />{messages.addItem}
              </button>
            </div>
            {fields.map((field, index) => (
              <fieldset key={field.id} className="grid gap-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <legend className="text-sm font-medium text-text">{messages.item} {index + 1}</legend>
                  <button
                    type="button"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-danger disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />{messages.removeItem}
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-text">
                    {messages.itemName}
                    <input className="min-h-11 rounded-md border border-border bg-surface px-3" maxLength={180} {...form.register(`items.${index}.item_name`)} />
                    <span className="text-xs text-danger">{form.formState.errors.items?.[index]?.item_name?.message}</span>
                  </label>
                  <label className="grid gap-1 text-sm text-text">
                    {messages.specification}
                    <input className="min-h-11 rounded-md border border-border bg-surface px-3" maxLength={1000} {...form.register(`items.${index}.specification`)} />
                  </label>
                  <label className="grid gap-1 text-sm text-text">
                    {messages.unit}
                    <input className="min-h-11 rounded-md border border-border bg-surface px-3" maxLength={24} {...form.register(`items.${index}.unit`)} />
                    <span className="text-xs text-danger">{form.formState.errors.items?.[index]?.unit?.message}</span>
                  </label>
                  <label className="grid gap-1 text-sm text-text">
                    {messages.quantity}
                    <input type="number" min="0.001" step="0.001" className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} />
                    <span className="text-xs text-danger">{form.formState.errors.items?.[index]?.quantity?.message}</span>
                  </label>
                  <label className="grid gap-1 text-sm text-text sm:col-span-2">
                    {messages.estimatedPrice}
                    <input type="number" min="0" step="0.01" className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register(`items.${index}.estimated_price`, { valueAsNumber: true })} />
                    <span className="text-xs text-danger">{form.formState.errors.items?.[index]?.estimated_price?.message}</span>
                  </label>
                </div>
              </fieldset>
            ))}
          </div>

          <label className="grid gap-1 text-sm text-text">
            {messages.comment}
            <textarea rows={3} maxLength={2000} className="rounded-md border border-border bg-surface px-3 py-2" {...form.register('comment')} />
          </label>
          {form.formState.errors.root?.message && <p role="alert" className="text-sm text-danger">{form.formState.errors.root.message}</p>}
          <footer className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:flex-row">
            <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm text-text">{messages.cancel}</button>
            <button type="submit" disabled={form.formState.isSubmitting || projects.length === 0} className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {form.formState.isSubmitting ? messages.submitting : messages.submitRequest}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
