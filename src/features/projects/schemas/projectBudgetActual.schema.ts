import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages('id').projects.budgetActual;

function isCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const projectBoqExpenseSchema = z.object({
  boq_item_id: z.string().uuid(messages.itemRequired),
  expense_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, messages.dateInvalid)
    .refine(isCalendarDate, messages.dateInvalid),
  amount: z.string()
    .regex(/^\d{1,16}(?:\.\d{1,2})?$/, messages.amountInvalid)
    .refine((value) => Number(value) > 0, messages.amountInvalid),
  description: z.string().trim()
    .min(2, messages.descriptionRequired)
    .max(500, messages.descriptionTooLong),
});

export type ProjectBoqExpenseFormValues = z.input<typeof projectBoqExpenseSchema>;
