import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyNotificationRealtimeEvent } from './notification.service';
import type { NotificationItem } from '../../../types/database';

const notification = (id: string, createdAt: string, isRead = false): NotificationItem => ({
  id,
  organization_id: 'org-1',
  user_id: 'user-1',
  title: `Notifikasi ${id}`,
  message: 'Pesan notifikasi',
  type: 'info',
  link: null,
  is_read: isRead,
  created_at: createdAt,
});

describe('applyNotificationRealtimeEvent', () => {
  it('adds inserted notifications once and orders newest first', () => {
    const existing = notification('older', '2026-10-19T09:00:00Z');
    const inserted = notification('newer', '2026-10-19T10:00:00Z');

    const result = applyNotificationRealtimeEvent([existing], { type: 'INSERT', notification: inserted });

    assert.deepEqual(result.map(({ id }) => id), ['newer', 'older']);
    assert.deepEqual(applyNotificationRealtimeEvent(result, { type: 'INSERT', notification: inserted }), result);
  });

  it('replaces updated notifications without creating duplicates', () => {
    const original = notification('existing', '2026-10-19T10:00:00Z');
    const updated = { ...original, is_read: true };

    const result = applyNotificationRealtimeEvent([original], { type: 'UPDATE', notification: updated });

    assert.equal(result.length, 1);
    assert.equal(result[0].is_read, true);
  });

  it('removes deleted notifications by id', () => {
    const existing = notification('existing', '2026-10-19T10:00:00Z');
    const other = notification('other', '2026-10-19T09:00:00Z');

    const result = applyNotificationRealtimeEvent([existing, other], { type: 'DELETE', id: existing.id });

    assert.deepEqual(result, [other]);
  });

  it('limits retained events to the latest 50 notifications', () => {
    const existing = Array.from({ length: 50 }, (_, index) =>
      notification(`id-${index}`, `2026-10-19T${String(index).padStart(2, '0')}:00:00Z`));

    const result = applyNotificationRealtimeEvent(
      existing,
      { type: 'INSERT', notification: notification('new', '2026-10-20T00:00:00Z') },
    );

    assert.equal(result.length, 50);
    assert.equal(result[0].id, 'new');
    assert.equal(result.some(({ id }) => id === 'id-0'), false);
  });
});
