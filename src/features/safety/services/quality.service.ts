import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../../../lib/supabase';
import type { Database } from '../../../types/database.types';
import {
  punchListCategorySchema,
  qualityPhotoSchema,
  punchListSeveritySchema,
  punchListStatusSchema,
  qcInspectionItemsSchema,
} from '../schemas/quality.schema';
import type {
  PunchListFormValues,
  PunchListTransition,
  QcInspectionFormValues,
} from '../schemas/quality.schema';
import type {
  QualityPunchListItem,
  QualityWorkspaceData,
  QcInspection,
} from '../types';

const QUALITY_EVIDENCE_BUCKET = 'quality-evidence';
const PHOTO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function getClient(): SupabaseClient<Database> {
  const client = getSupabase();
  if (!client) throw new Error('Data QC memerlukan koneksi Supabase.');
  return client;
}

function toQcInspection(row: Database['public']['Tables']['qc_inspections']['Row']): QcInspection {
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    inspection_date: row.inspection_date,
    title: row.title,
    inspector_name: row.inspector_name,
    location: row.location,
    items: qcInspectionItemsSchema.parse(row.items),
    overall_notes: row.overall_notes,
    created_at: row.created_at,
  };
}

function toPunchListItem(
  row: Database['public']['Tables']['punch_list_items']['Row'],
  signedUrls: Map<string, string>,
): QualityPunchListItem {
  const beforePhotoUrl = signedUrls.get(row.before_photo_path);
  if (!beforePhotoUrl) throw new Error(`Foto awal Punch List ${row.code} tidak dapat diakses.`);
  return {
    id: row.id,
    organization_id: row.organization_id,
    project_id: row.project_id,
    code: row.code,
    location_zone: row.location_zone,
    category: punchListCategorySchema.parse(row.category),
    defect_description: row.defect_description,
    assigned_to_subcon: row.assigned_to_subcon,
    due_date: row.due_date,
    severity: punchListSeveritySchema.parse(row.severity),
    status: punchListStatusSchema.parse(row.status),
    before_photo_path: row.before_photo_path,
    before_photo_url: beforePhotoUrl,
    after_photo_path: row.after_photo_path,
    after_photo_url: row.after_photo_path ? signedUrls.get(row.after_photo_path) ?? null : null,
    reported_by: row.reported_by,
    created_at: row.created_at,
    closed_at: row.closed_at,
  };
}

async function signPhotos(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await getClient()
    .storage
    .from(QUALITY_EVIDENCE_BUCKET)
    .createSignedUrls(paths, 3600);
  if (error) throw error;
  const signedUrls = new Map<string, string>();
  for (const photo of data) {
    if (photo.path && photo.signedUrl) signedUrls.set(photo.path, photo.signedUrl);
  }
  if (signedUrls.size !== paths.length) {
    throw new Error('Sebagian foto bukti QC tidak dapat dimuat. Periksa izin Storage lalu coba lagi.');
  }
  return signedUrls;
}

function validatePhoto(file: File): void {
  qualityPhotoSchema.parse(file);
}

function createPhotoPath(
  organizationId: string,
  projectId: string,
  punchListId: string,
  phase: 'before' | 'after',
  file: File,
): string {
  const extension = PHOTO_EXTENSIONS[file.type];
  if (!extension) throw new Error('Format foto tidak didukung.');
  return `${organizationId}/${projectId}/${punchListId}/${phase}/${crypto.randomUUID()}.${extension}`;
}

