import { AlertTriangle, Clock, CreditCard, Plus, CheckCircle2 } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { ProjectPayable } from '../../../types/database';
import { formatDateIndo, formatRupiah } from '../../../utils/format';
import { AgingSummary } from './AgingSummary';
import { calculateAgingTotals } from '../utils/payableAging';

const messages = getMessages('id').finance;

type PayablesPanelProps = {
  payables: ProjectPayable[];
  agingPayables: ProjectPayable[];
  isLoading: boolean;
  error: string;
  canPay: boolean;
  onAdd: () => void;
  onPay: (payable: ProjectPayable) => void;
  onReload: () => void;
};

export function PayablesPanel({
  payables,
  agingPayables,
  isLoading,
  error,
  canPay,
  onAdd,
  onPay,
  onReload,
}: PayablesPanelProps) {
  const aging = calculateAgingTotals(agingPayables.map((payable) => ({
    amount: payable.amount,
    paidAmount: payable.paid_amount,
    dueDate: payable.due_date,
    status: payable.status,
  })), new Date().toISOString().slice(0, 10));

  const renderState = () => {
    if (isLoading) return <p aria-live="polite" className="py-8 text-center text-sm text-muted">{messages.loadingPayables}</p>;
    if (error) {
      return (
        <div className="rounded-lg border border-border bg-surface p-6 text-center">
          <p className="text-sm text-danger" role="alert">{error}</p>
          <button className="mt-3 min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={onReload} type="button">
            {messages.retry}
          </button>
        </div>
      );
    }
    if (payables.length === 0) return <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted">{messages.noPayables}</p>;

    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {payables.map((payable) => {
          const remaining = payable.amount - payable.paid_amount;
          const isPaid = payable.status === 'paid';
          return (
            <article className="space-y-3 rounded-xl border border-border bg-surface p-4" key={payable.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary-600">{payable.payable_number} · {payable.supplier_invoice_number}</p>
                  <h3 className="mt-1 break-words text-sm font-semibold text-text">{payable.counterparty_name}</h3>
                  <p className="text-xs text-muted">{payable.project_name} · {payable.counterparty_type === 'vendor' ? messages.vendor : messages.subcontractor}</p>
                </div>
                <span className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${
                  isPaid ? 'bg-success-bg text-success' : payable.status === 'overdue' ? 'bg-danger-bg text-danger' : payable.status === 'partially_paid' ? 'bg-warning-bg text-warning' : 'bg-info-bg text-info'
                }`}>
                  {isPaid ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : payable.status === 'overdue' ? <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" /> : <Clock aria-hidden="true" className="h-3.5 w-3.5" />}
                  {isPaid ? messages.payableStatusPaid : payable.status === 'overdue' ? messages.payableStatusOverdue : payable.status === 'partially_paid' ? messages.payableStatusPartial : messages.payableStatusSent}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-xs">
                <div>
                  <dt className="text-muted">{messages.invoiceDate}</dt>
                  <dd className="mt-0.5 font-medium text-text">{formatDateIndo(payable.invoice_date)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{messages.dueDate}</dt>
                  <dd className="mt-0.5 font-medium text-text">{formatDateIndo(payable.due_date)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{messages.amountPayable}</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-text">{formatRupiah(payable.amount)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{messages.paidPayable}</dt>
                  <dd className="mt-0.5 font-medium tabular-nums text-text">{formatRupiah(payable.paid_amount)}</dd>
                </div>
                <div className="col-span-2 flex items-center justify-between border-t border-border pt-2">
                  <dt className="font-medium text-muted">{messages.outstandingPayable}</dt>
                  <dd className="font-semibold tabular-nums text-text">{formatRupiah(remaining)}</dd>
                </div>
              </dl>
              {payable.notes && <p className="break-words rounded-md bg-surface-2 p-2 text-xs text-muted">{payable.notes}</p>}
              {canPay && !isPaid && (
                <div className="border-t border-border pt-3">
                  <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary-700 px-3 text-sm font-semibold text-white hover:bg-primary-600" onClick={() => onPay(payable)} type="button">
                    <CreditCard aria-hidden="true" className="h-4 w-4" />
                    {messages.payPayable}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <AgingSummary title={messages.agingTitlePayable} totals={aging} />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text">{messages.payablesTab}</h2>
        <button className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-primary-700 px-3 text-sm font-semibold text-white hover:bg-primary-600" onClick={onAdd} type="button">
          <Plus aria-hidden="true" className="h-4 w-4" />
          {messages.addPayable}
        </button>
      </div>
      {renderState()}
    </div>
  );
}
