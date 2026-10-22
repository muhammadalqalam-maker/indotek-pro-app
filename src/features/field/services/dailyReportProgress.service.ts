import { getSupabase } from '../../../lib/supabase';
import { getMessages } from '../../../i18n';
import type { Tables } from '../../../types/database';
import { DAILY_REPORT_STATUSES } from '../schemas/dailyReport.schema';

const messages = getMessages().fieldReports;
const pageSize = 1000;
const reportIdChunkSize = 100;

export type DailyReportProgressVersion = Pick<
  Tables<'boq_versions'>,
  'id' | 'revision_number' | 'title' | 'status'
>;

export type DailyReportProgressEntry = Pick<
  Tables<'progress_entries'>,
  'id' | 'boq_item_id' | 'boq_version_id' | 'report_id' | 'installed_volume' | 'remarks'
> & { report_status: string };

export type DailyReportProgressItem = Pick<
  Tables<'boq_items'>,
  'id' | 'item_code' | 'description' | 'item_type' | 'volume' | 'unit_id' | 'sort_order'
>;

export type DailyReportProgressOverview = {
  versions: DailyReportProgressVersion[];
  entries: DailyReportProgressEntry[];
};

export type DailyReportProgressItems = {
  items: DailyReportProgressItem[];
  unitSymbols: Record<string, string>;
};

export type SaveDailyReportProgressEntry = {
  boq_item_id: string;
  installed_volume: number;
  remarks: string;
};

function getClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  return supabase;
}

async function fetchActiveReportStatuses(
  organizationId: string,
  projectId: string,
): Promise<Record<string, string>> {
  const client = getClient();
  const reportStatuses: Record<string, string> = {};

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from('daily_reports')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('id')
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    for (const report of data) reportStatuses[report.id] = report.status;
    if (data.length < pageSize) return reportStatuses;
  }
}

async function fetchActiveProgressEntries(
  organizationId: string,
  projectId: string,
  reportStatuses: Record<string, string>,
): Promise<DailyReportProgressEntry[]> {
  const client = getClient();
  const reportIds = Object.keys(reportStatuses);
  const entries: DailyReportProgressEntry[] = [];

  for (let chunkOffset = 0; chunkOffset < reportIds.length; chunkOffset += reportIdChunkSize) {
    const reportIdChunk = reportIds.slice(chunkOffset, chunkOffset + reportIdChunkSize);
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client
        .from('progress_entries')
        .select('id, boq_item_id, boq_version_id, report_id, installed_volume, remarks')
        .eq('organization_id', organizationId)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .in('report_id', reportIdChunk)
        .order('id')
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      entries.push(...data.map((entry) => ({
        ...entry,
        report_status: reportStatuses[entry.report_id] ?? DAILY_REPORT_STATUSES.rejected,
      })));
      if (data.length < pageSize) break;
    }
  }

  return entries;
}

export async function fetchDailyReportProgressOverview(
  organizationId: string,
  projectId: string,
): Promise<DailyReportProgressOverview> {
  const client = getClient();
  const [versionsResult, reportStatuses] = await Promise.all([
    client
      .from('boq_versions')
      .select('id, revision_number, title, status')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('revision_number', { ascending: false }),
    fetchActiveReportStatuses(organizationId, projectId),
  ]);

  if (versionsResult.error) throw versionsResult.error;
  const entries = await fetchActiveProgressEntries(organizationId, projectId, reportStatuses);
  return { versions: versionsResult.data, entries };
}

export async function fetchDailyReportProgressItems(
  organizationId: string,
  projectId: string,
  versionId: string,
): Promise<DailyReportProgressItems> {
  const client = getClient();
  const { data: items, error: itemsError } = await client
    .from('boq_items')
    .select('id, item_code, description, item_type, volume, unit_id, sort_order')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('boq_version_id', versionId)
    .is('deleted_at', null)
    .order('sort_order')
    .order('id');

  if (itemsError) throw itemsError;
  const unitIds = [...new Set(items.flatMap((item) => item.unit_id ? [item.unit_id] : []))];
  if (unitIds.length === 0) return { items, unitSymbols: {} };

  const { data: units, error: unitsError } = await client
    .from('measurement_units')
    .select('id, symbol')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .in('id', unitIds);

  if (unitsError) throw unitsError;
  return {
    items,
    unitSymbols: Object.fromEntries(units.map((unit) => [unit.id, unit.symbol])),
  };
}

export async function saveDailyReportProgress(
  organizationId: string,
  projectId: string,
  reportId: string,
  versionId: string,
  entries: SaveDailyReportProgressEntry[],
): Promise<void> {
  const { error } = await getClient().rpc('save_daily_report_progress', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_report_id: reportId,
    p_boq_version_id: versionId,
    p_entries: entries,
  });

  if (!error) return;
  if (error.message.includes('Progress volume exceeds BOQ item volume')) {
    throw new Error(messages.validation.progressVolumeExceeded);
  }
  if (error.message.includes('Daily report is not editable')) {
    throw new Error(messages.progressReadOnly);
  }
  throw error;
}
