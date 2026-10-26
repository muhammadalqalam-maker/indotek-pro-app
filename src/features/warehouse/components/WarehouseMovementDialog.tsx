import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { formatVolume } from '../../../utils/format';
import type { Project } from '../../../types/database';
import type { WarehouseInventoryItem } from '../types';
import { hasSufficientStock } from '../utils/warehouse.helpers';
import {
  warehouseMovementSchema,
  type WarehouseMovementFormValues,
} from '../schemas/warehouse.schema';

const messages = getMessages().warehouse;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';

function itemOption(item: WarehouseInventoryItem, projects: Project[]): string {
  const projectName = projects.find((project) => project.id === item.project_id)?.name ?? item.project_id;
  return `${item.item_code} · ${item.item_name} — ${projectName} / ${item.location_name} (${formatVolume(item.current_stock)} ${item.unit})`;
}

export function WarehouseMovementDialog({
  inventoryItems,
  projects,
  onClose,
  onSave,
}: {
  inventoryItems: WarehouseInventoryItem[];
  projects: Project[];
  onClose: () => void;
  onSave: (values: WarehouseMovementFormValues) => Promise<void>;
}) {
  const form = useForm<WarehouseMovementFormValues>({
    defaultValues: {
      movementType: 'out',
      quantity: 1,
      movementDate: new Date().toISOString().slice(0, 10),
      sourceInventoryItemId: '',
      destinationInventoryItemId: '',
      adjustmentDirection: 'decrease',
      referenceDoc: '',
      recipientOrSupplier: '',
      notes: '',
    },
  });
  const movementType = form.watch('movementType');
  const adjustmentDirection = form.watch('adjustmentDirection');

  const submit = form.handleSubmit(async (values) => {
    const parsed = warehouseMovementSchema.safeParse(values);
    if (!parsed.success) {
      form.setError('root', { message: parsed.error.issues[0]?.message ?? messages.movementFailed });
      return;
    }
    const validValues = parsed.data;
    const needsSource = validValues.movementType === 'out'
      || validValues.movementType === 'transfer'
      || (validValues.movementType === 'adjustment' && validValues.adjustmentDirection === 'decrease');
    if (needsSource) {
      const sourceItem = inventoryItems.find((item) => item.id === validValues.sourceInventoryItemId);
      if (sourceItem && !hasSufficientStock(sourceItem, validValues.quantity)) {
        form.setError('root', { message: messages.insufficientStock });
        return;
      }
    }
    try {
      await onSave(validValues);
      onClose();
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : messages.movementFailed,
      });
    }
  });

  const renderItemSelect = (
    field: 'sourceInventoryItemId' | 'destinationInventoryItemId',
    label: string,
  ) => (
    <label className="grid gap-1 text-sm text-text">
      {label}
      <select className={fieldClassName} {...form.register(field)}>
        <option value="">{messages.chooseItem}</option>
        {inventoryItems.map((item) => (
          <option key={item.id} value={item.id}>{itemOption(item, projects)}</option>
        ))}
      </select>
      {form.formState.errors[field]?.message && <span className="text-xs text-danger">{form.formState.errors[field]?.message}</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouse-movement-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6"
      >
        <header className="mb-5 flex items-start justify-between gap-3">
          <h2 id="warehouse-movement-title" className="text-lg font-semibold text-text">{messages.movementFormTitle}</h2>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-md p-2 text-muted-foreground hover:bg-surface-2" aria-label={messages.close}>
            <X className="mx-auto h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        {inventoryItems.length === 0 ? (
          <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            {messages.noInventoryHint}
          </p>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-text sm:col-span-2">
              {messages.type}
              <select
                className={fieldClassName}
                {...form.register('movementType', {
                  onChange: () => {
                    form.setValue('sourceInventoryItemId', '');
                    form.setValue('destinationInventoryItemId', '');
                  },
                })}
              >
                <option value="in">{messages.in}</option>
                <option value="out">{messages.out}</option>
                <option value="transfer">{messages.transfer}</option>
                <option value="adjustment">{messages.adjustment}</option>
              </select>
            </label>
            {movementType === 'adjustment' && (
              <label className="grid gap-1 text-sm text-text sm:col-span-2">
                {messages.adjustmentDirection}
                <select
                  className={fieldClassName}
                  {...form.register('adjustmentDirection', {
                    onChange: () => {
                      form.setValue('sourceInventoryItemId', '');
                      form.setValue('destinationInventoryItemId', '');
                    },
                  })}
                >
                  <option value="increase">{messages.increase}</option>
                  <option value="decrease">{messages.decrease}</option>
                </select>
              </label>
            )}
            {(movementType === 'out' || movementType === 'transfer' || (movementType === 'adjustment' && adjustmentDirection === 'decrease'))
              && renderItemSelect('sourceInventoryItemId', messages.sourceItem)}
            {(movementType === 'in' || (movementType === 'adjustment' && adjustmentDirection === 'increase'))
              && renderItemSelect('destinationInventoryItemId', messages.destinationItem)}
            {movementType === 'transfer' && renderItemSelect('destinationInventoryItemId', messages.destinationItem)}
            <label className="grid gap-1 text-sm text-text">
              {messages.quantity}
              <input
                type="number"
                min="0.001"
                max="1000000"
                step="0.001"
                inputMode="decimal"
                className={fieldClassName}
                {...form.register('quantity', { valueAsNumber: true })}
              />
              {form.formState.errors.quantity?.message && <span className="text-xs text-danger">{form.formState.errors.quantity.message}</span>}
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.date}
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                className={fieldClassName}
                {...form.register('movementDate')}
              />
              {form.formState.errors.movementDate?.message && <span className="text-xs text-danger">{form.formState.errors.movementDate.message}</span>}
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.referenceDoc}
              <input maxLength={120} className={fieldClassName} {...form.register('referenceDoc')} />
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.recipientOrSupplier}
              <input maxLength={120} className={fieldClassName} {...form.register('recipientOrSupplier')} />
            </label>
            <label className="grid gap-1 text-sm text-text sm:col-span-2">
              {messages.notes}
              <textarea rows={3} maxLength={1000} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text" {...form.register('notes')} />
              {form.formState.errors.notes?.message && <span className="text-xs text-danger">{form.formState.errors.notes.message}</span>}
            </label>
            {form.formState.errors.root?.message && (
              <p role="alert" className="text-sm text-danger sm:col-span-2">{form.formState.errors.root.message}</p>
            )}
            <footer className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:col-span-2 sm:flex-row">
              <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm text-text">
                {messages.cancel}
              </button>
              <button type="submit" disabled={form.formState.isSubmitting} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
                {form.formState.isSubmitting ? messages.loading : messages.saveMovement}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
