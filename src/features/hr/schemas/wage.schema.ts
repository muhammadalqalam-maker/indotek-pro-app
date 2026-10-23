import { z } from 'zod';

const rupiahAmount = z.number()
  .min(0)
  .max(9_999_999_999_999_999)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7);

const isoDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  });

export const workerWageRateSchema = z.object({
  daily_wage_rate: rupiahAmount,
  overtime_hourly_rate: rupiahAmount,
});

export const workerPieceworkSchema = z.object({
  worker_id: z.string().uuid(),
  work_date: isoDate,
  description: z.string().trim().min(2).max(240),
  quantity: z.number()
    .positive()
    .max(999_999_999)
    .refine((value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-7),
  unit: z.string().trim().min(1).max(20),
  unit_rate: rupiahAmount,
});

export type WorkerWageRateValues = z.infer<typeof workerWageRateSchema>;
export type WorkerPieceworkFormValues = z.infer<typeof workerPieceworkSchema>;
