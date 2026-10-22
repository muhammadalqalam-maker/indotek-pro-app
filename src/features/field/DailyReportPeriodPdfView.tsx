import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Download, FileText, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useCan } from '../../hooks/useCan';
import { getMessages } from '../../i18n';
import { formatTanggal, formatVolume } from '../../utils/format';
import { useFieldNetworkStatus } from './hooks/useFieldNetworkStatus';
import { fetchDailyReportPeriod } from './services/dailyReport.service';
import { getCurrentDateOnly, getReportPeriodRange, type ReportPeriodType } from './utils/reportPeriod.helpers';
import type { Project } from '../../types/database';

const messages = getMessages().fieldReports;
const periodMessages = messages.periodPdf;

type DailyReportPeriodPdfViewProps = {
  project: Project;
};

export function DailyReportPeriodPdfView({ project }: DailyReportPeriodPdfViewProps) {
  const { currentOrg, isSupabaseLive } = useApp();
  const organizationId = currentOrg?.id ?? '';
  const [period, setPeriod] = useState<ReportPeriodType>('weekly');
  const [selectedDate, setSelectedDate] = useState(getCurrentDateOnly);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const isOnline = useFieldNetworkStatus();
  const canView = useCan('field_reports', 'view');
  const range = useMemo(
    () => getReportPeriodRange(period, selectedDate),
    [period, selectedDate],
  );
  const reportsQuery = useQuery({
    queryKey: [
      'daily-report-period',
      organizationId,
      project.id,
      period,
      range.startDate,
      range.endDate,
    ],
    queryFn: () => fetchDailyReportPeriod(
      organizationId,
      project.id,
      range.startDate,
      range.endDate,
    ),
    enabled: Boolean(isSupabaseLive && canView && isOnline && organizationId && project.id),
  });
  const reports = reportsQuery.data ?? [];
  const workforceCount = reports.reduce(
    (total, entry) => total + entry.manpower.reduce((dailyTotal, item) => dailyTotal + item.headcount, 0),
    0,
  );
  const equipmentCount = reports.reduce((total, entry) => total + entry.equipment.length, 0);
  const materialCount = reports.reduce((total, entry) => total + entry.materials.length, 0);

  async function handleDownload() {
    if (!reports.length) return;
    setIsDownloading(true);
    setDownloadError(false);
    try {
      const { downloadDailyReportPdf } = await import('./utils/dailyReportPdf');
      downloadDailyReportPdf({
        projectCode: project.code,
        projectName: project.name,
        startDate: range.startDate,
        endDate: range.endDate,
        reports,
        labels: periodMessages,
      });
    } catch {
      setDownloadError(true);
    } finally {
      setIsDownloading(false);
    }
  }

  if (!canView) {
    return (
      <div role="alert" className="rounded-lg border border-danger/30 bg-danger-bg p-4 text-sm text-danger">
        {messages.accessDenied}
      </div>
    );
  }

  if (!isSupabaseLive) {
    return (
      <div role="alert" className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        {periodMessages.liveDataRequired}
      </div>
    );
  }

  const dateInputValue = period === 'monthly' ? selectedDate.slice(0, 7) : selectedDate;

  return (
    <section className="space-y-5" aria-labelledby="period-pdf-title">
      <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 id="period-pdf-title" className="text-lg font-semibold text-text">
              {periodMessages.title}
            </h2>
            <p className="text-sm text-muted">{periodMessages.description}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={!reports.length || reportsQuery.isPending || isDownloading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {isDownloading ? periodMessages.generating : periodMessages.download}
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-text">{periodMessages.periodType}</legend>
            <div className="flex min-h-11 rounded-md border border-border bg-background p-1">
              {(['weekly', 'monthly'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={period === value}
                  onClick={() => setPeriod(value)}
                  className={`min-h-9 flex-1 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${period === value ? 'bg-primary-600 text-white' : 'text-muted hover:text-text'}`}
                >
                  {value === 'weekly' ? periodMessages.weekly : periodMessages.monthly}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="space-y-2 text-sm font-medium text-text">
            <span>{period === 'weekly' ? periodMessages.anchorDate : periodMessages.month}</span>
            <input
              type={period === 'weekly' ? 'date' : 'month'}
              value={dateInputValue}
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (period === 'monthly') {
                  if (/^\d{4}-\d{2}$/.test(value)) setSelectedDate(`${value}-01`);
                } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                  setSelectedDate(value);
                }
              }}
              className="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            />
          </label>
        </div>
        <p className="mt-3 text-sm text-muted">
          {periodMessages.range}: {formatTanggal(range.startDate)} - {formatTanggal(range.endDate)}
        </p>
      </div>

      {!isOnline && (
        <div role="status" className="rounded-lg border border-warning/30 bg-warning-bg p-4 text-sm text-warning">
          {reports.length ? periodMessages.showingCachedData : periodMessages.offline}
        </div>
      )}

      {reportsQuery.isPending && isOnline && (
        <div className="animate-pulse space-y-3" aria-label={periodMessages.loading} aria-busy="true">
          <div className="h-20 rounded-lg bg-surface" />
          <div className="h-28 rounded-lg bg-surface" />
        </div>
      )}

      {reportsQuery.isError && isOnline && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger-bg p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {periodMessages.loadError}
          </span>
          <button
            type="button"
            onClick={() => void reportsQuery.refetch()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-danger/30 px-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {periodMessages.retry}
          </button>
        </div>
      )}

      {!reportsQuery.isPending && !reportsQuery.isError && reports.length === 0 && isOnline && (
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
          <h3 className="mt-3 font-semibold text-text">{periodMessages.emptyTitle}</h3>
          <p className="mt-1 text-sm text-muted">{periodMessages.emptyDescription}</p>
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [periodMessages.reportCount, formatVolume(reports.length, 0)],
              [periodMessages.workforce, formatVolume(workforceCount, 0)],
              [periodMessages.equipmentCount, formatVolume(equipmentCount, 0)],
              [periodMessages.materialCount, formatVolume(materialCount, 0)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {reports.map(({ report, manpower, equipment, materials }) => (
              <article key={report.id} className="space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-5">
                <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h3 className="font-semibold text-text">{formatTanggal(report.report_date, { long: true })}</h3>
                  <p className="text-sm text-muted">{report.site_manager_name}</p>
                </header>
                <p className="text-sm text-text"><span className="font-medium">{periodMessages.weather}:</span> {report.weather_conditions || '-'}</p>
                <p className="whitespace-pre-wrap text-sm text-text"><span className="font-medium">{periodMessages.workSummary}:</span> {report.work_summary || '-'}</p>
                <div className="grid gap-2 text-sm text-muted sm:grid-cols-3">
                  <p>{periodMessages.manpower}: {manpower.length}</p>
                  <p>{periodMessages.equipment}: {equipment.length}</p>
                  <p>{periodMessages.materials}: {materials.length}</p>
                </div>
                {(report.obstacles || report.solutions) && (
                  <div className="grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-2">
                    {report.obstacles && <p className="whitespace-pre-wrap text-text"><span className="font-medium">{periodMessages.obstacles}:</span> {report.obstacles}</p>}
                    {report.solutions && <p className="whitespace-pre-wrap text-text"><span className="font-medium">{periodMessages.solutions}:</span> {report.solutions}</p>}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {downloadError && (
        <p role="alert" className="text-sm text-danger">{periodMessages.downloadError}</p>
      )}
    </section>
  );
}
