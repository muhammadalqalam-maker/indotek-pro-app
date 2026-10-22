import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages().fieldReports.validation;

const volumeInputSchema = z.string().trim().refine(
  (value) => value === '' || /^\d+(?:\.\d{1,4})?$/.test(value),
  messages.progressVolumeFormat,
);

const progressEntrySchema = z.object({
  boq_item_id: z.string().uuid(),
  installed_volume: volumeInputSchema,
  maximum_volume: z.number().finite().nonnegative(),
  remarks: z.string().max(1000),
});

export const dailyReportProgressFormSchema = z.object({
  entries: z.array(progressEntrySchema).max(500),
}).superRefine(({ entries }, context) => {
  entries.forEach((entry, index) => {
    if ((entry.installed_volume === '' || Number(entry.installed_volume) === 0) && entry.remarks.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['entries', index, 'remarks'],
        message: messages.progressRemarksRequireVolume,
      });
    }
    if (entry.installed_volume !== '' && Number(entry.installed_volume) > entry.maximum_volume) {
      context.addIssue({
        code: 'custom',
        path: ['entries', index, 'installed_volume'],
        message: messages.progressVolumeExceeded,
      });
    }
  });
});

export type DailyReportProgressFormValues = z.input<typeof dailyReportProgressFormSchema>;
