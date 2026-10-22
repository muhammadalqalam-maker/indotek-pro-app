import { z } from 'zod';

export const clientInvoiceSchema = z.object({
  projectId: z.string().min(1, 'Pilih proyek.'),
  invoiceType: z.enum(['advance', 'progress', 'retention']),
  invoiceNumber: z.string().max(80, 'Nomor invoice maksimal 80 karakter.'),
  termLabel: z.string().trim().min(2, 'Keterangan termin wajib diisi.').max(180),
  invoiceDate: z.string().min(1, 'Tanggal invoice wajib diisi.'),
  dueDate: z.string().min(1, 'Tanggal jatuh tempo wajib diisi.'),
  progressBasisPercent: z.number().min(0).max(100),
  grossAmount: z.number().positive('Nilai bruto harus lebih dari 0.'),
  advanceDeduction: z.number().min(0),
  retentionDeduction: z.number().min(0),
  vatPercent: z.number().min(0).max(100),
  pphPercent: z.number().min(0).max(100),
  notes: z.string().max(2000, 'Catatan maksimal 2.000 karakter.'),
}).superRefine((value, context) => {
  if (value.dueDate < value.invoiceDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dueDate'],
      message: 'Jatuh tempo tidak boleh sebelum tanggal invoice.',
    });
  }
  if (value.advanceDeduction + value.retentionDeduction > value.grossAmount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['retentionDeduction'],
      message: 'Total potongan tidak boleh melebihi nilai bruto.',
    });
  }
});

export type ClientInvoiceFormValues = z.infer<typeof clientInvoiceSchema>;
