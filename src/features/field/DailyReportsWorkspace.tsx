import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { useCan } from '../../hooks/useCan';
import { getMessages } from '../../i18n';
import { createEmptyDailyReportValues } from './schemas/dailyReport.schema';
import {
  fetchDailyReportDetails,
  fetchDailyReports,
  saveDailyReportDraft,
} from './services/dailyReport.service';
import { DailyReportEditorPanel } from './components/DailyReportEditorPanel';
import { DailyReportConflictPanel } from './components/DailyReportConflictPanel';
import { DailyReportListPanel } from './components/DailyReportListPanel';
import { DailyReportProgressSection } from './components/DailyReportProgressSection';
import { useDailyReportEditor } from './hooks/useDailyReportEditor';
import { useDailyReportConflicts } from './hooks/useDailyReportConflicts';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { SyncIndicator } from './components/SyncIndicator';
import { enqueueDraft } from '../../lib/offlineDb';
import { useOfflineQueueStore } from '../../stores/offlineQueue.store';
import type { DailyReportRecord } from './services/dailyReport.service';
import { useOfflineDailyReportDrafts } from './hooks/useOfflineDailyReportDrafts';

const messages = getMessages().fieldReports;

function todayInJakarta(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function DailyReportsWorkspace() {
  const { flush, retry } = useOfflineSync({ autoSync: false });
  const {
    currentOrg,
    projects,
    selectedProjectId,
    isSupabaseLive,
    currentMemberRole,
    authSession,
  } = useApp();
  const queryClient = useQueryClient();
  const organizationId = currentOrg?.id ?? '';
  const projectOptions = useMemo(
    () => projects.filter((project) => project.organization_id === organizationId),
    [organizationId, projects],
  );
  const refreshOfflineQueue = useOfflineQueueStore((state) => state.refreshCounts);
  const [projectId, setProjectId] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState('');
  const syncStatus = useOfflineQueueStore((state) => state.syncStatus);
  const queueRevision = useOfflineQueueStore((state) => state.revision);
  const today = useMemo(todayInJakarta, []);
  const defaultValues = useMemo(() => createEmptyDailyReportValues(today), [today]);
  const canView = useCan('field_reports', 'view');
  const hasCreatePermission = useCan('field_reports', 'create');
  const hasEditPermission = useCan('field_reports', 'edit');
  const canCreate = Boolean(
    isSupabaseLive && authSession?.user.id && currentMemberRole === 'site_manager' && hasCreatePermission,
  );
  const canEdit = Boolean(
    isSupabaseLive && currentMemberRole === 'site_manager' && hasEditPermission,
  );

  useEffect(() => {
    const targetProjectId = selectedProjectId !== 'all'
      && projectOptions.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : projectOptions[0]?.id ?? '';
    if (!projectOptions.some((project) => project.id === projectId)) setProjectId(targetProjectId);
  }, [projectId, projectOptions, selectedProjectId]);

  useEffect(() => {
    setSelectedReportId(null);
  }, [organizationId, projectId]);

  const reportsKey = useMemo(
    () => ['daily-reports', organizationId, projectId],
    [organizationId, projectId],
  );
  const conflictActions = useDailyReportConflicts({
    organizationId,
    projectId,
    reportsKey,
    flush,
  });
  const reportsQuery = useQuery({
    queryKey: reportsKey,
    queryFn: () => fetchDailyReports(organizationId, projectId),
    enabled: Boolean(isSupabaseLive && organizationId && projectId),
  });
  const detailsQuery = useQuery({
    queryKey: ['daily-report-details', organizationId, projectId, selectedReportId],
    queryFn: () => {
      if (!selectedReportId) throw new Error(messages.selectReport);
      return fetchDailyReportDetails(organizationId, projectId, selectedReportId);
    },
    enabled: Boolean(isSupabaseLive && organizationId && projectId && selectedReportId),
  });
  const {
    drafts: visibleOfflineDrafts,
    details: offlineDetails,
  } = useOfflineDailyReportDrafts({
    organizationId,
    projectId,
    userId: authSession?.user.id ?? '',
    reportId: selectedReportId,
    queueRevision,
  });
  const activeDetails = offlineDetails ?? detailsQuery.data;
  const selectedReport = activeDetails?.report
    ?? reportsQuery.data?.find((report) => report.id === selectedReportId)
    ?? null;
  const editor = useDailyReportEditor({
    organizationId,
    projectId,
    reportId: selectedReportId,
    report: selectedReport,
    details: activeDetails,
    defaultValues,
    canEdit,
    reportsKey,
  });

  const selectReport = async (reportId: string) => {
    if (reportId === selectedReportId || editor.isSaving || isCreating) return;
    if (editor.editable && editor.hasUnsavedChanges && !(await editor.persistDraft(true))) return;
    setSelectedReportId(reportId);
  };

  const selectProject = async (nextProjectId: string) => {
    if (nextProjectId === projectId || editor.isSaving || isCreating) return;
    if (editor.editable && editor.hasUnsavedChanges && !(await editor.persistDraft(true))) return;
    setProjectId(nextProjectId);
  };

  const createDraft = async () => {
    if (!canCreate || !organizationId || !projectId || isCreating || editor.isSaving) return;
    if (editor.editable && editor.hasUnsavedChanges && !(await editor.persistDraft(true))) return;
    const todaysReport = reportsQuery.data?.find((report) => report.report_date === today)
      ?? visibleOfflineDrafts.find((draft) => draft.payload.report_date === today);
    if (todaysReport) {
      setSelectedReportId('id' in todaysReport ? todaysReport.id : todaysReport.reportId);
      return;
    }
    const reportId = crypto.randomUUID();
    setIsCreating(true);
    setCreationError('');
    try {
      if (editor.isOnline) {
        await saveDailyReportDraft(organizationId, projectId, reportId, defaultValues);
        await queryClient.invalidateQueries({ queryKey: reportsKey });
      } else {
        await enqueueDraft({
          reportId,
          organizationId,
          projectId,
          userId: authSession?.user.id ?? '',
          payload: {
            ...defaultValues,
            manpower: [],
            equipment: [],
            materials: [],
          },
          queuedAt: new Date().toISOString(),
          serverUpdatedAt: null,
          attempts: 0,
          lastError: null,
        });
        await refreshOfflineQueue(organizationId, authSession?.user.id);
      }
      setSelectedReportId(reportId);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      setCreationError(`${messages.autosaveError}: ${detail}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
        {messages.accessDenied}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SyncIndicator isOnline={editor.isOnline} onRetry={() => void retry()} />
      </div>
      <DailyReportConflictPanel
        conflicts={conflictActions.conflicts}
        isOnline={editor.isOnline}
        actionError={conflictActions.actionError}
        resolvingId={conflictActions.resolvingId}
        onKeepServer={(reportId) => void conflictActions.keepServerVersion(reportId)}
        onKeepLocal={(reportId) => void conflictActions.keepOfflineVersion(reportId)}
      />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(16rem,0.85fr)_minmax(0,2fr)]">
        <DailyReportListPanel
          projectOptions={projectOptions}
          projectId={projectId}
          selectedReportId={selectedReportId}
          reports={[
            ...(reportsQuery.data ?? []),
            ...visibleOfflineDrafts
              .filter((draft) => !reportsQuery.data?.some((report) => report.id === draft.reportId))
              .map((draft) => ({
                id: draft.reportId,
                report_date: draft.payload.report_date,
                work_summary: draft.payload.work_summary,
                status: 'draft',
              })),
          ]}
          isLoading={reportsQuery.isPending && visibleOfflineDrafts.length === 0}
          isError={reportsQuery.isError && visibleOfflineDrafts.length === 0}
          isOnline={editor.isOnline}
          canCreate={canCreate}
          isCreating={isCreating}
          isSaving={editor.isSaving}
          creationError={creationError}
          today={today}
          timezone={currentOrg?.timezone as import('../../utils/format').TimezoneZone | undefined}
          onProjectChange={(nextProjectId) => void selectProject(nextProjectId)}
          onSelectReport={(reportId) => void selectReport(reportId)}
          onCreateDraft={() => void createDraft()}
          onRetry={() => void reportsQuery.refetch()}
        />
        <DailyReportEditorPanel
          projectId={projectId}
          reportId={selectedReportId}
          report={selectedReport}
          details={activeDetails}
          isLoading={detailsQuery.isPending && !offlineDetails}
          isError={detailsQuery.isError && !offlineDetails}
          error={detailsQuery.error}
          timezone={currentOrg?.timezone as import('../../utils/format').TimezoneZone | undefined}
          editor={editor}
          onRetry={() => void detailsQuery.refetch()}
        />
      </div>
      {selectedReport && selectedReportId && (
        <DailyReportProgressSection
          organizationId={organizationId}
          projectId={projectId}
          reportId={selectedReportId}
          reportStatus={selectedReport.status}
          editable={editor.editable}
          isOnline={editor.isOnline}
          enabled={isSupabaseLive}
        />
      )}
      {isCreating && <span className="sr-only" role="status">{messages.saving}</span>}
    </div>
  );
}
