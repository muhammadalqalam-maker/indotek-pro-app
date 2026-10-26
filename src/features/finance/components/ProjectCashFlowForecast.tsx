import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getMessages } from '../../../i18n';
import type { ClientInvoice, ProjectCashTransaction, ProjectPayable } from '../../../types/database';
import { formatDateIndo, formatRupiah } from '../../../utils/format';
import { buildCashFlowForecast } from '../utils/cashFlowForecast';

const messages = getMessages('id').finance;

type ProjectCashFlowForecastProps = {
  transactions: ProjectCashTransaction[];
  invoices: ClientInvoice[];
  payables: ProjectPayable[];
  hasProjects: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function ProjectCashFlowForecast({
  transactions,
  invoices,
  payables,
  hasProjects,
  isLoading,
  error,
  onRetry,
}: ProjectCashFlowForecastProps) {
  if (isLoading) {
    return (
      <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5" aria-busy="true">
        <div className="h-5 w-56 animate-pulse rounded bg-surface-2" />
        <div className="h-64 animate-pulse rounded-md bg-surface-2" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-danger/30 bg-surface p-4 sm:p-5">
        <h2 className="font-semibold text-text">{messages.cashFlowForecastTitle}</h2>
        <p className="mt-2 text-sm text-danger" role="alert">{error}</p>
        <button
          className="mt-3 min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2"
          onClick={onRetry}
          type="button"
        >
          {messages.retry}
        </button>
      </section>
    );
  }

  const forecast = buildCashFlowForecast(transactions, invoices, payables);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-text">{messages.cashFlowForecastTitle}</h2>
        <p className="text-sm text-muted-foreground">{messages.cashFlowForecastDescription}</p>
        <p className="text-xs text-muted-foreground">{messages.cashFlowForecastNote}</p>
      </header>

      {!hasProjects ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {messages.cashFlowNoProjects}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <p className="text-xs font-medium text-muted-foreground">{messages.scheduledInflow}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-success">{formatRupiah(forecast.scheduledInflow)}</p>
              <p className="text-xs text-muted-foreground">{messages.forecastPeriod}</p>
            </div>
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <p className="text-xs font-medium text-muted-foreground">{messages.scheduledOutflow}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-danger">{formatRupiah(forecast.scheduledOutflow)}</p>
              <p className="text-xs text-muted-foreground">{messages.forecastPeriod}</p>
            </div>
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <p className="text-xs font-medium text-muted-foreground">{messages.scheduledNet}</p>
              <p className={`mt-1 text-lg font-semibold tabular-nums ${forecast.scheduledNet >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatRupiah(forecast.scheduledNet)}
              </p>
              <p className="text-xs text-muted-foreground">{messages.forecastPeriod}</p>
            </div>
          </div>

          <div className="h-64 w-full min-w-0 sm:h-72" role="img" aria-label={messages.cashFlowChartAccessibleName}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast.months} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(value: string) => formatDateIndo(`${value}-01`)}
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  minTickGap={8}
                />
                <YAxis
                  tickFormatter={(value: number) => new Intl.NumberFormat('id-ID', {
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(value)}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  width={56}
                />
                <Tooltip
                  labelFormatter={(value) => formatDateIndo(`${String(value)}-01`)}
                  formatter={(value, name) => [formatRupiah(Number(value)), String(name)]}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border-strong)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--text)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actualNet"
                  name={messages.actualNetCashflow}
                  stroke="var(--primary-500)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="scheduledNet"
                  name={messages.scheduledNetCashflow}
                  stroke="var(--accent-500)"
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">{messages.cashFlowTableCaption}</caption>
              <thead className="bg-surface-2 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">{messages.period}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{messages.actualInflow}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{messages.actualOutflow}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{messages.scheduledInflow}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">{messages.scheduledOutflow}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {forecast.months.map((item) => (
                  <tr key={item.month}>
                    <th scope="row" className="whitespace-nowrap px-3 py-2 font-medium text-text">
                      {formatDateIndo(`${item.month}-01`)}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums text-text">{formatRupiah(item.actualInflow)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text">{formatRupiah(item.actualOutflow)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text">{formatRupiah(item.scheduledInflow)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text">{formatRupiah(item.scheduledOutflow)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
