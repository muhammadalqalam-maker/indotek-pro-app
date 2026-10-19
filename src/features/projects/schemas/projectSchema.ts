import { z } from 'zod';

export const projectCategories = [
  'Gedung',
  'Infrastruktur',
  'Renovasi',
  'MEP',
  'Perumahan',
  'Lainnya',
] as const;

export const projectStatuses = [
  'planning',
  'active',
  'delayed',
  'completed',
  'maintenance',
] as const;

const nonEmpty = (message: string) => z.string().trim().min(1, message);
const validDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }, 'Tanggal tidak valid');

export const projectSchema = z.object({
  code: nonEmpty('Kode proyek wajib diisi').max(32, 'Kode proyek maksimal 32 karakter'),
  name: nonEmpty('Nama proyek wajib diisi').max(160, 'Nama proyek maksimal 160 karakter'),
  client_name: nonEmpty('Nama klien wajib diisi').max(160, 'Nama klien maksimal 160 karakter'),
  client_contact: z.string().trim().max(120, 'Kontak klien maksimal 120 karakter'),
  contract_number: z.string().trim().max(120, 'Nomor kontrak maksimal 120 karakter'),
  category: z.enum(projectCategories),
  location_address: nonEmpty('Alamat proyek wajib diisi').max(240, 'Alamat maksimal 240 karakter'),
  location_city: nonEmpty('Kota/kabupaten wajib diisi').max(120, 'Kota/kabupaten maksimal 120 karakter'),
  location_province: nonEmpty('Provinsi wajib diisi').max(120, 'Provinsi maksimal 120 karakter'),
  contract_value: z.number().finite().nonnegative('Nilai kontrak tidak boleh negatif'),
  start_date: validDate,
  end_date: validDate,
  maintenance_days: z.number().int().min(0, 'Masa pemeliharaan tidak boleh negatif').max(3650, 'Maksimal 10 tahun'),
  retention_percent: z.number().min(0, 'Retensi minimal 0%').max(100, 'Retensi maksimal 100%'),
  status: z.enum(projectStatuses),
  project_manager_id: z.string(),
  site_manager_id: z.string(),
  notes: z.string().trim().max(2000, 'Catatan maksimal 2.000 karakter'),
}).refine(({ start_date, end_date }) => start_date <= end_date, {
  message: 'Tanggal selesai harus sama atau setelah tanggal mulai',
  path: ['end_date'],
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
