import { z } from 'zod';

export const clientInvoicePaymentSchema = z.object({
  amount: z.number().positive('Jumlah pembayaran harus lebih dari 0.'),
  reference: z.string().trim().max(180, 'Referensi maksimal 180 karakter.'),
});

export type ClientInvoicePaymentValues = z.infer<typeof clientInvoicePaymentSchema>;
