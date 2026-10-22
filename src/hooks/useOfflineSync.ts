import { useCallback, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  getDraftQueue,
  getPhotosByReport,
  removeDraftFromQueue,
  removePhotoFromQueue,
  updateDraftQueueItem,
  updatePhotoQueueItem,
  recordConflict,
  resetFailedQueue,
} from '../lib/offlineDb';
import {
  saveDailyReportDraft,
  uploadDailyReportPhoto,
  uploadDailyReportSignature,
  fetchDailyReportSyncVersion,
} from '../features/field/services/dailyReport.service';
import { useOfflineQueueStore } from '../stores/offlineQueue.store';

const MAX_ATTEMPTS = 5;
const SYNC_INTERVAL_MS = 15_000;

/**
 * Hook global sinkronisasi offline.
 * Dipasang satu kali di root aplikasi atau AppContext.
 * Ketika online, flush semua item di antrian IndexedDB ke Supabase.
 */
export function useOfflineSync() {
  const { authSession, currentOrg } = useApp();
  const queryClient = useQueryClient();
  const userId = authSession?.user.id ?? '';
  const organizationId = currentOrg?.id ?? '';
  const refreshCounts = useOfflineQueueStore((s) => s.refreshCounts);
  const setSyncStatus = useOfflineQueueStore((s) => s.setSyncStatus);
  const setLastSyncError = useOfflineQueueStore((s) => s.setLastSyncError);
  const syncLock = useRef(false);

  const flush = useCallback(async () => {
    if (syncLock.current || !navigator.onLine || !organizationId || !userId) return;
    syncLock.current = true;
    setSyncStatus('syncing');
    setLastSyncError(null);

    let hadError = false;

    try {
      const drafts = await getDraftQueue(organizationId, userId);
      for (const draft of drafts) {
        if (draft.attempts >= MAX_ATTEMPTS) continue;
        try {
          let serverUpdatedAt: string | null = null;
          const serverVersion = await fetchDailyReportSyncVersion(
            draft.organizationId,
            draft.projectId,
            draft.reportId,
          );
          if (serverVersion) {
            if (serverVersion.status !== 'draft') {
              await recordConflict({
                reportId: draft.reportId,
                organizationId: draft.organizationId,
                projectId: draft.projectId,
                userId: draft.userId,
                localPayload: draft.payload,
                serverUpdatedAt: serverVersion.version,
                detectedAt: new Date().toISOString(),
                resolution: 'pending',
              });
              await removeDraftFromQueue(draft.reportId);
              continue;
            }

            serverUpdatedAt = serverVersion.version;
            if (serverUpdatedAt && draft.serverUpdatedAt && serverUpdatedAt !== draft.serverUpdatedAt) {
              await recordConflict({
                reportId: draft.reportId,
                organizationId: draft.organizationId,
                projectId: draft.projectId,
                userId: draft.userId,
                localPayload: draft.payload,
                serverUpdatedAt,
                detectedAt: new Date().toISOString(),
                resolution: 'pending',
              });
              await removeDraftFromQueue(draft.reportId);
              continue;
            }

          } else if (draft.serverUpdatedAt) {
              await recordConflict({
                reportId: draft.reportId,
                organizationId: draft.organizationId,
                projectId: draft.projectId,
                userId: draft.userId,
                localPayload: draft.payload,
                serverUpdatedAt: '',
                detectedAt: new Date().toISOString(),
                resolution: 'pending',
              });
              await removeDraftFromQueue(draft.reportId);
              continue;
          }

          const photos = await getPhotosByReport(draft.reportId, userId);
          for (const photo of photos) {
            if (photo.attempts >= MAX_ATTEMPTS) {
              hadError = true;
              continue;
            }
            try {
              const file = new File([photo.blob], photo.fileName, { type: photo.blob.type });
              if (photo.purpose === 'site-signature') {
                const path = await uploadDailyReportSignature(
                  photo.organizationId,
                  photo.projectId,
                  photo.reportId,
                  'site-manager',
                  file,
                );
                draft.payload.site_manager_signature_path = path;
                await updateDraftQueueItem(photo.reportId, { payload: draft.payload });
              } else {
                const path = await uploadDailyReportPhoto(
                  photo.organizationId,
                  photo.projectId,
                  photo.reportId,
                  photo.photoId,
                  file,
                );
                const offlinePath = `offline:${photo.photoId}`;
                const existingPhoto = draft.payload.photo_paths.find(
                  (entry) => entry.path === offlinePath,
                );
                draft.payload.photo_paths = existingPhoto
                  ? draft.payload.photo_paths.map((entry) => (
                    entry.path === offlinePath ? { ...entry, path } : entry
                  ))
                  : [...draft.payload.photo_paths, { path, caption: photo.fileName }];
                await updateDraftQueueItem(photo.reportId, { payload: draft.payload });
              }
              await removePhotoFromQueue(photo.id);
            } catch (err) {
              hadError = true;
              await updatePhotoQueueItem(photo.id, {
                attempts: photo.attempts + 1,
                lastError: err instanceof Error ? err.message : String(err),
              });
            }
          }
          if ((await getPhotosByReport(draft.reportId, userId)).length > 0) continue;

          await saveDailyReportDraft(
            draft.organizationId,
            draft.projectId,
            draft.reportId,
            {
              report_date: draft.payload.report_date,
              site_manager_name: draft.payload.site_manager_name,
              weather_conditions: draft.payload.weather_conditions,
              work_summary: draft.payload.work_summary,
              obstacles: draft.payload.obstacles,
              solutions: draft.payload.solutions,
              site_manager_signature_path: draft.payload.site_manager_signature_path,
              photo_paths: draft.payload.photo_paths,
              manpower: draft.payload.manpower,
              equipment: draft.payload.equipment,
              materials: draft.payload.materials,
            },
          );
          await removeDraftFromQueue(draft.reportId);
        } catch (err) {
          hadError = true;
          await updateDraftQueueItem(draft.reportId, {
            attempts: draft.attempts + 1,
            lastError: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } catch (err) {
      hadError = true;
      setLastSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      syncLock.current = false;
      await refreshCounts(organizationId, userId);
      if (!hadError) {
        await queryClient.invalidateQueries({
          queryKey: ['daily-reports', organizationId],
        });
        await queryClient.invalidateQueries({
          queryKey: ['daily-report-details', organizationId],
        });
      }
      const { conflicts } = useOfflineQueueStore.getState();
      if (conflicts.length > 0) {
        setSyncStatus('conflict');
      } else if (hadError) {
        setSyncStatus('error');
      } else {
        setSyncStatus('idle');
      }
    }
  }, [organizationId, queryClient, userId, refreshCounts, setLastSyncError, setSyncStatus]);

  // Flush saat kembali online
  useEffect(() => {
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flush]);

  // Flush periodik saat online
  useEffect(() => {
    const id = window.setInterval(() => {
      if (navigator.onLine) void flush();
    }, SYNC_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [flush]);

  // Muat hitungan awal dari IndexedDB
  useEffect(() => {
    void refreshCounts(organizationId, userId);
  }, [organizationId, refreshCounts, userId]);

  const retry = useCallback(async () => {
    if (!organizationId || !userId) return;
    await resetFailedQueue(organizationId, userId);
    await refreshCounts(organizationId, userId);
    await flush();
  }, [flush, organizationId, refreshCounts, userId]);

  return { flush, retry };
}
