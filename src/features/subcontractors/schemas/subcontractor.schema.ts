import { z } from 'zod';

const text = (minimum: number, maximum: number, message: string) => z.string().trim().min(minimum, message).max(maximum, message);
const optionalText = (maximum: number, message: string) => z.string().trim().max(maximum, message);

export const subcontractorSchema = z.object({
  code: text(1, 40, 'Kode subkontraktor wajib diisi.'),
  companyName: text(2, 180, 'Nama perusahaan wajib diisi.'),
  tradeSpecialty: text(2, 120, 'Bidang pekerjaan wajib diisi.'),
  picName: text(2, 120, 'Nama PIC atau mandor wajib diisi.'),
  phone: text(5, 32, 'Nomor telepon tidak valid.'),
  email: z.union([z.literal(''), z.email('Email tidak valid.').max(254, 'Email terlalu panjang.')]),
  address: optionalText(500, 'Alamat terlalu panjang.'),
  npwp: optionalText(32, 'NPWP terlalu panjang.'),
  bankName: optionalText(120, 'Nama bank terlalu panjang.'),
  bankAccountNo: optionalText(64, 'Nomor rekening terlalu panjang.'),
  bankAccountName: optionalText(180, 'Nama pemilik rekening terlalu panjang.'),
});

export const subcontractSchema = z.object({
  projectId: z.string().uuid('Pilih proyek yang valid.'),
  subcontractorId: z.string().uuid('Pilih subkontraktor yang valid.'),
  spkNumber: text(1, 80, 'Nomor SPK wajib diisi.'),
  workDescription: text(2, 1000, 'Uraian pekerjaan wajib diisi.'),
  contractDate: z.string().date('Tanggal kontrak tidak valid.'),
  startDate: z.string().date('Tanggal mulai tidak valid.'),
  endDate: z.string().date('Tanggal selesai tidak valid.'),
  contractAmount: z.number().positive('Nilai kontrak harus lebih dari nol.').max(9_999_999_999_999_999.99, 'Nilai kontrak terlalu besar.'),
  retentionPercent: z.number().min(0, 'Retensi harus 0–100%.').max(100, 'Retensi harus 0–100%.'),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']),
  notes: optionalText(2000, 'Catatan terlalu panjang.'),
}).refine((value) => value.endDate >= value.startDate, { path: ['endDate'], message: 'Tanggal selesai harus sama atau setelah tanggal mulai.' });

export type SubcontractorFormValues = z.infer<typeof subcontractorSchema>;
export type SubcontractFormValues = z.infer<typeof subcontractSchema>;
