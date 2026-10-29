import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, Boxes, Package, Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Button,
  Card,
  CardContent,
  Input,
  PageHeader,
  PageShell,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '../../components/ui';
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
    return <p className="rounded-lg border border-danger/30 bg-danger-bg p-4 text-sm text-danger" role="alert">{messages.noPermission}</p>;
  }

  if (!currentOrg) {
    return <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted-foreground" role="status">{messages.noOrganization}</p>;
  }

  return (
    <PageShell
      className="mx-auto max-w-6xl min-w-0"
      header={(
        <PageHeader
          title={messages.title}
          description={messages.description}
          actions={canCreate ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={!isSupabaseLive || projects.length === 0}
                onClick={() => setItemDialogOpen(true)}
              >
                <Package className="size-4" aria-hidden="true" />
                {messages.createItem}
              </Button>
              <Button
                type="button"
                disabled={!isSupabaseLive || inventoryItems.length === 0}
                onClick={() => setMovementDialogOpen(true)}
              >
                <Plus className="size-4" aria-hidden="true" />
                {messages.createMovement}
              </Button>
            </>
          ) : undefined}
        />
      )}
    >

      {!isSupabaseLive && (
        <p role="status" className="rounded-lg border border-warning/30 bg-warning-bg p-3 text-sm text-warning">
          {messages.liveUnavailable}
        </p>
      )}

      {query.isError && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger-bg p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="break-words text-sm text-danger">
            {messages.loadFailed} {query.error instanceof Error ? query.error.message : ''}
          </p>
          <Button type="button" variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {messages.retry}
          </Button>
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

          <Tabs value={activeTab} onValueChange={(value) => {
            if (value === 'inventory' || value === 'movements') setActiveTab(value);
          }}>
          <TabsList aria-label={messages.title}>
            <TabsTrigger
              value="inventory"
              type="button"
            >
              <Boxes className="h-4 w-4" aria-hidden="true" />
              {messages.inventory} ({filteredInventory.length})
            </TabsTrigger>
            <TabsTrigger
              value="movements"
              type="button"
            >
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
              {messages.movementLog} ({filteredMovements.length})
            </TabsTrigger>
          </TabsList>

          <Card>
            <CardContent className="p-4">
              <Input
                label={messages.search}
                type="search"
                placeholder={messages.search}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
              />
            </CardContent>
          </Card>

          <TabsContent value={activeTab}>
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
          </TabsContent>
          </Tabs>
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
    </PageShell>
  );
}
