export const EQUIPMENT_CATEGORIES = [
  'Alat Berat',
  'Alat Angkat',
  'Alat Cor',
  'Genset & Daya',
  'Peralatan Survei',
  'Scaffolding',
] as const;

export const EQUIPMENT_CONDITIONS = [
  'Sangat Baik',
  'Baik',
  'Perlu Perawatan',
  'Rusak / Perbaikan',
] as const;

export type EquipmentOwnership = 'internal_asset' | 'rental';
export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];
export type EquipmentCondition = (typeof EQUIPMENT_CONDITIONS)[number];

export interface EquipmentAsset {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  brand_model: string;
  category: EquipmentCategory;
  ownership: EquipmentOwnership;
  assigned_project_id: string | null;
  daily_rental_rate: number;
  condition: EquipmentCondition;
  fuel_consumption_rate: string;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
}

export interface EquipmentUsageEntry {
  id: string;
  organization_id: string;
  project_id: string;
  equipment_id: string;
  usage_date: string;
  operating_hours: number;
  fuel_liters: number;
  fuel_cost_amount: number;
  rental_cost_snapshot: number;
  notes: string;
}

export interface EquipmentMaintenanceLog {
  id: string;
  organization_id: string;
  project_id: string | null;
  equipment_id: string;
  maintenance_date: string;
  next_maintenance_date: string | null;
  description: string;
  cost_amount: number;
}

export interface EquipmentWorkspaceData {
  assets: EquipmentAsset[];
  usage: EquipmentUsageEntry[];
  maintenance: EquipmentMaintenanceLog[];
}
