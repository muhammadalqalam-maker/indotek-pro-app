import { getSupabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/database';
import {
  dailyReportDraftSchema,
  dailyReportPhotoSchema,
  type DailyReportFormValues,
} from '../schemas/dailyReport.schema';

export type DailyReportRecord = Tables<'daily_reports'>;

export type DailyReportDetails = {
  report: DailyReportRecord;
  values: DailyReportFormValues;
  photoPreviewUrls: Record<string, string>;
  siteSignatureUrl: string | null;
  approverSignatureUrl: string | null;
  syncVersion: string;
};

export type DailyReportSyncVersion = {
  status: string;
  version: string;
};

function buildSyncVersion(
  reportUpdatedAt: string,
  manpower: Array<{ id: string; updated_at: string }>,
  equipment: Array<{ id: string; updated_at: string }>,
  materials: Array<{ id: string; updated_at: string }>,
): string {
  return JSON.stringify({
    report: reportUpdatedAt,
    manpower: manpower.map(({ id, updated_at }) => [id, updated_at]).sort(),
    equipment: equipment.map(({ id, updated_at }) => [id, updated_at]).sort(),
    materials: materials.map(({ id, updated_at }) => [id, updated_at]).sort(),
  });
}

function getClient() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia.');
  return supabase;
}

export async function fetchDailyReports(
  organizationId: string,
  projectId: string,
): Promise<DailyReportRecord[]> {
  const { data, error } = await getClient()
    .from('daily_reports')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('report_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchDailyReportSyncVersion(
  organizationId: string,
  projectId: string,
  reportId: string,
): Promise<DailyReportSyncVersion | null> {
  const client = getClient();
  const [reportResult, manpowerResult, equipmentResult, materialsResult] = await Promise.all([
    client.from('daily_reports')
      .select('status, updated_at')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('id', reportId)
      .is('deleted_at', null)
      .maybeSingle(),
    client.from('daily_report_manpower_entries')
      .select('id, updated_at')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('report_id', reportId)
      .is('deleted_at', null),
    client.from('daily_report_equipment_entries')
      .select('id, updated_at')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('report_id', reportId)
      .is('deleted_at', null),
    client.from('daily_report_material_entries')
      .select('id, updated_at')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('report_id', reportId)
      .is('deleted_at', null),
  ]);
  if (reportResult.error) throw reportResult.error;
  if (manpowerResult.error) throw manpowerResult.error;
  if (equipmentResult.error) throw equipmentResult.error;
  if (materialsResult.error) throw materialsResult.error;
  if (!reportResult.data) return null;

  const version = buildSyncVersion(
    reportResult.data.updated_at,
    manpowerResult.data,
    equipmentResult.data,
    materialsResult.data,
  );
  return { status: reportResult.data.status, version };
}

export async function fetchDailyReportDetails(
  organizationId: string,
  projectId: string,
  reportId: string,
): Promise<DailyReportDetails> {
  const client = getClient();
  const [reportResult, manpowerResult, equipmentResult, materialsResult] = await Promise.all([
    client.from('daily_reports')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('id', reportId)
      .is('deleted_at', null)
      .single(),
    client.from('daily_report_manpower_entries')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('report_id', reportId)
      .is('deleted_at', null)
      .order('created_at'),
    client.from('daily_report_equipment_entries')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('report_id', reportId)
      .is('deleted_at', null)
      .order('created_at'),
    client.from('daily_report_material_entries')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('report_id', reportId)
      .is('deleted_at', null)
      .order('created_at'),
  ]);

  if (reportResult.error) throw reportResult.error;
  if (manpowerResult.error) throw manpowerResult.error;
  if (equipmentResult.error) throw equipmentResult.error;
  if (materialsResult.error) throw materialsResult.error;

  const photoPaths = dailyReportDraftSchema.shape.photo_paths.parse(reportResult.data.photo_paths);
  const values = dailyReportDraftSchema.parse({
    report_date: reportResult.data.report_date,
    site_manager_name: reportResult.data.site_manager_name,
    site_manager_signature_path: reportResult.data.site_manager_signature_path,
    weather_conditions: reportResult.data.weather_conditions,
    work_summary: reportResult.data.work_summary,
    obstacles: reportResult.data.obstacles,
    solutions: reportResult.data.solutions,
    photo_paths: photoPaths,
    manpower: manpowerResult.data.map((entry) => ({
      id: entry.id,
      trade_type: entry.trade_type,
      headcount: entry.headcount,
      work_hours: Number(entry.work_hours),
      remarks: entry.remarks,
    })),
    equipment: equipmentResult.data.map((entry) => ({
      id: entry.id,
      equipment_name: entry.equipment_name,
      quantity: Number(entry.quantity),
      active_hours: Number(entry.active_hours),
      standby_hours: Number(entry.standby_hours),
      remarks: entry.remarks,
    })),
    materials: materialsResult.data.map((entry) => ({
      id: entry.id,
      material_name: entry.material_name,
      quantity: Number(entry.quantity),
      unit: entry.unit,
      supplier_name: entry.supplier_name,
      delivery_note_no: entry.delivery_note_no,
    })),
  });

  const storage = client.storage.from('org-project-files');
  const signedPaths = await Promise.all([
    ...photoPaths.map(async (photo) => {
      const { data, error } = await storage.createSignedUrl(photo.path, 3600);
      if (error) throw error;
      return [photo.path, data.signedUrl] as const;
    }),
    ...(reportResult.data.site_manager_signature_path
      ? [storage.createSignedUrl(reportResult.data.site_manager_signature_path, 3600)
        .then(({ data, error }) => {
          if (error) throw error;
          return ['site-manager-signature', data.signedUrl] as const;
        })]
      : []),
    ...(reportResult.data.approver_signature_path
      ? [storage.createSignedUrl(reportResult.data.approver_signature_path, 3600)
        .then(({ data, error }) => {
          if (error) throw error;
          return ['approver-signature', data.signedUrl] as const;
        })]
      : []),
  ]);
  const photoPreviewUrls = Object.fromEntries(
    signedPaths.filter(([key]) => key !== 'site-manager-signature' && key !== 'approver-signature'),
  );

  return {
    report: reportResult.data,
    values,
    photoPreviewUrls,
    siteSignatureUrl: signedPaths.find(([key]) => key === 'site-manager-signature')?.[1] ?? null,
    approverSignatureUrl: signedPaths.find(([key]) => key === 'approver-signature')?.[1] ?? null,
    syncVersion: buildSyncVersion(
      reportResult.data.updated_at,
      manpowerResult.data,
      equipmentResult.data,
      materialsResult.data,
    ),
  };
}

export async function saveDailyReportDraft(
  organizationId: string,
  projectId: string,
  reportId: string,
  values: DailyReportFormValues,
): Promise<string> {
  const parsed = dailyReportDraftSchema.parse(values);
  const { data, error } = await getClient().rpc('save_daily_report_draft', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_report_id: reportId,
    p_values: parsed,
  });
  if (error) throw error;
  return data;
}

