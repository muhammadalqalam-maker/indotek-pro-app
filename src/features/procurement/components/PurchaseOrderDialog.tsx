import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { formatRupiah } from '../../../utils/format';
import { purchaseOrderFromQuoteSchema } from '../schemas/procurement.schema';
import { createPurchaseOrderFromQuote } from '../services/procurement.service';
import type { ProcurementPurchaseRequest, VendorQuote } from '../types';

const messages = getMessages().procurementWorkflow;
type FormValues = {
  quoteId: string;
  deliveryDeadline: string;
  deliveryAddress: string;
};

export function PurchaseOrderDialog({
  organizationId,
  request,
  quotes,
  onClose,
  onCreated,
}: {
  organizationId: string;
  request: ProcurementPurchaseRequest;
  quotes: VendorQuote[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const form = useForm<FormValues>({
    defaultValues: {
      quoteId: '',
      deliveryDeadline: '',
      deliveryAddress: '',
    },
  });
  const selectedQuote = quotes.find((quote) => quote.id === form.watch('quoteId'));
  const submit = form.handleSubmit(async (values) => {
    const parsed = purchaseOrderFromQuoteSchema.safeParse(values);
    if (!parsed.success) {
      form.setError('root', { message: parsed.error.issues[0]?.message ?? messages.orderFailed });
      return;
    }
    try {
      await createPurchaseOrderFromQuote(
        organizationId,
        request.id,
        parsed.data.quoteId,
        parsed.data.deliveryDeadline,
        parsed.data.deliveryAddress,
      );
      await onCreated();
      onClose();
    } catch (error) {
      form.setError('root', { message: error instanceof Error ? error.message : messages.orderFailed });
    }
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="purchase-order-title" className="w-full max-w-xl rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="purchase-order-title" className="text-lg font-semibold text-text">{messages.createOrder}</h2>
            <p className="mt-1 text-sm text-muted">{request.pr_number} · {request.project_name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted hover:bg-surface-2" aria-label={messages.close}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <label className="grid gap-1 text-sm text-text">
            {messages.chooseQuote}
            <select className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('quoteId')}>
              <option value="">{messages.chooseQuote}</option>
              {quotes.map((quote) => (
                <option key={quote.id} value={quote.id}>
                  {quote.vendor_name} — {formatRupiah(quote.grand_total)} ({quote.quote_number})
                </option>
              ))}
            </select>
          </label>
          {selectedQuote && (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-3 text-sm">
              <span className="text-muted">Subtotal</span><strong className="text-right text-text">{formatRupiah(selectedQuote.subtotal)}</strong>
              <span className="text-muted">PPN {selectedQuote.ppn_percent}%</span><strong className="text-right text-text">{formatRupiah(selectedQuote.ppn_amount)}</strong>
              <span className="font-semibold text-text">{messages.comparison}</span><strong className="text-right text-primary-700">{formatRupiah(selectedQuote.grand_total)}</strong>
            </div>
          )}
          <label className="grid gap-1 text-sm text-text">
            {messages.deliveryDeadline}
            <input type="date" min={new Date().toISOString().slice(0, 10)} className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('deliveryDeadline')} />
          </label>
          <label className="grid gap-1 text-sm text-text">
            {messages.deliveryAddress}
            <textarea rows={3} maxLength={500} className="rounded-md border border-border bg-surface px-3 py-2" {...form.register('deliveryAddress')} />
          </label>
          {form.formState.errors.root?.message && <p role="alert" className="text-sm text-danger">{form.formState.errors.root.message}</p>}
          <footer className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:flex-row">
            <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm text-text">{messages.cancel}</button>
            <button type="submit" disabled={form.formState.isSubmitting || quotes.length < 2} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-50">
              {form.formState.isSubmitting ? messages.submitting : messages.createOrder}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
