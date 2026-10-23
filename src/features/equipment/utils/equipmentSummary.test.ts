import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { EquipmentAsset, EquipmentMaintenanceLog, EquipmentUsageEntry } from '../types';
import { buildEquipmentSummary, getEquipmentTotalHours } from './equipmentSummary';

const assets: EquipmentAsset[] = [{
  id: 'equipment-1',
  organization_id: 'organization-1',
  code: 'EQ-01',
  name: 'Excavator',
  brand_model: 'Model X',
  category: 'Alat Berat',
  ownership: 'rental',
  assigned_project_id: 'project-1',
  daily_rental_rate: 2_500_000,
  condition: 'Baik',
  fuel_consumption_rate: '',
  last_maintenance_date: null,
  next_maintenance_date: '2026-10-22',
}];

const usage: EquipmentUsageEntry[] = [{
  id: 'usage-1',
  organization_id: 'organization-1',
  project_id: 'project-1',
  equipment_id: 'equipment-1',
  usage_date: '2026-10-22',
  operating_hours: 6.5,
  fuel_liters: 40,
  fuel_cost_amount: 520_000,
  rental_cost_snapshot: 2_500_000,
  notes: '',
}];

const maintenance: EquipmentMaintenanceLog[] = [{
  id: 'maintenance-1',
  organization_id: 'organization-1',
  project_id: 'project-1',
  equipment_id: 'equipment-1',
  maintenance_date: '2026-10-20',
  next_maintenance_date: '2026-11-20',
  description: 'Servis berkala',
  cost_amount: 750_000,
}];

describe('equipment summary', () => {
  it('totals rental, fuel, maintenance, operating time and due maintenance', () => {
    assert.deepEqual(buildEquipmentSummary(assets, usage, maintenance, '2026-10-23'), {
      assetCount: 1,
      readyCount: 1,
      operatingHours: 6.5,
      rentalCost: 2_500_000,
      fuelCost: 520_000,
      maintenanceCost: 750_000,
      dueMaintenanceCount: 1,
    });
  });

  it('sums recorded operating hours by equipment', () => {
    assert.equal(getEquipmentTotalHours('equipment-1', usage), 6.5);
    assert.equal(getEquipmentTotalHours('missing', usage), 0);
  });
});
