import { z } from 'zod';
import { getMessages } from '../../../i18n';

const AHSP_CODE_PATTERN = /^[A-Z0-9._/-]+$/;
const AHSP_MAX_COMPONENTS = 100;
const messages = getMessages().rab.validation;

const ahspComponentSchema = z.object({
  component_id: z.string().uuid().optional(),
  price_item_id: z.string().uuid(messages.priceItemRequired),
  coefficient: z.number({ error: messages.coefficientRequired })
    .finite()
    .min(0.000001, messages.coefficientRange)
    .max(999_999_999_999.999999, messages.coefficientRange)
    .refine(
      (value) => Math.abs(value * 1_000_000 - Math.round(value * 1_000_000)) < 0.000001,
      messages.coefficientPrecision,
    ),
});

export const ahspSchema = z.object({
  code: z.string().trim().toUpperCase()
    .min(1, messages.codeRequired)
    .max(40, messages.codeMax)
    .regex(AHSP_CODE_PATTERN, messages.codeInvalid),
  title: z.string().trim().min(2, messages.titleMin).max(180, messages.titleMax),
  division: z.string().trim().min(2, messages.divisionMin).max(120, messages.divisionMax),
  unit_id: z.string().uuid(messages.unitRequired),
  components: z.array(ahspComponentSchema)
    .min(1, messages.componentRequired)
    .max(AHSP_MAX_COMPONENTS, messages.componentMaximum),
}).superRefine((value, context) => {
  const componentIds = value.components.flatMap((component) => component.component_id ?? []);
  if (new Set(componentIds).size !== componentIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['components'],
      message: messages.duplicateComponents,
    });
  }
});

export type AhspFormValues = z.infer<typeof ahspSchema>;
