import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages('id').finance.validation;

function isCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, messages.date)
  .refine(isCalendarDate, messages.date);

const amountSchema = z.string()
  .regex(/^\d{1,16}(?:\.\d{1,2})?$/, messages.amount)
  .refine((value) => Number(value) > 0, messages.amount);

export const projectPayableSchema = z.object({
  projectId: z.string().uuid(messages.project),
  counterpartyType: z.enum(['vendor', 'subcontractor'], { message: messages.payableCounterparty }),
  counterpartyId: z.string().uuid(messages.payableCounterparty),
  supplierInvoiceNumber: z.string().trim().min(1, messages.payableReference).max(80, messages.payableReference),
  invoiceDate: dateSchema,
  dueDate: dateSchema,
  amount: amountSchema,
  notes: z.string().max(2000, messages.comment),
}).refine((values) => values.dueDate >= values.invoiceDate, {
  path: ['dueDate'],
  message: messages.payableDueDate,
});

export type ProjectPayableFormValues = z.input<typeof projectPayableSchema>;

export const projectPayablePaymentSchema = z.object({
  amount: amountSchema,
  paymentDate: dateSchema,
  paymentMethod: z.enum(['Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya'], { message: messages.paymentMethod }),
  reference: z.string().max(180, messages.reference),
});

export type ProjectPayablePaymentValues = z.input<typeof projectPayablePaymentSchema>;
