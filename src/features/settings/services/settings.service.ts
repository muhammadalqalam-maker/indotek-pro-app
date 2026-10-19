import { getSupabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/database';
import type { AppAction, AppModule, UserRole } from '../../../utils/permissions';
import type {
  DocumentSequence,
  MeasurementUnit,
  OrganizationActivity,
  PriceItem,
  PriceItemInput,
  RolePermissionOverride,
} from '../types';

function getSettingsClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  return supabase;
}

export async function fetchMeasurementUnits(organizationId: string): Promise<MeasurementUnit[]> {
  const { data, error } = await getSettingsClient()
    .from('measurement_units')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createMeasurementUnit(
  organizationId: string,
  unit: Pick<MeasurementUnit, 'code' | 'name' | 'symbol'>,
): Promise<MeasurementUnit> {
  const { data, error } = await getSettingsClient()
    .from('measurement_units')
    .insert({ organization_id: organizationId, ...unit })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMeasurementUnit(
  id: string,
  organizationId: string,
  unit: Pick<MeasurementUnit, 'code' | 'name' | 'symbol'>,
): Promise<MeasurementUnit> {
  const { data, error } = await getSettingsClient()
    .from('measurement_units')
    .update(unit)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteMeasurementUnit(id: string, organizationId: string): Promise<void> {
  const { error } = await getSettingsClient()
    .from('measurement_units')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null);
  if (error) throw error;
}

export async function fetchPriceItems(organizationId: string): Promise<PriceItem[]> {
  const { data, error } = await getSettingsClient()
    .from('price_items')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('category')
    .order('code');
  if (error) throw error;
  return data ?? [];
}

export async function createPriceItem(
  organizationId: string,
  input: PriceItemInput,
): Promise<PriceItem> {
  const { data, error } = await getSettingsClient()
    .from('price_items')
    .insert({ organization_id: organizationId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePriceItem(
  id: string,
  organizationId: string,
  input: PriceItemInput,
): Promise<PriceItem> {
  const { data, error } = await getSettingsClient()
    .from('price_items')
    .update(input)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDeletePriceItem(id: string, organizationId: string): Promise<void> {
  const { error } = await getSettingsClient()
    .from('price_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null);
  if (error) throw error;
}

export async function fetchDocumentSequences(
  organizationId: string,
  year: number,
): Promise<DocumentSequence[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  const { data, error } = await supabase
    .from('doc_number_sequences')
    .select('id, organization_id, entity_type, year, prefix, last_value, updated_at')
    .eq('organization_id', organizationId)
    .eq('year', year)
    .order('entity_type');
  if (error) throw error;
  return data ?? [];
}

export async function saveDocumentSequencePrefix(
  organizationId: string,
  entityType: string,
  year: number,
  prefix: string,
): Promise<DocumentSequence> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  const normalizedEntityType = entityType.trim().toLowerCase();
  const { data: existing, error: readError } = await supabase
    .from('doc_number_sequences')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('entity_type', normalizedEntityType)
    .eq('year', year)
    .maybeSingle();
  if (readError) throw readError;

  const result = existing
    ? await supabase
      .from('doc_number_sequences')
      .update({ prefix })
      .eq('id', existing.id)
      .select('id, organization_id, entity_type, year, prefix, last_value, updated_at')
      .single()
    : await supabase
      .from('doc_number_sequences')
      .insert({
        organization_id: organizationId,
        entity_type: normalizedEntityType,
        year,
        prefix,
        last_value: 0,
      })
      .select('id, organization_id, entity_type, year, prefix, last_value, updated_at')
      .single();
  if (result.error) throw result.error;
  return result.data;
}

export async function fetchOrganizationRolePermissions(
  organizationId: string,
): Promise<RolePermissionOverride[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia untuk memuat matriks izin.');
  const { data, error } = await supabase
    .from('roles_permissions')
    .select('organization_id, role, module, action, allowed')
    .eq('organization_id', organizationId);
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const roles: UserRole[] = ['owner', 'admin', 'project_manager', 'site_manager', 'estimator', 'procurement', 'finance', 'warehouse', 'safety_officer', 'subcontractor', 'client_viewer'];
    const modules: AppModule[] = ['dashboard', 'projects', 'rab', 'field_reports', 'procurement', 'warehouse', 'finance', 'safety', 'approvals', 'users', 'settings'];
    const actions: AppAction[] = ['view', 'create', 'edit', 'delete', 'approve'];
    return roles.includes(row.role as UserRole)
      && modules.includes(row.module as AppModule)
      && actions.includes(row.action as AppAction)
      ? [{
        organization_id: row.organization_id,
        role: row.role as UserRole,
        module: row.module as AppModule,
        action: row.action as AppAction,
        allowed: row.allowed,
      }]
      : [];
  });
}

export async function saveRolePermissionOverride(
  organizationId: string,
  role: UserRole,
  module: AppModule,
  action: AppAction,
  allowed: boolean,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia untuk menyimpan izin.');
  const { error } = await supabase
    .from('roles_permissions')
    .upsert(
      { organization_id: organizationId, role, module, action, allowed },
      { onConflict: 'organization_id,role,module,action' },
    );
  if (error) throw error;
}

export async function clearRolePermissionOverrides(
  organizationId: string,
  role: UserRole,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia untuk mengatur ulang izin.');
  const { error } = await supabase
    .from('roles_permissions')
    .delete()
    .eq('organization_id', organizationId)
    .eq('role', role);
  if (error) throw error;
}

type AuditRow = Pick<
  Tables<'audit_logs'>,
  'id' | 'user_id' | 'action' | 'entity_type' | 'entity_id' | 'old_data' | 'new_data' | 'project_id' | 'created_at'
> & {
  actor: { full_name: string | null; email: string | null } | null;
  project: { name: string } | null;
};

function describeActivity(row: AuditRow): string {
  const data = row.new_data ?? row.old_data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const candidate = data.name ?? data.title ?? data.code ?? data.addendum_number;
    if (typeof candidate === 'string' && candidate.trim()) {
      return `${row.entity_type}: ${candidate}`;
    }
  }
  return `${row.entity_type} ${row.entity_id}`;
}

export async function fetchOrganizationActivity(organizationId: string): Promise<OrganizationActivity[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia untuk memuat audit log.');
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, user_id, action, entity_type, entity_id, old_data, new_data, project_id, created_at, actor:profiles!audit_logs_user_id_fkey(full_name, email), project:projects!audit_logs_project_id_fkey(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  return ((data ?? []) as unknown as AuditRow[]).map((row) => ({
    id: row.id,
    actor_name: row.actor?.full_name || row.actor?.email || 'Pengguna tidak tersedia',
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    details: describeActivity(row),
    project_name: row.project?.name ?? null,
    created_at: row.created_at,
  }));
}

export function missingSettingsMigrationMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const record = error as { code?: unknown };
  if (record.code === '42P01' || record.code === 'PGRST205') {
    return 'Skema pengaturan katalog belum tersedia di database. Terapkan migrasi lokal T-1.26 setelah mendapatkan persetujuan.';
  }
  return null;
}
