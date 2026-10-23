import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Antrian penyimpanan draf laporan harian untuk sinkronisasi offline.
 *
 * Queue item: entri draf yang belum berhasil disimpan ke Supabase.
 * Photo queue: foto yang belum terunggah.
 * Conflict log: draf yang terdeteksi konflik saat sinkronisasi.
 */

export type OfflineDraftPayload = {
  report_date: string;
  site_manager_name: string;
  weather_conditions: string;
  work_summary: string;
  obstacles: string;
  solutions: string;
  site_manager_signature_path: string | null;
  photo_paths: Array<{ path: string; caption: string }>;
  manpower: Array<{
    id: string;
    trade_type: string;
    headcount: number;
    work_hours: number;
    remarks: string;
  }>;
  equipment: Array<{
    id: string;
    equipment_name: string;
    quantity: number;
    active_hours: number;
    standby_hours: number;
    remarks: string;
  }>;
  materials: Array<{
    id: string;
    material_name: string;
    quantity: number;
    unit: string;
    supplier_name: string;
    delivery_note_no: string;
  }>;
};

export type OfflineDraftQueueItem = {
  /** client-generated UUID — idempoten ke server */
  reportId: string;
  organizationId: string;
  projectId: string;
  userId: string;
  payload: OfflineDraftPayload;
  /** ISO timestamp saat item ditambahkan ke queue */
  queuedAt: string;
  /** updated_at server saat draf dimuat untuk deteksi konflik optimistic */
  serverUpdatedAt: string | null;
  /** jumlah percobaan sinkronisasi yang gagal */
  attempts: number;
  /** pesan error terakhir jika ada */
  lastError: string | null;
};

export type OfflinePhotoQueueItem = {
  id: string;
  reportId: string;
  organizationId: string;
  projectId: string;
  userId: string;
  photoId: string;
  /** nama file asli untuk caption default */
  fileName: string;
  blob: Blob;
  purpose: 'photo' | 'site-signature';
  queuedAt: string;
  attempts: number;
  lastError: string | null;
};

export type OfflineConflictItem = {
  reportId: string;
  organizationId: string;
  projectId: string;
  userId: string;
  localPayload: OfflineDraftPayload;
  serverUpdatedAt: string;
  detectedAt: string;
  /** 'pending' = belum ditangani; 'resolved-local' = simpan lokal; 'resolved-server' = buang lokal */
  resolution: 'pending' | 'resolved-local' | 'resolved-server';
};

interface IndotekOfflineDB extends DBSchema {
  draftQueue: {
    key: string; // reportId
    value: OfflineDraftQueueItem;
    indexes: { byOrg: string };
  };
  photoQueue: {
    key: string; // id (photoId per foto)
    value: OfflinePhotoQueueItem;
    indexes: { byReport: string };
  };
  conflictLog: {
    key: string; // reportId
    value: OfflineConflictItem;
    indexes: { byResolution: string };
  };
}

const DB_NAME = 'indotek-offline';
const DB_VERSION = 2;

let _db: IDBPDatabase<IndotekOfflineDB> | null = null;

export async function getOfflineDb(): Promise<IDBPDatabase<IndotekOfflineDB>> {
  if (_db) return _db;
  _db = await openDB<IndotekOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('draftQueue')) {
        const draftStore = db.createObjectStore('draftQueue', { keyPath: 'reportId' });
        draftStore.createIndex('byOrg', 'organizationId');
      }

      if (!db.objectStoreNames.contains('photoQueue')) {
        const photoStore = db.createObjectStore('photoQueue', { keyPath: 'id' });
        photoStore.createIndex('byReport', 'reportId');
      }

      if (!db.objectStoreNames.contains('conflictLog')) {
        const conflictStore = db.createObjectStore('conflictLog', { keyPath: 'reportId' });
        conflictStore.createIndex('byResolution', 'resolution');
      }
    },
  });
  return _db;
}

// --- Draft queue ---

export async function enqueueDraft(item: OfflineDraftQueueItem): Promise<void> {
  const db = await getOfflineDb();
  await db.put('draftQueue', item);
}

export async function enqueueDraftWithPhotos(
  draft: OfflineDraftQueueItem,
  photos: OfflinePhotoQueueItem[],
): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction(['draftQueue', 'photoQueue'], 'readwrite');
  const done = tx.done;
  const writes: Promise<unknown>[] = [];
  try {
    writes.push(tx.objectStore('draftQueue').put(draft));
    for (const photo of photos) {
      writes.push(tx.objectStore('photoQueue').put(photo));
    }
    await Promise.all([...writes, done]);
  } catch (error) {
    try {
      tx.abort();
    } catch (abortError) {
      if (!(abortError instanceof DOMException && abortError.name === 'InvalidStateError')) {
        throw abortError;
      }
    }
    await Promise.allSettled([...writes, done]);
    throw error;
  }
}

