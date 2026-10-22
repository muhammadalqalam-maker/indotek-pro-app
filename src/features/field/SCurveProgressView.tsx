import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CloudOff, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent, EmptyState, ErrorState, Skeleton } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { formatPersen, formatRupiah, formatTanggal } from '../../utils/format';
import {
  calculateApprovedTimeExtensionDays,
  calculateEffectiveContractEndDate,
} from '../../utils/projectCalculations';
import { SCurveChart } from './components/SCurveChart';
import { useFieldNetworkStatus } from './hooks/useFieldNetworkStatus';
import { fetchProjectSCurve } from './services/sCurve.service';

const messages = getMessages().fieldReports;
const curveMessages = messages.sCurve;

export function SCurveProgressView({ projectId }: { projectId: string }) {
  const { currentOrg, isSupabaseLive, projects } = useApp();
  const isOnline = useFieldNetworkStatus();
  const project = projects.find((item) => item.id === projectId && item.organization_id === currentOrg?.id);
  const organizationId = currentOrg?.id ?? '';
  const effectiveEndDate = project
    ? calculateEffectiveContractEndDate(
      project.end_date,
      calculateApprovedTimeExtensionDays(project.addendums ?? []),
    )
    : '';
  const query = useQuery({
    queryKey: ['project-s-curve', organizationId, projectId, project?.start_date, effectiveEndDate],
    queryFn: () => {
      if (!project) throw new Error(messages.noProject);
      return fetchProjectSCurve(organizationId, project.id, project.start_date, effectiveEndDate);
    },
    enabled: Boolean(isSupabaseLive && organizationId && project && isOnline),
  });
  const chartData = useMemo(
    () => query.data?.points ?? [],
    [query.data?.points],
  );
  const lastPoint = chartData.at(-1);

  if (!isSupabaseLive) {
    return (
      <EmptyState
        title={curveMessages.liveDataRequired}
        description={curveMessages.liveDataDescription}
        icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  if (!project) {
    return (
      <EmptyState
        title={messages.noProject}
        description={messages.noReportsProject}
      />
    );
  }

  if (query.isPending && isOnline) {
    return (
      <section className="space-y-4" aria-busy="true" aria-label={curveMessages.loading}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </section>
    );
  }

  if (query.isError && !query.data) {
    return (
      <ErrorState
        title={curveMessages.loadError}
        description={query.error instanceof Error ? query.error.message : messages.loadError}
        retryLabel={messages.retry}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (!query.data && !isOnline) {
    return (
      <EmptyState
        title={curveMessages.offline}
        description={curveMessages.offlineDescription}
        icon={<CloudOff className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  if (!query.data?.version) {
    return (
      <EmptyState
        title={curveMessages.noApprovedBoq}
        description={curveMessages.noApprovedBoqDescription}
        icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  if (query.data.budget <= 0 || chartData.length === 0) {
    return (
      <EmptyState
        title={curveMessages.noBoqValue}
        description={curveMessages.noBoqValueDescription}
        icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  const actualPercent = lastPoint?.actual_cumulative_percent ?? 0;

  return (
    <section className="space-y-4">
      {!isOnline && (
        <p className="flex items-start gap-2 rounded-md bg-warning-bg p-3 text-sm text-warning" role="status">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {curveMessages.showingCachedData}
        </p>
      )}
      {query.isError && (
        <p className="flex items-start gap-2 rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {curveMessages.refreshFailed}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs font-medium text-muted">{curveMessages.approvedBudget}</p>
            <p className="break-words text-lg font-semibold tabular-nums text-text">{formatRupiah(query.data.budget)}</p>
            <p className="text-xs text-muted">
              {curveMessages.boqRevision(query.data.version.revision_number, query.data.version.title)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs font-medium text-muted">{curveMessages.earnedValue}</p>
            <p className="break-words text-lg font-semibold tabular-nums text-text">{formatRupiah(query.data.earnedValue)}</p>
            <p className="text-xs text-muted">
              {query.data.latestReportDate
                ? curveMessages.progressDate(formatTanggal(query.data.latestReportDate))
                : curveMessages.noApprovedProgress}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-4">
            <p className="text-xs font-medium text-muted">{curveMessages.actualProgress}</p>
            <p className="text-lg font-semibold tabular-nums text-text">{formatPersen(actualPercent)}</p>
            <p className="text-xs text-muted">{curveMessages.weightedByBoqValue}</p>
          </CardContent>
        </Card>
      </div>

      <SCurveChart points={chartData} />
      <p className="text-xs leading-relaxed text-muted">{curveMessages.calculationNote}</p>
    </section>
  );
}
