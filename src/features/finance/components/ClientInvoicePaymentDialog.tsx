import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { ClientInvoice } from '../../../types/database';
import { formatRupiah } from '../../../utils/format';
import { clientInvoicePaymentSchema, ClientInvoicePaymentValues } from '../schemas/client-invoice-payment.schema';

type ClientInvoicePaymentDialogProps = {
  invoice: ClientInvoice;
  onClose: () => void;
  onSubmit: (amount: number, reference: string) => Promise<void>;
};

export function ClientInvoicePaymentDialog({ invoice, onClose, onSubmit }: ClientInvoicePaymentDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const remaining = invoice.net_receivable - (invoice.paid_amount ?? 0);
  const { register, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<ClientInvoicePaymentValues>({
    defaultValues: { amount: remaining, reference: '' },
  });

  const submit = handleSubmit(async (values) => {
    setSubmitError('');
    clearErrors();
    const result = clientInvoicePaymentSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === 'amount' || field === 'reference') setError(field, { message: issue.message });
      }
      return;
    }
    if (result.data.amount > remaining) {
      setError('amount', { message: `Pembayaran tidak boleh melebihi sisa ${formatRupiah(remaining)}.` });
      return;
    }
    try {
      await onSubmit(result.data.amount, result.data.reference);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Pembayaran gagal dicatat.');
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section aria-labelledby="invoice-payment-title" aria-modal="true" className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-5 shadow-lg" role="dialog">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold text-text" id="invoice-payment-title">Catat pembayaran invoice</h2>
            <p className="mt-1 text-sm text-muted">{invoice.invoice_number} · Sisa {formatRupiah(remaining)}</p>
          </div>
          <button aria-label="Tutup dialog" className="min-h-11 min-w-11 rounded-md text-muted hover:bg-surface-2" onClick={onClose} type="button">
            <X aria-hidden="true" className="mx-auto h-5 w-5" />
          </button>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1 text-sm text-text">
            <span>Jumlah diterima (Rp)</span>
            <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" min="1" max={remaining} step="1" type="number" {...register('amount', { valueAsNumber: true })} />
            {errors.amount && <span className="text-xs text-danger">{errors.amount.message}</span>}
          </label>
          <label className="block space-y-1 text-sm text-text">
            <span>Referensi pembayaran</span>
            <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" maxLength={180} {...register('reference')} />
            {errors.reference && <span className="text-xs text-danger">{errors.reference.message}</span>}
          </label>
          {submitError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{submitError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <button className="min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={onClose} type="button">Batal</button>
            <button className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Menyimpan…' : 'Simpan pembayaran'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
