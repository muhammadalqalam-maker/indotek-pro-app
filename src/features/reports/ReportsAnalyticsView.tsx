import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  useToast,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { formatTanggal } from '../../utils/format';
import type { AppModule } from '../../utils/permissions';
import {
  fetchReportDataset,
  type ReportColumn,
  type ReportType,
} from './reportData.service';
import { ReportFilters } from './ReportFilters';
import { ReportPageHeading } from './ReportPageHeading';
import { ReportResults } from './ReportResults';
import {
  filterReportRows,
  formatReportValue,
  getExcelReportValue,
  getCurrentMonthDateRange,
  getDisplayReportRow,
  getReportCellValue,
  isValidReportDateRange,
} from './reportModel';
import { downloadReportExcel, downloadReportPdf } from './reportExport';

const messages = getMessages().reportAnalytics;
const REPORT_TYPES: ReportType[] = [
  'progress', 'finance', 'procurement',
  'stock', 'attendance', 'safety',
];
const REPORT_PERMISSIONS: Record<ReportType, AppModule> = {
  progress: 'field_reports',
  finance: 'finance',
  procurement: 'procurement',
  stock: 'warehouse',
  attendance: 'users',
  safety: 'safety',
};
const COMMON_COLUMNS: ReportColumn[] = [
  { key: 'project', format: 'text' },
  { key: 'date', format: 'date' },
  { key: 'status', format: 'status' },
];

function createStatusLabelMap(): Record<string, string> {
  return Object.entries(messages.statusLabels).reduce<Record<string, string>>(
    (labels, [key, value]) => {
      labels[key] = value;
      return labels;
    },
    {},
  );
}

function getDisplayValue(
  row: Parameters<typeof getReportCellValue>[0],
  column: ReportColumn,
  projectNames: ReadonlyMap<string, string>,
  statusLabels: Record<string, string>,
): string {
  return formatReportValue(
    getReportCellValue(row, column, projectNames, statusLabels, messages.projectUnavailable),
    column.format,
    statusLabels,
  );
}

