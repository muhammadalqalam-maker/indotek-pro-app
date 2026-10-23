import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import {
  chunkIds,
  fetchAllPages,
  makeRow,
  type BoqItemRow,
  type DailyReportRow,
  type MeasurementUnitRow,
  type ProgressEntryRow,
  type ReportFilters,
  type ReportRow,
} from './reportData.shared';

export async function fetchProgressReport(
  client: SupabaseClient<Database>,
  filters: ReportFilters,
): Promise<ReportRow[]> {
  const reports = await fetchAllPages<DailyReportRow>((from, to) => {
    let query = client.from('daily_reports')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .is('deleted_at', null)
      .gte('report_date', filters.startDate)
      .lte('report_date', filters.endDate)
      .order('report_date', { ascending: false })
      .range(from, to);
    if (filters.projectId !== 'all') query = query.eq('project_id', filters.projectId);
    return query;
  });
  if (reports.length === 0) return [];

  const reportById = new Map(reports.map((report) => [report.id, report]));
  const reportIds = reports.map((report) => report.id);
  const progressEntries: ProgressEntryRow[] = [];
  for (const reportIdBatch of chunkIds(reportIds)) {
    const batch = await fetchAllPages<ProgressEntryRow>((from, to) => client
      .from('progress_entries')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .is('deleted_at', null)
      .in('report_id', reportIdBatch)
      .range(from, to));
    progressEntries.push(...batch);
  }
  if (progressEntries.length === 0) return [];

  const itemIds = [...new Set(progressEntries.map((entry) => entry.boq_item_id))];
  const items: BoqItemRow[] = [];
  for (const itemIdBatch of chunkIds(itemIds)) {
    items.push(...await fetchAllPages<BoqItemRow>((from, to) => client
      .from('boq_items')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .in('id', itemIdBatch)
      .range(from, to)));
  }
  const itemById = new Map(items.map((item) => [item.id, item]));
  const unitIds = [...new Set(items.flatMap((item) => item.unit_id ? [item.unit_id] : []))];
  const units: MeasurementUnitRow[] = [];
  for (const unitIdBatch of chunkIds(unitIds)) {
    units.push(...await fetchAllPages<MeasurementUnitRow>((from, to) => client
      .from('measurement_units')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .in('id', unitIdBatch)
      .range(from, to)));
  }
  const unitById = new Map(units.map((unit) => [unit.id, unit.symbol]));

  return progressEntries.flatMap((entry) => {
    const report = reportById.get(entry.report_id);
    if (!report) throw new Error('Laporan progres tidak memiliki laporan harian terkait.');
    const item = itemById.get(entry.boq_item_id);
    return [makeRow(
      entry.id,
      [entry.project_id],
      report.report_date,
      report.status,
      {
        siteManager: report.site_manager_name,
        itemCode: item?.item_code ?? null,
        itemDescription: item?.description ?? null,
        installedVolume: Number(entry.installed_volume),
        unit: item?.unit_id ? unitById.get(item.unit_id) ?? null : null,
        remarks: entry.remarks,
        workSummary: report.work_summary,
        obstacles: report.obstacles,
      },
    )];
  }).sort((first, second) => second.date.localeCompare(first.date));
}
