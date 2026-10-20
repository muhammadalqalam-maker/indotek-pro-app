import { getMessages } from '../../../i18n';
import type { DailyReportConflict } from '../hooks/useDailyReportConflicts';

const messages = getMessages().fieldReports;

type DailyReportConflictPanelProps = {
  conflicts: DailyReportConflict[];
  isOnline: boolean;
  actionError: string;
  resolvingId: string | null;
  onKeepServer: (reportId: string) => void;
  onKeepLocal: (reportId: string) => void;
};

export function DailyReportConflictPanel({
  conflicts,
  isOnline,
  actionError,
  resolvingId,
  onKeepServer,
  onKeepLocal,
}: DailyReportConflictPanelProps) {
  if (conflicts.length === 0) return null;

  return (
    <section className="space-y-3 rounded-lg border border-warning/40 bg-warning-bg p-4" aria-labelledby="daily-report-conflicts">
      <h2 id="daily-report-conflicts" className="font-semibold text-warning">{messages.syncConflict}</h2>
      <p className="text-sm text-warning">{messages.conflictDescription}</p>
      {actionError && <p className="text-sm text-danger" role="alert">{actionError}</p>}
      <ul className="space-y-3">
        {conflicts.map((conflict) => (
          <li key={conflict.reportId} className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 break-all text-sm text-text">{conflict.reportId}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="min-h-11 rounded-md border border-border px-3 text-sm text-text hover:bg-surface-2 disabled:opacity-50"
                disabled={!isOnline || resolvingId === conflict.reportId}
                onClick={() => onKeepServer(conflict.reportId)}
              >
                {messages.conflictKeepServer}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-md bg-primary-600 px-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                disabled={!isOnline || resolvingId === conflict.reportId}
                onClick={() => onKeepLocal(conflict.reportId)}
              >
                {messages.conflictUseLocal}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
