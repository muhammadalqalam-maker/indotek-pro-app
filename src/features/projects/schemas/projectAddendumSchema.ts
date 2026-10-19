import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages('id').projects;

export const projectAddendumSchema = z.object({
  addendum_number: z.string().trim().min(1, messages.addendumValidationNumber)
    .max(80, messages.addendumValidationNumberLength),
  title: z.string().trim().min(1, messages.addendumValidationTitle)
    .max(160, messages.addendumValidationTitleLength),
  description: z.string().trim().max(2000, messages.addendumValidationDescriptionLength),
  amount: z.number().finite(messages.addendumValidationAmount),
  time_extension_days: z.number()
    .int(messages.addendumValidationDaysInteger)
    .min(0, messages.addendumValidationDaysMinimum)
    .max(3650, messages.addendumValidationDaysMaximum),
}).refine(({ amount, time_extension_days }) => amount !== 0 || time_extension_days > 0, {
  message: messages.addendumValidationChangeRequired,
  path: ['amount'],
});

export type ProjectAddendumFormValues = z.infer<typeof projectAddendumSchema>;
