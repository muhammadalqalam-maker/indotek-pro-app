import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Plus } from 'lucide-react';
import { Button, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { PUNCH_LIST_CLOSURE_ROLES } from '../../../utils/permissions';
import { useQualityWorkspace } from '../hooks/useQualityWorkspace';
import type { PunchListFormValues, QcInspectionFormValues } from '../schemas/quality.schema';
import type { QualityPunchListItem } from '../types';
import { PunchListForm } from './PunchListForm';
import { PunchListList } from './PunchListList';
import { QcInspectionForm } from './QcInspectionForm';
import { QcInspectionList } from './QcInspectionList';

const messages = getMessages().safety;
type QualityTab = 'inspections' | 'punch_list';
type QualityForm = 'inspection' | 'punch_list' | null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : messages.saveError;
}

export function QualityWorkspace() {
  const {
    currentOrg,
    projects,
    selectedProjectId,
    isSupabaseLive,
    can,
    currentMemberRole,
    organizationDataError,
  } = useApp();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<QualityTab>('inspections');
  const [activeForm, setActiveForm] = useState<QualityForm>(null);
  const workspace = useQualityWorkspace(
    currentOrg?.id ?? '',
    selectedProjectId,
    isSupabaseLive,
  );
  const data = workspace.query.data;
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const canCreate = can('safety', 'create') && Boolean(currentOrg) && isSupabaseLive;
  const canEdit = can('safety', 'edit') && isSupabaseLive;
  const canClose = canEdit && PUNCH_LIST_CLOSURE_ROLES.some((role) => role === currentMemberRole);
  const defaultProjectId = selectedProjectId === 'all' ? '' : selectedProjectId;
  const isSaving = workspace.createInspection.isPending
    || workspace.createPunchList.isPending
    || workspace.advancePunchList.isPending
    || workspace.closePunchList.isPending;

  const saveInspection = async (values: QcInspectionFormValues) => {
    try {
      await workspace.createInspection.mutateAsync(values);
      setActiveForm(null);
      toast({ title: messages.qcInspectionSaved, variant: 'success' });
    } catch (error: unknown) {
      toast({ title: messages.qualityError, description: errorMessage(error), variant: 'error' });
      throw error;
    }
  };

  const savePunchList = async (values: PunchListFormValues, beforePhoto: File) => {
    try {
      await workspace.createPunchList.mutateAsync({ values, beforePhoto });
      setActiveForm(null);
      toast({ title: messages.punchListSaved, variant: 'success' });
    } catch (error: unknown) {
      toast({ title: messages.qualityError, description: errorMessage(error), variant: 'error' });
      throw error;
    }
  };

  const advancePunchList = async (
    item: QualityPunchListItem,
    nextStatus: 'in_progress' | 'ready_for_inspection',
  ) => {
    if (item.status !== 'open' && item.status !== 'in_progress') {
      toast({ title: messages.qualityError, description: messages.punchListStatusSaved, variant: 'error' });
      return;
    }
    try {
      await workspace.advancePunchList.mutateAsync({
        itemId: item.id,
        currentStatus: item.status,
        nextStatus,
      });
      toast({ title: messages.punchListStatusSaved, variant: 'success' });
    } catch (error: unknown) {
      toast({ title: messages.qualityError, description: errorMessage(error), variant: 'error' });
    }
  };

  const closePunchList = async (item: QualityPunchListItem, afterPhoto: File) => {
    try {
      await workspace.closePunchList.mutateAsync({
        itemId: item.id,
        projectId: item.project_id,
        afterPhoto,
      });
      toast({ title: messages.punchListClosed, variant: 'success' });
    } catch (error: unknown) {
      toast({ title: messages.qualityError, description: errorMessage(error), variant: 'error' });
      throw error;
    }
  };

  const tabs: { id: QualityTab; label: string; count: number; icon: typeof ClipboardCheck }[] = [
    { id: 'inspections', label: messages.qualityInspectionTab, count: data?.inspections.length ?? 0, icon: ClipboardCheck },
    { id: 'punch_list', label: messages.qualityPunchListTab, count: data?.punchList.length ?? 0, icon: CheckCircle2 },
  ];
  const addLabel = activeTab === 'inspections' ? messages.addQcInspection : messages.addPunchList;

  return (
    <section className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">{messages.qualityTab}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {activeTab === 'inspections' ? messages.qualityInspectionDescription : messages.qualityPunchListDescription}
          </p>
        </div>
        {canCreate && activeForm === null && (
          <Button
            type="button"
            onClick={() => setActiveForm(activeTab === 'inspections' ? 'inspection' : 'punch_list')}
            disabled={projects.length === 0 || isSaving}
          >
            <Plus className="size-4" aria-hidden="true" />
            {addLabel}
          </Button>
        )}
      </header>

      {projects.length === 0 && (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">{messages.noProjects}</p>
      )}

      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === 'inspections' || value === 'punch_list') setActiveTab(value);
      }}>
        <TabsList aria-label={messages.qualityTab} className="w-full justify-start">
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <TabsTrigger
              key={id}
              id={`quality-tab-${id}`}
              value={id}
              disabled={activeForm !== null}
              className="min-h-11"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums">{count}</span>
            </TabsTrigger>
          ))}
        </TabsList>

      {activeForm === 'inspection' && (
        <QcInspectionForm
          projects={projects}
          defaultProjectId={defaultProjectId}
          isSaving={workspace.createInspection.isPending}
          onCancel={() => setActiveForm(null)}
          onSave={saveInspection}
        />
      )}
      {activeForm === 'punch_list' && (
        <PunchListForm
          projects={projects}
          defaultProjectId={defaultProjectId}
          isSaving={workspace.createPunchList.isPending}
          onCancel={() => setActiveForm(null)}
          onSave={savePunchList}
        />
      )}

      {!isSupabaseLive ? (
        <div role="alert" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
          {messages.connectionRequired}
        </div>
      ) : !currentOrg ? (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {organizationDataError || messages.loadError}
        </div>
      ) : workspace.query.isPending ? (
        <div className="grid gap-3" aria-label={messages.loading}>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : workspace.query.isError ? (
        <div role="alert" className="grid gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <p>{messages.loadError}</p>
          <p>{errorMessage(workspace.query.error)}</p>
          <button
            type="button"
            onClick={() => void workspace.query.refetch()}
            className="min-h-11 w-fit rounded-md border border-current px-3 font-semibold"
          >
            {messages.retry}
          </button>
        </div>
      ) : (
        <TabsContent
          value={activeTab}
          id={`quality-panel-${activeTab}`}
          aria-labelledby={`quality-tab-${activeTab}`}
          className="grid gap-4"
        >
          {activeTab === 'inspections' && (
            <QcInspectionList
              inspections={data?.inspections ?? []}
              projectNames={projectNames}
              canCreate={canCreate}
              onCreate={() => setActiveForm('inspection')}
            />
          )}
          {activeTab === 'punch_list' && (
            <PunchListList
              items={data?.punchList ?? []}
              projectNames={projectNames}
              canCreate={canCreate}
              canEdit={canEdit}
              canClose={canClose}
              isSaving={isSaving}
              onCreate={() => setActiveForm('punch_list')}
              onAdvance={advancePunchList}
              onClose={closePunchList}
            />
          )}
        </TabsContent>
      )}
      </Tabs>
    </section>
  );
}
