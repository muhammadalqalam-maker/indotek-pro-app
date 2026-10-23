import { create } from 'zustand';
import {
  getDraftQueue,
  getPhotoQueue,
  getPendingConflicts,
  type OfflineDraftQueueItem,
  type OfflinePhotoQueueItem,
  type OfflineConflictItem,
} from '../lib/offlineDb';
import { getAttendanceQueue } from '../features/hr/services/hrOfflineStorage';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'conflict';

type OfflineQueueState = {
  draftCount: number;
  photoCount: number;
  attendanceCount: number;
  conflicts: OfflineConflictItem[];
  syncStatus: SyncStatus;
  lastSyncError: string | null;
  revision: number;
  refreshCounts: (organizationId?: string, userId?: string) => Promise<void>;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncError: (err: string | null) => void;
  setConflicts: (conflicts: OfflineConflictItem[]) => void;
};

export const useOfflineQueueStore = create<OfflineQueueState>((set) => ({
  draftCount: 0,
  photoCount: 0,
  attendanceCount: 0,
  conflicts: [],
  syncStatus: 'idle',
  lastSyncError: null,
  revision: 0,

  refreshCounts: async (organizationId, userId) => {
    if (!organizationId || !userId) {
      set((state) => ({
        draftCount: 0,
        photoCount: 0,
        attendanceCount: 0,
        conflicts: [],
        syncStatus: 'idle',
        lastSyncError: null,
        revision: state.revision + 1,
      }));
      return;
    }

    const [drafts, photos, attendances, conflicts] = await Promise.all([
      getDraftQueue(organizationId, userId),
      getPhotoQueue(organizationId, userId),
      getAttendanceQueue(organizationId, userId),
      getPendingConflicts(organizationId, userId),
    ]);
    set((state) => ({
      draftCount: drafts.length,
      photoCount: photos.length,
      attendanceCount: attendances.length,
      conflicts,
      syncStatus: conflicts.length > 0 ? 'conflict' : 'idle',
      revision: state.revision + 1,
    }));
  },

  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSyncError: (lastSyncError) => set({ lastSyncError }),
  setConflicts: (conflicts) => set({ conflicts }),
}));

export function selectQueueTotal(state: OfflineQueueState): number {
  return state.draftCount + state.photoCount + state.attendanceCount;
}

export function selectHasPending(state: OfflineQueueState): boolean {
  return state.draftCount > 0
    || state.photoCount > 0
    || state.attendanceCount > 0
    || state.conflicts.length > 0;
}

export function selectQueuedDrafts(
  drafts: OfflineDraftQueueItem[],
  reportId: string,
): OfflineDraftQueueItem | undefined {
  return drafts.find((d) => d.reportId === reportId);
}

export function selectQueuedPhotos(
  photos: OfflinePhotoQueueItem[],
  reportId: string,
): OfflinePhotoQueueItem[] {
  return photos.filter((p) => p.reportId === reportId);
}
