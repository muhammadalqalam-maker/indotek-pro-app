import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { formatVolume } from '../../../utils/format';
import type { WarehouseInventoryItem } from '../types';
import {
  minimumStockSchema,
  type MinimumStockFormValues,
} from '../schemas/warehouse.schema';

const messages = getMessages().warehouse;

export function MinimumStockDialog({
  item,
  onClose,
  onSave,
}: {
  item: WarehouseInventoryItem;
  onClose: () => void;
  onSave: (values: MinimumStockFormValues) => Promise<void>;
}) {
  const form = useForm<MinimumStockFormValues>({
    defaultValues: { minimumStock: item.minimum_stock },
  });

  const submit = form.handleSubmit(async (values) => {
    const parsed = minimumStockSchema.safeParse(values);
    if (!parsed.success) {
      form.setError('root', { message: parsed.error.issues[0]?.message ?? messages.minimumFailed });
      return;
    }
    try {
      await onSave(parsed.data);
      onClose();
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : messages.minimumFailed,
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="warehouse-minimum-title"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6"
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="warehouse-minimum-title" className="text-lg font-semibold text-text">{messages.minimumFormTitle}</h2>
            <p className="mt-1 text-sm text-muted">{item.item_code} · {item.item_name}</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 rounded-md p-2 text-muted hover:bg-surface-2" aria-label={messages.close}>
            <X className="mx-auto h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <p className="mb-4 text-sm text-muted">
          {messages.currentStock}: {formatVolume(item.current_stock)} {item.unit}
        </p>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <label className="grid gap-1 text-sm text-text">
            {messages.minimumStock}
            <input
              type="number"
              min="0"
              max="1000000"
              step="0.001"
              inputMode="decimal"
              className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text"
              {...form.register('minimumStock', { valueAsNumber: true })}
            />
            {form.formState.errors.minimumStock?.message && <span className="text-xs text-danger">{form.formState.errors.minimumStock.message}</span>}
          </label>
          {form.formState.errors.root?.message && <p role="alert" className="text-sm text-danger">{form.formState.errors.root.message}</p>}
          <footer className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:flex-row">
            <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm text-text">
              {messages.cancel}
            </button>
            <button type="submit" disabled={form.formState.isSubmitting} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
              {form.formState.isSubmitting ? messages.loading : messages.saveMinimum}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
