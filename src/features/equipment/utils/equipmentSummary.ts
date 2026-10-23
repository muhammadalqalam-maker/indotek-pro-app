import type {
  EquipmentAsset,
  EquipmentMaintenanceLog,
  EquipmentUsageEntry,
} from '../types';

export interface EquipmentSummary {
  assetCount: number;
  readyCount: number;
  operatingHours: number;
  rentalCost: number;
  fuelCost: number;
  maintenanceCost: number;
  dueMaintenanceCount: number;
}

export function buildEquipmentSummary(
  assets: EquipmentAsset[],
  usage: EquipmentUsageEntry[],
  maintenance: EquipmentMaintenanceLog[],
  today: string,
): EquipmentSummary {
  return {
    assetCount: assets.length,
    readyCount: assets.filter((asset) => (
      asset.condition === 'Sangat Baik' || asset.condition === 'Baik'
    )).length,
    operatingHours: usage.reduce((total, entry) => total + entry.operating_hours, 0),
    rentalCost: usage.reduce((total, entry) => total + entry.rental_cost_snapshot, 0),
    fuelCost: usage.reduce((total, entry) => total + entry.fuel_cost_amount, 0),
    maintenanceCost: maintenance.reduce((total, entry) => total + entry.cost_amount, 0),
    dueMaintenanceCount: assets.filter((asset) => (
      asset.next_maintenance_date !== null
      && asset.next_maintenance_date <= today
    )).length,
  };
}

export function getEquipmentTotalHours(
  assetId: string,
  usage: EquipmentUsageEntry[],
): number {
  return usage.reduce(
    (total, entry) => total + (entry.equipment_id === assetId ? entry.operating_hours : 0),
    0,
  );
}
