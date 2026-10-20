import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { useCan } from '../../../hooks/useCan';
import { EmptyState, ErrorState, Skeleton } from '../../../components/ui';
import { calculateBoqDraftTotals, type BoqDraftItem } from '../boqCalculations';
import { applyBoqFormErrors } from '../schemas/applyBoqFormErrors';
import { boqDraftSchema, type BoqDraftFormValues } from '../schemas/boq.schema';
import {
  fetchBoqItems,
  fetchBoqWorkspace,
  saveBoqDraft,
  toBoqDraftForm,
} from '../services/boq.service';
import { BoqDraftEditor } from './BoqDraftEditor';
import { BoqRevisionTools } from './BoqRevisionTools';
import { BoqVersionDetails } from './BoqVersionDetails';
import { BoqWorkspaceHeader } from './BoqWorkspaceHeader';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

export function BoqPanel() {
  const { currentOrg, currentMemberRole, isSupabaseLive, projects, selectedProjectId } = useApp();
  const messages = getMessages().rab;
  const organizationId = currentOrg?.id ?? null;
  const projectId = selectedProjectId !== 'all' ? selectedProjectId : null;
  const project = projects.find((item) => item.id === projectId);
  const canEdit = useCan('rab', 'edit')
    && isSupabaseLive
    && ['owner', 'admin', 'project_manager', 'estimator'].includes(currentMemberRole ?? '');
  const queryClient = useQueryClient();
  const [versionId, setVersionId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const form = useForm<BoqDraftFormValues>({
    defaultValues: toBoqDraftForm(null, []),
    mode: 'onSubmit',
  });
  const watchedDraft = useWatch({ control: form.control });
  const workspaceKey = ['boq-workspace', organizationId, projectId];
  const workspaceQuery = useQuery({
    queryKey: workspaceKey,
    queryFn: () => {
      if (!organizationId || !projectId) throw new Error(messages.boqProjectMissing);
      return fetchBoqWorkspace(organizationId, projectId);
    },
    enabled: Boolean(organizationId && projectId && isSupabaseLive),
  });
  const selectedVersion = workspaceQuery.data?.versions.find((version) => version.id === versionId) ?? null;
  const itemsQuery = useQuery({
    queryKey: ['boq-items', organizationId, projectId, versionId],
    queryFn: () => {
      if (!organizationId || !projectId || !versionId) throw new Error(messages.boqProjectMissing);
      return fetchBoqItems(organizationId, projectId, versionId);
    },
    enabled: Boolean(organizationId && projectId && versionId && isSupabaseLive),
  });
  const saveMutation = useMutation({
    mutationFn: ({ targetVersionId, values }: {
      targetVersionId: string | null;
      values: ReturnType<typeof boqDraftSchema.parse>;
    }) => {
      if (!organizationId || !projectId) throw new Error(messages.boqProjectMissing);
      return saveBoqDraft(organizationId, projectId, targetVersionId, values);
    },
  });

  useEffect(() => {
    const versions = workspaceQuery.data?.versions;
    if (!versions) return;
    if (versionId && versions.some((version) => version.id === versionId)) return;
    setVersionId(versions[0]?.id ?? null);
  }, [versionId, workspaceQuery.data?.versions]);

  useEffect(() => {
    if (!workspaceQuery.data) return;
    if (!selectedVersion) {
      if (workspaceQuery.data.versions.length === 0) form.reset(toBoqDraftForm(null, []));
      return;
    }
    if (itemsQuery.isSuccess) form.reset(toBoqDraftForm(selectedVersion, itemsQuery.data));
  }, [form, itemsQuery.data, itemsQuery.isSuccess, selectedVersion, workspaceQuery.data]);

  useEffect(() => {
    if (validationErrors.length > 0) errorSummaryRef.current?.focus();
  }, [validationErrors]);

  const draftTotals = useMemo(() => {
    const allItems: BoqDraftItem[] = (watchedDraft.divisions ?? []).flatMap((division) =>
      (division.work_items ?? []).map((item) => ({
        volume: item.volume ?? '0',
        unit_price: item.unit_price ?? '0',
      })),
    );
    return calculateBoqDraftTotals(
      allItems,
      watchedDraft.overhead_percent ?? '0',
      watchedDraft.profit_percent ?? '0',
      watchedDraft.ppn_percent ?? '0',
    );
  }, [watchedDraft]);

  const handleSave = form.handleSubmit(async (values) => {
    const parsed = boqDraftSchema.safeParse(values);
    if (!parsed.success) {
      setValidationErrors(parsed.error.issues.map((issue) => issue.message));
      setActionError(messages.boqValidationFailed);
      applyBoqFormErrors(form, parsed.error.issues);
      return;
    }

    try {
      const savedVersionId = await saveMutation.mutateAsync({ targetVersionId: versionId, values: parsed.data });
      await queryClient.invalidateQueries({ queryKey: workspaceKey });
      await queryClient.invalidateQueries({ queryKey: ['boq-items', organizationId, projectId, savedVersionId] });
      setVersionId(savedVersionId);
      setFeedback(messages.boqSaveSuccess);
      setActionError('');
      setValidationErrors([]);
      setEditorOpen(false);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, messages.boqSaveFailed));
      setFeedback('');
    }
  });

  const cancelEditing = () => {
    form.reset(toBoqDraftForm(selectedVersion, itemsQuery.data ?? []));
    setEditorOpen(false);
    setActionError('');
    setValidationErrors([]);
  };

  if (!organizationId) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">{messages.boqOrganizationMissing}</p>;
  }

  if (!isSupabaseLive) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">{messages.boqOffline}</p>;
  }

  if (!project) {
    return (
      <EmptyState
        title={projects.length > 0 ? messages.boqProjectMissing : messages.boqNoProjects}
        description={projects.length === 0 ? messages.boqNoProjects : undefined}
        icon={<FileSpreadsheet className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  if (workspaceQuery.isLoading) {
    return (
      <div className="grid gap-3" aria-label={messages.boqLoading}>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (workspaceQuery.isError) {
    return (
      <ErrorState
        title={messages.boqLoadFailed}
        description={getErrorMessage(workspaceQuery.error, messages.boqLoadFailed)}
        retryLabel={messages.boqRetry}
        onRetry={() => void workspaceQuery.refetch()}
      />
    );
  }

  const workspace = workspaceQuery.data;
  if (!workspace) return <Skeleton className="h-48 w-full" aria-label={messages.boqLoading} />;
  const versions = workspace.versions;
  const units = workspace.units.filter((unit) => unit.deleted_at === null);
  const analyses = workspace.analyses.filter((analysis) =>
    analysis.deleted_at === null && units.some((unit) => unit.id === analysis.unit_id),
  );
  const itemList = itemsQuery.data ?? [];
  const readOnly = !canEdit || (versions.length > 0 && selectedVersion?.status !== 'draft');

  if (versions.length > 0 && (!versionId || !selectedVersion)) {
    return <Skeleton className="h-48 w-full" aria-label={messages.boqLoading} />;
  }

  const savedTotals = calculateBoqDraftTotals(
    itemList
      .filter((item) => item.item_type === 'work_item')
      .map((item) => ({
        volume: item.volume?.toString() ?? '0',
        unit_price: item.unit_price?.toString() ?? '0',
      })),
    selectedVersion?.overhead_percent.toString() ?? '0',
    selectedVersion?.profit_percent.toString() ?? '0',
    selectedVersion?.ppn_percent.toString() ?? '0',
  );
  const displayedTotals = selectedVersion ? {
    ...savedTotals,
    directCost: Number(selectedVersion.subtotal_direct_cost),
    overheadAmount: Number(selectedVersion.overhead_amount),
    profitAmount: Number(selectedVersion.profit_amount),
    ppnAmount: Number(selectedVersion.ppn_amount),
    grandTotal: Number(selectedVersion.grand_total),
  } : savedTotals;

  return (
    <section className="grid gap-4">
      <BoqWorkspaceHeader
        projectCode={project.code}
        projectName={project.name}
        versions={versions}
        selectedVersionId={versionId}
        messages={messages}
        onVersionChange={(newVersionId) => {
          setVersionId(newVersionId);
          setEditorOpen(false);
          setFeedback('');
          setActionError('');
        }}
      />

      {actionError && (
        <div ref={errorSummaryRef} tabIndex={-1} className="grid gap-1 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger" role="alert">
          <p>{actionError}</p>
          {validationErrors.map((message, index) => <p key={`${message}-${index}`}>• {message}</p>)}
        </div>
      )}
      {feedback && <p className="rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success" role="status">{feedback}</p>}

      {selectedVersion && !editorOpen && (
        <BoqRevisionTools
          organizationId={organizationId}
          projectId={project.id}
          versions={versions}
          selectedVersion={selectedVersion}
          canEdit={canEdit}
          comparisonUnits={workspace.units}
          analyses={analyses}
          messages={messages}
          onRevisionCreated={(newVersionId) => {
            setVersionId(newVersionId);
            setEditorOpen(true);
            setFeedback(messages.boqRevisionCreated);
            setActionError('');
            setValidationErrors([]);
          }}
        />
      )}

      {versions.length === 0 && !editorOpen ? (
        <EmptyState
          title={messages.boqNewTitle}
          description={messages.boqNewDescription}
          actionLabel={canEdit ? messages.boqCreateFirst : undefined}
          onAction={canEdit ? () => {
            setVersionId(null);
            form.reset(toBoqDraftForm(null, []));
            setEditorOpen(true);
            setActionError('');
            setFeedback('');
          } : undefined}
          icon={<FileSpreadsheet className="h-5 w-5" aria-hidden="true" />}
        />
      ) : itemsQuery.isLoading ? (
        <Skeleton className="h-48 w-full" aria-label={messages.boqLoading} />
      ) : itemsQuery.isError ? (
        <ErrorState
          title={messages.boqLoadFailed}
          description={getErrorMessage(itemsQuery.error, messages.boqLoadFailed)}
          retryLabel={messages.boqRetry}
          onRetry={() => void itemsQuery.refetch()}
        />
      ) : (
        <>
          {readOnly && <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-muted">{messages.boqReadOnly}</p>}
          {editorOpen ? (
            <BoqDraftEditor
              form={form}
              units={units}
              analyses={analyses}
              totals={draftTotals}
              messages={messages}
              readOnly={readOnly}
              isSaving={saveMutation.isPending}
              onSubmit={handleSave}
              onCancel={cancelEditing}
            />
          ) : selectedVersion ? (
            <BoqVersionDetails
              version={selectedVersion}
              items={itemList}
              units={units}
              totals={displayedTotals}
              canEdit={canEdit}
              messages={messages}
              onEdit={() => {
                setEditorOpen(true);
                setFeedback('');
                setActionError('');
              }}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
