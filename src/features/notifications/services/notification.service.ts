import { getSupabase } from '../../../lib/supabase';
import type { Tables, NotificationItem } from '../../../types/database';

export type NotificationRealtimeEvent =
  | { type: 'INSERT' | 'UPDATE'; notification: NotificationItem }
  | { type: 'DELETE'; id: string };

export type NotificationRealtimeStatus = 'connecting' | 'connected' | 'error' | 'closed' | 'disabled';

export function applyNotificationRealtimeEvent(
  notifications: NotificationItem[],
  event: NotificationRealtimeEvent,
): NotificationItem[] {
  if (event.type === 'DELETE') {
    return notifications.filter((notification) => notification.id !== event.id);
  }
  return [
    event.notification,
    ...notifications.filter((notification) => notification.id !== event.notification.id),
  ]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);
}

function mapNotification(row: Tables<'notifications'>): NotificationItem {
  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    link: row.link,
    is_read: row.is_read,
    created_at: row.created_at,
  };
}

export function subscribeToNotifications(
  organizationId: string,
  userId: string,
  onEvent: (event: NotificationRealtimeEvent) => void,
  onStatus: (status: NotificationRealtimeStatus, error?: string) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Koneksi Supabase belum tersedia untuk notifikasi realtime.');

  onStatus('connecting');
  const channel = supabase
    .channel(`notifications:${organizationId}:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old.id;
          if (typeof id === 'string') onEvent({ type: 'DELETE', id });
          return;
        }

        const row = payload.new as Tables<'notifications'>;
        if (row.organization_id !== organizationId || row.user_id !== userId) return;
        onEvent({
          type: payload.eventType,
          notification: mapNotification(row),
        });
      },
    )
    .subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        onStatus('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatus('error', error?.message);
      } else {
        onStatus('closed');
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
