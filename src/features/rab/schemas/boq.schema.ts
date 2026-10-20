import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages().rab.boqValidation;

function decimalInput(maximumFractionDigits: number, maximum: number) {
  return z.string()
    .trim()
    .min(1, messages.decimalRequired)
    .regex(new RegExp(`^\\d+(\\.\\d{1,${maximumFractionDigits}})?$`), messages.decimalFormat)
    .transform(Number)
    .pipe(z.number({ error: messages.numberFinite })
      .finite(messages.numberFinite)
      .min(0, messages.numberRange(maximum))
      .max(maximum, messages.numberRange(maximum)));
}

const percentageSchema = decimalInput(2, 100);

const workItemSchema = z.object({
  id: z.string().uuid(messages.invalidId),
  item_code: z.string().trim().min(1, messages.codeRequired).max(40, messages.codeMax),
  description: z.string().trim().min(2, messages.descriptionRequired).max(500, messages.descriptionMax),
  unit_id: z.string().uuid(messages.invalidId),
  ahsp_id: z.string().uuid(messages.invalidId).nullable(),
  volume: decimalInput(4, 1_000_000),
  unit_price: decimalInput(2, 1_000_000_000),
  sort_order: z.number({ error: messages.sortInteger })
    .int(messages.sortInteger)
    .min(0, messages.sortNonnegative),
});

const divisionSchema = z.object({
  id: z.string().uuid(messages.invalidId),
  item_code: z.string().trim().min(1, messages.codeRequired).max(40, messages.codeMax),
  description: z.string().trim().min(2, messages.descriptionRequired).max(500, messages.descriptionMax),
  sort_order: z.number({ error: messages.sortInteger })
    .int(messages.sortInteger)
    .min(0, messages.sortNonnegative),
  work_items: z.array(workItemSchema).max(500, messages.workItemMaximum),
});

export const boqDraftSchema = z.object({
  title: z.string().trim()
    .min(2, messages.titleRequired)
    .max(180, messages.titleMax),
  overhead_percent: percentageSchema,
  profit_percent: percentageSchema,
  ppn_percent: percentageSchema,
  divisions: z.array(divisionSchema).max(100, messages.divisionMaximum),
}).superRefine((draft, context) => {
  const workItems = draft.divisions.flatMap((division) => division.work_items);
  if (draft.divisions.length + workItems.length > 500) {
    context.addIssue({
      code: 'custom',
      path: ['divisions'],
      message: messages.totalItemsMaximum,
    });
  }

  const directCostCents = workItems.reduce((total, item) => {
    const volume = BigInt(Math.round(item.volume * 10_000));
    const unitPrice = BigInt(Math.round(item.unit_price * 100));
    return total + (volume * unitPrice + 5_000n) / 10_000n;
  }, 0n);
  if (directCostCents * 6n > BigInt(Number.MAX_SAFE_INTEGER)) {
    context.addIssue({
      code: 'custom',
      path: ['divisions'],
      message: messages.totalUnsafe,
    });
  }

  const versionCodes = new Set<string>();
  draft.divisions.forEach((division, divisionIndex) => {
    const divisionCode = division.item_code.toLocaleLowerCase('id-ID');
    if (versionCodes.has(divisionCode)) {
      context.addIssue({
        code: 'custom',
        path: ['divisions', divisionIndex, 'item_code'],
        message: messages.divisionCodeDuplicate,
      });
    }
    versionCodes.add(divisionCode);

    const itemCodes = new Set<string>();
    division.work_items.forEach((item, itemIndex) => {
      const code = item.item_code.toLocaleLowerCase('id-ID');
      if (itemCodes.has(code)) {
        context.addIssue({
          code: 'custom',
          path: ['divisions', divisionIndex, 'work_items', itemIndex, 'item_code'],
          message: messages.workCodeDuplicate,
        });
      }
      itemCodes.add(code);
    });
  });
});

export type BoqDraftValues = z.infer<typeof boqDraftSchema>;
export type BoqDraftFormValues = z.input<typeof boqDraftSchema>;

export function parseBoqDraft(values: unknown): BoqDraftValues {
  return boqDraftSchema.parse(values);
}
