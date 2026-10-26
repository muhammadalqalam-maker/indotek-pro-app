import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Boxes, Package, Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui/Toast';
import { getMessages } from '../../i18n';
import { fetchWarehouseData, recordWarehouseMovement, registerInventoryItem, updateInventoryMinimum } from './services/warehouse.service';
import type { WarehouseInventoryItem } from './types';
import { WarehouseMovementCard } from './components/WarehouseMovementCard';
import { WarehouseStockCard } from './components/WarehouseStockCard';
import { WarehouseSummaryCards } from './components/WarehouseSummaryCards';
import { WarehouseEmptyState } from './components/WarehouseEmptyState';
import { getInventoryStatus } from './utils/warehouse.helpers';
import { InventoryItemDialog } from './components/InventoryItemDialog';
import { MinimumStockDialog } from './components/MinimumStockDialog';
import { WarehouseMovementDialog } from './components/WarehouseMovementDialog';
import type {
  InventoryItemFormValues,
  MinimumStockFormValues,
  WarehouseMovementFormValues,
} from './schemas/warehouse.schema';

const messages = getMessages().warehouse;

export function WarehouseWorkspace() {
  const {
    currentOrg,
    projects,
    selectedProjectId,
    isSupabaseLive,
    can,
  } = useApp();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [isItemDialogOpen, setItemDialogOpen] = useState(false);
  const [isMovementDialogOpen, setMovementDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WarehouseInventoryItem | null>(null);

  const query = useQuery({
    queryKey: ['warehouse', currentOrg?.id, selectedProjectId],
    queryFn: () => {
      if (!currentOrg) throw new Error(messages.noOrganization);
      return fetchWarehouseData(currentOrg.id, selectedProjectId);
    },
    enabled: Boolean(currentOrg && isSupabaseLive),
  });
  const createItemMutation = useMutation({ mutationFn: registerInventoryItem });
  const updateMinimumMutation = useMutation({
    mutationFn: ({ itemId, minimumStock }: { itemId: string; minimumStock: number }) => {
      if (!currentOrg) throw new Error(messages.noOrganization);
      return updateInventoryMinimum(currentOrg.id, itemId, minimumStock);
    },
  });
  const movementMutation = useMutation({ mutationFn: recordWarehouseMovement });

  const inventoryItems = query.data?.inventoryItems ?? [];
  const movements = query.data?.movements ?? [];
  const canCreate = can('warehouse', 'create');
  const canEdit = can('warehouse', 'edit');
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const search = searchTerm.trim().toLocaleLowerCase();
  const filteredInventory = inventoryItems.filter((item) =>
    (selectedProjectId === 'all' || item.project_id === selectedProjectId)
    && (!search || [
      item.item_code,
      item.item_name,
      item.category,
      item.location_name,
      projectById.get(item.project_id) ?? '',
    ].some((value) => value.toLocaleLowerCase().includes(search))),
  );
  const filteredMovements = movements.filter((movement) => {
    const names = [
      movement.movement_number,
      movement.reference_doc,
      movement.source_item?.item_name ?? '',
      movement.destination_item?.item_name ?? '',
      movement.source_item?.location_name ?? '',
      movement.destination_item?.location_name ?? '',
    ];
    return !search || names.some((value) => value.toLocaleLowerCase().includes(search));
  });
  const month = new Date().toISOString().slice(0, 7);
  const lowCount = inventoryItems.filter((item) => getInventoryStatus(item) === 'low').length;
  const outOfStockCount = inventoryItems.filter((item) => getInventoryStatus(item) === 'out_of_stock').length;
  const monthlyMovementCount = movements.filter((movement) => movement.movement_date.startsWith(month)).length;
  const defaultProjectId = selectedProjectId === 'all'
    ? projects[0]?.id ?? ''
    : selectedProjectId;

  const refreshWarehouseData = async () => {
    if (!currentOrg) return;
    await queryClient.invalidateQueries({ queryKey: ['warehouse', currentOrg.id] });
  };

  const saveItem = async (values: InventoryItemFormValues) => {
    if (!currentOrg) throw new Error(messages.noOrganization);
    await createItemMutation.mutateAsync({
      organizationId: currentOrg.id,
      projectId: values.projectId,
      itemCode: values.itemCode,
      itemName: values.itemName,
      category: values.category,
      unit: values.unit,
      locationName: values.locationName,
      minimumStock: values.minimumStock,
    });
    await refreshWarehouseData();
    toast({ title: messages.itemCreated, variant: 'success' });
  };

  const saveMinimum = async (values: MinimumStockFormValues) => {
    if (!editingItem) return;
    await updateMinimumMutation.mutateAsync({
      itemId: editingItem.id,
      minimumStock: values.minimumStock,
    });
    await refreshWarehouseData();
    toast({ title: messages.minimumUpdated, variant: 'success' });
  };

  const saveMovement = async (values: WarehouseMovementFormValues) => {
    if (!currentOrg) throw new Error(messages.noOrganization);
    const adjustmentIncrease = values.movementType === 'adjustment'
      && values.adjustmentDirection === 'increase';
    const movementType = values.movementType;
    await movementMutation.mutateAsync({
      organizationId: currentOrg.id,
      movementType,
      quantity: values.quantity,
      movementDate: values.movementDate,
      sourceInventoryItemId: movementType === 'out'
        || (movementType === 'adjustment' && !adjustmentIncrease)
        || movementType === 'transfer'
        ? values.sourceInventoryItemId || null
        : null,
      destinationInventoryItemId: movementType === 'in'
        || movementType === 'transfer'
        || (movementType === 'adjustment' && adjustmentIncrease)
        ? values.destinationInventoryItemId || null
        : null,
      referenceDoc: values.referenceDoc,
      recipientOrSupplier: values.recipientOrSupplier,
      notes: values.notes,
    });
    await refreshWarehouseData();
    toast({ title: messages.movementCreated, variant: 'success' });
  };

  if (!can('warehouse', 'view')) {
    return (
      <section className="rounded-xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger" role="alert">
        {messages.noPermission}
      </section>
    );
  }

  if (!currentOrg) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground" role="status">
        {messages.noOrganization}
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="warehouse-page-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 id="warehouse-page-title" className="text-2xl font-bold tracking-tight text-text">{messages.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{messages.description}</p>
        </div>
        {canCreate && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!isSupabaseLive || projects.length === 0}
              onClick={() => setItemDialogOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-text hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              {messages.createItem}
            </button>
            <button
              type="button"
              disabled={!isSupabaseLive || inventoryItems.length === 0}
              onClick={() => setMovementDialogOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {messages.createMovement}
            </button>
          </div>
        )}
      </header>

      {!isSupabaseLive && (
        <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          {messages.liveUnavailable}
        </p>
      )}

      {query.isError && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="break-words text-sm text-danger">
            {messages.loadFailed} {query.error instanceof Error ? query.error.message : ''}
          </p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-danger/30 px-4 text-sm font-semibold text-danger"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {messages.retry}
          </button>
        </div>
      )}

      {query.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={messages.loading}>
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="h-24 animate-pulse rounded-xl border border-border bg-surface-2" />
          ))}
        </div>
      ) : query.data && (
        <>
          <WarehouseSummaryCards inventoryItems={inventoryItems} movements={movements} />

          <div className="flex min-w-0 gap-2 overflow-x-auto border-b border-border" role="tablist" aria-label={messages.title}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'inventory'}
              onClick={() => setActiveTab('inventory')}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${activeTab === 'inventory' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-foreground'}`}
            >
              <Boxes className="h-4 w-4" aria-hidden="true" />
              {messages.inventory} ({filteredInventory.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'movements'}
              onClick={() => setActiveTab('movements')}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold ${activeTab === 'movements' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-foreground'}`}
            >
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              {messages.movementLog} ({filteredMovements.length})
            </button>
          </div>

          <label className="block max-w-xl">
            <span className="sr-only">{messages.search}</span>
            <input
              type="search"
              placeholder={messages.search}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text placeholder:text-muted-foreground"
            />
          </label>

          {activeTab === 'inventory' ? (
            filteredInventory.length === 0 ? (
              <WarehouseEmptyState
                icon={Package}
                title={messages.noInventory}
                description={messages.noInventoryHint}
                action={canCreate && projects.length > 0 ? () => setItemDialogOpen(true) : undefined}
                actionLabel={messages.createItem}
              />
            ) : (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredInventory.map((item) => (
                  <WarehouseStockCard
                    key={item.id}
                    item={item}
                    projects={projects}
                    canEdit={can('warehouse', 'edit')}
                    onEditMinimum={setEditingItem}
                  />
                ))}
              </div>
            )
          ) : filteredMovements.length === 0 ? (
            <WarehouseEmptyState
              icon={ArrowRightLeft}
              title={messages.noMovements}
              description={messages.noMovementsHint}
              action={canCreate && inventoryItems.length > 0 ? () => setMovementDialogOpen(true) : undefined}
              actionLabel={messages.createMovement}
            />
          ) : (
            <div className="grid min-w-0 gap-3">
              {filteredMovements.map((movement) => (
                <WarehouseMovementCard key={movement.id} movement={movement} projects={projects} />
              ))}
              <p className="text-center text-xs text-muted-foreground">{messages.limitNote}</p>
            </div>
          )}
        </>
      )}

      {isItemDialogOpen && (
        <InventoryItemDialog
          projects={projects}
          defaultProjectId={defaultProjectId}
          onClose={() => setItemDialogOpen(false)}
          onSave={saveItem}
        />
      )}
      {editingItem && (
        <MinimumStockDialog
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={saveMinimum}
        />
      )}
      {isMovementDialogOpen && (
        <WarehouseMovementDialog
          inventoryItems={inventoryItems}
          projects={projects}
          onClose={() => setMovementDialogOpen(false)}
          onSave={saveMovement}
        />
      )}
    </section>
  );
}
