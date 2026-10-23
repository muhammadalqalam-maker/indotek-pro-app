import { z } from 'zod';
import { getMessages } from '../../../i18n';
import { EQUIPMENT_CATEGORIES, EQUIPMENT_CONDITIONS } from '../types';

const messages = getMessages().equipment;

const amount = z.number({ message: messages.validation.amount })
  .min(0, messages.validation.amount)
  .max(9_999_999_999_999_999, messages.validation.amount)
  .refine((value) => Number.isFinite(value) && Number(value.toFixed(2)) === value, {
    message: messages.validation.amount,
  });

export const equipmentAssetSchema = z.object({
  code: z.string().trim().min(1, messages.validation.code).max(64, messages.validation.long),
  name: z.string().trim().min(2, messages.validation.name).max(180, messages.validation.long),
  brand_model: z.string().trim().max(180, messages.validation.long),
  category: z.enum(EQUIPMENT_CATEGORIES),
  ownership: z.enum(['internal_asset', 'rental']),
  assigned_project_id: z.string().uuid().or(z.literal('')),
  daily_rental_rate: amount,
  condition: z.enum(EQUIPMENT_CONDITIONS),
  fuel_consumption_rate: z.string().trim().max(120, messages.validation.long),
  next_maintenance_date: z.union([z.string().date(), z.literal('')]),
}).superRefine((asset, context) => {
  if (asset.ownership === 'internal_asset' && asset.daily_rental_rate > 0) {
    context.addIssue({
      code: 'custom',
      path: ['daily_rental_rate'],
      message: messages.validation.internalRentalRate,
    });
  }
});

export const equipmentUsageSchema = z.object({
  project_id: z.string().uuid(messages.validation.project),
  equipment_id: z.string().uuid(messages.validation.asset),
  usage_date: z.string().date(messages.validation.date),
  operating_hours: z.number({ message: messages.validation.hours })
    .min(0.01, messages.validation.hours)
    .max(24, messages.validation.hours),
  fuel_liters: z.number({ message: messages.validation.fuel })
    .min(0, messages.validation.fuel)
    .max(999_999_999, messages.validation.fuel),
  fuel_cost_amount: amount,
  notes: z.string().trim().max(1000, messages.validation.long),
});

export const equipmentMaintenanceSchema = z.object({
  equipment_id: z.string().uuid(messages.validation.asset),
  maintenance_date: z.string().date(messages.validation.date),
  next_maintenance_date: z.union([z.string().date(), z.literal('')]),
  description: z.string().trim().min(2, messages.validation.description).max(500, messages.validation.long),
  cost_amount: amount,
}).superRefine((maintenance, context) => {
  if (
    maintenance.next_maintenance_date
    && maintenance.next_maintenance_date < maintenance.maintenance_date
  ) {
    context.addIssue({
      code: 'custom',
      path: ['next_maintenance_date'],
      message: messages.validation.nextDate,
    });
  }
});

export type EquipmentAssetFormValues = z.infer<typeof equipmentAssetSchema>;
export type EquipmentUsageFormValues = z.infer<typeof equipmentUsageSchema>;
export type EquipmentMaintenanceFormValues = z.infer<typeof equipmentMaintenanceSchema>;
