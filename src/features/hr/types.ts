import type { FieldWorker } from '../../types/database';

export interface WorkerPieceworkEntry {
  id: string;
  organization_id: string;
  project_id: string;
  worker_id: string;
  work_date: string;
  description: string;
  quantity: number;
  unit: string;
  unit_rate: number;
  total_amount: number;
}

export interface WeeklyWageRecord {
  worker_id: string;
  worker_name: string;
  role_trade: FieldWorker['role_trade'];
  attendance_days: number;
  base_wage: number;
  overtime_wage: number;
  piecework_wage: number;
  total_wage: number;
}
