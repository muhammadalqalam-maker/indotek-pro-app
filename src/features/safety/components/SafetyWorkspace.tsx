import { useMemo, useState } from 'react';
import { Plus, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { Skeleton } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { useSafetyWorkspace } from '../hooks/useSafetyWorkspace';
import type { SafetyIncidentActionValues } from '../schemas/safety.schema';
import type { SafetyIncident } from '../types';
import { SafetyIncidentForm } from './SafetyIncidentForm';
import { SafetyIncidentList } from './SafetyIncidentList';
import { SafetyInspectionForm } from './SafetyInspectionForm';
import { SafetyInspectionList } from './SafetyInspectionList';
import { ToolboxMeetingForm } from './ToolboxMeetingForm';
import { ToolboxMeetingList } from './ToolboxMeetingList';

const messages = getMessages().safety;
type SafetyTab = 'inspections' | 'incidents' | 'toolbox';
const tabIcons = {
  inspections: ShieldCheck,
  incidents: ShieldAlert,
  toolbox: Users,
} satisfies Record<SafetyTab, typeof ShieldCheck>;

export function SafetyWorkspace() {
  const {
    currentOrg,
    projects,
    selectedProjectId,
    isSupabaseLive,
    can,
    organizationDataError,
  } = useApp();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SafetyTab>('inspections');
  const [activeForm, setActiveForm] = useState<SafetyTab | null>(null);
  const [activeIncidentActionId, setActiveIncidentActionId] = useState<string | null>(null);
  const workspace = useSafetyWorkspace(
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
  const openIncidentCount = data?.incidents.filter((incident) => incident.status !== 'closed').length ?? 0;
  const unresolvedFindingCount = data?.inspections
    .flatMap((inspection) => inspection.items)
    .filter((item) => item.result === 'non_compliant').length ?? 0;
  const selectedProjectDefault = selectedProjectId === 'all' ? '' : selectedProjectId;
  const hasConnection = Boolean(isSupabaseLive && currentOrg);

  const saveInspection = async (values: Parameters<typeof workspace.createInspection.mutateAsync>[0]) => {
    await workspace.createInspection.mutateAsync(values);
    setActiveForm(null);
    toast({ title: messages.inspectionSaved, variant: 'success' });
  };
  const saveIncident = async (values: Parameters<typeof workspace.createIncident.mutateAsync>[0]) => {
    await workspace.createIncident.mutateAsync(values);
    setActiveForm(null);
    toast({ title: messages.incidentSaved, variant: 'success' });
  };
  const saveToolbox = async (values: Parameters<typeof workspace.createToolbox.mutateAsync>[0]) => {
    await workspace.createToolbox.mutateAsync(values);
    setActiveForm(null);
    toast({ title: messages.toolboxSaved, variant: 'success' });
  };
  const saveIncidentAction = async (incidentId: string, values: SafetyIncidentActionValues) => {
    await workspace.updateIncidentStatus.mutateAsync({
      incidentId,
      status: 'action_taken',
      corrective_action: values.corrective_action,
    });
    setActiveIncidentActionId(null);
    toast({ title: messages.incidentStatusSaved, variant: 'success' });
  };
  const closeIncident = async (incidentId: string) => {
    try {
      await workspace.updateIncidentStatus.mutateAsync({ incidentId, status: 'closed' });
      toast({ title: messages.incidentStatusSaved, variant: 'success' });
    } catch {
      toast({ title: messages.errorStatusUpdate, variant: 'error' });
    }
  };

  const tabs: { id: SafetyTab; label: string; count: number }[] = [
    { id: 'inspections', label: messages.inspectionsTab, count: data?.inspections.length ?? 0 },
    { id: 'incidents', label: messages.incidentsTab, count: data?.incidents.length ?? 0 },
    { id: 'toolbox', label: messages.toolboxTab, count: data?.toolboxMeetings.length ?? 0 },
  ];
  const addLabels: Record<SafetyTab, string> = {
    inspections: messages.addInspection,
    incidents: messages.addIncident,
    toolbox: messages.addToolbox,
  };

  return (
    <section className="grid gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">{messages.title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">{messages.description}</p>
        </div>
        {canCreate && !activeForm && !activeIncidentActionId && (
          <button
            type="button"
            onClick={() => {
              setActiveIncidentActionId(null);
              setActiveForm(activeTab);
            }}
            disabled={projects.length === 0}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Plus className="size-4" aria-hidden="true" />
            {addLabels[activeTab]}
          </button>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: messages.inspections, value: data?.inspections.length ?? 0 },
          { label: messages.incidentsOpen, value: openIncidentCount },
          { label: messages.toolboxMeetings, value: data?.toolboxMeetings.length ?? 0 },
          { label: messages.findingsOpen, value: unresolvedFindingCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-text">{value}</p>
          </div>
        ))}
      </div>
      {projects.length === 0 && (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">{messages.noProjects}</p>
      )}

      <div role="tablist" aria-label={messages.title} className="flex gap-2 overflow-x-auto border-b border-border">
        {tabs.map(({ id, label, count }) => {
          const Icon = tabIcons[id];
          return (
            <button
              key={id}
              id={`safety-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`safety-panel-${id}`}
              disabled={activeForm !== null || activeIncidentActionId !== null}
              onClick={() => {
                setActiveTab(id);
                setActiveForm(null);
                setActiveIncidentActionId(null);
              }}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${
                activeTab === id ? 'border-primary-500 text-primary-700 dark:text-primary-500' : 'border-transparent text-muted hover:text-text'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {hasConnection && activeForm === 'inspections' && (
        <SafetyInspectionForm
          projects={projects}
          defaultProjectId={selectedProjectDefault}
          isSaving={workspace.createInspection.isPending}
          onCancel={() => setActiveForm(null)}
          onSave={saveInspection}
        />
      )}
      {hasConnection && activeForm === 'incidents' && (
        <SafetyIncidentForm
          projects={projects}
          defaultProjectId={selectedProjectDefault}
          isSaving={workspace.createIncident.isPending}
          onCancel={() => setActiveForm(null)}
          onSave={saveIncident}
        />
      )}
      {hasConnection && activeForm === 'toolbox' && (
        <ToolboxMeetingForm
          projects={projects}
          defaultProjectId={selectedProjectDefault}
          isSaving={workspace.createToolbox.isPending}
          onCancel={() => setActiveForm(null)}
          onSave={saveToolbox}
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
          <button
            type="button"
            onClick={() => void workspace.query.refetch()}
            className="min-h-11 w-fit rounded-md border border-current px-3 font-semibold"
          >
            {messages.retry}
          </button>
        </div>
      ) : (
        <div
          id={`safety-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`safety-tab-${activeTab}`}
          className="grid gap-3"
        >
          {activeTab === 'inspections' && (
            <SafetyInspectionList
              inspections={data?.inspections ?? []}
              projectNames={projectNames}
              canCreate={canCreate}
              onCreate={() => setActiveForm('inspections')}
            />
          )}
          {activeTab === 'incidents' && (
            <SafetyIncidentList
              incidents={data?.incidents ?? []}
              projectNames={projectNames}
              canCreate={canCreate}
              canEdit={canEdit}
              isSaving={workspace.updateIncidentStatus.isPending}
              activeActionId={activeIncidentActionId}
              onCreate={() => setActiveForm('incidents')}
              onStartAction={setActiveIncidentActionId}
              onCancelAction={() => setActiveIncidentActionId(null)}
              onSaveAction={saveIncidentAction}
              onCloseIncident={(incidentId) => void closeIncident(incidentId)}
            />
          )}
          {activeTab === 'toolbox' && (
            <ToolboxMeetingList
              meetings={data?.toolboxMeetings ?? []}
              projectNames={projectNames}
              canCreate={canCreate}
              onCreate={() => setActiveForm('toolbox')}
            />
          )}
        </div>
      )}
    </section>
  );
}
