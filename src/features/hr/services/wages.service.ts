import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database.types';
import type { DailyAttendance, FieldWorker } from '../../../types/database';
import type { WorkerPieceworkFormValues } from '../schemas/wage.schema';
import type { WorkerPieceworkEntry } from '../types';
import { fetchFieldWorkers } from './hr.service';

type AttendanceRow = Database['public']['Tables']['daily_attendance']['Row'];
type PieceworkRow = Database['public']['Tables']['worker_piecework_entries']['Row'];

function getClient(): SupabaseClient<Database> {
  const client = getSupabase();
  if (!client) throw new Error('Rekap upah memerlukan koneksi Supabase.');
  return client as SupabaseClient<Database>;
}

function toAttendance(row: AttendanceRow, worker: FieldWorker): DailyAttendance {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    date: row.attendance_date,
    worker_id: row.worker_id,
    worker_name: worker.full_name,
    role_trade: worker.role_trade,
    status: row.status as DailyAttendance['status'],
    work_hours: Number(row.work_hours),
    overtime_hours: Number(row.overtime_hours),
    daily_wage_rate_snapshot: Number(row.daily_wage_rate_snapshot),
    overtime_hourly_rate_snapshot: Number(row.overtime_hourly_rate_snapshot),
    daily_earnings: 0,
  };
}

function toPieceworkEntry(row: PieceworkRow): WorkerPieceworkEntry {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    worker_id: row.worker_id,
    work_date: row.work_date,
    description: row.description,
    quantity: Number(row.quantity),
    unit: row.unit,
    unit_rate: Number(row.unit_rate),
    total_amount: Number(row.total_amount),
  };
}

export async function fetchWeeklyAttendance(
  organizationId: string,
  projectId: string,
  startDate: string,
  endDate: string,
  workers: FieldWorker[],
): Promise<DailyAttendance[]> {
  const { data, error } = await getClient()
    .from('daily_attendance')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .is('deleted_at', null);
  if (error) throw error;
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));
  return data.flatMap((row) => {
    const worker = workerById.get(row.worker_id);
    return worker ? [toAttendance(row, worker)] : [];
  });
}

export async function fetchPayrollWorkers(
  organizationId: string,
  projectId: string,
): Promise<FieldWorker[]> {
  return fetchFieldWorkers(organizationId, projectId, true);
}

export async function fetchWeeklyPiecework(
  organizationId: string,
  projectId: string,
  startDate: string,
  endDate: string,
): Promise<WorkerPieceworkEntry[]> {
  const { data, error } = await getClient()
    .from('worker_piecework_entries')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .is('deleted_at', null)
    .order('work_date', { ascending: true });
  if (error) throw error;
  return data.map(toPieceworkEntry);
}

export async function createWorkerPieceworkEntry(
  organizationId: string,
  projectId: string,
  values: WorkerPieceworkFormValues,
): Promise<WorkerPieceworkEntry> {
  const { data, error } = await getClient()
    .from('worker_piecework_entries')
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      worker_id: values.worker_id,
      work_date: values.work_date,
      description: values.description,
      quantity: values.quantity,
      unit: values.unit,
      unit_rate: values.unit_rate,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toPieceworkEntry(data);
}
