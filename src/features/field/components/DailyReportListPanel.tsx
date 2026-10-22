import { CloudOff, FilePlus2, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { formatTanggal, type TimezoneZone } from '../../../utils/format';
import { getMessages } from '../../../i18n';
import { DAILY_REPORT_STATUSES } from '../schemas/dailyReport.schema';
import type { DailyReportRecord } from '../services/dailyReport.service';

const messages = getMessages().fieldReports;

type ProjectOption = { id: string; code: string; name: string };

type DailyReportListPanelProps = {
  projectOptions: ProjectOption[];
  projectId: string;
  selectedReportId: string | null;
  reports: Array<Pick<DailyReportRecord, 'id' | 'report_date' | 'status' | 'work_summary'>> | undefined;
  isLoading: boolean;
  isError: boolean;
  isOnline: boolean;
  canCreate: boolean;
  isCreating: boolean;
  isSaving: boolean;
  creationError: string;
  today: string;
  timezone?: TimezoneZone;
  onProjectChange: (projectId: string) => void;
  onSelectReport: (reportId: string) => void;
  onCreateDraft: () => void;
  onRetry: () => void;
};

function statusLabel(status: string): string {
  if (status === DAILY_REPORT_STATUSES.draft) return messages.statusDraft;
  if (status === DAILY_REPORT_STATUSES.submitted) return messages.statusSubmitted;
  if (status === DAILY_REPORT_STATUSES.approved) return messages.statusApproved;
  return messages.statusRejected;
}

function statusClasses(status: string): string {
  if (status === DAILY_REPORT_STATUSES.approved) return 'bg-success-bg text-success';
  if (status === DAILY_REPORT_STATUSES.submitted) return 'bg-warning-bg text-warning';
  return 'bg-surface-2 text-muted';
}

export function DailyReportListPanel({
  projectOptions,
  projectId,
  selectedReportId,
  reports,
  isLoading,
  isError,
  isOnline,
  canCreate,
  isCreating,
  isSaving,
  creationError,
  today,
  timezone,
  onProjectChange,
  onSelectReport,
  onCreateDraft,
  onRetry,
}: DailyReportListPanelProps) {
  const todayExists = reports?.some((report) => report.report_date === today) ?? false;

  return (
    <aside className="space-y-4">
      {projectOptions.length > 0 ? (
        <div className="space-y-2">
          <label htmlFor="daily-report-project" className="text-sm font-medium text-text">{messages.project}</label>
          <select
            id="daily-report-project"
            value={projectId}
            onChange={(event) => onProjectChange(event.currentTarget.value)}
            disabled={isSaving || isCreating}
            className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>{project.code} · {project.name}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-5 text-sm text-muted">{messages.noProject}</div>
      )}

      {canCreate && projectId && (
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={onCreateDraft}
            disabled={todayExists || isLoading || isCreating || isSaving}
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            {isCreating ? messages.saving : messages.createDraft}
          </Button>
          {todayExists && <p className="text-xs text-muted">{messages.alreadyCreatedToday}</p>}
        </div>
      )}
      {creationError && (
        <p className="rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">{creationError}</p>
      )}

      <section className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <h2 className="text-base font-semibold text-text">{messages.reportList}</h2>
        {!isOnline && (
          <p className="flex items-start gap-2 rounded-md bg-warning-bg p-3 text-xs text-warning" role="status">
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{messages.offline}
          </p>
        )}
        {isLoading && (
          <div className="space-y-2" aria-label={messages.loading}>
            {[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-md bg-surface-2" />)}
          </div>
        )}
        {isError && (
          <div className="space-y-3 rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">
            <p>{messages.loadError}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />{messages.retry}
            </Button>
          </div>
        )}
        {!isLoading && !isError && reports?.length === 0 && (
          <div className="space-y-1 py-3">
            <p className="text-sm font-medium text-text">{messages.emptyTitle}</p>
            <p className="text-sm text-muted">{messages.emptyDescription}</p>
          </div>
        )}
        {reports && reports.length > 0 && (
          <ul className="space-y-2">
            {reports.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => onSelectReport(report.id)}
                  disabled={isSaving || isCreating}
                  aria-current={selectedReportId === report.id ? 'true' : undefined}
                  className={`min-h-16 w-full rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${selectedReportId === report.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10' : 'border-border bg-surface hover:bg-surface-2'}`}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text">
                      {formatTanggal(report.report_date, { timezone })}
                    </span>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses(report.status)}`}>
                      {statusLabel(report.status)}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted">
                    {report.work_summary || messages.selectReport}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
