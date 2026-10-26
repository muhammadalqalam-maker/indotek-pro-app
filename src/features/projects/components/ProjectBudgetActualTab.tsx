import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ConfirmDialog,
  EmptyState,
  useToast,
} from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { useCan } from '../../../hooks/useCan';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import { useProjectNetworkStatus } from '../hooks/useProjectNetworkStatus';
import {
  fetchApprovedBoqVersions,
  fetchProjectBudgetActual,
  recordProjectBoqExpense,
  verifyProjectBoqExpense,
  type ProjectBoqExpense,
} from '../services/projectBudgetActual.service';
import {
  calculateProjectBudgetActual,
  type BudgetActualDivision,
} from '../utils/projectBudgetActual.helpers';
import { ProjectBoqExpenseDialog } from './ProjectBoqExpenseDialog';
import { ProjectBudgetActualReport } from './ProjectBudgetActualReport';
import { ProjectBudgetActualHeader } from './ProjectBudgetActualHeader';
import { ProjectBudgetActualLoadError } from './ProjectBudgetActualLoadError';
import type { ProjectBoqExpenseFormValues } from '../schemas/projectBudgetActual.schema';

const messages = getMessages('id').projects.budgetActual;

type ProjectBudgetActualTabProps = {
  project: Project;
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ProjectBudgetActualTab({ project }: ProjectBudgetActualTabProps) {
  const queryClient = useQueryClient();
  const { currentOrg, isSupabaseLive } = useApp();
  const { toast } = useToast();
  const isOnline = useProjectNetworkStatus();
  const canView = useCan('finance', 'view');
  const canCreate = useCan('finance', 'create');
  const canVerify = useCan('finance', 'approve');
  const organizationId = currentOrg?.id ?? '';
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [expenseDialogError, setExpenseDialogError] = useState('');
  const [expenseToVerify, setExpenseToVerify] = useState<ProjectBoqExpense | null>(null);
  const [verifyError, setVerifyError] = useState('');
  const versionsKey = useMemo(
    () => ['project-budget-actual-versions', organizationId, project.id],
    [organizationId, project.id],
  );
  const versionsQuery = useQuery({
    queryKey: versionsKey,
    queryFn: () => fetchApprovedBoqVersions(organizationId, project.id),
    enabled: Boolean(isSupabaseLive && organizationId && isOnline && canView),
  });
  const versions = versionsQuery.data ?? [];

  useEffect(() => {
    if (versions.length === 0) {
      setSelectedVersionId('');
      return;
    }
    if (!versions.some((version) => version.id === selectedVersionId)) {
      setSelectedVersionId(versions[0].id);
    }
  }, [selectedVersionId, versions]);

  const workspaceKey = useMemo(
    () => ['project-budget-actual', organizationId, project.id, selectedVersionId],
    [organizationId, project.id, selectedVersionId],
  );
  const workspaceQuery = useQuery({
    queryKey: workspaceKey,
    queryFn: () => fetchProjectBudgetActual(organizationId, project.id, selectedVersionId),
    enabled: Boolean(isSupabaseLive && organizationId && isOnline && canView && selectedVersionId),
  });

  const saveMutation = useMutation({
    mutationFn: (values: ProjectBoqExpenseFormValues) => recordProjectBoqExpense(
      organizationId,
      project.id,
      selectedVersionId,
      values.boq_item_id,
      values.expense_date,
      values.amount,
      values.description,
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceKey });
      toast({ title: messages.expenseCreated, variant: 'success' });
      setExpenseDialogOpen(false);
      setExpenseDialogError('');
    },
    onError: (error: unknown) => {
      const detail = getErrorMessage(error, messages.expenseCreateFailed);
      setExpenseDialogError(detail);
      toast({ title: messages.expenseCreateFailed, description: detail, variant: 'error' });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (expense: ProjectBoqExpense) => verifyProjectBoqExpense(
      organizationId,
      project.id,
      expense.id,
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workspaceKey });
      toast({ title: messages.verified, variant: 'success' });
      setExpenseToVerify(null);
      setVerifyError('');
    },
    onError: (error: unknown) => {
      const detail = getErrorMessage(error, messages.verifyFailed);
      setVerifyError(detail);
      toast({ title: messages.verifyFailed, description: detail, variant: 'error' });
    },
  });

  if (!organizationId) {
    return <EmptyState title={messages.noOrganization} icon={<CircleDollarSign className="h-5 w-5" aria-hidden="true" />} />;
  }
  if (!canView) {
    return <EmptyState title={messages.noViewAccess} icon={<CircleDollarSign className="h-5 w-5" aria-hidden="true" />} />;
  }
  if (!isSupabaseLive) {
    return <EmptyState title={messages.demoUnavailable} icon={<CircleDollarSign className="h-5 w-5" aria-hidden="true" />} />;
  }
  if (!isOnline && !versionsQuery.data) {
    return (
      <EmptyState
        title={messages.offlineReadOnly}
        description={messages.offlineNoCache}
        icon={<CircleDollarSign className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }
  if (versionsQuery.isPending && !versionsQuery.data) {
    return (
      <section className="space-y-4" aria-label={messages.loading}>
        <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
        <div className="h-24 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-48 animate-pulse rounded-lg bg-surface-2" />
      </section>
    );
  }
  if (versionsQuery.isError && !versionsQuery.data) {
    return <ProjectBudgetActualLoadError detail={versionsQuery.error.message} onRetry={() => void versionsQuery.refetch()} />;
  }
  if (versions.length === 0) {
    return <EmptyState title={messages.noApprovedBoq} icon={<CircleDollarSign className="h-5 w-5" aria-hidden="true" />} />;
  }
  if (!selectedVersionId) {
    return <div className="h-16 animate-pulse rounded-lg bg-surface-2" aria-label={messages.loading} />;
  }
  if (!isOnline && !workspaceQuery.data) {
    return (
      <EmptyState
        title={messages.offlineReadOnly}
        description={messages.offlineNoCache}
        icon={<CircleDollarSign className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }
  if (workspaceQuery.isPending && !workspaceQuery.data) {
    return (
      <section className="space-y-4" aria-label={messages.loading}>
        <div className="h-12 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-24 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-48 animate-pulse rounded-lg bg-surface-2" />
      </section>
    );
  }
  if (workspaceQuery.isError && !workspaceQuery.data) {
    return <ProjectBudgetActualLoadError detail={workspaceQuery.error.message} onRetry={() => void workspaceQuery.refetch()} />;
  }

  let divisions: BudgetActualDivision[];
  let calculationError = '';
  try {
    divisions = calculateProjectBudgetActual(
      workspaceQuery.data?.items ?? [],
      workspaceQuery.data?.expenses ?? [],
    );
  } catch (error) {
    divisions = [];
    calculationError = getErrorMessage(error, messages.loadFailed);
  }

  const workItems = workspaceQuery.data?.items.filter((item) => item.item_type === 'work_item') ?? [];
  const pendingExpense = expenseToVerify?.status === 'pending' ? expenseToVerify : null;

  return (
    <section className="space-y-4">
      {!isOnline && (
        <p className="rounded-md bg-warning-bg p-3 text-sm text-warning" role="status">
          {messages.offlineReadOnly}
        </p>
      )}
      {versionsQuery.isError && (
        <p className="rounded-md border border-danger bg-surface p-3 text-sm text-danger" role="alert">
          {messages.loadFailed} {versionsQuery.error.message}
        </p>
      )}
      {workspaceQuery.isError && (
        <p className="rounded-md border border-danger bg-surface p-3 text-sm text-danger" role="alert">
          {messages.loadFailed} {workspaceQuery.error.message}
        </p>
      )}

      <ProjectBudgetActualHeader
        versions={versions}
        selectedVersionId={selectedVersionId}
        canCreate={canCreate}
        canAddExpense={isOnline && workItems.length > 0}
        onVersionChange={setSelectedVersionId}
        onAddExpense={() => {
          setExpenseDialogError('');
          setExpenseDialogOpen(true);
        }}
      />

      {calculationError ? (
        <div className="rounded-lg border border-danger bg-surface p-4 text-sm text-danger" role="alert">
          <p>{messages.loadFailed}</p>
          <p className="mt-1 break-words">{calculationError}</p>
        </div>
      ) : workspaceQuery.data && (
        <>
          {workItems.length === 0 ? (
            <EmptyState title={messages.noItems} icon={<CircleDollarSign className="h-5 w-5" aria-hidden="true" />} />
          ) : (
            <ProjectBudgetActualReport
              divisions={divisions}
              expenses={workspaceQuery.data.expenses}
              canVerify={canVerify && isOnline}
              verifyingExpenseId={verifyMutation.isPending ? verifyMutation.variables?.id ?? null : null}
              onVerify={(expense) => {
                setVerifyError('');
                setExpenseToVerify(expense);
              }}
            />
          )}
          {workspaceQuery.data.expenses.some((expense) => expense.status === 'pending') && !canVerify && (
            <p className="rounded-md bg-surface-2 p-3 text-sm text-muted-foreground" role="note">{messages.noVerifyAccess}</p>
          )}
        </>
      )}

      {canCreate && (
        <ProjectBoqExpenseDialog
          open={expenseDialogOpen}
          items={workspaceQuery.data?.items ?? []}
          saving={saveMutation.isPending}
          error={expenseDialogError}
          onClose={() => setExpenseDialogOpen(false)}
          onSave={(values) => saveMutation.mutate(values)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingExpense)}
        onOpenChange={(open) => {
          if (!open && !verifyMutation.isPending) {
            setExpenseToVerify(null);
            setVerifyError('');
          }
        }}
        title={messages.verifyTitle}
        description={pendingExpense ? messages.verifyDescription(pendingExpense.description) : undefined}
        confirmLabel={messages.verifyConfirm}
        cancelLabel={messages.verifyCancel}
        loading={verifyMutation.isPending}
        onConfirm={() => {
          if (pendingExpense) verifyMutation.mutate(pendingExpense);
        }}
      >
        {verifyError && <p className="text-sm text-danger" role="alert">{verifyError}</p>}
      </ConfirmDialog>

    </section>
  );
}
