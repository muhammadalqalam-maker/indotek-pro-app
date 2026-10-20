import { fetchAhspCatalog } from './ahsp.service';
import { getSupabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/database';
import type { AhspDetail, MeasurementUnit } from '../types';
import type { BoqDraftFormValues, BoqDraftValues } from '../schemas/boq.schema';

export type BoqVersion = Tables<'boq_versions'>;
export type BoqItem = Tables<'boq_items'>;

export type BoqWorkspace = {
  versions: BoqVersion[];
  units: MeasurementUnit[];
  analyses: AhspDetail[];
};

export type BoqSaveValues = BoqDraftValues;

function getBoqClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  return supabase;
}

export async function fetchBoqWorkspace(
  organizationId: string,
  projectId: string,
): Promise<BoqWorkspace> {
  const client = getBoqClient();
  const [versionsResult, unitsResult, ahspCatalog] = await Promise.all([
    client.from('boq_versions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('revision_number', { ascending: false }),
    client.from('measurement_units')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('name'),
    fetchAhspCatalog(organizationId),
  ]);

  if (versionsResult.error) throw versionsResult.error;
  if (unitsResult.error) throw unitsResult.error;

  return {
    versions: versionsResult.data,
    units: unitsResult.data,
    analyses: ahspCatalog.analyses,
  };
}

export async function fetchBoqItems(
  organizationId: string,
  projectId: string,
  versionId: string,
): Promise<BoqItem[]> {
  const { data, error } = await getBoqClient()
    .from('boq_items')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('boq_version_id', versionId)
    .is('deleted_at', null)
    .order('sort_order');

  if (error) throw error;
  return data;
}

export async function saveBoqDraft(
  organizationId: string,
  projectId: string,
  versionId: string | null,
  values: BoqSaveValues,
): Promise<string> {
  const items = values.divisions.flatMap((division) => [
    {
      id: division.id,
      item_type: 'division',
      item_code: division.item_code,
      description: division.description,
      sort_order: division.sort_order,
    },
    ...division.work_items.map((item) => ({
      ...item,
      parent_id: division.id,
      item_type: 'work_item',
    })),
  ]);

  const { data, error } = await getBoqClient().rpc('save_boq_draft', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_boq_version_id: versionId,
    p_title: values.title,
    p_overhead_percent: values.overhead_percent,
    p_profit_percent: values.profit_percent,
    p_ppn_percent: values.ppn_percent,
    p_items: items,
  });

  if (error) throw error;
  return data;
}

export async function createBoqRevision(
  organizationId: string,
  projectId: string,
  sourceVersionId: string,
): Promise<string> {
  const { data, error } = await getBoqClient().rpc('create_boq_revision', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_source_version_id: sourceVersionId,
  });

  if (error) throw error;
  return data;
}

export function toBoqDraftForm(
  version: BoqVersion | null,
  items: BoqItem[],
): BoqDraftFormValues {
  const divisions = items
    .filter((item) => item.item_type === 'division')
    .map((division) => ({
      id: division.id,
      item_code: division.item_code,
      description: division.description,
      sort_order: division.sort_order,
      work_items: items
        .filter((item) => item.parent_id === division.id && item.item_type === 'work_item')
        .map((item) => ({
          id: item.id,
          item_code: item.item_code,
          description: item.description,
          unit_id: item.unit_id ?? '',
          ahsp_id: item.ahsp_id,
          volume: item.volume?.toString() ?? '0',
          unit_price: item.unit_price?.toString() ?? '0',
          sort_order: item.sort_order,
        })),
    }));

  return {
    title: version?.title ?? 'RAB Rev 0',
    overhead_percent: version?.overhead_percent.toString() ?? '10',
    profit_percent: version?.profit_percent.toString() ?? '0',
    ppn_percent: version?.ppn_percent.toString() ?? '11',
    divisions,
  };
}
