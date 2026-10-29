import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, ListChecks, RotateCcw, Settings2, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  PageShell,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui';
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
  const currentTab = canManageFlows ? activeTab : 'requests';
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
    return (
      <PageShell
        className="mx-auto max-w-6xl"
        header={<PageHeader title={messages.title} description={messages.description} />}
      >
        <EmptyState title={messages.noOrganization} icon={<ListChecks className="h-5 w-5" aria-hidden="true" />} />
      </PageShell>
    );
  }
  if (!isSupabaseLive) {
    return (
      <PageShell
        className="mx-auto max-w-6xl"
        header={<PageHeader title={messages.title} description={messages.description} />}
      >
        <div className="rounded-lg border border-warning/30 bg-warning-bg p-4 text-sm text-warning" role="note">
          {messages.liveRequired}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      className="mx-auto max-w-6xl"
      header={(
        <PageHeader
          title={messages.title}
          description={messages.description}
          actions={(
            <Badge variant="warning" className="min-h-10 gap-2 px-3 text-sm">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              {messages.pendingCount(pendingCount)}
            </Badge>
          )}
        />
      )}
    >
      <Tabs
        value={currentTab}
        onValueChange={(value) => {
          if (value === 'requests' || value === 'flows') setActiveTab(value);
        }}
      >
        <TabsList aria-label={messages.title}>
          <TabsTrigger value="requests">
            <ListChecks className="h-4 w-4" aria-hidden="true" />
            {messages.requestsTab}
          </TabsTrigger>
          {canManageFlows && (
            <TabsTrigger value="flows">
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              {messages.flowsTab}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="flows">
          {flowsQuery.isPending ? (
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
          )}
        </TabsContent>

        <TabsContent value="requests">
          {requestsQuery.isPending ? (
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
              <Card>
                <CardContent className="flex flex-wrap gap-2 p-3 sm:p-4" role="group" aria-label={messages.requestsTab}>
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
                          : 'border-border bg-surface text-muted-foreground hover:text-text'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                      {status === APPROVAL_STATUSES.pending && <span>{pendingCount}</span>}
                    </button>
                  ))}
                </CardContent>
              </Card>

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
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
