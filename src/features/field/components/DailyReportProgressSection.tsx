import { useEffect, useMemo, useState } from 'react';
import { useForm, type FieldPath } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { getMessages } from '../../../i18n';
import { DAILY_REPORT_STATUSES } from '../schemas/dailyReport.schema';
import { dailyReportProgressFormSchema, type DailyReportProgressFormValues } from '../schemas/dailyReportProgress.schema';
import { DailyReportProgressForm } from './DailyReportProgressForm';
import {
  applyProgressValidationErrors,
  BOQ_VERSION_STATUS,
  sumProgressEntries,
  versionStatusLabel,
} from '../utils/dailyReportProgress.helpers';
import {
  fetchDailyReportProgressItems,
  fetchDailyReportProgressOverview,
  saveDailyReportProgress,
} from '../services/dailyReportProgress.service';

const messages = getMessages().fieldReports;

type DailyReportProgressSectionProps = {
  organizationId: string;
  projectId: string;
  reportId: string;
  reportStatus: string;
  editable: boolean;
  isOnline: boolean;
  enabled: boolean;
};

export function DailyReportProgressSection({
  organizationId,
  projectId,
  reportId,
  reportStatus,
  editable,
  isOnline,
  enabled,
}: DailyReportProgressSectionProps) {
  const queryClient = useQueryClient();
  const [versionId, setVersionId] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveErrorDetail, setSaveErrorDetail] = useState('');
  const [saveFeedback, setSaveFeedback] = useState('');
  const form = useForm<DailyReportProgressFormValues>({
    defaultValues: { entries: [] },
    mode: 'onBlur',
  });
  const overviewKey = useMemo(
    () => ['daily-report-progress', organizationId, projectId],
    [organizationId, projectId],
  );
  const overviewQuery = useQuery({
    queryKey: overviewKey,
    queryFn: () => fetchDailyReportProgressOverview(organizationId, projectId),
    enabled: Boolean(enabled && isOnline && organizationId && projectId),
  });
  const overview = overviewQuery.data;
  const reportEntries = useMemo(
    () => overview?.entries.filter((entry) => entry.report_id === reportId) ?? [],
    [overview?.entries, reportId],
  );
  const reportVersionIds = useMemo(
    () => [...new Set(reportEntries.map((entry) => entry.boq_version_id))],
    [reportEntries],
  );
  const selectedVersionId = reportVersionIds.length === 1 ? reportVersionIds[0] : '';
  const defaultVersionId = useMemo(() => {
    if (selectedVersionId) return selectedVersionId;
    if (!overview) return '';
    return overview.versions.find((version) => version.status === BOQ_VERSION_STATUS.approved)?.id
      ?? overview.versions.find((version) => version.status !== BOQ_VERSION_STATUS.rejected)?.id
      ?? '';
  }, [overview, selectedVersionId]);
  const hasVersionConflict = reportVersionIds.length > 1
    || Boolean(selectedVersionId && !overview?.versions.some((version) => version.id === selectedVersionId));
  const effectiveVersionId = versionId || defaultVersionId;
  const itemsKey = useMemo(
    () => ['daily-report-progress-items', organizationId, projectId, effectiveVersionId],
    [organizationId, projectId, effectiveVersionId],
  );
  const itemsQuery = useQuery({
    queryKey: itemsKey,
    queryFn: () => fetchDailyReportProgressItems(organizationId, projectId, effectiveVersionId),
    enabled: Boolean(enabled && isOnline && organizationId && projectId && effectiveVersionId && overview),
  });
  const workItems = useMemo(
    () => itemsQuery.data?.items.filter((item) => (
      item.item_type === 'work_item' && item.volume !== null && item.volume > 0
    )) ?? [],
    [itemsQuery.data?.items],
  );
  const canEditReport = editable && reportStatus === DAILY_REPORT_STATUSES.draft;
  const canSave = canEditReport && isOnline && form.formState.isDirty && !form.formState.isSubmitting;

  useEffect(() => {
    setVersionId(defaultVersionId);
  }, [defaultVersionId, reportId]);

  useEffect(() => {
    if (!overview || !itemsQuery.data || form.formState.isDirty) return;
    form.reset({
      entries: workItems.map((item) => {
        const currentEntry = reportEntries.find((entry) => entry.boq_item_id === item.id);
        const previousVolume = sumProgressEntries(overview.entries, item.id, reportId);
        return {
          boq_item_id: item.id,
          installed_volume: currentEntry ? String(currentEntry.installed_volume) : '',
          maximum_volume: Math.max(0, Number(item.volume) - previousVolume),
          remarks: currentEntry?.remarks ?? '',
        };
      }),
    });
  }, [form, form.formState.isDirty, itemsQuery.data, overview, reportEntries, reportId, workItems]);

  const mutation = useMutation({
    mutationFn: (entries: DailyReportProgressFormValues['entries']) => saveDailyReportProgress(
      organizationId,
      projectId,
      reportId,
      effectiveVersionId,
      entries
        .filter((entry) => Number(entry.installed_volume) > 0)
        .map((entry) => ({
          boq_item_id: entry.boq_item_id,
          installed_volume: Number(entry.installed_volume),
          remarks: entry.remarks.trim(),
        })),
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: overviewKey });
    },
  });

  const validateEntry = (index: number) => {
    const result = dailyReportProgressFormSchema.safeParse({
      entries: [form.getValues(`entries.${index}`)],
    });
    const fieldNames = ['installed_volume', 'remarks'] as const;
    for (const fieldName of fieldNames) {
      const path = `entries.${index}.${fieldName}` as FieldPath<DailyReportProgressFormValues>;
      form.clearErrors(path);
      if (!result.success) {
        const issue = result.error.issues.find((candidate) => (
          candidate.path[2] === fieldName
        ));
        if (issue) form.setError(path, { type: 'validate', message: issue.message });
      }
    }
  };

  const handleSave = form.handleSubmit(async (values) => {
    setSaveError('');
    setSaveErrorDetail('');
    setSaveFeedback('');
    form.clearErrors();
    const validation = dailyReportProgressFormSchema.safeParse(values);
    if (!validation.success) {
      applyProgressValidationErrors(validation.error.issues, form.setError);
      return;
    }

    try {
      await mutation.mutateAsync(validation.data.entries);
      form.reset(validation.data);
      setSaveFeedback(messages.progressSaved);
    } catch (error: unknown) {
      setSaveError(error instanceof Error && error.message === messages.validation.progressVolumeExceeded
        ? error.message
        : messages.progressSaveError);
      setSaveErrorDetail(error instanceof Error ? error.message : 'Unknown error');
    }
  });

  const versionChangeLocked = reportEntries.length > 0 || form.formState.isDirty;
  const noCachedOfflineData = !isOnline && (!overview || Boolean(effectiveVersionId && !itemsQuery.data));
  const queryError = overviewQuery.error ?? itemsQuery.error;
  const retryQuery = () => {
    if (overviewQuery.isError) void overviewQuery.refetch();
    else void itemsQuery.refetch();
  };

  if (noCachedOfflineData) {
    return (
      <section className="space-y-3 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h3 className="text-base font-semibold text-text">{messages.progressSectionTitle}</h3>
        <p className="rounded-md bg-warning-bg p-3 text-sm text-warning" role="status">{messages.progressOffline}</p>
      </section>
    );
  }

  if (overviewQuery.isPending || (effectiveVersionId && itemsQuery.isPending)) {
    return (
      <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5" aria-label={messages.progressSectionTitle}>
        <div className="h-5 w-52 animate-pulse rounded bg-surface-2" />
        <div className="h-24 animate-pulse rounded bg-surface-2" />
        <div className="h-24 animate-pulse rounded bg-surface-2" />
      </section>
    );
  }

  if (queryError) {
    return (
      <section className="space-y-3 rounded-lg border border-danger bg-surface p-4 text-danger sm:p-5" role="alert">
        <p>{messages.progressLoadError}</p>
        <Button type="button" variant="outline" onClick={retryQuery}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />{messages.retry}
        </Button>
        {queryError instanceof Error && (
          <details className="text-xs">
            <summary>Detail teknis</summary>
            <p className="mt-2 break-words">{queryError.message}</p>
          </details>
        )}
      </section>
    );
  }

  if (!overview || hasVersionConflict) {
    return (
      <section className="space-y-3 rounded-lg border border-danger bg-surface p-4 text-danger sm:p-5" role="alert">
        {messages.progressReportVersionError}
      </section>
    );
  }

  const versionsForSelection = overview.versions.filter((version) => (
    version.status !== BOQ_VERSION_STATUS.rejected || version.id === selectedVersionId
  ));

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <header className="space-y-1">
        <h3 className="text-base font-semibold text-text">{messages.progressSectionTitle}</h3>
        <p className="text-sm text-muted-foreground">{messages.progressSectionDescription}</p>
      </header>

      {!isOnline && (
        <p className="rounded-md bg-warning-bg p-3 text-sm text-warning" role="status">
          {messages.progressOffline}
        </p>
      )}
      {!canEditReport && (
        <p className="rounded-md bg-surface-2 p-3 text-sm text-muted-foreground" role="status">
          {reportStatus === DAILY_REPORT_STATUSES.draft ? messages.progressAccessDenied : messages.progressReadOnly}
        </p>
      )}

      {overview.versions.length === 0 ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{messages.progressNoBoq}</p>
      ) : (
        <>
          <Select
            id="daily-report-progress-version"
            label={messages.progressVersionLabel}
            hint={messages.progressVersionHint}
            value={effectiveVersionId}
            disabled={!isOnline || versionChangeLocked || !canEditReport}
            onChange={(event) => setVersionId(event.currentTarget.value)}
          >
            {versionsForSelection.map((version) => (
              <option key={version.id} value={version.id}>
                Rev {version.revision_number} · {version.title} · {versionStatusLabel(version.status)}
              </option>
            ))}
          </Select>

          {workItems.length === 0 ? (
            <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">{messages.progressNoItems}</p>
          ) : (
            <DailyReportProgressForm
              form={form}
              entries={overview.entries}
              reportId={reportId}
              workItems={workItems}
              unitSymbols={itemsQuery.data?.unitSymbols ?? {}}
              editable={canEditReport}
              isOnline={isOnline}
              includeReportVolumeInTotal={reportStatus !== DAILY_REPORT_STATUSES.rejected}
              canSave={canSave}
              saveError={saveError}
              saveErrorDetail={saveErrorDetail}
              saveFeedback={saveFeedback}
              onSubmit={(event) => void handleSave(event)}
              onValidateEntry={validateEntry}
            />
          )}
        </>
      )}
    </section>
  );
}