export function ReportsAnalyticsView() {
  const {
    currentOrg,
    isSupabaseLive,
    projects,
    can,
    selectedProjectId,
    setSelectedProjectId,
  } = useApp();
  const { toast } = useToast();
  const currentMonth = getCurrentMonthDateRange();
  const [reportType, setReportType] = useState<ReportType>('progress');
  const [startDate, setStartDate] = useState(currentMonth.startDate);
  const [endDate, setEndDate] = useState(currentMonth.endDate);
  const [statusFilter, setStatusFilter] = useState('all');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const visibleReportTypes = REPORT_TYPES.filter((type) => can(REPORT_PERMISSIONS[type], 'view'));
  const activeReportType = visibleReportTypes.includes(reportType)
    ? reportType
    : visibleReportTypes[0] ?? null;
  const dateRangeIsValid = isValidReportDateRange({ startDate, endDate });
  const organizationId = currentOrg?.id ?? '';
  const projectNames = new Map(
    projects
      .filter((project) => project.organization_id === organizationId)
      .map((project) => [project.id, project.name]),
  );
  const query = useQuery({
    queryKey: ['report-dataset', organizationId, activeReportType, selectedProjectId, startDate, endDate],
    queryFn: () => {
      if (!activeReportType) throw new Error(messages.permissionDenied);
      return fetchReportDataset(activeReportType, {
        organizationId,
        projectId: selectedProjectId,
        startDate,
        endDate,
      });
    },
    enabled: Boolean(isSupabaseLive && organizationId && activeReportType && dateRangeIsValid),
    staleTime: 30_000,
  });

  const statusOptions = [...new Set(query.data?.rows.map((row) => row.status) ?? [])].sort();
  const effectiveStatusFilter = statusOptions.includes(statusFilter) ? statusFilter : 'all';
  const rows = filterReportRows(query.data?.rows ?? [], effectiveStatusFilter);
  const columns = [...COMMON_COLUMNS, ...(query.data?.columns ?? [])];
  const statusLabelMap = createStatusLabelMap();
  const projectLabel = selectedProjectId === 'all'
    ? messages.allProjects
    : projectNames.get(selectedProjectId) ?? messages.projectUnavailable;
  const periodLabel = `${messages.period}: ${formatTanggal(startDate)} - ${formatTanggal(endDate)}`;

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!query.data || rows.length === 0 || !dateRangeIsValid || !activeReportType) return;
    setExporting(format);
    const exportOptions = {
      title: messages.reportTypes[activeReportType],
      organizationName: currentOrg?.name ?? '',
      projectLabel: `${messages.project}: ${projectLabel}`,
      periodLabel,
      columns: columns.map((column) => ({
        label: messages.columns[column.key],
        format: column.format,
      })),
      fileName: `laporan-${activeReportType}-${startDate}-${endDate}.xlsx`,
    };

    try {
      if (format === 'pdf') {
        const exportRows = rows.map((row) => getDisplayReportRow(
          row,
          columns,
          projectNames,
          statusLabelMap,
          messages.projectUnavailable,
        ));
        await downloadReportPdf({ ...exportOptions, rows: exportRows });
      } else {
        const exportRows = rows.map((row) => columns.map((column) => {
          const value = getReportCellValue(
            row,
            column,
            projectNames,
            statusLabelMap,
            messages.projectUnavailable,
          );
          return getExcelReportValue(value, column.format, statusLabelMap);
        }));
        await downloadReportExcel({ ...exportOptions, rows: exportRows });
      }
      toast({ title: messages.exportSuccess, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.exportError,
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setExporting(null);
    }
  };

  if (!isSupabaseLive) {
    return (
      <section className="space-y-6">
        <ReportPageHeading />
        <EmptyState title={messages.liveDataRequired} />
      </section>
    );
  }

  if (!currentOrg) {
    return (
      <section className="space-y-6">
        <ReportPageHeading />
        <EmptyState title={messages.organizationRequired} />
      </section>
    );
  }

  if (!activeReportType) {
    return (
      <section className="space-y-6">
        <ReportPageHeading />
        <EmptyState title={messages.permissionDenied} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <ReportPageHeading />

      <ReportFilters
        reportTypes={visibleReportTypes}
        reportType={activeReportType}
        projects={projects
          .filter((project) => project.organization_id === organizationId)
          .map((project) => ({ id: project.id, name: project.name }))}
        projectId={selectedProjectId}
        startDate={startDate}
        endDate={endDate}
        status={effectiveStatusFilter}
        statuses={statusOptions}
        hasDataset={Boolean(query.data)}
        labels={{
          reportType: messages.reportType,
          project: messages.project,
          allProjects: messages.allProjects,
          startDate: messages.startDate,
          endDate: messages.endDate,
          status: messages.status,
          allStatuses: messages.allStatuses,
          statusLabel: (status) => statusLabelMap[status] ?? status,
          reportTypeLabel: (type) => messages.reportTypes[type],
        }}
        onReportTypeChange={(type) => {
          setReportType(type);
          setStatusFilter('all');
        }}
        onProjectChange={setSelectedProjectId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onStatusChange={setStatusFilter}
      />

      {!dateRangeIsValid && (
        <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">
          {messages.invalidDateRange}
        </p>
      )}
      {query.isError && query.data && (
        <p className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {messages.loadError} {query.error instanceof Error ? query.error.message : ''}
        </p>
      )}
      {query.isFetching && query.data && (
        <p className="text-sm text-muted-foreground" role="status">{messages.loading}…</p>
      )}

      {query.isFetching && !query.data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full sm:col-span-2" />
        </div>
      ) : query.isError && !query.data ? (
        <ErrorState
          title={messages.loadError}
          description={query.error instanceof Error ? query.error.message : messages.loadError}
          retryLabel={messages.retry}
          onRetry={() => void query.refetch()}
        />
      ) : dateRangeIsValid && query.data && rows.length === 0 ? (
        <EmptyState title={messages.emptyTitle} description={messages.emptyDescription} />
      ) : dateRangeIsValid && query.data ? (
        <ReportResults
          title={messages.reportTypes[activeReportType]}
          rows={rows}
          columns={columns}
          periodLabel={periodLabel}
          projectLabel={projectLabel}
          recordCountLabel={messages.recordCount}
          exportExcelLabel={messages.exportExcel}
          exportPdfLabel={messages.exportPdf}
          exportingLabel={messages.exporting}
          exporting={exporting}
          columnLabel={(key) => messages.columns[key]}
          cellValue={(row, column) => getDisplayValue(row, column, projectNames, statusLabelMap)}
          onExport={(format) => void handleExport(format)}
        />
      ) : null}
    </section>
  );
}
