import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database.types';
import type {
  CreateInventoryItemInput,
  RecordWarehouseMovementInput,
  WarehouseInventoryItem,
  WarehouseMovement,
  WarehouseMovementType,
} from '../types';

type InventoryRow = Database['public']['Tables']['inventory_items']['Row'];
type MovementRow = Database['public']['Tables']['stock_movements']['Row'];

function getClient(): SupabaseClient<Database> {
  const client = getSupabase();
  if (!client) throw new Error('Data gudang memerlukan koneksi Supabase.');
  return client as SupabaseClient<Database>;
}

function parseMovementType(value: string): WarehouseMovementType {
  if (value === 'in' || value === 'out' || value === 'transfer' || value === 'adjustment') {
    return value;
  }
  throw new Error('Jenis mutasi gudang tidak dikenal.');
}

function toInventoryItem(row: InventoryRow): WarehouseInventoryItem {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    item_code: row.item_code,
    item_name: row.item_name,
    category: row.category,
    unit: row.unit,
    location_name: row.location_name,
    current_stock: Number(row.current_stock),
    minimum_stock: Number(row.minimum_stock),
    last_movement_date: row.last_movement_date,
  };
}

export async function fetchWarehouseData(
  organizationId: string,
  projectId: string,
): Promise<{ inventoryItems: WarehouseInventoryItem[]; movements: WarehouseMovement[] }> {
  const client = getClient();
  let inventoryQuery = client
    .from('inventory_items')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('item_name', { ascending: true });
  let movementQuery = client
    .from('stock_movements')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300);

  if (projectId !== 'all') {
    movementQuery = movementQuery.or(
      `source_project_id.eq.${projectId},destination_project_id.eq.${projectId}`,
    );
  }

  const [inventoryResult, movementResult] = await Promise.all([
    inventoryQuery,
    movementQuery,
  ]);
  if (inventoryResult.error) throw inventoryResult.error;
  if (movementResult.error) throw movementResult.error;

  const movementRows: MovementRow[] = movementResult.data;
  const relatedItemIds = [...new Set(
    movementRows.flatMap((row) => [
      row.source_inventory_item_id,
      row.destination_inventory_item_id,
    ].filter((id): id is string => id !== null)),
  )];
  let relatedRows: InventoryRow[] = [];
  if (relatedItemIds.length > 0) {
    const { data, error } = await client
      .from('inventory_items')
      .select('*')
      .eq('organization_id', organizationId)
      .in('id', relatedItemIds);
    if (error) throw error;
    relatedRows = data;
  }

  const itemById = new Map(
    [...inventoryResult.data, ...relatedRows].map((row) => [row.id, toInventoryItem(row)]),
  );
  return {
    inventoryItems: inventoryResult.data.map(toInventoryItem),
    movements: movementRows.map((row) => ({
      id: row.id,
      movement_number: row.movement_number,
      movement_date: row.movement_date,
      movement_type: parseMovementType(row.movement_type),
      quantity: Number(row.quantity),
      source_project_id: row.source_project_id,
      destination_project_id: row.destination_project_id,
      source_item: row.source_inventory_item_id
        ? itemById.get(row.source_inventory_item_id) ?? null
        : null,
      destination_item: row.destination_inventory_item_id
        ? itemById.get(row.destination_inventory_item_id) ?? null
        : null,
      reference_doc: row.reference_doc,
      recipient_or_supplier: row.recipient_or_supplier,
      notes: row.notes,
    })),
  };
}

export async function registerInventoryItem(input: CreateInventoryItemInput): Promise<string> {
  const { data, error } = await getClient().rpc('register_inventory_item', {
    p_organization_id: input.organizationId,
    p_project_id: input.projectId,
    p_item_code: input.itemCode,
    p_item_name: input.itemName,
    p_category: input.category,
    p_unit: input.unit,
    p_location_name: input.locationName,
    p_minimum_stock: input.minimumStock,
  });
  if (error) throw error;
  return data;
}

export async function updateInventoryMinimum(
  organizationId: string,
  itemId: string,
  minimumStock: number,
): Promise<void> {
  const { error } = await getClient().rpc('update_inventory_minimum', {
    p_organization_id: organizationId,
    p_inventory_item_id: itemId,
    p_minimum_stock: minimumStock,
  });
  if (error) throw error;
}

export async function recordWarehouseMovement(
  input: RecordWarehouseMovementInput,
): Promise<string> {
  const { data, error } = await getClient().rpc('record_stock_movement', {
    p_organization_id: input.organizationId,
    p_movement_type: input.movementType,
    p_quantity: input.quantity,
    p_movement_date: input.movementDate,
    p_source_inventory_item_id: input.sourceInventoryItemId,
    p_destination_inventory_item_id: input.destinationInventoryItemId,
    p_reference_doc: input.referenceDoc,
    p_recipient_or_supplier: input.recipientOrSupplier,
    p_notes: input.notes,
  });
  if (error) throw error;
  return data;
}