export async function getDraftQueue(organizationId?: string, userId?: string): Promise<OfflineDraftQueueItem[]> {
  const db = await getOfflineDb();
  const items = await db.getAll('draftQueue');
  return items.filter((item) =>
    (!organizationId || item.organizationId === organizationId)
    && (!userId || item.userId === userId),
  );
}

export async function removeDraftFromQueue(reportId: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete('draftQueue', reportId);
}

export async function updateDraftQueueItem(
  reportId: string,
  patch: Partial<Pick<OfflineDraftQueueItem, 'attempts' | 'lastError' | 'payload'>>,
): Promise<void> {
  const db = await getOfflineDb();
  const existing = await db.get('draftQueue', reportId);
  if (!existing) return;
  await db.put('draftQueue', { ...existing, ...patch });
}

// --- Photo queue ---

export async function enqueuePhoto(item: OfflinePhotoQueueItem): Promise<void> {
  const db = await getOfflineDb();
  await db.put('photoQueue', item);
}

export async function getPhotoQueue(organizationId?: string, userId?: string): Promise<OfflinePhotoQueueItem[]> {
  const db = await getOfflineDb();
  const items = await db.getAll('photoQueue');
  return items.filter((item) =>
    (!organizationId || item.organizationId === organizationId)
    && (!userId || item.userId === userId),
  );
}

export async function getPhotosByReport(reportId: string, userId?: string): Promise<OfflinePhotoQueueItem[]> {
  const db = await getOfflineDb();
  const items = await db.getAllFromIndex('photoQueue', 'byReport', reportId);
  return items.filter((item) => !userId || item.userId === userId);
}

export async function removePhotoFromQueue(id: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete('photoQueue', id);
}

export async function updatePhotoQueueItem(
  id: string,
  patch: Partial<Pick<OfflinePhotoQueueItem, 'attempts' | 'lastError'>>,
): Promise<void> {
  const db = await getOfflineDb();
  const existing = await db.get('photoQueue', id);
  if (!existing) return;
  await db.put('photoQueue', { ...existing, ...patch });
}

// --- Conflict log ---

export async function recordConflict(item: OfflineConflictItem): Promise<void> {
  const db = await getOfflineDb();
  await db.put('conflictLog', item);
}

export async function getPendingConflicts(organizationId?: string, userId?: string): Promise<OfflineConflictItem[]> {
  const db = await getOfflineDb();
  const items = await db.getAllFromIndex('conflictLog', 'byResolution', 'pending');
  return items.filter((item) =>
    (!organizationId || item.organizationId === organizationId)
    && (!userId || item.userId === userId),
  );
}

export async function resolveConflict(
  reportId: string,
  resolution: 'resolved-local' | 'resolved-server',
): Promise<void> {
  const db = await getOfflineDb();
  const existing = await db.get('conflictLog', reportId);
  if (!existing) return;
  await db.put('conflictLog', { ...existing, resolution });
}

export async function clearResolvedConflicts(): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction('conflictLog', 'readwrite');
  const resolved = await tx.store.index('byResolution').getAll('resolved-local');
  const resolvedServer = await tx.store.index('byResolution').getAll('resolved-server');
  for (const item of [...resolved, ...resolvedServer]) {
    await tx.store.delete(item.reportId);
  }
  await tx.done;
}

export async function removeConflict(reportId: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete('conflictLog', reportId);
}

export async function removeQueuedReportPhotos(reportId: string, userId: string): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction('photoQueue', 'readwrite');
  const photos = await tx.store.index('byReport').getAll(reportId);
  for (const photo of photos) {
    if (photo.userId === userId) await tx.store.delete(photo.id);
  }
  await tx.done;
}

export async function removeQueuedReportData(reportId: string, userId: string): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction(['draftQueue', 'photoQueue'], 'readwrite');
  const draft = await tx.objectStore('draftQueue').get(reportId);
  if (draft?.userId === userId) await tx.objectStore('draftQueue').delete(reportId);
  const photos = await tx.objectStore('photoQueue').index('byReport').getAll(reportId);
  for (const photo of photos) {
    if (photo.userId === userId) await tx.objectStore('photoQueue').delete(photo.id);
  }
  await tx.done;
}

export async function resetFailedQueue(organizationId: string, userId: string): Promise<void> {
  const db = await getOfflineDb();
  const tx = db.transaction(['draftQueue', 'photoQueue'], 'readwrite');
  const [drafts, photos] = await Promise.all([
    tx.objectStore('draftQueue').getAll(),
    tx.objectStore('photoQueue').getAll(),
  ]);
  for (const draft of drafts) {
    if (draft.organizationId === organizationId && draft.userId === userId && draft.attempts >= 5) {
      await tx.objectStore('draftQueue').put({ ...draft, attempts: 0, lastError: null });
    }
  }
  for (const photo of photos) {
    if (photo.organizationId === organizationId && photo.userId === userId && photo.attempts >= 5) {
      await tx.objectStore('photoQueue').put({ ...photo, attempts: 0, lastError: null });
    }
  }
  await tx.done;
}
