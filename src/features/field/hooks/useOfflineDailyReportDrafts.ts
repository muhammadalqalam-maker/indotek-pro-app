import { useEffect, useMemo, useState } from 'react';
import {
  getDraftQueue,
  getPhotosByReport,
  type OfflineDraftQueueItem,
} from '../../../lib/offlineDb';
import type { DailyReportDetails } from '../services/dailyReport.service';
import { dailyReportDraftSchema } from '../schemas/dailyReport.schema';

type UseOfflineDailyReportDraftsOptions = {
  organizationId: string;
  projectId: string;
  userId: string;
  reportId: string | null;
  queueRevision: number;
};

export function useOfflineDailyReportDrafts({
  organizationId,
  projectId,
  userId,
  reportId,
  queueRevision,
}: UseOfflineDailyReportDraftsOptions) {
  const [drafts, setDrafts] = useState<OfflineDraftQueueItem[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Record<string, string>>({});
  const [siteSignatureUrl, setSiteSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!organizationId || !userId) {
      setDrafts([]);
      return;
    }
    void getDraftQueue(organizationId, userId).then((items) => {
      if (active) setDrafts(items);
    });
    return () => {
      active = false;
    };
  }, [organizationId, queueRevision, userId]);

  const projectDrafts = useMemo(
    () => drafts.filter((draft) => draft.projectId === projectId),
    [drafts, projectId],
  );
  const selectedDraft = projectDrafts.find((draft) => draft.reportId === reportId);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    setPhotoPreviewUrls({});
    setSiteSignatureUrl(null);
    if (!selectedDraft) return;
    void getPhotosByReport(selectedDraft.reportId, userId).then((photos) => {
      if (!active) return;
      const previews: Record<string, string> = {};
      for (const photo of photos) {
        const url = URL.createObjectURL(photo.blob);
        urls.push(url);
        if (photo.purpose === 'photo') previews[`offline:${photo.photoId}`] = url;
        if (photo.purpose === 'site-signature') setSiteSignatureUrl(url);
      }
      setPhotoPreviewUrls(previews);
    });
    return () => {
      active = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedDraft, userId]);

  const details: DailyReportDetails | undefined = useMemo(() => (
    selectedDraft
      ? {
        report: {
          id: selectedDraft.reportId,
          organization_id: selectedDraft.organizationId,
          project_id: selectedDraft.projectId,
          created_by: selectedDraft.userId,
          created_at: selectedDraft.queuedAt,
          updated_at: selectedDraft.queuedAt,
          deleted_at: null,
          report_date: selectedDraft.payload.report_date,
          status: 'draft',
          site_manager_name: selectedDraft.payload.site_manager_name,
          site_manager_signature_path: selectedDraft.payload.site_manager_signature_path,
          approver_signature_path: null,
          photo_paths: selectedDraft.payload.photo_paths,
          weather_conditions: selectedDraft.payload.weather_conditions,
          work_summary: selectedDraft.payload.work_summary,
          obstacles: selectedDraft.payload.obstacles,
          solutions: selectedDraft.payload.solutions,
          submitted_at: null,
          submitted_by: null,
          approved_at: null,
          approved_by: null,
        },
        values: dailyReportDraftSchema.parse(selectedDraft.payload),
        photoPreviewUrls,
        siteSignatureUrl,
        approverSignatureUrl: null,
        syncVersion: selectedDraft.serverUpdatedAt ?? '',
      }
      : undefined
  ), [photoPreviewUrls, selectedDraft, siteSignatureUrl]);

  return { drafts: projectDrafts, selectedDraft, details };
}
