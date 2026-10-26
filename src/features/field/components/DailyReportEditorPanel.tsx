import { AlertCircle, Check, CloudOff, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { formatTanggal, type TimezoneZone } from '../../../utils/format';
import { getMessages } from '../../../i18n';
import { DAILY_REPORT_STATUSES } from '../schemas/dailyReport.schema';
import type { DailyReportDetails, DailyReportRecord } from '../services/dailyReport.service';
import type { DailyReportEditorState } from '../hooks/useDailyReportEditor';
import { DailyReportFormFields } from './DailyReportFormFields';

const messages = getMessages().fieldReports;

type DailyReportEditorPanelProps = {
  projectId: string;
  reportId: string | null;
  report: DailyReportRecord | null;
  details: DailyReportDetails | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  timezone?: TimezoneZone;
  editor: DailyReportEditorState;
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
  return 'bg-surface-2 text-muted-foreground';
}

function technicalError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function DailyReportEditorPanel({
  projectId,
  reportId,
  report,
  details,
  isLoading,
  isError,
  error,
  timezone,
  editor,
  onRetry,
}: DailyReportEditorPanelProps) {
  const canSubmit = Boolean(editor.editable && editor.isOnline && !editor.isSaving);

  if (!projectId) {
    return <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">{messages.noReportsProject}</div>;
  }
  if (!reportId) {
    return <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">{messages.selectReport}</div>;
  }
  if (isLoading) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-surface p-5" aria-label={messages.loadingDetails}>
        <div className="h-8 animate-pulse rounded bg-surface-2" />
        <div className="h-40 animate-pulse rounded bg-surface-2" />
        <div className="h-28 animate-pulse rounded bg-surface-2" />
      </div>
    );
  }
  if (isError || !details || !report) {
    return (
      <div className="space-y-3 rounded-lg border border-danger bg-surface p-5 text-danger" role="alert">
        <p>{messages.loadError}</p>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />{messages.retry}
        </Button>
        {error !== undefined && error !== null && (
          <details className="text-xs">
            <summary>Detail teknis</summary>
            <p className="mt-2 break-words">{technicalError(error)}</p>
          </details>
        )}
      </div>
    );
  }

  return (
    <form
      className="min-w-0 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void editor.submit();
      }}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{messages.reportDate}</p>
          <h2 className="mt-1 text-lg font-semibold text-text">
            {formatTanggal(report.report_date, { timezone, long: true })}
          </h2>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${statusClasses(report.status)}`}>
          {statusLabel(report.status)}
        </span>
      </header>

      {!editor.isOnline && (
        <p className="flex gap-2 rounded-md bg-warning-bg p-3 text-sm text-warning" role="status">
          <CloudOff className="h-5 w-5 shrink-0" aria-hidden="true" />{messages.offline}
        </p>
      )}

      <DailyReportFormFields
        form={editor.form}
        editable={editor.editable && !editor.isSaving}
        pendingPhotos={editor.pendingPhotos}
        setPendingPhotos={editor.changePendingPhotos}
        photoPreviewUrls={editor.photoPreviewUrls}
        onRemovePhoto={editor.removePhoto}
        siteSignatureUrl={editor.siteSignatureUrl}
        onSiteSignatureChange={editor.onSiteSignatureChange}
      />

      {editor.form.formState.errors.root?.validation?.message && (
        <div className="rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">
          {editor.form.formState.errors.root.validation.message}
        </div>
      )}
      {editor.saveError && (
        <div className="space-y-1 rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">
          <p>{editor.saveError}</p>
          {editor.saveErrorDetail && (
            <details className="text-xs">
              <summary>Detail teknis</summary>
              <p className="mt-2 break-words">{editor.saveErrorDetail}</p>
            </details>
          )}
        </div>
      )}
      {editor.actionFeedback && (
        <p className="flex items-center gap-2 rounded-md bg-success-bg p-3 text-sm text-success" role="status">
          <Check className="h-4 w-4" aria-hidden="true" />{editor.actionFeedback}
        </p>
      )}

      <footer className="sticky bottom-2 z-20 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-md sm:flex-row sm:items-center sm:justify-between">
        <p
          className={`flex items-center gap-2 text-xs ${editor.saveState === 'error' ? 'text-danger' : 'text-muted-foreground'}`}
          role="status"
          aria-live="polite"
        >
          {editor.saveState === 'saving'
            ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
            : editor.saveState === 'error'
              ? <AlertCircle className="h-4 w-4" aria-hidden="true" />
              : null}
          {editor.saveLabel}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {editor.editable && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void editor.persistDraft(true)}
                disabled={editor.isSaving}
              >
                {messages.saveNow}
              </Button>
              <Button type="submit" disabled={!canSubmit}>{messages.submit}</Button>
            </>
          )}
          {!editor.editable && (
            <span className="text-xs text-muted-foreground">{messages.readOnly}</span>
          )}
        </div>
      </footer>
    </form>
  );
}
