import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_DOCUMENT_ACCESS_ROLES,
  documentAccessSchema,
  documentFormSchema,
  documentVersionFileSchema,
} from './documents.schema';

const validDocument = {
  project_id: '0e13eac4-6a45-4ec5-8008-77bb7080d174',
  document_number: 'DED-STR-001',
  title: 'Gambar struktur lantai satu',
  category: 'Gambar Kerja (DED)',
  access_roles: [...DEFAULT_DOCUMENT_ACCESS_ROLES],
  expires_on: '2027-10-23',
} as const;

test('Dokumen menerima kategori, role akses, dan tanggal kedaluwarsa yang valid', () => {
  assert.equal(documentFormSchema.safeParse(validDocument).success, true);
});

test('Dokumen menolak tanggal kalender tidak valid dan daftar pembaca kosong', () => {
  assert.equal(documentFormSchema.safeParse({ ...validDocument, expires_on: '2027-02-30' }).success, false);
  assert.equal(documentFormSchema.safeParse({ ...validDocument, access_roles: [] }).success, false);
});

test('Perubahan akses mensyaratkan minimal satu role pembaca', () => {
  assert.equal(documentAccessSchema.safeParse({
    access_roles: ['owner', 'client_viewer'],
    expires_on: null,
  }).success, true);
  assert.equal(documentAccessSchema.safeParse({
    access_roles: [],
    expires_on: null,
  }).success, false);
});

test('Dokumen menolak kategori atau proyek di luar domain yang didukung', () => {
  assert.equal(documentFormSchema.safeParse({ ...validDocument, project_id: 'invalid' }).success, false);
  assert.equal(documentFormSchema.safeParse({ ...validDocument, category: 'Spreadsheet' }).success, false);
});

test('File versi hanya menerima PDF dan gambar aman dengan ukuran maksimal 50 MB', () => {
  assert.equal(documentVersionFileSchema.safeParse(undefined).success, false);
  assert.equal(documentVersionFileSchema.safeParse(
    new File(['pdf'], 'drawing.pdf', { type: 'application/pdf' }),
  ).success, true);
  assert.equal(documentVersionFileSchema.safeParse(
    new File(['script'], 'drawing.svg', { type: 'image/svg+xml' }),
  ).success, false);
});
