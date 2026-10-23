import { z } from 'zod';
import { getMessages } from '../../../i18n';
import {
  PUNCH_LIST_CATEGORIES,
  PUNCH_LIST_SEVERITIES,
  PUNCH_LIST_STATUSES,
  PUNCH_LIST_TRANSITIONS,
  QC_CHECK_RESULTS,
} from '../types';

const validation = getMessages().safety.validation;
const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];
const isFileLike = (value: unknown): value is File => Boolean(
  value
  && typeof value === 'object'
  && 'type' in value
  && 'size' in value
  && typeof value.type === 'string'
  && typeof value.size === 'number',
);

export const punchListCategorySchema = z.enum(PUNCH_LIST_CATEGORIES);
export const punchListSeveritySchema = z.enum(PUNCH_LIST_SEVERITIES);
export const punchListStatusSchema = z.enum(PUNCH_LIST_STATUSES);
export const qualityPhotoSchema = z.custom<File>(isFileLike, validation.photoRequired)
  .superRefine((file, context) => {
    if (!isFileLike(file)) return;
    if (!allowedPhotoTypes.includes(file.type)) {
      context.addIssue({ code: 'custom', message: validation.photoType });
    }
    if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
      context.addIssue({ code: 'custom', message: validation.photoSize });
    }
  });

export const qcChecklistItemSchema = z.object({
  label: z.string().trim().min(2, validation.itemLabel).max(200, validation.long),
  result: z.enum(QC_CHECK_RESULTS),
  notes: z.string().trim().max(1000, validation.long),
});

export const qcInspectionItemsSchema = z.array(qcChecklistItemSchema)
  .min(1, validation.inspectionItemRequired)
  .max(100, validation.tooManyItems);

export const qcInspectionSchema = z.object({
  project_id: z.string().uuid(validation.project),
  inspection_date: z.string().date(validation.date),
  title: z.string().trim().min(2, validation.title).max(180, validation.long),
  inspector_name: z.string().trim().min(2, validation.name).max(120, validation.long),
  location: z.string().trim().min(2, validation.location).max(180, validation.long),
  items: qcInspectionItemsSchema,
  overall_notes: z.string().trim().max(2000, validation.long),
});

export const punchListSchema = z.object({
  project_id: z.string().uuid(validation.project),
  location_zone: z.string().trim().min(2, validation.location).max(180, validation.long),
  category: punchListCategorySchema,
  defect_description: z.string().trim().min(5, validation.description).max(3000, validation.long),
  assigned_to_subcon: z.string().trim().min(2, validation.name).max(180, validation.long),
  due_date: z.string().date(validation.date),
  severity: punchListSeveritySchema,
  reported_by: z.string().trim().min(2, validation.name).max(120, validation.long),
});

export const punchListTransitionSchema = z.enum(PUNCH_LIST_TRANSITIONS);
export const punchListClosureSchema = z.object({ after_photo: qualityPhotoSchema });
export const punchListClosureInputSchema = z.object({ after_photo: qualityPhotoSchema.nullable() });

export type QcChecklistItemFormValues = z.infer<typeof qcChecklistItemSchema>;
export type QcInspectionFormValues = z.infer<typeof qcInspectionSchema>;
export type PunchListFormValues = z.infer<typeof punchListSchema>;
export type PunchListTransition = z.infer<typeof punchListTransitionSchema>;
export type PunchListClosureInput = z.infer<typeof punchListClosureInputSchema>;
