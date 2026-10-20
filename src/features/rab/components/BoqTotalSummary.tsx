import { getMessages } from '../../../i18n';
import { formatRupiah } from '../../../utils/format';
import type { BoqDraftTotals } from '../boqCalculations';

type BoqMessages = ReturnType<typeof getMessages>['rab'];

type BoqTotalSummaryProps = {
  totals: BoqDraftTotals;
  messages: BoqMessages;
  className?: string;
  live?: boolean;
};

export function BoqTotalSummary({ totals, messages, className, live = false }: BoqTotalSummaryProps) {
  return (
    <section
      className={`grid gap-2 rounded-xl border border-border bg-surface p-4 sm:ml-auto sm:w-full sm:max-w-xl sm:p-6 ${className ?? ''}`}
      aria-live={live ? 'polite' : undefined}
    >
      <TotalLine label={messages.boqDirectCost} amount={totals.directCost} />
      <TotalLine label={messages.boqOverheadAmount} amount={totals.overheadAmount} />
      <TotalLine label={messages.boqProfitAmount} amount={totals.profitAmount} />
      <TotalLine label={messages.boqBeforeTax} amount={totals.beforeTax} emphasize />
      <TotalLine label={messages.boqPpnAmount} amount={totals.ppnAmount} />
      <TotalLine label={messages.boqGrandTotal} amount={totals.grandTotal} emphasize strong />
    </section>
  );
}

function TotalLine({
  label,
  amount,
  emphasize = false,
  strong = false,
}: {
  label: string;
  amount: number;
  emphasize?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={`flex flex-wrap justify-between gap-x-4 gap-y-1 border-border ${emphasize ? 'border-t pt-2 font-semibold' : ''} ${strong ? 'text-base text-primary-700 dark:text-primary-300' : 'text-sm text-text'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{formatRupiah(amount, true, 2)}</span>
    </div>
  );
}
