import { useState } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import {
  enqueueDraft,
  removeConflict,
  removeQueuedReportData,
  type OfflineConflictItem,
} from '../../../lib/offlineDb';
import { useOfflineQueueStore } from '../../../stores/offlineQueue.store';
import { fetchDailyReportSyncVersion } from '../services/dailyReport.service';

const messages = getMessages().fieldReports;

type UseDailyReportConflictsOptions = {
  organizationId: string;
  projectId: string;
  reportsKey: QueryKey;
  flush: () => Promise<void>;
};

export function useDailyReportConflicts({
  organizationId,
  projectId,
  reportsKey,
  flush,
}: UseDailyReportConflictsOptions) {
  const { authSession } = useApp();
  const queryClient = useQueryClient();
  const refreshOfflineQueue = useOfflineQueueStore((state) => state.refreshCounts);
  const conflicts = useOfflineQueueStore((state) => state.conflicts);
  const [actionError, setActionError] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const keepServerVersion = async (reportId: string) => {
    const userId = authSession?.user.id;
    if (!userId) return;
    setResolvingId(reportId);
    setActionError('');
    try {
      await removeQueuedReportData(reportId, userId);
      await removeConflict(reportId);
      await refreshOfflineQueue(organizationId, userId);
      await queryClient.invalidateQueries({ queryKey: reportsKey });
      await queryClient.invalidateQueries({
        queryKey: ['daily-report-details', organizationId, projectId, reportId],
      });
    } catch (error: unknown) {
      setActionError(
        `${messages.conflictResolutionError} ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setResolvingId(null);
    }
  };

  const keepOfflineVersion = async (conflictReportId: string) => {
    const userId = authSession?.user.id;
    const conflict = conflicts.find((item) => item.reportId === conflictReportId);
    if (!userId || !conflict) return;
    setResolvingId(conflictReportId);
    setActionError('');
    try {
      const serverVersion = await fetchDailyReportSyncVersion(
        conflict.organizationId,
        conflict.projectId,
        conflict.reportId,
      );
      if (serverVersion && serverVersion.status !== 'draft') {
        throw new Error(messages.conflictCannotOverwriteSubmitted);
      }
      await enqueueDraft({
        reportId: conflict.reportId,
        organizationId: conflict.organizationId,
        projectId: conflict.projectId,
        userId,
        payload: conflict.localPayload,
        queuedAt: new Date().toISOString(),
        serverUpdatedAt: serverVersion?.version ?? null,
        attempts: 0,
        lastError: null,
      });
      await removeConflict(conflict.reportId);
      await refreshOfflineQueue(conflict.organizationId, userId);
      if (navigator.onLine) await flush();
    } catch (error: unknown) {
      setActionError(
        `${messages.conflictResolutionError} ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setResolvingId(null);
    }
  };

  return { conflicts, actionError, resolvingId, keepServerVersion, keepOfflineVersion };
}

export type DailyReportConflict = OfflineConflictItem;
