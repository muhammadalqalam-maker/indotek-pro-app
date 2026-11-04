import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import {
  cacheHrAttendance,
  cacheHrWorkers,
  enqueueAttendanceBatch,
  getAttendanceQueue,
  getCachedHrAttendance,
  getCachedHrWorkers,
} from '../services/hrOfflineStorage';
import type { DailyAttendance } from '../../../types/database';
import {
  attendanceBatchSchema,
  type AttendanceRecordInput,
  type FieldWorkerFormValues,
} from '../schemas/hr.schema';
import { workerWageRateSchema, type WorkerWageRateValues } from '../schemas/wage.schema';
import {
  createFieldWorker,
  archiveDailyAttendance,
  fetchDailyAttendance,
  fetchFieldWorkers,
  upsertDailyAttendance,
  updateFieldWorkerWageRates,
} from '../services/hr.service';
import { useOfflineQueueStore } from '../../../stores/offlineQueue.store';
import { getMessages } from '../../../i18n';

const messages = getMessages().hrManpower;

function isConnectionError(error: unknown): boolean {
  return error instanceof TypeError
    || (error instanceof Error && /network|fetch|connection/i.test(error.message));
}

export function useHrManpower(
  organizationId: string,
  userId: string,
  projectId: string,
  attendanceDate: string,
  isOnline: boolean,
  canAccessWorkforce: boolean,
) {
  const queryClient = useQueryClient();
  const { retry: retrySync } = useOfflineSync({ autoSync: false });
  const refreshCounts = useOfflineQueueStore((state) => state.refreshCounts);
  const attendanceCount = useOfflineQueueStore((state) => state.attendanceCount);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [awaitingAttendanceSync, setAwaitingAttendanceSync] = useState(false);

  useEffect(() => {
    if (!isOnline || !organizationId || !projectId) return;
    void queryClient.invalidateQueries({ queryKey: ['hr-workers', organizationId] });
    void queryClient.invalidateQueries({ queryKey: ['hr-attendance', organizationId] });
  }, [isOnline, organizationId, projectId, queryClient]);

  useEffect(() => {
    if (!awaitingAttendanceSync || !isOnline || attendanceCount > 0) return;
    setActionMessage(messages.attendanceSynced);
    setAwaitingAttendanceSync(false);
  }, [attendanceCount, awaitingAttendanceSync, isOnline]);

  const workersQuery = useQuery({
    queryKey: ['hr-workers', organizationId, projectId, userId],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: Boolean(canAccessWorkforce && organizationId && projectId && userId),
    queryFn: async () => {
      if (!isOnline) {
        const cached = await getCachedHrWorkers(organizationId, userId);
        const projectWorkers = cached.filter((worker) => worker.project_id === projectId);
        if (projectWorkers.length === 0) throw new Error(messages.staleOffline);
        return projectWorkers;
      }
      const workers = await fetchFieldWorkers(organizationId, projectId);
      await cacheHrWorkers(organizationId, userId, projectId, workers);
      return workers;
    },
  });

  const attendanceQuery = useQuery({
    queryKey: ['hr-attendance', organizationId, projectId, attendanceDate, userId],
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: Boolean(
      canAccessWorkforce
      && organizationId
      && projectId
      && userId
      && workersQuery.data,
    ),
    queryFn: async () => {
      const workers = workersQuery.data ?? [];
      const cached = isOnline
        ? await fetchDailyAttendance(organizationId, projectId, attendanceDate, workers)
        : await getCachedHrAttendance(organizationId, userId, projectId, attendanceDate);
      const pending = await getAttendanceQueue(organizationId, userId);
      const pendingForDate = pending.filter((item) => (
        item.projectId === projectId && item.attendanceDate === attendanceDate
      ));
      const byWorker = new Map(cached.map((attendance) => [attendance.worker_id, attendance]));
      for (const item of pendingForDate) {
        const worker = workers.find(({ id }) => id === item.record.worker_id);
        if (!worker) continue;
        byWorker.set(worker.id, {
          id: item.record.id,
          organization_id: organizationId,
          project_id: projectId,
          date: attendanceDate,
          worker_id: worker.id,
          worker_name: worker.full_name,
          role_trade: worker.role_trade,
          status: item.record.status,
          work_hours: item.record.work_hours,
          overtime_hours: item.record.overtime_hours,
          daily_earnings: 0,
        });
      }
      if (isOnline) {
        await cacheHrAttendance(
          organizationId,
          userId,
          projectId,
          attendanceDate,
          [...byWorker.values()],
        );
      }
      return [...byWorker.values()];
    },
  });

  const createWorker = useMutation({
    mutationFn: (values: FieldWorkerFormValues) => createFieldWorker(organizationId, values),
    onSuccess: async () => {
      setActionMessage(messages.workerSaved);
      setActionError('');
      await queryClient.invalidateQueries({ queryKey: ['hr-workers', organizationId] });
    },
    onError: () => {
      setActionMessage('');
      setActionError(messages.workerSaveError);
    },
  });

  const updateWorkerRates = useMutation({
    mutationFn: async ({ workerId, values }: { workerId: string; values: WorkerWageRateValues }) => {
      const parsed = workerWageRateSchema.parse(values);
      return updateFieldWorkerWageRates(organizationId, projectId, workerId, parsed);
    },
    onSuccess: async () => {
      setActionMessage(messages.workerRatesSaved);
      setActionError('');
      await queryClient.invalidateQueries({ queryKey: ['hr-workers', organizationId] });
    },
    onError: () => {
      setActionMessage('');
      setActionError(messages.workerRatesSaveError);
    },
  });

  const saveAttendance = useMutation({
    networkMode: 'always',
    mutationFn: async (records: AttendanceRecordInput[]) => {
      const parsed = attendanceBatchSchema.safeParse({ attendance_date: attendanceDate, records });
      if (!parsed.success) throw new Error(messages.attendanceFormError);
      if (isOnline) {
        try {
          await upsertDailyAttendance(organizationId, projectId, attendanceDate, records.map((record) => ({
            id: crypto.randomUUID(),
            worker_id: record.worker_id,
            status: record.status,
            work_hours: record.work_hours,
            overtime_hours: record.overtime_hours,
          })));
          return { queued: false, count: records.length, attendance: null };
        } catch (error) {
          if (!isConnectionError(error)) throw error;
        }
      }

      const queuedAttendance = await enqueueAttendanceBatch(
        organizationId,
        userId,
        projectId,
        attendanceDate,
        records,
        workersQuery.data ?? [],
      );
      await refreshCounts(organizationId, userId);
      return { queued: true, count: records.length, attendance: queuedAttendance };
    },
    onSuccess: async ({ queued, count, attendance }) => {
      setActionMessage(queued ? messages.attendanceQueued(count) : messages.attendanceSaved);
      setActionError('');
      setAwaitingAttendanceSync(queued);
      if (queued) {
        queryClient.setQueryData<DailyAttendance[]>(
          ['hr-attendance', organizationId, projectId, attendanceDate, userId],
          (current = []) => {
            const byWorker = new Map(current.map((item) => [item.worker_id, item]));
            for (const item of attendance ?? []) byWorker.set(item.worker_id, item);
            return [...byWorker.values()];
          },
        );
        await queryClient.invalidateQueries({ queryKey: ['hr-weekly-wages', organizationId] });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['hr-attendance', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['hr-weekly-wages', organizationId] });
    },
    onError: () => {
      setActionMessage('');
      setActionError(messages.attendanceSaveError);
    },
  });

  const archiveAttendance = useMutation({
    mutationFn: async (attendance: DailyAttendance) => {
      if (!isOnline) throw new Error(messages.attendanceArchiveOnlineRequired);
      const queue = await getAttendanceQueue(organizationId, userId);
      if (queue.some((item) => (
        item.projectId === attendance.project_id
        && item.attendanceDate === attendance.date
        && item.record.worker_id === attendance.worker_id
      ))) {
        throw new Error(messages.attendanceArchiveSyncRequired);
      }
      await archiveDailyAttendance(organizationId, projectId, attendance.id);
      return attendance;
    },
    onSuccess: async (attendance) => {
      const queryKey = ['hr-attendance', organizationId, projectId, attendanceDate, userId];
      const remaining = (queryClient.getQueryData<DailyAttendance[]>(queryKey) ?? [])
        .filter((record) => record.id !== attendance.id);
      queryClient.setQueryData(queryKey, remaining);
      await cacheHrAttendance(organizationId, userId, projectId, attendanceDate, remaining);
      setActionMessage(messages.attendanceArchived);
      setActionError('');
      await queryClient.invalidateQueries({ queryKey: ['hr-attendance', organizationId] });
      await queryClient.invalidateQueries({ queryKey: ['hr-weekly-wages', organizationId] });
    },
    onError: (error) => {
      setActionMessage('');
      setActionError(error instanceof Error ? error.message : messages.attendanceArchiveError);
    },
  });

  return {
    archiveAttendance,
    actionError,
    actionMessage,
    attendanceQuery,
    canArchiveAttendance: isOnline && attendanceCount === 0,
    createWorker,
    retrySync,
    saveAttendance,
    workersQuery,
    updateWorkerRates,
  };
}
