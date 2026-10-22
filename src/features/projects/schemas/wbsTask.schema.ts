import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages('id').projects.schedule;

function isCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const calendarDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, messages.invalidDate)
  .refine(isCalendarDate, messages.invalidDate);

export const wbsTaskSchema = z.object({
  title: z.string().trim().min(1, messages.titleRequired).max(160, messages.titleTooLong),
  description: z.string().max(2000, messages.descriptionTooLong),
  parent_task_id: z.string().uuid().or(z.literal('')),
  start_date: calendarDateSchema,
  end_date: calendarDateSchema,
  is_milestone: z.boolean(),
  predecessor_task_ids: z.array(z.string().uuid()).max(500),
}).superRefine((values, context) => {
  if (values.end_date < values.start_date) {
    context.addIssue({
      code: 'custom',
      path: ['end_date'],
      message: messages.endBeforeStart,
    });
  }
  if (values.is_milestone && values.end_date !== values.start_date) {
    context.addIssue({
      code: 'custom',
      path: ['end_date'],
      message: messages.milestoneOneDay,
    });
  }
});

export type WbsTaskFormValues = z.input<typeof wbsTaskSchema>;
