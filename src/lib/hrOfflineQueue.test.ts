import 'fake-indexeddb/auto';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheHrWorkers,
  clearHrCacheForUser,
  enqueueAttendance,
  getAttendanceQueue,
  getCachedHrWorkers,
  removeAttendanceFromQueue,
  type OfflineAttendanceQueueItem,
} from '../features/hr/services/hrOfflineStorage';
import type { FieldWorker } from '../types/database';

const organizationId = 'hr-offline-test-org';
const projectId = 'hr-offline-test-project';
const userId = 'hr-offline-test-user';

function makeQueueItem(key: string, overrides: Partial<OfflineAttendanceQueueItem> = {}): OfflineAttendanceQueueItem {
  return {
    key,
    organizationId,
    projectId,
    userId,
    attendanceDate: '2026-10-22',
    record: {
      id: 'hr-offline-test-record',
      worker_id: 'hr-offline-test-worker',
      status: 'hadir',
      work_hours: 8,
      overtime_hours: 0,
    },
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    ...overrides,
  };
}

describe('HR offline storage', () => {
  beforeEach(async () => {
    const queue = await getAttendanceQueue();
    for (const item of queue) {
      if (item.organizationId === organizationId) await removeAttendanceFromQueue(item.key);
    }
    await clearHrCacheForUser(userId);
  });

  it('deduplicates attendance by organization, project, date, and worker key', async () => {
    const item = makeQueueItem('attendance-key');
    await enqueueAttendance(item);
    await enqueueAttendance({
      ...item,
      record: { ...item.record, status: 'lembur', overtime_hours: 2 },
    });

    const results = await getAttendanceQueue(organizationId, userId);
    assert.equal(results.length, 1);
    assert.equal(results[0].record.status, 'lembur');
    await removeAttendanceFromQueue(item.key);
  });

  it('scopes queued attendance by organization and user', async () => {
    await Promise.all([
      enqueueAttendance(makeQueueItem('own-attendance')),
      enqueueAttendance(makeQueueItem('other-user-attendance', { userId: 'another-user' })),
      enqueueAttendance(makeQueueItem('other-org-attendance', { organizationId: 'another-org' })),
    ]);

    const ownQueue = await getAttendanceQueue(organizationId, userId);
    assert.deepEqual(ownQueue.map((item) => item.key), ['own-attendance']);
    await Promise.all([
      removeAttendanceFromQueue('own-attendance'),
      removeAttendanceFromQueue('other-user-attendance'),
      removeAttendanceFromQueue('other-org-attendance'),
    ]);
  });

  it('scopes cached worker details and clears them at logout', async () => {
    const worker: FieldWorker = {
      id: 'hr-offline-test-worker',
      organization_id: organizationId,
      project_id: projectId,
      nik: '3171000000000001',
      full_name: 'Pekerja Uji',
      role_trade: 'Tukang Besi',
      daily_wage_rate: 0,
      overtime_hourly_rate: 0,
      status: 'active',
    };
    await cacheHrWorkers(organizationId, userId, projectId, [worker]);
    await cacheHrWorkers(organizationId, 'another-user', projectId, [{ ...worker, full_name: 'Akun Lain' }]);

    assert.equal((await getCachedHrWorkers(organizationId, userId))[0].full_name, worker.full_name);
    await clearHrCacheForUser(userId);
    assert.equal((await getCachedHrWorkers(organizationId, userId)).length, 0);
    assert.equal((await getCachedHrWorkers(organizationId, 'another-user')).length, 1);
    await clearHrCacheForUser('another-user');
  });

  it('replaces workers only for the selected project', async () => {
    const otherProject = 'hr-offline-test-other-project';
    const firstProjectWorker: FieldWorker = {
      id: 'hr-offline-test-worker-a',
      organization_id: organizationId,
      project_id: projectId,
      nik: 'A-001',
      full_name: 'Pekerja A',
      role_trade: 'Operator',
      daily_wage_rate: 0,
      overtime_hourly_rate: 0,
      status: 'active',
    };
    const secondProjectWorker: FieldWorker = {
      ...firstProjectWorker,
      id: 'hr-offline-test-worker-b',
      project_id: otherProject,
      nik: 'B-001',
      full_name: 'Pekerja B',
    };
    await cacheHrWorkers(organizationId, userId, projectId, [firstProjectWorker]);
    await cacheHrWorkers(organizationId, userId, otherProject, [secondProjectWorker]);
    await cacheHrWorkers(organizationId, userId, projectId, []);

    const cached = await getCachedHrWorkers(organizationId, userId);
    assert.deepEqual(cached.map((worker) => worker.id), [secondProjectWorker.id]);
    await clearHrCacheForUser(userId);
  });
});
