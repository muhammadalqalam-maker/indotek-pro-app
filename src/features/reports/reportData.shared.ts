import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

export type ReportType = 'progress' | 'finance' | 'procurement' | 'stock' | 'attendance' | 'safety';
export type ReportValue = string | number | null;
export type ReportValueFormat = 'text' | 'number' | 'currency' | 'date' | 'status';
export type ReportColumnKey =
  | 'project'
  | 'date'
  | 'status'
  | 'siteManager'
  | 'itemCode'
  | 'itemDescription'
  | 'installedVolume'
  | 'unit'
  | 'remarks'
  | 'workSummary'
  | 'obstacles'
  | 'documentType'
  | 'documentNumber'
  | 'amount'
  | 'paidAmount'
  | 'outstanding'
  | 'poNumber'
  | 'vendor'
  | 'grandTotal'
  | 'deliveryDeadline'
  | 'itemName'
  | 'movementType'
  | 'quantity'
  | 'reference'
  | 'counterparty'
  | 'workerName'
  | 'role'
  | 'workHours'
  | 'overtimeHours'
  | 'incidentNumber'
  | 'category'
  | 'severity'
  | 'location'
  | 'description';

export type ReportColumn = {
  key: ReportColumnKey;
  format: ReportValueFormat;
};

export type ReportRow = {
  id: string;
  projectIds: string[];
  date: string;
  status: string;
  values: Partial<Record<ReportColumnKey, ReportValue>>;
};

export type ReportDataset = {
  columns: ReportColumn[];
  rows: ReportRow[];
};

export type ReportFilters = {
  organizationId: string;
  projectId: string;
  startDate: string;
  endDate: string;
};

export type DailyReportRow = Database['public']['Tables']['daily_reports']['Row'];
export type ProgressEntryRow = Database['public']['Tables']['progress_entries']['Row'];
export type BoqItemRow = Database['public']['Tables']['boq_items']['Row'];
export type MeasurementUnitRow = Database['public']['Tables']['measurement_units']['Row'];
export type ClientInvoiceRow = Database['public']['Tables']['client_invoices']['Row'];
export type ProjectPayableRow = Database['public']['Tables']['project_payables']['Row'];
export type PurchaseOrderRow = Database['public']['Tables']['purchase_orders']['Row'];
export type VendorRow = Database['public']['Tables']['vendors']['Row'];
export type StockMovementRow = Database['public']['Tables']['stock_movements']['Row'];
export type InventoryItemRow = Database['public']['Tables']['inventory_items']['Row'];
export type AttendanceRow = Database['public']['Tables']['daily_attendance']['Row'];
export type FieldWorkerRow = Database['public']['Tables']['field_workers']['Row'];
export type SafetyIncidentRow = Database['public']['Tables']['safety_incidents']['Row'];

const PAGE_SIZE = 500;
const ID_BATCH_SIZE = 100;

export const REPORT_COLUMNS: Record<ReportType, ReportColumn[]> = {
  progress: [
    { key: 'siteManager', format: 'text' },
    { key: 'itemCode', format: 'text' },
    { key: 'itemDescription', format: 'text' },
    { key: 'installedVolume', format: 'number' },
    { key: 'unit', format: 'text' },
    { key: 'remarks', format: 'text' },
    { key: 'workSummary', format: 'text' },
    { key: 'obstacles', format: 'text' },
  ],
  finance: [
    { key: 'documentType', format: 'status' },
    { key: 'documentNumber', format: 'text' },
    { key: 'amount', format: 'currency' },
    { key: 'paidAmount', format: 'currency' },
    { key: 'outstanding', format: 'currency' },
  ],
  procurement: [
    { key: 'poNumber', format: 'text' },
    { key: 'vendor', format: 'text' },
    { key: 'grandTotal', format: 'currency' },
    { key: 'deliveryDeadline', format: 'date' },
  ],
  stock: [
    { key: 'itemName', format: 'text' },
    { key: 'movementType', format: 'text' },
    { key: 'quantity', format: 'number' },
    { key: 'reference', format: 'text' },
    { key: 'counterparty', format: 'text' },
  ],
  attendance: [
    { key: 'workerName', format: 'text' },
    { key: 'role', format: 'text' },
    { key: 'workHours', format: 'number' },
    { key: 'overtimeHours', format: 'number' },
  ],
  safety: [
    { key: 'incidentNumber', format: 'text' },
    { key: 'category', format: 'text' },
    { key: 'severity', format: 'text' },
    { key: 'location', format: 'text' },
    { key: 'description', format: 'text' },
  ],
};

export function getClient(): SupabaseClient<Database> {
  const client = getSupabase();
  if (!client) throw new Error('Laporan memerlukan koneksi Supabase.');
  return client as SupabaseClient<Database>;
}
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await fetchPage(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = [];
  for (let offset = 0; offset < ids.length; offset += ID_BATCH_SIZE) {
    chunks.push(ids.slice(offset, offset + ID_BATCH_SIZE));
  }
  return chunks;
}

function uniqueIds(ids: Array<string | null>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export function makeRow(
  id: string,
  projectIds: Array<string | null>,
  date: string,
  status: string,
  values: ReportRow['values'],
): ReportRow {
  return {
    id,
    projectIds: uniqueIds(projectIds),
    date,
    status,
    values,
  };
}
