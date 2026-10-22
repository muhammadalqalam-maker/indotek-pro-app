import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages('id').finance.validation;

function isCalendarDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export const cashTransactionSchema = z.object({
  projectId: z.string().uuid(messages.project),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, messages.date).refine(isCalendarDate, messages.date),
  type: z.enum(['inflow', 'outflow'], { message: messages.type }),
  category: z.enum(['Material', 'Upah Pekerja', 'Subkon', 'Sewa Alat', 'Operasional Site', 'Lainnya'], { message: messages.category }),
  amount: z.string()
    .regex(/^\d{1,16}(?:\.\d{1,2})?$/, messages.amount)
    .refine((value) => Number(value) > 0, messages.amount),
  recipientOrPayer: z.string().trim().min(2, messages.person).max(180, messages.person),
  description: z.string().trim().min(2, messages.description).max(500, messages.description),
  paymentMethod: z.enum(['Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya'], { message: messages.paymentMethod }),
  reference: z.string().max(180, messages.reference),
});

export type CashTransactionFormValues = z.input<typeof cashTransactionSchema>;

export const cashAdvanceRequestSchema = z.object({
  projectId: z.string().uuid(messages.project),
  requestType: z.enum(['kasbon', 'reimbursement'], { message: messages.type }),
  employeeName: z.string().trim().min(2, messages.person).max(180, messages.person),
  employeeRole: z.string().max(120, messages.role),
  requestDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, messages.date).refine(isCalendarDate, messages.date),
  amount: z.string()
    .regex(/^\d{1,16}(?:\.\d{1,2})?$/, messages.amount)
    .refine((value) => Number(value) > 0, messages.amount),
  purpose: z.string().trim().min(2, messages.purpose).max(500, messages.purpose),
});

export type CashAdvanceRequestFormValues = z.input<typeof cashAdvanceRequestSchema>;

export const cashAdvanceActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'payout', 'settle']),
  comment: z.string().max(2000, messages.comment),
  paymentMethod: z.enum(['Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya'], { message: messages.paymentMethod }),
  reference: z.string().max(180, messages.reference),
  settledAmount: z.string()
    .regex(/^\d{1,16}(?:\.\d{1,2})?$/, messages.settlementAmount)
    .refine((value) => Number(value) >= 0, messages.settlementAmount),
  notes: z.string().max(2000, messages.comment),
}).superRefine((values, context) => {
  if (values.action === 'reject' && values.comment.trim().length === 0) {
    context.addIssue({ code: 'custom', path: ['comment'], message: messages.rejectionReason });
  }
});

export type CashAdvanceActionFormValues = z.input<typeof cashAdvanceActionSchema>;