export async function uploadDailyReportPhoto(
  organizationId: string,
  projectId: string,
  reportId: string,
  photoId: string,
  file: File,
): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
    throw new Error('Foto harus berupa JPEG, PNG, atau WebP dengan ukuran maksimal 10 MiB.');
  }
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const path = `${organizationId}/${projectId}/daily-reports/${reportId}/photos/${photoId}.${extension}`;
  const { data, error } = await getClient().storage.from('org-project-files').upload(path, file, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;
  return data.path;
}

export async function uploadDailyReportSignature(
  organizationId: string,
  projectId: string,
  reportId: string,
  signer: 'site-manager' | 'approver',
  file: File,
): Promise<string> {
  if (file.type !== 'image/png' || file.size > 2 * 1024 * 1024) {
    throw new Error('Tanda tangan harus berupa PNG dengan ukuran maksimal 2 MiB.');
  }
  const path = `${organizationId}/${projectId}/daily-reports/${reportId}/signatures/${signer}.png`;
  const { data, error } = await getClient().storage.from('org-project-files').upload(path, file, {
    contentType: 'image/png',
    upsert: true,
  });
  if (error) throw error;
  return data.path;
}

export async function submitDailyReport(
  organizationId: string,
  projectId: string,
  reportId: string,
): Promise<void> {
  const { error } = await getClient().rpc('submit_daily_report', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_report_id: reportId,
  });
  if (error) throw error;
}

export async function approveDailyReport(
  organizationId: string,
  projectId: string,
  reportId: string,
  signaturePath: string,
): Promise<void> {
  const { error } = await getClient().rpc('approve_daily_report', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_report_id: reportId,
    p_approver_signature_path: signaturePath,
  });
  if (error) throw error;
}

export function parseDailyReportPhotos(value: unknown) {
  return dailyReportPhotoSchema.array().max(10).parse(value);
}