async function uploadPhoto(path: string, file: File): Promise<void> {
  validatePhoto(file);
  const { error } = await getClient()
    .storage
    .from(QUALITY_EVIDENCE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
}

async function removePhoto(path: string): Promise<void> {
  const { error } = await getClient().storage.from(QUALITY_EVIDENCE_BUCKET).remove([path]);
  if (error) throw error;
}

async function cleanupAfterFailure(path: string, originalError: unknown, context: string): Promise<never> {
  try {
    await removePhoto(path);
  } catch (cleanupError: unknown) {
    throw new AggregateError(
      [originalError, cleanupError],
      `${context} Gagal menyimpan data dan membersihkan berkas sementara.`,
    );
  }
  throw originalError;
}

export async function fetchQualityWorkspace(
  organizationId: string,
  projectId: string,
): Promise<QualityWorkspaceData> {
  const client = getClient();
  let qcQuery = client.from('qc_inspections')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('inspection_date', { ascending: false });
  let punchQuery = client.from('punch_list_items')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (projectId !== 'all') {
    qcQuery = qcQuery.eq('project_id', projectId);
    punchQuery = punchQuery.eq('project_id', projectId);
  }

  const [qcResult, punchResult] = await Promise.all([qcQuery, punchQuery]);
  if (qcResult.error) throw qcResult.error;
  if (punchResult.error) throw punchResult.error;

  const rows = punchResult.data;
  const paths = rows.flatMap((row) => (
    row.after_photo_path ? [row.before_photo_path, row.after_photo_path] : [row.before_photo_path]
  ));
  const signedUrls = await signPhotos(paths);
  return {
    inspections: qcResult.data.map(toQcInspection),
    punchList: rows.map((row) => toPunchListItem(row, signedUrls)),
  };
}

export async function createQcInspection(
  organizationId: string,
  values: QcInspectionFormValues,
): Promise<QcInspection> {
  const { data, error } = await getClient()
    .from('qc_inspections')
    .insert({ organization_id: organizationId, ...values })
    .select('*')
    .single();
  if (error) throw error;
  return toQcInspection(data);
}

function createPunchListCode(): string {
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `PL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${suffix}`;
}

export async function createPunchListItem(
  organizationId: string,
  values: PunchListFormValues,
  beforePhoto: File,
): Promise<void> {
  validatePhoto(beforePhoto);
  const id = crypto.randomUUID();
  const beforePhotoPath = createPhotoPath(organizationId, values.project_id, id, 'before', beforePhoto);
  await uploadPhoto(beforePhotoPath, beforePhoto);
  const { error } = await getClient()
    .from('punch_list_items')
    .insert({
      id,
      organization_id: organizationId,
      ...values,
      code: createPunchListCode(),
      before_photo_path: beforePhotoPath,
      status: 'open',
    });
  if (error) await cleanupAfterFailure(beforePhotoPath, error, 'Temuan Punch List tidak tersimpan.');
}

export async function advancePunchListItem(
  organizationId: string,
  itemId: string,
  currentStatus: 'open' | 'in_progress',
  nextStatus: PunchListTransition,
): Promise<void> {
  const allowedNextStatus: Record<typeof currentStatus, PunchListTransition> = {
    open: 'in_progress',
    in_progress: 'ready_for_inspection',
  };
  if (allowedNextStatus[currentStatus] !== nextStatus) {
    throw new Error('Tahapan status Punch List tidak sesuai.');
  }

  const { data, error } = await getClient()
    .from('punch_list_items')
    .update({ status: nextStatus })
    .eq('organization_id', organizationId)
    .eq('id', itemId)
    .eq('status', currentStatus)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Status Punch List sudah berubah. Muat ulang daftar sebelum mencoba lagi.');
}

export async function closePunchListItem(
  organizationId: string,
  itemId: string,
  projectId: string,
  afterPhoto: File,
): Promise<void> {
  validatePhoto(afterPhoto);
  const afterPhotoPath = createPhotoPath(organizationId, projectId, itemId, 'after', afterPhoto);
  await uploadPhoto(afterPhotoPath, afterPhoto);
  const { data, error } = await getClient()
    .from('punch_list_items')
    .update({ after_photo_path: afterPhotoPath, status: 'closed' })
    .eq('organization_id', organizationId)
    .eq('id', itemId)
    .eq('project_id', projectId)
    .eq('status', 'ready_for_inspection')
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();
  if (error) await cleanupAfterFailure(afterPhotoPath, error, 'Punch List tidak dapat ditutup.');
  if (!data) {
    await cleanupAfterFailure(
      afterPhotoPath,
      new Error('Status Punch List sudah berubah. Muat ulang daftar sebelum mencoba lagi.'),
      'Punch List tidak dapat ditutup.',
    );
  }
}
