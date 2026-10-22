import type { AgingTotals } from '../utils/payableAging';
import { formatRupiah } from '../../../utils/format';
import { getMessages } from '../../../i18n';

const messages = getMessages('id').finance;

type AgingSummaryProps = {
  title: string;
  totals: AgingTotals;
};

const buckets = [
  ['not_due', 'agingNotDue'],
  ['1_30', 'aging1To30'],
  ['31_60', 'aging31To60'],
  ['61_90', 'aging61To90'],
  ['over_90', 'agingOver90'],
] as const;

export function AgingSummary({ title, totals }: AgingSummaryProps) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {buckets.map(([bucket, label]) => (
          <div className="rounded-lg border border-border bg-surface p-3" key={bucket}>
            <p className="min-h-8 text-xs font-medium text-muted">{messages[label]}</p>
            <p className="mt-1 break-words text-sm font-semibold tabular-nums text-text">{formatRupiah(totals[bucket])}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
