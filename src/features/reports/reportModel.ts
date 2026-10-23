import { formatRupiah, formatTanggal, formatVolume } from '../../utils/format';
import type {
  ReportColumn,
  ReportRow,
  ReportValue,
  ReportValueFormat,
} from './reportData.service';

export type ReportDateRange = {
  startDate: string;
  endDate: string;
};

export function getCurrentMonthDateRange(date = new Date()): ReportDateRange {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
  return { startDate, endDate };
}

export function isValidReportDateRange({ startDate, endDate }: ReportDateRange): boolean {
  return Boolean(startDate && endDate && startDate <= endDate);
}

export function filterReportRows(rows: ReportRow[], status: string): ReportRow[] {
  return status === 'all' ? rows : rows.filter((row) => row.status === status);
}

export function formatReportValue(
  value: ReportValue,
  format: ReportValueFormat,
  statusLabels: Record<string, string>,
): string {
  if (value === null || value === undefined || value === '') return '-';
  if (format === 'currency') {
    const amount = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(amount) ? formatRupiah(amount, true, 2) : '-';
  }
  if (format === 'number') {
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(number) ? formatVolume(number) : '-';
  }
  if (format === 'date') return formatTanggal(String(value));
  if (format === 'status') return statusLabels[String(value)] ?? String(value);
  return String(value);
}

export function getExcelReportValue(
  value: ReportValue,
  format: ReportValueFormat,
  statusLabels: Record<string, string>,
): ReportValue | Date {
  if (value === null || value === '') return null;
  if (format === 'date' && typeof value === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null;
  }
  if (format === 'currency' || format === 'number') {
    return typeof value === 'number' ? value : null;
  }
  return formatReportValue(value, format, statusLabels);
}

export function getReportCellValue(
  row: ReportRow,
  column: ReportColumn,
  projectNames: ReadonlyMap<string, string>,
  statusLabels: Record<string, string>,
  projectUnavailable: string,
): ReportValue {
  if (column.key === 'date') return row.date;
  if (column.key === 'status') return row.status;
  if (column.key === 'project') {
    const projectLabel = row.projectIds
      .map((projectId) => projectNames.get(projectId))
      .filter((name): name is string => Boolean(name))
      .join(' → ');
    return projectLabel || projectUnavailable;
  }
  return row.values[column.key] ?? null;
}

export function getDisplayReportRow(
  row: ReportRow,
  columns: ReportColumn[],
  projectNames: ReadonlyMap<string, string>,
  statusLabels: Record<string, string>,
  projectUnavailable: string,
): string[] {
  return columns.map((column) => formatReportValue(
    getReportCellValue(row, column, projectNames, statusLabels, projectUnavailable),
    column.format,
    statusLabels,
  ));
}
