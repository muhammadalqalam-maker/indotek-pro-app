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
import { DailyReportListPanel } from './components/DailyReportListPanel';
import { useDailyReportEditor } from './hooks/useDailyReportEditor';

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
  const {
    currentOrg,
    projects,
    selectedProjectId,
    isSupabaseLive,
    currentMemberRole,
  } = useApp();
  const queryClient = useQueryClient();
  const organizationId = currentOrg?.id ?? '';
  const projectOptions = useMemo(
    () => projects.filter((project) => project.organization_id === organizationId),
    [organizationId, projects],
  );
  const [projectId, setProjectId] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState('');
  const today = useMemo(todayInJakarta, []);
  const defaultValues = useMemo(() => createEmptyDailyReportValues(today), [today]);
  const canView = useCan('field_reports', 'view');
  const hasCreatePermission = useCan('field_reports', 'create');
  const hasEditPermission = useCan('field_reports', 'edit');
  const hasApprovalPermission = useCan('field_reports', 'approve');
  const canCreate = Boolean(
    isSupabaseLive && currentMemberRole === 'site_manager' && hasCreatePermission,
  );
  const canEdit = Boolean(
    isSupabaseLive && currentMemberRole === 'site_manager' && hasEditPermission,
  );
  const canApprove = Boolean(
    isSupabaseLive
    && ['owner', 'admin', 'project_manager'].includes(currentMemberRole ?? '')
    && hasApprovalPermission,
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
  const selectedReport = detailsQuery.data?.report
    ?? reportsQuery.data?.find((report) => report.id === selectedReportId)
    ?? null;
  const editor = useDailyReportEditor({
    organizationId,
    projectId,
    reportId: selectedReportId,
    report: selectedReport,
    details: detailsQuery.data,
    defaultValues,
    canEdit,
    canApprove,
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
    if (!canCreate || !organizationId || !projectId || !editor.isOnline || isCreating || editor.isSaving) return;
    if (editor.editable && editor.hasUnsavedChanges && !(await editor.persistDraft(true))) return;
    const todaysReport = reportsQuery.data?.find((report) => report.report_date === today);
    if (todaysReport) {
      setSelectedReportId(todaysReport.id);
      return;
    }
    const reportId = crypto.randomUUID();
    setIsCreating(true);
    setCreationError('');
    try {
      await saveDailyReportDraft(organizationId, projectId, reportId, defaultValues);
      setSelectedReportId(reportId);
      await queryClient.invalidateQueries({ queryKey: reportsKey });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      setCreationError(`${messages.autosaveError}: ${detail}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        {messages.accessDenied}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(16rem,0.85fr)_minmax(0,2fr)]">
      <DailyReportListPanel
        projectOptions={projectOptions}
        projectId={projectId}
        selectedReportId={selectedReportId}
        reports={reportsQuery.data}
        isLoading={reportsQuery.isPending}
        isError={reportsQuery.isError}
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
        details={detailsQuery.data}
        isLoading={detailsQuery.isPending}
        isError={detailsQuery.isError}
        error={detailsQuery.error}
        timezone={currentOrg?.timezone as import('../../utils/format').TimezoneZone | undefined}
        canApprove={canApprove}
        editor={editor}
        onRetry={() => void detailsQuery.refetch()}
      />
      {isCreating && <span className="sr-only" role="status">{messages.saving}</span>}
    </div>
  );
}
