import { Card, CardContent, DatePicker, Select } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import type { DashboardPeriod } from '../dashboardMetrics';

const messages = getMessages('id').dashboard;
const dashboardPeriods = ['all', 'this_year', 'last_year', 'custom'] as const satisfies readonly DashboardPeriod[];

function isDashboardPeriod(value: string): value is DashboardPeriod {
  return dashboardPeriods.some((periodValue) => periodValue === value);
}

export function DashboardFilters({
  period,
  startDate,
  endDate,
  rangeError,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
}: {
  period: DashboardPeriod;
  startDate: string;
  endDate: string;
  rangeError: boolean;
  onPeriodChange: (period: DashboardPeriod) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 sm:pt-5 lg:grid-cols-[minmax(12rem,1fr)_repeat(2,minmax(10rem,0.7fr))]">
        <Select
          name="dashboard-period"
          label={messages.period}
          value={period}
          onChange={(event) => {
            const selectedPeriod = event.target.value;
            if (isDashboardPeriod(selectedPeriod)) onPeriodChange(selectedPeriod);
          }}
          hint={messages.periodHint}
        >
          <option value="this_year">{messages.thisYear}</option>
          <option value="last_year">{messages.lastYear}</option>
          <option value="all">{messages.allPeriods}</option>
          <option value="custom">{messages.customPeriod}</option>
        </Select>
        {period === 'custom' && (
          <>
            <DatePicker
              label={messages.startDate}
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              error={rangeError ? messages.invalidRange : undefined}
            />
            <DatePicker
              label={messages.endDate}
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
              error={rangeError ? messages.invalidRange : undefined}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
