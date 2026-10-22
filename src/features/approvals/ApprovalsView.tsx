import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, ListChecks, RotateCcw, Settings2, XCircle } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useCan } from '../../hooks/useCan';
import { getMessages } from '../../i18n';
import { ApprovalFlowEditor } from './components/ApprovalFlowEditor';
import { ApprovalRequestCard } from './components/ApprovalRequestCard';
import { fetchApprovalFlows, fetchApprovals } from './services/approval.service';
import { APPROVAL_STATUSES, type ApprovalStatus } from './types';

const messages = getMessages().approvals;
type StatusFilter = ApprovalStatus | 'all';

export function ApprovalsView() {
  const {
    currentOrg,
    currentMemberRole,
    isSupabaseLive,
    members,
    reloadProjects,
  } = useApp();
  const hasApprovalPermission = useCan('approvals', 'approve');
  const organizationId = currentOrg?.id ?? null;
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>(APPROVAL_STATUSES.pending);
  const [activeTab, setActiveTab] = useState<'requests' | 'flows'>('requests');
  const canManageFlows = Boolean(
    isSupabaseLive && (currentMemberRole === 'owner' || currentMemberRole === 'admin'),
  );
  const requestsQuery = useQuery({
    queryKey: ['approvals', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error(messages.noOrganization);
      return fetchApprovals(organizationId);
    },
    enabled: Boolean(organizationId && isSupabaseLive),
  });
  const flowsQuery = useQuery({
    queryKey: ['approval-flows', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error(messages.noOrganization);
      return fetchApprovalFlows(organizationId);
    },
    enabled: Boolean(organizationId && isSupabaseLive && canManageFlows),
  });

  const requests = requestsQuery.data?.requests ?? [];
  const pendingCount = requests.filter((request) => request.status === APPROVAL_STATUSES.pending).length;
  const visibleRequests = requests.filter((request) => (
    filter === 'all' || request.status === filter
  ));

  const refreshAfterDecision = async () => {
    if (!organizationId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['approvals', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['boq-workspace', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['daily-reports', organizationId] }),
      queryClient.invalidateQueries({ queryKey: ['daily-report-details', organizationId] }),
      reloadProjects(),
    ]);
  };

  if (!organizationId) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">{messages.noOrganization}</p>;
  }
  if (!isSupabaseLive) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">{messages.liveRequired}</p>;
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">{messages.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{messages.description}</p>
        </div>
        <span className="inline-flex min-h-10 items-center gap-2 self-start rounded-full bg-warning-bg px-3 text-sm font-semibold text-warning sm:self-auto">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          {messages.pendingCount(pendingCount)}
        </span>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-border pb-3" aria-label={messages.title}>
        <button
          type="button"
          aria-pressed={activeTab === 'requests'}
          onClick={() => setActiveTab('requests')}
          className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
            activeTab === 'requests' ? 'bg-primary-700 text-white' : 'text-muted hover:bg-surface-2 hover:text-text'
          }`}
        >
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          {messages.requestsTab}
        </button>
        {canManageFlows && (
          <button
            type="button"
            aria-pressed={activeTab === 'flows'}
            onClick={() => setActiveTab('flows')}
            className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
              activeTab === 'flows' ? 'bg-primary-700 text-white' : 'text-muted hover:bg-surface-2 hover:text-text'
            }`}
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            {messages.flowsTab}
          </button>
        )}
      </nav>

      {activeTab === 'flows' && canManageFlows ? (
        flowsQuery.isPending ? (
          <div className="grid gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : flowsQuery.isError ? (
          <div className="grid gap-3 rounded-md border border-danger/30 bg-danger-bg p-4 text-sm text-danger" role="alert">
            <p>{messages.loadFailed}</p>
            <p>{flowsQuery.error instanceof Error ? flowsQuery.error.message : messages.loadFailed}</p>
            <Button variant="outline" onClick={() => void flowsQuery.refetch()}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />{messages.retry}
            </Button>
          </div>
        ) : (
          <ApprovalFlowEditor organizationId={organizationId} flows={flowsQuery.data ?? []} />
        )
      ) : requestsQuery.isPending ? (
        <div className="grid gap-3" aria-label={messages.loading}>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : requestsQuery.isError ? (
        <div className="grid gap-3 rounded-md border border-danger/30 bg-danger-bg p-4 text-sm text-danger" role="alert">
          <p>{messages.loadFailed}</p>
          <p>{requestsQuery.error instanceof Error ? requestsQuery.error.message : messages.loadFailed}</p>
          <Button variant="outline" onClick={() => void requestsQuery.refetch()}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />{messages.retry}
          </Button>
        </div>
      ) : (
        <section className="grid gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label={messages.requestsTab}>
            {([
              [APPROVAL_STATUSES.pending, messages.pending, Clock3],
              [APPROVAL_STATUSES.approved, messages.approved, CheckCircle2],
              [APPROVAL_STATUSES.rejected, messages.rejected, XCircle],
              ['all', messages.all, ListChecks],
            ] as const).map(([status, label, Icon]) => (
              <button
                key={status}
                type="button"
                aria-pressed={filter === status}
                onClick={() => setFilter(status)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium ${
                  filter === status
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-500'
                    : 'border-border bg-surface text-muted hover:text-text'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
                {status === APPROVAL_STATUSES.pending && <span>{pendingCount}</span>}
              </button>
            ))}
          </div>

          {visibleRequests.length === 0 ? (
            <EmptyState
              title={messages.emptyTitle}
              description={filter === APPROVAL_STATUSES.pending ? messages.emptyDescription : undefined}
              icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
            />
          ) : (
            <div className="grid gap-4">
              {visibleRequests.map((request) => (
                <ApprovalRequestCard
                  key={request.id}
                  request={request}
                  currentUserId={requestsQuery.data.currentUserId}
                  currentRole={currentMemberRole}
                  members={members}
                  hasApprovalPermission={hasApprovalPermission}
                  onProcessed={refreshAfterDecision}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
