import type { ReportDataset, ReportFilters, ReportType } from './reportData.shared';
import { getClient, REPORT_COLUMNS } from './reportData.shared';
import { fetchProgressReport } from './reportProgress.service';
import {
  fetchAttendanceReport,
  fetchFinanceReport,
  fetchProcurementReport,
  fetchSafetyReport,
  fetchStockReport,
} from './reportOperational.service';

export type {
  ReportColumn,
  ReportColumnKey,
  ReportDataset,
  ReportFilters,
  ReportRow,
  ReportType,
  ReportValue,
  ReportValueFormat,
} from './reportData.shared';

export async function fetchReportDataset(
  reportType: ReportType,
  filters: ReportFilters,
): Promise<ReportDataset> {
  if (!filters.organizationId) throw new Error('Pilih organisasi untuk memuat laporan.');
  const client = getClient();
  const rows = reportType === 'progress'
    ? await fetchProgressReport(client, filters)
    : reportType === 'finance'
      ? await fetchFinanceReport(client, filters)
      : reportType === 'procurement'
        ? await fetchProcurementReport(client, filters)
        : reportType === 'stock'
          ? await fetchStockReport(client, filters)
          : reportType === 'attendance'
            ? await fetchAttendanceReport(client, filters)
            : await fetchSafetyReport(client, filters);

  return { columns: REPORT_COLUMNS[reportType], rows };
}
