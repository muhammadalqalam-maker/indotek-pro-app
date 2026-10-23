import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DailyAttendance, FieldWorker } from '../../../types/database';

export type OfflineAttendanceQueueItem = {
  key: string;
  organizationId: string;
  projectId: string;
  userId: string;
  attendanceDate: string;
  record: {
    id: string;
    worker_id: string;
    status: DailyAttendance['status'];
    work_hours: number;
    overtime_hours: number;
  };
  queuedAt: string;
  attempts: number;
  lastError: string | null;
};

interface HrOfflineDB extends DBSchema {
  hrWorkerCache: {
    key: string;
    value: {
      key: string;
      organizationId: string;
      userId: string;
      worker: FieldWorker;
    };
    indexes: { byOrg: string };
  };
  hrAttendanceCache: {
    key: string;
    value: {
      key: string;
      organizationId: string;
      userId: string;
      attendance: DailyAttendance;
    };
    indexes: { byOrg: string };
  };
  attendanceQueue: {
    key: string;
    value: OfflineAttendanceQueueItem;
    indexes: { byOrg: string };
  };
};

const HR_DB_NAME = 'indotek-hr-offline';
const HR_DB_VERSION = 1;
let database: IDBPDatabase<HrOfflineDB> | null = null;

function getHrOfflineDb(): Promise<IDBPDatabase<HrOfflineDB>> {
  if (database) return Promise.resolve(database);
  return openDB<HrOfflineDB>(HR_DB_NAME, HR_DB_VERSION, {
    upgrade(db) {
      const workerStore = db.createObjectStore('hrWorkerCache', { keyPath: 'key' });
      workerStore.createIndex('byOrg', 'organizationId');
      const attendanceStore = db.createObjectStore('hrAttendanceCache', { keyPath: 'key' });
      attendanceStore.createIndex('byOrg', 'organizationId');
      const queueStore = db.createObjectStore('attendanceQueue', { keyPath: 'key' });
      queueStore.createIndex('byOrg', 'organizationId');
    },
  }).then((opened) => {
    database = opened;
    return opened;
  });
}

export async function cacheHrWorkers(
  organizationId: string,
  userId: string,
  projectId: string,
  workers: FieldWorker[],
): Promise<void> {
  const db = await getHrOfflineDb();
  const tx = db.transaction('hrWorkerCache', 'readwrite');
  const existing = await tx.store.index('byOrg').getAll(organizationId);
  for (const item of existing) {
    if (item.userId === userId && item.worker.project_id === projectId) {
      await tx.store.delete(item.key);
    }
  }
  for (const worker of workers) {
    await tx.store.put({
      key: `${organizationId}:${userId}:${worker.id}`,
      organizationId,
      userId,
      worker,
    });
  }
  await tx.done;
}

export async function getCachedHrWorkers(
  organizationId: string,
  userId: string,
): Promise<FieldWorker[]> {
  const db = await getHrOfflineDb();
  const items = await db.getAllFromIndex('hrWorkerCache', 'byOrg', organizationId);
  return items.filter((item) => item.userId === userId).map((item) => item.worker);
}

export async function cacheHrAttendance(
  organizationId: string,
  userId: string,
  projectId: string,
  attendanceDate: string,
  attendances: DailyAttendance[],
): Promise<void> {
  const db = await getHrOfflineDb();
  const tx = db.transaction('hrAttendanceCache', 'readwrite');
  const existing = await tx.store.index('byOrg').getAll(organizationId);
  for (const item of existing) {
    if (
      item.userId === userId
      && item.attendance.project_id === projectId
      && item.attendance.date === attendanceDate
    ) {
      await tx.store.delete(item.key);
    }
  }
  for (const attendance of attendances) {
    await tx.store.put({
      key: `${organizationId}:${userId}:${attendance.project_id}:${attendance.date}:${attendance.worker_id}`,
      organizationId,
      userId,
      attendance,
    });
  }
  await tx.done;
}

export async function getCachedHrAttendance(
  organizationId: string,
  userId: string,
  projectId: string,
  attendanceDate: string,
): Promise<DailyAttendance[]> {
  const db = await getHrOfflineDb();
  const items = await db.getAllFromIndex('hrAttendanceCache', 'byOrg', organizationId);
  return items
    .filter((item) => (
      item.userId === userId
      && item.attendance.project_id === projectId
      && item.attendance.date === attendanceDate
    ))
    .map((item) => item.attendance);
}

export async function clearHrCacheForUser(userId: string): Promise<void> {
  const db = await getHrOfflineDb();
  const tx = db.transaction(['hrWorkerCache', 'hrAttendanceCache'], 'readwrite');
  const [workers, attendances] = await Promise.all([
    tx.objectStore('hrWorkerCache').getAll(),
    tx.objectStore('hrAttendanceCache').getAll(),
  ]);
  for (const item of workers) {
    if (item.userId === userId) await tx.objectStore('hrWorkerCache').delete(item.key);
  }
  for (const item of attendances) {
    if (item.userId === userId) await tx.objectStore('hrAttendanceCache').delete(item.key);
  }
  await tx.done;
}

export async function enqueueAttendance(item: OfflineAttendanceQueueItem): Promise<void> {
  const db = await getHrOfflineDb();
  await db.put('attendanceQueue', item);
}

export async function getAttendanceQueue(
  organizationId?: string,
  userId?: string,
): Promise<OfflineAttendanceQueueItem[]> {
  const db = await getHrOfflineDb();
  const items = await db.getAll('attendanceQueue');
  return items.filter((item) =>
    (!organizationId || item.organizationId === organizationId)
    && (!userId || item.userId === userId),
  );
}

export async function removeAttendanceFromQueue(key: string): Promise<void> {
  const db = await getHrOfflineDb();
  await db.delete('attendanceQueue', key);
}

export async function updateAttendanceQueueItem(
  key: string,
  patch: Partial<Pick<OfflineAttendanceQueueItem, 'attempts' | 'lastError'>>,
): Promise<void> {
  const db = await getHrOfflineDb();
  const existing = await db.get('attendanceQueue', key);
  if (existing) await db.put('attendanceQueue', { ...existing, ...patch });
}

export async function resetFailedAttendanceQueue(organizationId: string, userId: string): Promise<void> {
  const db = await getHrOfflineDb();
  const tx = db.transaction('attendanceQueue', 'readwrite');
  const items = await tx.store.getAll();
  for (const item of items) {
    if (item.organizationId === organizationId && item.userId === userId && item.attempts >= 5) {
      await tx.store.put({ ...item, attempts: 0, lastError: null });
    }
  }
  await tx.done;
}
