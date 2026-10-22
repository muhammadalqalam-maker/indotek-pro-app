import { z } from 'zod';
import { getMessages } from '../../../i18n';

export const vendorCategories = [
  'Beton',
  'Besi',
  'Finishing',
  'Mekanikal-Elektrikal',
  'Alat Berat',
  'Umum',
] as const;

export const vendorSchema = z.object({
  code: z.string().trim().toUpperCase().min(1, getMessages().vendorManagement.validation.code)
    .max(40, getMessages().vendorManagement.validation.code)
    .regex(/^[A-Z0-9][A-Z0-9._/-]*$/, getMessages().vendorManagement.validation.code),
  name: z.string().trim().min(2, getMessages().vendorManagement.validation.name)
    .max(180, getMessages().vendorManagement.validation.name),
  category: z.enum(vendorCategories, { error: getMessages().vendorManagement.validation.category }),
  contact_person: z.string().trim().min(2, getMessages().vendorManagement.validation.contact)
    .max(120, getMessages().vendorManagement.validation.contact),
  phone: z.string().trim().min(5, getMessages().vendorManagement.validation.phone)
    .max(32, getMessages().vendorManagement.validation.phone),
  email: z.union([
    z.literal(''),
    z.email({ error: getMessages().vendorManagement.validation.email }).max(254, getMessages().vendorManagement.validation.email),
  ]),
  address: z.string().trim().max(500, getMessages().vendorManagement.validation.address),
  npwp: z.string().trim().max(32, getMessages().vendorManagement.validation.npwp),
  payment_terms_days: z.number()
    .int(getMessages().vendorManagement.validation.paymentTerms)
    .min(0, getMessages().vendorManagement.validation.paymentTerms)
    .max(365, getMessages().vendorManagement.validation.paymentTerms),
});

export const vendorEvaluationSchema = z.object({
  transaction_reference: z.string().trim()
    .min(1, getMessages().vendorManagement.validation.transactionReference)
    .max(120, getMessages().vendorManagement.validation.transactionReference),
  quality_score: z.number().int(getMessages().vendorManagement.validation.score)
    .min(1, getMessages().vendorManagement.validation.score)
    .max(5, getMessages().vendorManagement.validation.score),
  price_score: z.number().int(getMessages().vendorManagement.validation.score)
    .min(1, getMessages().vendorManagement.validation.score)
    .max(5, getMessages().vendorManagement.validation.score),
  delivery_score: z.number().int(getMessages().vendorManagement.validation.score)
    .min(1, getMessages().vendorManagement.validation.score)
    .max(5, getMessages().vendorManagement.validation.score),
  service_score: z.number().int(getMessages().vendorManagement.validation.score)
    .min(1, getMessages().vendorManagement.validation.score)
    .max(5, getMessages().vendorManagement.validation.score),
  comment: z.string().trim().max(2000, getMessages().vendorManagement.validation.comment),
});

export type VendorInput = z.infer<typeof vendorSchema>;
export type VendorEvaluationInput = z.infer<typeof vendorEvaluationSchema>;
