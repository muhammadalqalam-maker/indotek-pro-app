import { useMemo, useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Input,
  PageHeader,
  PageShell,
  Skeleton,
  Tabs,
  TabsContent,
  useToast,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { EquipmentAssetCard } from './components/EquipmentAssetCard';
import { EquipmentAssetForm } from './components/EquipmentAssetForm';
import { EquipmentMaintenanceCard } from './components/EquipmentMaintenanceCard';
import { EquipmentMaintenanceForm } from './components/EquipmentMaintenanceForm';
import { EquipmentSummaryPanel } from './components/EquipmentSummaryPanel';
import { EquipmentUsageCard } from './components/EquipmentUsageCard';
import { EquipmentUsageForm } from './components/EquipmentUsageForm';
import { EquipmentWorkspaceTabs, type EquipmentTab } from './components/EquipmentWorkspaceTabs';
import { useEquipmentWorkspace } from './hooks/useEquipmentWorkspace';
import type { EquipmentAsset } from './types';
import { getCurrentMonth, getLocalDate, getMonthRange } from './utils/equipmentDate';
import { buildEquipmentSummary } from './utils/equipmentSummary';

const messages = getMessages().equipment;

export function EquipmentView() {
  const {
    currentOrg,
    projects,
    selectedProjectId,
    isSupabaseLive,
    can,
    organizationDataError,
  } = useApp();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<EquipmentTab>('assets');
  const [month, setMonth] = useState(getCurrentMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [assetForm, setAssetForm] = useState<EquipmentAsset | null | undefined>(undefined);
  const [usageFormOpen, setUsageFormOpen] = useState(false);
  const [maintenanceFormOpen, setMaintenanceFormOpen] = useState(false);
  const period = useMemo(() => getMonthRange(month), [month]);
  const workspace = useEquipmentWorkspace(
    currentOrg?.id ?? '',
    selectedProjectId,
    period.start,
    period.end,
    isSupabaseLive,
  );
  const assets = workspace.query.data?.assets ?? [];
  const usage = workspace.query.data?.usage ?? [];
  const maintenance = workspace.query.data?.maintenance ?? [];
  const today = getLocalDate();
  const summary = useMemo(
    () => buildEquipmentSummary(assets, usage, maintenance, today),
    [assets, usage, maintenance, today],
  );
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );
  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);
  const search = searchTerm.trim().toLocaleLowerCase();
  const filteredAssets = assets.filter((asset) => (
    !search || [asset.code, asset.name, asset.brand_model, asset.category]
      .some((value) => value.toLocaleLowerCase().includes(search))
  ));
  const filteredUsage = usage.filter((entry) => {
    const asset = assetById.get(entry.equipment_id);
    return !search || [
      asset?.code ?? '',
      asset?.name ?? '',
      projectById.get(entry.project_id) ?? '',
      entry.notes,
    ].some((value) => value.toLocaleLowerCase().includes(search));
  });
  const filteredMaintenance = maintenance.filter((entry) => {
    const asset = assetById.get(entry.equipment_id);
    return !search || [
      asset?.code ?? '',
      asset?.name ?? '',
      entry.description,
      projectById.get(entry.project_id ?? '') ?? '',
    ].some((value) => value.toLocaleLowerCase().includes(search));
  });
  const canCreate = can('warehouse', 'create');
  const canEdit = can('warehouse', 'edit');

  const saveAsset = async (values: Parameters<typeof workspace.createAsset.mutateAsync>[0]) => {
    if (assetForm) {
      await workspace.updateAsset.mutateAsync({ equipmentId: assetForm.id, values });
    } else {
      await workspace.createAsset.mutateAsync(values);
    }
    setAssetForm(undefined);
    toast({ title: messages.assetSaved, variant: 'success' });
  };

  const saveUsage = async (values: Parameters<typeof workspace.createUsage.mutateAsync>[0]) => {
    await workspace.createUsage.mutateAsync(values);
    setUsageFormOpen(false);
    toast({ title: messages.usageSaved, variant: 'success' });
  };

  const saveMaintenance = async (values: Parameters<typeof workspace.createMaintenance.mutateAsync>[0]) => {
    await workspace.createMaintenance.mutateAsync(values);
    setMaintenanceFormOpen(false);
    toast({ title: messages.maintenanceSaved, variant: 'success' });
  };

  if (!can('warehouse', 'view')) {
    return <p role="alert" className="rounded-lg border border-danger/30 bg-danger-bg p-4 text-sm text-danger">Akun Anda tidak memiliki izin untuk melihat peralatan.</p>;
  }

  return (
    <PageShell
      className="mx-auto max-w-6xl min-w-0"
      header={(
        <PageHeader
          title={messages.title}
          description={messages.description}
          actions={canCreate ? (
            <Button
            type="button"
            onClick={() => setAssetForm(null)}
          >
            <Plus className="size-4" aria-hidden="true" />
            {messages.addAsset}
          </Button>
          ) : undefined}
        />
      )}
    >

      <EquipmentSummaryPanel summary={summary} />

      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Input
            type="search"
            label={messages.search}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
          />
          <label className="grid gap-1.5 text-sm font-medium text-text">
            {messages.usageDate}
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value || getCurrentMonth())}
              className="min-h-11 rounded-md border border-border bg-surface px-3 text-base text-text"
            />
          </label>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === 'assets' || value === 'usage' || value === 'maintenance') setActiveTab(value);
      }}>
      <EquipmentWorkspaceTabs />

      {assetForm !== undefined && (
        <EquipmentAssetForm
          key={assetForm?.id ?? 'new'}
          asset={assetForm}
          projects={projects}
          defaultProjectId={selectedProjectId === 'all' ? '' : selectedProjectId}
          isSaving={workspace.createAsset.isPending || workspace.updateAsset.isPending}
          onCancel={() => setAssetForm(undefined)}
          onSave={saveAsset}
        />
      )}
      {usageFormOpen && (
        <EquipmentUsageForm
          key={`${selectedProjectId}-${projects.length}`}
          assets={assets}
          projects={projects}
          defaultProjectId={selectedProjectId === 'all' ? '' : selectedProjectId}
          isSaving={workspace.createUsage.isPending}
          onCancel={() => setUsageFormOpen(false)}
          onSave={saveUsage}
        />
      )}
      {maintenanceFormOpen && (
        <EquipmentMaintenanceForm
          key={assets.map((asset) => asset.id).join(':')}
          assets={assets}
          isSaving={workspace.createMaintenance.isPending}
          onCancel={() => setMaintenanceFormOpen(false)}
          onSave={saveMaintenance}
        />
      )}

      {!isSupabaseLive ? (
        <section role="status" className="rounded-xl border border-warning/30 bg-warning-bg p-4 text-sm text-warning">{messages.loadError}</section>
      ) : !currentOrg ? (
        <section role="alert" className="rounded-xl border border-danger/30 bg-danger-bg p-4 text-sm text-danger">
          {organizationDataError || messages.loadError}
        </section>
      ) : workspace.query.isPending ? (
        <div className="grid gap-3" aria-label={messages.loading}>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : workspace.query.isError ? (
        <section role="alert" className="grid gap-3 rounded-xl border border-danger/30 bg-danger-bg p-4 text-sm text-danger">
          <p>{messages.loadError}</p>
          <Button type="button" variant="outline" onClick={() => void workspace.query.refetch()}>
            {messages.retry}
          </Button>
        </section>
      ) : (
        <TabsContent value={activeTab}>
        <section className="grid gap-3">
          {activeTab === 'assets' && (
            filteredAssets.length === 0 ? (
              <Card>
              <CardContent className="p-6 text-center">
                <Wrench className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-text">{messages.noAssets}</p>
                {canCreate && (
                  <Button type="button" onClick={() => setAssetForm(null)} className="mt-4">
                    {messages.addAsset}
                  </Button>
                )}
              </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredAssets.map((asset) => (
                  <EquipmentAssetCard
                    key={asset.id}
                    asset={asset}
                    projectName={asset.assigned_project_id ? projectById.get(asset.assigned_project_id) ?? messages.unassigned : messages.unassigned}
                    usage={usage}
                    today={today}
                    canEdit={canEdit}
                    onEdit={() => setAssetForm(asset)}
                  />
                ))}
              </div>
            )
          )}

          {activeTab === 'usage' && (
            <>
              {canCreate && (
                <Button type="button" onClick={() => setUsageFormOpen((open) => !open)} disabled={projects.length === 0 || assets.length === 0}>
                  <Plus className="size-4" aria-hidden="true" />
                  {messages.recordUsage}
                </Button>
              )}
              {projects.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">{messages.noProjects}</p>
              ) : filteredUsage.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">{messages.noUsage}</p>
              ) : filteredUsage.map((entry) => (
                <EquipmentUsageCard
                  key={entry.id}
                  entry={entry}
                  assetName={assetById.get(entry.equipment_id)?.name ?? messages.equipment}
                  projectName={projectById.get(entry.project_id) ?? messages.project}
                />
              ))}
            </>
          )}

          {activeTab === 'maintenance' && (
            <>
              {canCreate && (
                <Button type="button" onClick={() => setMaintenanceFormOpen((open) => !open)} disabled={assets.length === 0}>
                  <Plus className="size-4" aria-hidden="true" />
                  {messages.recordMaintenance}
                </Button>
              )}
              {filteredMaintenance.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">{messages.noMaintenance}</p>
              ) : filteredMaintenance.map((entry) => (
                <EquipmentMaintenanceCard
                  key={entry.id}
                  entry={entry}
                  assetName={assetById.get(entry.equipment_id)?.name ?? messages.equipment}
                  projectName={entry.project_id ? projectById.get(entry.project_id) ?? messages.project : messages.unassigned}
                />
              ))}
            </>
          )}
        </section>
        </TabsContent>
      )}
      </Tabs>
    </PageShell>
  );
}
