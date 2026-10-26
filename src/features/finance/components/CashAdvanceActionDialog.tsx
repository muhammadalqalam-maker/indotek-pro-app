import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { KasbonReimbursement } from '../../../types/database';
import type { CashAdvanceActionFormValues } from '../schemas/cashbook.schema';
import { cashAdvanceActionSchema } from '../schemas/cashbook.schema';
import { formatRupiah } from '../../../utils/format';

const messages = getMessages('id').finance;

type Action = CashAdvanceActionFormValues['action'];

type CashAdvanceActionDialogProps = {
  request: KasbonReimbursement;
  action: Action;
  onClose: () => void;
  onSubmit: (values: CashAdvanceActionFormValues) => Promise<void>;
};

const titles: Record<Action, string> = {
  approve: messages.approveTitle,
  reject: messages.rejectTitle,
  payout: messages.payoutTitle,
  settle: messages.settleTitle,
};

export function CashAdvanceActionDialog({ request, action, onClose, onSubmit }: CashAdvanceActionDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const paidAmount = request.paid_amount ?? request.amount;
  const { register, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } =
    useForm<CashAdvanceActionFormValues>({
      defaultValues: {
        action,
        comment: '',
        paymentMethod: request.payment_method ?? 'Transfer Bank',
        reference: '',
        settledAmount: String(paidAmount),
        notes: '',
      },
    });

  const submit = handleSubmit(async (values) => {
    setSubmitError('');
    clearErrors();
    const result = cashAdvanceActionSchema.safeParse(values);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const field = firstIssue?.path[0];
      if (field === 'comment' || field === 'paymentMethod' || field === 'reference' || field === 'settledAmount' || field === 'notes') {
        setError(field, { message: firstIssue.message });
      }
      return;
    }
    if (result.data.action === 'settle' && Number(result.data.settledAmount) > paidAmount) {
      setError('settledAmount', { message: messages.validation.settlementAmount });
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
      <section aria-labelledby="cash-advance-action-title" aria-modal="true" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-lg" role="dialog">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold text-text" id="cash-advance-action-title">{titles[action]}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{request.ticket_number} · {formatRupiah(request.amount)}</p>
          </div>
          <button aria-label={messages.close} className="min-h-11 min-w-11 rounded-md text-muted-foreground hover:bg-surface-2" onClick={onClose} type="button">
            <X aria-hidden="true" className="mx-auto h-5 w-5" />
          </button>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          {action === 'approve' && (
            <label className="block space-y-1 text-sm text-text">
              <span>{messages.decisionNotes}</span>
              <textarea className="min-h-24 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base" maxLength={2000} {...register('comment')} />
              {errors.comment && <span className="text-xs text-danger">{errors.comment.message}</span>}
            </label>
          )}
          {action === 'reject' && (
            <label className="block space-y-1 text-sm text-text">
              <span>{messages.rejectionReason}</span>
              <textarea className="min-h-24 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base" maxLength={2000} {...register('comment')} />
              {errors.comment && <span className="text-xs text-danger">{errors.comment.message}</span>}
            </label>
          )}
          {action === 'payout' && (
            <>
              <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-muted-foreground">{messages.payoutHint}</p>
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
            </>
          )}
          {action === 'settle' && (
            <>
              <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-muted-foreground">{messages.settledHint}</p>
              <label className="block space-y-1 text-sm text-text">
                <span>{messages.settlementAmount}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" inputMode="decimal" {...register('settledAmount')} />
                <span className="block text-xs text-muted-foreground">{messages.settlementAmountHint(formatRupiah(paidAmount))}</span>
                {errors.settledAmount && <span className="text-xs text-danger">{errors.settledAmount.message}</span>}
              </label>
              <label className="block space-y-1 text-sm text-text">
                <span>{messages.settlementNotes}</span>
                <textarea className="min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base" maxLength={2000} {...register('notes')} />
                {errors.notes && <span className="text-xs text-danger">{errors.notes.message}</span>}
              </label>
            </>
          )}
          {submitError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{submitError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <button className="min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={onClose} type="button">{messages.cancel}</button>
            <button className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? messages.saving : titles[action]}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
