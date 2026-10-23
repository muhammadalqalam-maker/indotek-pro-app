import { z } from 'zod';
import { getMessages } from '../../../i18n';
import {
  INSPECTION_RESULTS,
  SAFETY_INCIDENT_CATEGORIES,
  SAFETY_INCIDENT_SEVERITIES,
  SAFETY_INCIDENT_STATUSES,
} from '../types';

const validation = getMessages().safety.validation;

export const safetyIncidentCategorySchema = z.enum(SAFETY_INCIDENT_CATEGORIES);
export const safetyIncidentSeveritySchema = z.enum(SAFETY_INCIDENT_SEVERITIES);
export const safetyIncidentStatusSchema = z.enum(SAFETY_INCIDENT_STATUSES);

export const safetyInspectionItemSchema = z.object({
  label: z.string().trim().min(2, validation.itemLabel).max(200, validation.long),
  result: z.enum(INSPECTION_RESULTS),
  notes: z.string().trim().max(1000, validation.long),
  follow_up: z.string().trim().max(1000, validation.long),
}).superRefine((item, context) => {
  if (item.result === 'non_compliant' && item.follow_up.length < 2) {
    context.addIssue({
      code: 'custom',
      path: ['follow_up'],
      message: validation.followUpRequired,
    });
  }
});

export const safetyInspectionItemsSchema = z.array(safetyInspectionItemSchema)
  .min(1, validation.inspectionItemRequired)
  .max(100, validation.tooManyItems);

export const safetyInspectionSchema = z.object({
  project_id: z.string().uuid(validation.project),
  inspection_date: z.string().date(validation.date),
  title: z.string().trim().min(2, validation.title).max(180, validation.long),
  inspector_name: z.string().trim().min(2, validation.name).max(120, validation.long),
  location: z.string().trim().min(2, validation.location).max(180, validation.long),
  items: safetyInspectionItemsSchema,
  overall_notes: z.string().trim().max(2000, validation.long),
});

export const safetyIncidentSchema = z.object({
  project_id: z.string().uuid(validation.project),
  incident_date: z.string().date(validation.date),
  category: safetyIncidentCategorySchema,
  severity: safetyIncidentSeveritySchema,
  location: z.string().trim().min(2, validation.location).max(180, validation.long),
  description: z.string().trim().min(5, validation.description).max(3000, validation.long),
  immediate_action: z.string().trim().min(2, validation.immediateAction).max(2000, validation.long),
  corrective_action: z.string().trim().max(2000, validation.long),
  reporter_name: z.string().trim().min(2, validation.name).max(120, validation.long),
});

export const safetyIncidentActionSchema = z.object({
  corrective_action: z.string().trim().min(2, validation.immediateAction).max(2000, validation.long),
});

export const toolboxMeetingSchema = z.object({
  project_id: z.string().uuid(validation.project),
  meeting_date: z.string().date(validation.date),
  topic: z.string().trim().min(2, validation.topic).max(180, validation.long),
  presenter_name: z.string().trim().min(2, validation.name).max(120, validation.long),
  attendees_count: z.number(validation.attendees).int().min(1, validation.attendees).max(10000, validation.attendees),
  key_points: z.string().trim().min(2, validation.keyPoints)
    .transform((value) => value.split(/\r?\n/).map((point) => point.trim()).filter(Boolean))
    .pipe(z.array(z.string().min(2, validation.keyPoints).max(500, validation.long)).min(1, validation.keyPoints).max(20, validation.tooManyItems)),
});

export type SafetyInspectionFormValues = z.infer<typeof safetyInspectionSchema>;
export type SafetyIncidentFormValues = z.infer<typeof safetyIncidentSchema>;
export type SafetyIncidentActionValues = z.infer<typeof safetyIncidentActionSchema>;
export type ToolboxMeetingFormInput = z.input<typeof toolboxMeetingSchema>;
export type ToolboxMeetingFormValues = z.output<typeof toolboxMeetingSchema>;
