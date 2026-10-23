import 'fake-indexeddb/auto';
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueDraft,
  enqueueDraftWithPhotos,
  getDraftQueue,
  removeDraftFromQueue,
  enqueuePhoto,
  getPhotoQueue,
  getPhotosByReport,
  removePhotoFromQueue,
  recordConflict,
  getPendingConflicts,
  resolveConflict,
  clearResolvedConflicts,
  type OfflineDraftQueueItem,
  type OfflinePhotoQueueItem,
  type OfflineConflictItem,
} from './offlineDb';
import { useOfflineQueueStore } from '../stores/offlineQueue.store';

const testOrgId = 'test-org-offline-queue';

function makeDraft(reportId: string): OfflineDraftQueueItem {
  return {
    reportId,
    organizationId: testOrgId,
    projectId: 'test-project',
    userId: 'test-user',
    payload: {
      report_date: '2026-10-20',
      site_manager_name: 'Test',
      weather_conditions: '',
      work_summary: '',
      obstacles: '',
      solutions: '',
      site_manager_signature_path: null,
      photo_paths: [],
      manpower: [],
      equipment: [],
      materials: [],
    },
    queuedAt: new Date().toISOString(),
    serverUpdatedAt: null,
    attempts: 0,
    lastError: null,
  };
}

describe('offline IndexedDB queue', () => {
  beforeEach(async () => {
    const drafts = await getDraftQueue();
    for (const item of drafts) {
      if (item.organizationId === testOrgId) await removeDraftFromQueue(item.reportId);
    }
    const photos = await getPhotoQueue();
    for (const item of photos) {
      if (item.organizationId === testOrgId) await removePhotoFromQueue(item.id);
    }
  });

  test('draft queue upserts by idempotent reportId', async () => {
    const draft = makeDraft('idempotent-report');
    await enqueueDraft(draft);
    await enqueueDraft({ ...draft, payload: { ...draft.payload, work_summary: 'updated' } });

    const results = (await getDraftQueue()).filter((item) => item.reportId === draft.reportId);
    assert.equal(results.length, 1);
    assert.equal(results[0].payload.work_summary, 'updated');
    await removeDraftFromQueue(draft.reportId);
  });

  test('draft and attachments are committed atomically', async () => {
    const draft = makeDraft('atomic-report');
    const photo: OfflinePhotoQueueItem = {
      id: 'atomic-report-photo',
      reportId: draft.reportId,
      organizationId: testOrgId,
      projectId: draft.projectId,
      userId: draft.userId,
      photoId: 'photo-1',
      fileName: 'site.jpg',
      blob: new Blob(['image-bytes'], { type: 'image/jpeg' }),
      purpose: 'photo' as const,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
    };
    const invalidPhoto = new Proxy(photo, {
      get(target, property, receiver) {
        if (property === 'blob') throw new DOMException('Invalid blob', 'DataCloneError');
        return Reflect.get(target, property, receiver);
      },
    });

    await assert.rejects(enqueueDraftWithPhotos(draft, [invalidPhoto]));
    assert.equal((await getDraftQueue()).some((item) => item.reportId === draft.reportId), false);
    assert.equal((await getPhotoQueue()).some((item) => item.reportId === draft.reportId), false);
  });

  test('queues can be scoped to the signed-in user and organization', async () => {
    const ownDraft = makeDraft('own-report');
    const otherUserDraft = { ...makeDraft('other-user-report'), userId: 'another-user' };
    const otherOrgDraft = { ...makeDraft('other-org-report'), organizationId: 'another-org' };
    await Promise.all([
      enqueueDraft(ownDraft),
      enqueueDraft(otherUserDraft),
      enqueueDraft(otherOrgDraft),
    ]);

    const ownQueue = await getDraftQueue(testOrgId, 'test-user');
    assert.deepEqual(ownQueue.map((item) => item.reportId), ['own-report']);

    await Promise.all([
      removeDraftFromQueue(ownDraft.reportId),
      removeDraftFromQueue(otherUserDraft.reportId),
      removeDraftFromQueue(otherOrgDraft.reportId),
    ]);
  });

  test('clears visible queue counts when no user is signed in without deleting pending work', async () => {
    const draft = makeDraft('logout-visibility-report');
    await enqueueDraft(draft);
    await useOfflineQueueStore.getState().refreshCounts(testOrgId, draft.userId);
    assert.equal(useOfflineQueueStore.getState().draftCount, 1);

    await useOfflineQueueStore.getState().refreshCounts('', '');
    const state = useOfflineQueueStore.getState();
    assert.equal(state.draftCount, 0);
    assert.equal(state.photoCount, 0);
    assert.equal(state.attendanceCount, 0);
    assert.equal(state.conflicts.length, 0);
    assert.equal((await getDraftQueue(testOrgId, draft.userId)).length, 1);
    await removeDraftFromQueue(draft.reportId);
  });

  test('photo queue preserves blobs and supports report lookup', async () => {
    const item: OfflinePhotoQueueItem = {
      id: 'report-1-photo-1',
      reportId: 'report-1',
      organizationId: testOrgId,
      projectId: 'test-project',
      userId: 'test-user',
      photoId: 'photo-1',
      fileName: 'site.jpg',
      blob: new Blob(['image-bytes'], { type: 'image/jpeg' }),
      purpose: 'photo',
      queuedAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
    };
    await enqueuePhoto(item);

    const found = await getPhotosByReport(item.reportId);
    assert.equal(found.length, 1);
    assert.equal(await found[0].blob.text(), 'image-bytes');
    await removePhotoFromQueue(item.id);
    assert.equal((await getPhotosByReport(item.reportId)).length, 0);
  });

  test('conflicts remain pending until explicitly resolved', async () => {
    const conflict: OfflineConflictItem = {
      reportId: 'conflict-report',
      organizationId: testOrgId,
      projectId: 'test-project',
      userId: 'test-user',
      localPayload: makeDraft('conflict-report').payload,
      serverUpdatedAt: new Date().toISOString(),
      detectedAt: new Date().toISOString(),
      resolution: 'pending',
    };
    await recordConflict(conflict);
    assert.equal((await getPendingConflicts()).some((item) => item.reportId === conflict.reportId), true);

    await resolveConflict(conflict.reportId, 'resolved-server');
    assert.equal((await getPendingConflicts()).some((item) => item.reportId === conflict.reportId), false);
    await clearResolvedConflicts();
  });
});
