import { z } from 'zod';

export const WORKER_TRADES = [
  'Mandor',
  'Kepala Tukang',
  'Tukang Besi',
  'Tukang Kayu',
  'Tukang Batu',
  'Pekerja / Kenek',
  'Operator',
] as const;

export const ATTENDANCE_STATUSES = ['hadir', 'lembur', 'izin', 'sakit', 'alpa'] as const;
export const WAGE_EARNING_ATTENDANCE_STATUSES = ['hadir', 'lembur'] as const;

export const fieldWorkerSchema = z.object({
  project_id: z.string().uuid(),
  nik: z.string().trim().min(1).max(32),
  full_name: z.string().trim().min(2).max(120),
  role_trade: z.enum(WORKER_TRADES),
  daily_wage_rate: z.number().min(0).max(9_999_999_999_999_999),
  overtime_hourly_rate: z.number().min(0).max(9_999_999_999_999_999),
  phone: z.string().trim().max(32),
  origin_city: z.string().trim().max(120),
});

export const attendanceRecordSchema = z.object({
  worker_id: z.string().uuid(),
  status: z.enum(ATTENDANCE_STATUSES),
  work_hours: z.number().min(0).max(24),
  overtime_hours: z.number().min(0).max(24),
}).superRefine((record, context) => {
  if (record.status !== 'hadir' && record.status !== 'lembur'
    && (record.work_hours !== 0 || record.overtime_hours !== 0)) {
    context.addIssue({
      code: 'custom',
      message: 'Jam kerja dan lembur harus nol untuk status selain hadir.',
      path: ['work_hours'],
    });
  }
});

export const attendanceBatchSchema = z.object({
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(attendanceRecordSchema).min(1),
});

export type FieldWorkerFormValues = z.infer<typeof fieldWorkerSchema>;
export type AttendanceRecordInput = z.infer<typeof attendanceRecordSchema>;
