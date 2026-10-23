import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database.types';
import type {
  EquipmentAsset,
  EquipmentMaintenanceLog,
  EquipmentUsageEntry,
  EquipmentWorkspaceData,
} from '../types';
import type {
  EquipmentAssetFormValues,
  EquipmentMaintenanceFormValues,
  EquipmentUsageFormValues,
} from '../schemas/equipment.schema';

type AssetRow = Database['public']['Tables']['equipment_assets']['Row'];
type UsageRow = Database['public']['Tables']['equipment_usage_entries']['Row'];
type MaintenanceRow = Database['public']['Tables']['equipment_maintenance_logs']['Row'];

function getClient(): SupabaseClient<Database> {
  const client = getSupabase();
  if (!client) throw new Error('Data peralatan memerlukan koneksi Supabase.');
  return client as SupabaseClient<Database>;
}

function toAsset(row: AssetRow): EquipmentAsset {
  return {
    id: row.id,
    organization_id: row.organization_id,
    code: row.code,
    name: row.name,
    brand_model: row.brand_model,
    category: row.category as EquipmentAsset['category'],
    ownership: row.ownership as EquipmentAsset['ownership'],
    assigned_project_id: row.assigned_project_id,
    daily_rental_rate: Number(row.daily_rental_rate),
    condition: row.condition as EquipmentAsset['condition'],
    fuel_consumption_rate: row.fuel_consumption_rate,
    last_maintenance_date: row.last_maintenance_date,
    next_maintenance_date: row.next_maintenance_date,
  };
}

function toUsage(row: UsageRow): EquipmentUsageEntry {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    equipment_id: row.equipment_id,
    usage_date: row.usage_date,
    operating_hours: Number(row.operating_hours),
    fuel_liters: Number(row.fuel_liters),
    fuel_cost_amount: Number(row.fuel_cost_amount),
    rental_cost_snapshot: Number(row.rental_cost_snapshot),
    notes: row.notes,
  };
}

function toMaintenance(row: MaintenanceRow): EquipmentMaintenanceLog {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    equipment_id: row.equipment_id,
    maintenance_date: row.maintenance_date,
    next_maintenance_date: row.next_maintenance_date,
    description: row.description,
    cost_amount: Number(row.cost_amount),
  };
}

export async function fetchEquipmentWorkspace(
  organizationId: string,
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<EquipmentWorkspaceData> {
  const client = getClient();
  let assetsQuery = client.from('equipment_assets')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  let usageQuery = client.from('equipment_usage_entries')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('usage_date', startDate)
    .lte('usage_date', endDate)
    .is('deleted_at', null)
    .order('usage_date', { ascending: false });
  let maintenanceQuery = client.from('equipment_maintenance_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('maintenance_date', startDate)
    .lte('maintenance_date', endDate)
    .is('deleted_at', null)
    .order('maintenance_date', { ascending: false });

  if (projectId !== 'all') {
    assetsQuery = assetsQuery.or(`assigned_project_id.is.null,assigned_project_id.eq.${projectId}`);
    usageQuery = usageQuery.eq('project_id', projectId);
    maintenanceQuery = maintenanceQuery.or(`project_id.is.null,project_id.eq.${projectId}`);
  }

  const [assetsResult, usageResult, maintenanceResult] = await Promise.all([
    assetsQuery,
    usageQuery,
    maintenanceQuery,
  ]);

  if (assetsResult.error) throw assetsResult.error;
  if (usageResult.error) throw usageResult.error;
  if (maintenanceResult.error) throw maintenanceResult.error;

  return {
    assets: assetsResult.data.map(toAsset),
    usage: usageResult.data.map(toUsage),
    maintenance: maintenanceResult.data.map(toMaintenance),
  };
}

function toAssetPayload(values: EquipmentAssetFormValues) {
  return {
    code: values.code,
    name: values.name,
    brand_model: values.brand_model,
    category: values.category,
    ownership: values.ownership,
    assigned_project_id: values.assigned_project_id || null,
    daily_rental_rate: values.ownership === 'rental' ? values.daily_rental_rate : 0,
    condition: values.condition,
    fuel_consumption_rate: values.fuel_consumption_rate,
    next_maintenance_date: values.next_maintenance_date || null,
  };
}

export async function createEquipmentAsset(
  organizationId: string,
  values: EquipmentAssetFormValues,
): Promise<EquipmentAsset> {
  const { data, error } = await getClient()
    .from('equipment_assets')
    .insert({ organization_id: organizationId, ...toAssetPayload(values) })
    .select('*')
    .single();
  if (error) throw error;
  return toAsset(data);
}

export async function updateEquipmentAsset(
  organizationId: string,
  equipmentId: string,
  values: EquipmentAssetFormValues,
): Promise<EquipmentAsset> {
  const { data, error } = await getClient()
    .from('equipment_assets')
    .update(toAssetPayload(values))
    .eq('organization_id', organizationId)
    .eq('id', equipmentId)
    .is('deleted_at', null)
    .select('*')
    .single();
  if (error) throw error;
  return toAsset(data);
}

export async function recordEquipmentUsage(
  organizationId: string,
  values: EquipmentUsageFormValues,
): Promise<EquipmentUsageEntry> {
  const { data, error } = await getClient()
    .from('equipment_usage_entries')
    .insert({
      organization_id: organizationId,
      project_id: values.project_id,
      equipment_id: values.equipment_id,
      usage_date: values.usage_date,
      operating_hours: values.operating_hours,
      fuel_liters: values.fuel_liters,
      fuel_cost_amount: values.fuel_cost_amount,
      notes: values.notes,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toUsage(data);
}

export async function recordEquipmentMaintenance(
  organizationId: string,
  values: EquipmentMaintenanceFormValues,
): Promise<string> {
  const { data, error } = await getClient().rpc('record_equipment_maintenance', {
    p_organization_id: organizationId,
    p_equipment_id: values.equipment_id,
    p_maintenance_date: values.maintenance_date,
    p_description: values.description,
    p_cost_amount: values.cost_amount,
    p_next_maintenance_date: values.next_maintenance_date || undefined,
  });
  if (error) throw error;
  return data;
}
