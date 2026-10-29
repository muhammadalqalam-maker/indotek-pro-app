import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { ProjectPayable } from '../../../types/database';
import { formatRupiah } from '../../../utils/format';
import { projectPayablePaymentSchema, type ProjectPayablePaymentValues } from '../schemas/payable.schema';

const messages = getMessages('id').finance;
const today = new Date().toISOString().slice(0, 10);

type ProjectPayablePaymentDialogProps = {
  payable: ProjectPayable;
  onClose: () => void;
  onSubmit: (values: ProjectPayablePaymentValues) => Promise<void>;
};

export function ProjectPayablePaymentDialog({ payable, onClose, onSubmit }: ProjectPayablePaymentDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const remaining = payable.amount - payable.paid_amount;
  const { register, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } =
    useForm<ProjectPayablePaymentValues>({
      defaultValues: { amount: String(remaining), paymentDate: today, paymentMethod: 'Transfer Bank', reference: '' },
    });

  const submit = handleSubmit(async (values) => {
    setSubmitError('');
    clearErrors();
    const result = projectPayablePaymentSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (field === 'amount' || field === 'paymentDate' || field === 'paymentMethod' || field === 'reference') {
          setError(field, { message: issue.message });
        }
      }
      return;
    }
    if (Number(result.data.amount) > remaining) {
      setError('amount', { message: `Pembayaran tidak boleh melebihi sisa ${formatRupiah(remaining)}.` });
      return;
    }
    try {
      await onSubmit(result.data);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : messages.actionError);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section aria-labelledby="project-payable-payment-title" aria-modal="true" className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-5 shadow-lg" role="dialog">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold text-text" id="project-payable-payment-title">{messages.payablePaymentTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{messages.payablePaymentHint(payable.payable_number, formatRupiah(remaining))}</p>
          </div>
          <button aria-label={messages.close} className="min-h-11 min-w-11 rounded-md text-muted-foreground hover:bg-surface-2" onClick={onClose} type="button">
            <X aria-hidden="true" className="mx-auto h-5 w-5" />
          </button>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-1 text-sm text-text">
            <span>{messages.payablePaymentAmount}</span>
            <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" inputMode="decimal" {...register('amount')} />
            {errors.amount && <span className="text-xs text-danger">{errors.amount.message}</span>}
          </label>
          <label className="block space-y-1 text-sm text-text">
            <span>{messages.date}</span>
            <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" type="date" {...register('paymentDate')} />
            {errors.paymentDate && <span className="text-xs text-danger">{errors.paymentDate.message}</span>}
          </label>
          <label className="block space-y-1 text-sm text-text">
            <span>{messages.paymentMethod}</span>
            <select className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" {...register('paymentMethod')}>
              <option value="Transfer Bank">{messages.paymentMethods.bankTransfer}</option>
              <option value="Kas Tunai">{messages.paymentMethods.cash}</option>
              <option value="Giro / Cek">{messages.paymentMethods.cheque}</option>
              <option value="Lainnya">{messages.paymentMethods.other}</option>
            </select>
            {errors.paymentMethod && <span className="text-xs text-danger">{errors.paymentMethod.message}</span>}
          </label>
          <label className="block space-y-1 text-sm text-text">
            <span>{messages.reference}</span>
            <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" maxLength={180} {...register('reference')} />
            {errors.reference && <span className="text-xs text-danger">{errors.reference.message}</span>}
          </label>
          <p className="rounded-md border border-info/30 bg-info-bg p-3 text-sm text-info">{messages.payablePaymentLedgerNotice}</p>
          {submitError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{submitError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <button className="min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={onClose} type="button">{messages.cancel}</button>
            <button className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? messages.saving : messages.payPayable}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
