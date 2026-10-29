import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarRange,
  CircleDollarSign,
  Plus,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { Can } from '../../components/shared/Can';
import {
  Button,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  PageShell,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { formatPersen, formatRupiah } from '../../utils/format';
import {
  calculateDashboardMetrics,
  filterProjectsByPeriod,
  getDashboardDateRange,
  getProjectsNeedingAttention,
  type DashboardPeriod,
} from './dashboardMetrics';
import { DashboardFilters } from './components/DashboardFilters';
import { DashboardInsights } from './components/DashboardInsights';
import { DashboardLoadingSkeleton } from './components/DashboardLoadingSkeleton';
import { DashboardProjectList } from './components/DashboardProjectList';

const messages = getMessages('id').dashboard;

export const DashboardView: React.FC<{
  onOpenCreateProject: () => void;
}> = ({ onOpenCreateProject }) => {
  const {
    currentOrg,
    projects,
    isLoading,
    organizationDataError,
    reloadAllData,
    selectedProjectId,
    setSelectedProjectId,
    openProjectDetail,
    isSupabaseLive,
  } = useApp();
  const [period, setPeriod] = useState<DashboardPeriod>('this_year');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const dateRange = useMemo(
    () => getDashboardDateRange(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate],
  );
  const periodProjects = useMemo(
    () => filterProjectsByPeriod(projects, dateRange, selectedProjectId),
    [projects, dateRange, selectedProjectId],
  );
  const metrics = useMemo(() => calculateDashboardMetrics(periodProjects), [periodProjects]);
  const attentionProjects = useMemo(
    () => getProjectsNeedingAttention(periodProjects),
    [periodProjects],
  );
  const recentProjects = useMemo(
    () => [...periodProjects]
      .sort((first, second) => second.updated_at.localeCompare(first.updated_at))
      .slice(0, 5),
    [periodProjects],
  );

  const resetFilters = () => {
    setPeriod('this_year');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedProjectId('all');
  };

  if (isLoading) return <DashboardLoadingSkeleton />;

  if (organizationDataError) {
    return (
      <ErrorState
        title={messages.loadErrorTitle}
        description={organizationDataError}
        onRetry={() => void reloadAllData()}
        retryLabel={messages.retry}
      />
    );
  }

  if (!currentOrg) {
    return (
      <EmptyState
        title={messages.organizationRequiredTitle}
        description={messages.organizationRequiredDescription}
        icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  const rangeError = period === 'custom' && !dateRange.isValid;

  return (
    <PageShell
      header={(
        <>
          <PageHeader
            title={messages.title}
            description={messages.description(currentOrg.name)}
            actions={(
              <Can module="projects" action="create">
                <Button onClick={onOpenCreateProject}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {messages.addProject}
                </Button>
              </Can>
            )}
          />

          {!isSupabaseLive && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-bg p-3 text-sm text-warning" role="note">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{messages.demoNotice}</p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info-bg p-3 text-sm text-info" role="note">
            <CalendarRange className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{messages.scopeNotice}</p>
          </div>
        </>
      )}
      filters={(
        <DashboardFilters
          period={period}
          startDate={customStartDate}
          endDate={customEndDate}
          rangeError={rangeError}
          onPeriodChange={setPeriod}
          onStartDateChange={setCustomStartDate}
          onEndDateChange={setCustomEndDate}
        />
      )}
    >
      {rangeError ? (
        <EmptyState
          title={messages.invalidRange}
          description={messages.periodHint}
          icon={<CalendarRange className="h-5 w-5" aria-hidden="true" />}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          title={messages.emptyTitle}
          description={messages.emptyDescription}
          actionLabel={messages.addProject}
          onAction={onOpenCreateProject}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        />
      ) : periodProjects.length === 0 ? (
        <EmptyState
          title={messages.noProjectsInPeriod}
          description={messages.noProjectsInPeriodDescription}
          actionLabel={messages.clearFilters}
          onAction={resetFilters}
          icon={<RotateCcw className="h-5 w-5" aria-hidden="true" />}
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={messages.title}>
            <KpiCard
              label={messages.activeProjects}
              value={metrics.activeProjectCount}
              description={messages.activeProjectsDescription}
              icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
            />
            <KpiCard
              label={messages.contractValue}
              value={formatRupiah(metrics.contractValue)}
              description={`${metrics.projectCount} ${messages.projectCount.toLowerCase()}`}
              icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
            />
            <KpiCard
              label={messages.realizedCost}
              value={formatRupiah(metrics.realizedCost)}
              description={`${messages.budgetUsage}: ${formatPersen(metrics.budgetUsagePercent)}`}
              icon={<Activity className="h-4 w-4" aria-hidden="true" />}
            />
            <KpiCard
              label={messages.averageProgress}
              value={formatPersen(metrics.averageActualProgress)}
              description={messages.averageProgressDescription(formatPersen(metrics.averagePlannedProgress))}
              icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            />
          </section>

          <DashboardInsights projects={periodProjects} metrics={metrics} />

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DashboardProjectList
              title={messages.attentionTitle}
              emptyMessage={messages.noAttention}
              projects={attentionProjects.slice(0, 5)}
              onOpenProject={openProjectDetail}
              openProjectLabel={messages.openProject}
            />
            <DashboardProjectList
              title={messages.projectListTitle}
              emptyMessage={messages.noProjectsInPeriod}
              projects={recentProjects}
              onOpenProject={openProjectDetail}
              openProjectLabel={messages.openProject}
            />
          </section>
        </>
      )}
    </PageShell>
  );
};
