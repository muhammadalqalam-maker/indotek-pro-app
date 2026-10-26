import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { Vendor } from '../../../types/database';
import { vendorQuoteSchema } from '../schemas/procurement.schema';
import { createVendorQuote } from '../services/procurement.service';
import type { ProcurementPurchaseRequest } from '../types';

const messages = getMessages().procurementWorkflow;
type FormValues = {
  vendorId: string;
  quoteDate: string;
  validUntil: string;
  ppnPercent: number;
  notes: string;
  items: Array<{ purchaseRequestItemId: string; unitPrice: number }>;
};

export function VendorQuoteDialog({
  organizationId,
  request,
  vendors,
  onClose,
  onCreated,
}: {
  organizationId: string;
  request: ProcurementPurchaseRequest;
  vendors: Vendor[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const form = useForm<FormValues>({
    defaultValues: {
      vendorId: '',
      quoteDate: new Date().toISOString().slice(0, 10),
      validUntil: '',
      ppnPercent: 11,
      notes: '',
      items: request.items.map((item) => ({
        purchaseRequestItemId: item.id,
        unitPrice: item.estimated_price,
      })),
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const parsed = vendorQuoteSchema.safeParse({
      ...values,
      validUntil: values.validUntil || null,
      items: values.items.map((item) => ({
        purchaseRequestItemId: item.purchaseRequestItemId,
        unitPrice: item.unitPrice,
      })),
    });
    if (!parsed.success) {
      form.setError('root', { message: parsed.error.issues[0]?.message ?? messages.quoteFailed });
      return;
    }

    try {
      await createVendorQuote({
        organizationId,
        purchaseRequestId: request.id,
        vendorId: parsed.data.vendorId,
        quoteDate: parsed.data.quoteDate,
        validUntil: parsed.data.validUntil,
        ppnPercent: parsed.data.ppnPercent,
        notes: parsed.data.notes,
        items: parsed.data.items.map((item, index) => ({
          purchase_request_item_id: item.purchaseRequestItemId,
          quantity: request.items[index].quantity,
          unit_price: item.unitPrice,
        })),
      });
      await onCreated();
      onClose();
    } catch (error) {
      form.setError('root', { message: error instanceof Error ? error.message : messages.quoteFailed });
    }
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="vendor-quote-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="vendor-quote-title" className="text-lg font-semibold text-text">{messages.quoteTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{request.pr_number} · {request.project_name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-surface-2" aria-label={messages.close}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-text">
              {messages.vendor}
              <select className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('vendorId')}>
                <option value="">{messages.chooseVendor}</option>
                {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.quoteDate}
              <input type="date" className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('quoteDate')} />
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.validUntil}
              <input type="date" className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('validUntil')} />
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.taxPercent}
              <input type="number" min="0" max="100" step="0.01" className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('ppnPercent', { valueAsNumber: true })} />
            </label>
          </div>

          <fieldset className="grid gap-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-sm font-semibold text-text">{messages.items}</legend>
            {request.items.map((item, index) => (
              <div key={item.id} className="grid items-center gap-2 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_10rem]">
                <p className="text-sm text-text">
                  {item.item_name} · {item.quantity} {item.unit}
                  {item.specification && <span className="block text-xs text-muted-foreground">{item.specification}</span>}
                </p>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  {messages.estimatedPrice}
                  <input type="number" min="0" step="0.01" className="min-h-11 rounded-md border border-border bg-surface px-3 text-sm text-text" {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })} />
                </label>
              </div>
            ))}
          </fieldset>

          <label className="grid gap-1 text-sm text-text">
            {messages.notes}
            <textarea rows={3} maxLength={2000} className="rounded-md border border-border bg-surface px-3 py-2" {...form.register('notes')} />
          </label>
          {form.formState.errors.root?.message && <p role="alert" className="text-sm text-danger">{form.formState.errors.root.message}</p>}
          <footer className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:flex-row">
            <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm text-text">{messages.cancel}</button>
            <button type="submit" disabled={form.formState.isSubmitting || vendors.length === 0} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
              {form.formState.isSubmitting ? messages.submitting : messages.saveQuote}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
