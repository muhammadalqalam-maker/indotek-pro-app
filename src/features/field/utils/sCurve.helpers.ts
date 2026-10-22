export type SCurveBoqItem = {
  id: string;
  volume: number | null;
  line_total: number | null;
};

export type SCurveReport = {
  id: string;
  report_date: string;
};

export type SCurveProgressEntry = {
  boq_item_id: string;
  report_id: string;
  installed_volume: number;
};

export type SCurvePoint = {
  week_number: number;
  start_date: string;
  end_date: string;
  planned_weekly_percent: number;
  planned_cumulative_percent: number;
  actual_weekly_percent: number;
  actual_cumulative_percent: number;
  deviation_percent: number;
};

export type SCurveResult = {
  points: SCurvePoint[];
  budget: number;
  earnedValue: number;
  latestReportDate: string | null;
};

const dayMilliseconds = 24 * 60 * 60 * 1000;
const weekMilliseconds = 7 * dayMilliseconds;

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Tanggal Kurva S tidak valid: ${value}`);
  }
  return date;
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function plannedPercent(date: Date, start: Date, finish: Date): number {
  const duration = finish.getTime() - start.getTime();
  if (duration <= 0) return 100;

  const progress = Math.max(0, Math.min(1, (date.getTime() - start.getTime()) / duration));
  const logistic = (value: number) => 1 / (1 + Math.exp(-10 * (value - 0.5)));
  const low = logistic(0);
  const high = logistic(1);
  return ((logistic(progress) - low) / (high - low)) * 100;
}

export function calculateSCurve(
  projectStartDate: string,
  projectEndDate: string,
  items: SCurveBoqItem[],
  reports: SCurveReport[],
  entries: SCurveProgressEntry[],
): SCurveResult {
  const start = parseDate(projectStartDate);
  const finish = parseDate(projectEndDate);
  if (finish < start) throw new Error('Tanggal selesai proyek harus setelah tanggal mulai.');

  const itemById = new Map(items.map((item) => [item.id, item]));
  const reportById = new Map(reports.map((report) => [report.id, report]));
  const approvedValueByDate = new Map<string, number>();
  let budget = 0;

  for (const item of items) {
    const volume = item.volume ?? 0;
    const lineTotal = item.line_total ?? 0;
    if (volume > 0 && lineTotal > 0) budget += lineTotal;
  }

  if (budget <= 0) {
    return { points: [], budget: 0, earnedValue: 0, latestReportDate: null };
  }

  for (const entry of entries) {
    const report = reportById.get(entry.report_id);
    const item = itemById.get(entry.boq_item_id);
    if (!report || !item || !Number.isFinite(entry.installed_volume) || entry.installed_volume <= 0) continue;

    const volume = item.volume ?? 0;
    const lineTotal = item.line_total ?? 0;
    if (volume <= 0 || lineTotal <= 0) continue;

    const earned = (lineTotal / volume) * entry.installed_volume;
    approvedValueByDate.set(
      report.report_date,
      (approvedValueByDate.get(report.report_date) ?? 0) + earned,
    );
  }

  const reportDates = [...approvedValueByDate.keys()]
    .filter((reportDate) => reportDate >= projectStartDate)
    .sort();
  const latestReportDate = reportDates.at(-1) ?? null;
  const curveEnd = latestReportDate && latestReportDate > projectEndDate
    ? parseDate(latestReportDate)
    : finish;
  const points: SCurvePoint[] = [];
  let cumulativeActual = 0;
  let cumulativePlanned = 0;
  const sortedActualDates = [...approvedValueByDate.keys()].sort();
  let nextActualDateIndex = 0;
  let weekStart = start;
  let weekNumber = 1;

  while (weekStart <= curveEnd) {
    const weekEnd = new Date(Math.min(weekStart.getTime() + weekMilliseconds - dayMilliseconds, curveEnd.getTime()));
    const planThrough = weekEnd > finish ? finish : weekEnd;
    const plannedCumulative = plannedPercent(planThrough, start, finish);
    const plannedWeekly = plannedCumulative - cumulativePlanned;

    while (
      nextActualDateIndex < sortedActualDates.length
      && sortedActualDates[nextActualDateIndex] <= dateString(weekEnd)
    ) {
      cumulativeActual += approvedValueByDate.get(sortedActualDates[nextActualDateIndex]) ?? 0;
      nextActualDateIndex += 1;
    }

    const actualCumulativePercent = (cumulativeActual / budget) * 100;
    const previousActualPercent = points.at(-1)?.actual_cumulative_percent ?? 0;
    points.push({
      week_number: weekNumber,
      start_date: dateString(weekStart),
      end_date: dateString(weekEnd),
      planned_weekly_percent: plannedWeekly,
      planned_cumulative_percent: plannedCumulative,
      actual_weekly_percent: actualCumulativePercent - previousActualPercent,
      actual_cumulative_percent: actualCumulativePercent,
      deviation_percent: actualCumulativePercent - plannedCumulative,
    });

    cumulativePlanned = plannedCumulative;
    weekStart = new Date(weekStart.getTime() + weekMilliseconds);
    weekNumber += 1;
  }

  return {
    points,
    budget,
    earnedValue: cumulativeActual,
    latestReportDate,
  };
}
