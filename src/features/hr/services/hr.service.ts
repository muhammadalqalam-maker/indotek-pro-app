import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database.types';
import type { DailyAttendance, FieldWorker } from '../../../types/database';
import type { FieldWorkerFormValues } from '../schemas/hr.schema';
import type { WorkerWageRateValues } from '../schemas/wage.schema';

type WorkerRow = Database['public']['Tables']['field_workers']['Row'];
type AttendanceRow = Database['public']['Tables']['daily_attendance']['Row'];

function getClient(): SupabaseClient<Database> {
  const client = getSupabase();
  if (!client) throw new Error('Data SDM memerlukan koneksi Supabase.');
  return client as SupabaseClient<Database>;
}

function toFieldWorker(row: WorkerRow): FieldWorker {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    nik: row.nik,
    full_name: row.full_name,
    role_trade: row.role_trade as FieldWorker['role_trade'],
    daily_wage_rate: Number(row.daily_wage_rate),
    overtime_hourly_rate: Number(row.overtime_hourly_rate),
    phone: row.phone ?? undefined,
    origin_city: row.origin_city ?? undefined,
    status: row.status as FieldWorker['status'],
  };
}

function toDailyAttendance(row: AttendanceRow, worker: FieldWorker): DailyAttendance {
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

export async function fetchFieldWorkers(
  organizationId: string,
  projectId: string,
  includeInactive = false,
): Promise<FieldWorker[]> {
  let query = getClient()
    .from('field_workers')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('full_name', { ascending: true });
  if (!includeInactive) query = query.eq('status', 'active');
  if (projectId !== 'all') query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(toFieldWorker);
}

export async function createFieldWorker(
  organizationId: string,
  values: FieldWorkerFormValues,
): Promise<FieldWorker> {
  const { data, error } = await getClient()
    .from('field_workers')
    .insert({
      organization_id: organizationId,
      project_id: values.project_id,
      nik: values.nik,
      full_name: values.full_name,
      role_trade: values.role_trade,
      daily_wage_rate: values.daily_wage_rate,
      overtime_hourly_rate: values.overtime_hourly_rate,
      phone: values.phone || null,
      origin_city: values.origin_city || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toFieldWorker(data);
}

export async function updateFieldWorkerWageRates(
  organizationId: string,
  projectId: string,
  workerId: string,
  values: WorkerWageRateValues,
): Promise<FieldWorker> {
  const { data, error } = await getClient()
    .from('field_workers')
    .update({
      daily_wage_rate: values.daily_wage_rate,
      overtime_hourly_rate: values.overtime_hourly_rate,
    })
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('id', workerId)
    .is('deleted_at', null)
    .select('*')
    .single();
  if (error) throw error;
  return toFieldWorker(data);
}

export async function fetchDailyAttendance(
  organizationId: string,
  projectId: string,
  attendanceDate: string,
  workers: FieldWorker[],
): Promise<DailyAttendance[]> {
  const { data, error } = await getClient()
    .from('daily_attendance')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('attendance_date', attendanceDate)
    .is('deleted_at', null);
  if (error) throw error;
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));
  return data.flatMap((row) => {
    const worker = workerById.get(row.worker_id);
    return worker ? [toDailyAttendance(row, worker)] : [];
  });
}

export async function upsertDailyAttendance(
  organizationId: string,
  projectId: string,
  attendanceDate: string,
  records: Array<{
    id: string;
    worker_id: string;
    status: DailyAttendance['status'];
    work_hours: number;
    overtime_hours: number;
  }>,
): Promise<void> {
  const { error } = await getClient()
    .from('daily_attendance')
    .upsert(records.map((record) => ({
      id: record.id,
      organization_id: organizationId,
      project_id: projectId,
      worker_id: record.worker_id,
      attendance_date: attendanceDate,
      status: record.status,
      work_hours: record.work_hours,
      overtime_hours: record.overtime_hours,
      deleted_at: null,
    })), { onConflict: 'organization_id,project_id,worker_id,attendance_date' });
  if (error) throw error;
}
