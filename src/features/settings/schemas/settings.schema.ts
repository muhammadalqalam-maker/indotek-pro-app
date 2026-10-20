import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages().settings.validation;

export const companyProfileSchema = z.object({
  name: z.string().trim().min(2, messages.companyNameMin).max(160, messages.companyNameMax),
  company_code: z.string().trim().toUpperCase().min(2, messages.companyCodeMin).max(6, messages.companyCodeMax)
    .regex(/^[A-Z0-9]+$/, messages.companyCodeInvalid),
  address: z.string().trim().max(500, messages.addressMax),
  city: z.string().trim().max(100, messages.cityMax),
  province: z.string().trim().max(100, messages.provinceMax),
  postal_code: z.string().trim().max(16, messages.postalCodeMax),
  phone: z.string().trim().max(30, messages.phoneMax),
  email: z.union([
    z.literal(''),
    z.string().trim().email(messages.emailInvalid).max(254, messages.emailMax),
  ]),
  npwp: z.string().trim().max(32, messages.npwpMax),
  nib: z.string().trim().max(32, messages.nibMax),
  timezone: z.enum(['WIB', 'WITA', 'WIT']),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

export const measurementUnitSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, messages.unitCodeRequired).max(20, messages.unitCodeMax)
    .regex(/^[A-Z0-9_-]+$/, messages.unitCodeInvalid),
  name: z.string().trim().min(2, messages.unitNameMin).max(80, messages.unitNameMax),
  symbol: z.string().trim().min(1, messages.unitSymbolRequired).max(16, messages.unitSymbolMax),
});

export const priceItemSchema = z.object({
  category: z.enum(['bahan', 'upah', 'alat']),
  code: z.string().trim().toUpperCase().min(1, messages.priceCodeRequired).max(40, messages.priceCodeMax)
    .regex(/^[A-Z0-9._/-]+$/, messages.priceCodeInvalid),
  name: z.string().trim().min(2, messages.priceNameMin).max(180, messages.priceNameMax),
  unit_id: z.string().uuid(messages.unitInvalid),
  unit_price: z.number().finite().min(0, messages.priceNegative).max(999_999_999_999_999.99, messages.priceTooLarge),
  region: z.string().trim().max(120, messages.regionMax),
  valid_from: z.iso.date(messages.validFromInvalid),
  valid_until: z.union([z.literal(''), z.iso.date(messages.validUntilInvalid)]),
  source: z.string().trim().max(160, messages.sourceMax),
}).superRefine((value, context) => {
  if (value.valid_until && value.valid_until < value.valid_from) {
    context.addIssue({
      code: 'custom',
      path: ['valid_until'],
      message: messages.dateRangeInvalid,
    });
  }
});

export type PriceItemFormInput = z.infer<typeof priceItemSchema>;

export const documentPrefixSchema = z.object({
  prefix: z.string().trim().toUpperCase().max(20, messages.prefixMax)
    .regex(/^[A-Z0-9/-]*$/, messages.prefixInvalid),
});
