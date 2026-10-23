import { z } from 'zod';
import { getMessages } from '../../../i18n';
import type { UserRole } from '../../../utils/permissions';

const messages = getMessages().documents;

export const DOCUMENT_CATEGORIES = [
  'Kontrak & SPK',
  'Gambar Kerja (DED)',
  'Shop Drawing',
  'As-Built Drawing',
  'RFI (Klarifikasi)',
  'Berita Acara (BAST)',
  'Laporan K3 & Lingkungan',
] as const;
export const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES);

export const DOCUMENT_ACCESS_ROLES = [
  'owner',
  'admin',
  'project_manager',
  'site_manager',
  'estimator',
  'procurement',
  'finance',
  'warehouse',
  'safety_officer',
  'subcontractor',
  'client_viewer',
] as const satisfies readonly UserRole[];

export const DEFAULT_DOCUMENT_ACCESS_ROLES = [
  'owner',
  'admin',
  'project_manager',
  'site_manager',
  'estimator',
  'procurement',
  'finance',
  'warehouse',
  'safety_officer',
] as const satisfies readonly UserRole[];

export const documentFormSchema = z.object({
  project_id: z.string().uuid(messages.validation.projectRequired),
  document_number: z.string().trim().min(1, messages.validation.required).max(80),
  title: z.string().trim().min(2, messages.validation.title).max(180),
  category: documentCategorySchema,
  access_roles: z.array(z.enum(DOCUMENT_ACCESS_ROLES)).min(1, messages.validation.readerRequired),
  expires_on: z.iso.date().nullable(),
});

export const documentAccessSchema = z.object({
  access_roles: z.array(z.enum(DOCUMENT_ACCESS_ROLES)).min(1, messages.validation.readerRequired),
  expires_on: z.iso.date().nullable(),
});

export const documentVersionFileSchema = z.custom<File>(
  (value) => (
    typeof File !== 'undefined'
    && value instanceof File
    && value.size > 0
    && value.size <= 52_428_800
    && value.name.trim().length > 0
    && value.name.length <= 255
    && ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(value.type)
  ),
  { message: messages.validation.fileInvalid },
);

export type DocumentFormValues = z.infer<typeof documentFormSchema>;
