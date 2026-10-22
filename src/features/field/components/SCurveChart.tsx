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
import { formatPersen, formatTanggal } from '../../../utils/format';
import type { SCurvePoint } from '../utils/sCurve.helpers';

const messages = getMessages().fieldReports.sCurve;

export function SCurveChart({ points }: { points: SCurvePoint[] }) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-text">{messages.chartTitle}</h2>
        <p className="text-sm text-muted">{messages.chartDescription}</p>
      </header>

      <div className="h-72 w-full min-w-0 sm:h-80" role="img" aria-label={messages.chartAccessibleName}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="week_number"
              tickFormatter={(value: number) => messages.shortWeek(value)}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              minTickGap={16}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value: number) => formatPersen(value, 0)}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              width={48}
            />
            <Tooltip
              labelFormatter={(value) => messages.weekLabel(Number(value))}
              formatter={(value, name) => [formatPersen(Number(value)), String(name)]}
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
              dataKey="planned_cumulative_percent"
              name={messages.planned}
              stroke="var(--primary-500)"
              strokeDasharray="5 4"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="actual_cumulative_percent"
              name={messages.actual}
              stroke="var(--accent-500)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">{messages.tableCaption}</caption>
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">{messages.weekColumn}</th>
              <th scope="col" className="px-3 py-2 font-semibold">{messages.periodColumn}</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">{messages.plannedWeeklyColumn}</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">{messages.plannedCumulativeColumn}</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">{messages.actualWeeklyColumn}</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">{messages.actualCumulativeColumn}</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">{messages.deviationColumn}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {points.map((point) => (
              <tr key={point.week_number}>
                <th scope="row" className="px-3 py-2 font-semibold text-text">
                  {messages.weekLabel(point.week_number)}
                </th>
                <td className="whitespace-nowrap px-3 py-2 text-muted">
                  {formatTanggal(point.start_date)} – {formatTanggal(point.end_date)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text">{formatPersen(point.planned_weekly_percent)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text">{formatPersen(point.planned_cumulative_percent)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text">{formatPersen(point.actual_weekly_percent)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text">{formatPersen(point.actual_cumulative_percent)}</td>
                <td className={`px-3 py-2 text-right tabular-nums font-medium ${point.deviation_percent >= 0 ? 'text-success' : 'text-danger'}`}>
                  {point.deviation_percent > 0 ? '+' : ''}{formatPersen(point.deviation_percent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
