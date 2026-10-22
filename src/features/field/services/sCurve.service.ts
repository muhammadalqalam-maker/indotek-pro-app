import { getSupabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/database';
import { calculateSCurve, type SCurveResult } from '../utils/sCurve.helpers';

const pageSize = 1000;
const reportIdChunkSize = 100;

type ApprovedBoqVersion = Pick<Tables<'boq_versions'>, 'id' | 'revision_number' | 'title'>;

function getClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  return supabase;
}

async function fetchApprovedReports(organizationId: string, projectId: string) {
  const client = getClient();
  const reports = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from('daily_reports')
      .select('id, report_date')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .order('report_date')
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    reports.push(...data);
    if (data.length < pageSize) return reports;
  }
}

async function fetchApprovedBoqItems(
  organizationId: string,
  projectId: string,
  versionId: string,
) {
  const client = getClient();
  const items = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from('boq_items')
      .select('id, volume, line_total')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('boq_version_id', versionId)
      .eq('item_type', 'work_item')
      .is('deleted_at', null)
      .order('sort_order')
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    items.push(...data);
    if (data.length < pageSize) return items;
  }
}

async function fetchApprovedVersionProgress(
  organizationId: string,
  projectId: string,
  versionId: string,
  reportIds: string[],
) {
  const client = getClient();
  const entries = [];

  for (let chunkOffset = 0; chunkOffset < reportIds.length; chunkOffset += reportIdChunkSize) {
    const reportIdChunk = reportIds.slice(chunkOffset, chunkOffset + reportIdChunkSize);
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client
        .from('progress_entries')
        .select('boq_item_id, report_id, installed_volume')
        .eq('organization_id', organizationId)
        .eq('project_id', projectId)
        .eq('boq_version_id', versionId)
        .is('deleted_at', null)
        .in('report_id', reportIdChunk)
        .order('id')
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      entries.push(...data);
      if (data.length < pageSize) break;
    }
  }

  return entries;
}

export type ProjectSCurveData = SCurveResult & {
  version: ApprovedBoqVersion | null;
};

export async function fetchProjectSCurve(
  organizationId: string,
  projectId: string,
  projectStartDate: string,
  projectEndDate: string,
): Promise<ProjectSCurveData> {
  const client = getClient();
  const { data: version, error: versionError } = await client
    .from('boq_versions')
    .select('id, revision_number, title')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('revision_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (versionError) throw versionError;
  if (!version) {
    return {
      version: null,
      points: [],
      budget: 0,
      earnedValue: 0,
      latestReportDate: null,
    };
  }

  const [items, reports] = await Promise.all([
    fetchApprovedBoqItems(organizationId, projectId, version.id),
    fetchApprovedReports(organizationId, projectId),
  ]);
  const entries = await fetchApprovedVersionProgress(
    organizationId,
    projectId,
    version.id,
    reports.map((report) => report.id),
  );

  return {
    version,
    ...calculateSCurve(projectStartDate, projectEndDate, items, reports, entries),
  };
}
