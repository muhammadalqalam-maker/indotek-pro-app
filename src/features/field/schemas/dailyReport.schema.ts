import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages().fieldReports.validation;

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export const DAILY_REPORT_STATUSES = {
  draft: 'draft',
  submitted: 'submitted',
  approved: 'approved',
  rejected: 'rejected',
} as const;

export const dailyReportPhotoSchema = z.object({
  path: z.string().min(1),
  caption: z.string().max(160, messages.photoCaption),
});

const manpowerEntrySchema = z.object({
  id: z.string().uuid(),
  trade_type: z.string().trim().min(1, messages.manpowerType).max(120),
  headcount: z.number().int(messages.headcount).min(1, messages.headcount).max(10000),
  work_hours: z.number().finite(messages.workHours).min(0, messages.workHours).max(24, messages.workHours),
  remarks: z.string().max(1000),
});

const equipmentEntrySchema = z.object({
  id: z.string().uuid(),
  equipment_name: z.string().trim().min(1, messages.equipmentName).max(180),
  quantity: z.number().finite(messages.quantity).gt(0, messages.quantity).max(100000),
  active_hours: z.number().finite(messages.hours).min(0, messages.hours).max(24, messages.hours),
  standby_hours: z.number().finite(messages.hours).min(0, messages.hours).max(24, messages.hours),
  remarks: z.string().max(1000),
});

const materialEntrySchema = z.object({
  id: z.string().uuid(),
  material_name: z.string().trim().min(1, messages.materialName).max(180),
  quantity: z.number().finite(messages.materialQuantity).gt(0, messages.materialQuantity).max(1_000_000_000),
  unit: z.string().trim().min(1, messages.materialUnit).max(40),
  supplier_name: z.string().max(180),
  delivery_note_no: z.string().max(120),
});

export const dailyReportDraftSchema = z.object({
  report_date: z.string().refine(isIsoDate, messages.date),
  site_manager_name: z.string().trim().max(120, messages.name),
  site_manager_signature_path: z.string().nullable(),
  weather_conditions: z.string().max(300, messages.weather),
  work_summary: z.string().max(5000, messages.workSummary),
  obstacles: z.string().max(3000, messages.obstacles),
  solutions: z.string().max(3000, messages.solutions),
  photo_paths: z.array(dailyReportPhotoSchema).max(10, messages.maximumRows),
  manpower: z.array(manpowerEntrySchema).max(50, messages.maximumRows),
  equipment: z.array(equipmentEntrySchema).max(50, messages.maximumRows),
  materials: z.array(materialEntrySchema).max(50, messages.maximumRows),
});

export const dailyReportSubmissionSchema = z.object({
  site_manager_name: z.string().trim().min(2, messages.name).max(120, messages.name),
});

export type DailyReportFormValues = z.infer<typeof dailyReportDraftSchema>;
export type DailyReportPhoto = z.infer<typeof dailyReportPhotoSchema>;

export function createEmptyDailyReportValues(reportDate: string): DailyReportFormValues {
  return {
    report_date: reportDate,
    site_manager_name: '',
    site_manager_signature_path: null,
    weather_conditions: '',
    work_summary: '',
    obstacles: '',
    solutions: '',
    photo_paths: [],
    manpower: [],
    equipment: [],
    materials: [],
  };
}
