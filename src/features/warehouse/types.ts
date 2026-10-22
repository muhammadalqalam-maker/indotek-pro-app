export type WarehouseMovementType = 'in' | 'out' | 'transfer' | 'adjustment';

export interface WarehouseInventoryItem {
  id: string;
  organization_id: string;
  project_id: string;
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
  location_name: string;
  current_stock: number;
  minimum_stock: number;
  last_movement_date: string | null;
}

export interface WarehouseMovement {
  id: string;
  movement_number: string;
  movement_date: string;
  movement_type: WarehouseMovementType;
  quantity: number;
  source_project_id: string | null;
  destination_project_id: string | null;
  source_item: WarehouseInventoryItem | null;
  destination_item: WarehouseInventoryItem | null;
  reference_doc: string;
  recipient_or_supplier: string;
  notes: string;
}

export interface CreateInventoryItemInput {
  organizationId: string;
  projectId: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  locationName: string;
  minimumStock: number;
}

export interface RecordWarehouseMovementInput {
  organizationId: string;
  movementType: WarehouseMovementType;
  quantity: number;
  movementDate: string;
  sourceInventoryItemId: string | null;
  destinationInventoryItemId: string | null;
  referenceDoc: string;
  recipientOrSupplier: string;
  notes: string;
}
