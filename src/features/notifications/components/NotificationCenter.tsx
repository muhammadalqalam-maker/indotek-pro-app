import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Bell, CheckCheck, Circle, Info } from 'lucide-react';
import { Badge, Button } from '../../../components/ui';
import { useToast } from '../../../components/ui/Toast';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { formatTanggal } from '../../../utils/format';
import type { NotificationItem } from '../../../types/database';

type NotificationFilter = 'all' | 'unread';

function NotificationIcon({ type }: { type: string }) {
  const className = 'mt-0.5 h-4 w-4 shrink-0';
  if (type === 'urgent') return <AlertCircle className={`${className} text-danger`} aria-hidden="true" />;
  if (type === 'warning') return <Circle className={`${className} text-warning`} aria-hidden="true" />;
  if (type === 'success') return <CheckCheck className={`${className} text-success`} aria-hidden="true" />;
  return <Info className={`${className} text-info`} aria-hidden="true" />;
}

function NotificationRow({
  notification,
  timezone,
  onOpen,
}: {
  notification: NotificationItem;
  timezone: 'WIB' | 'WITA' | 'WIT';
  onOpen: (notification: NotificationItem) => void;
}) {
  const messages = getMessages().notifications;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={`flex min-h-16 w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
          notification.is_read ? '' : 'bg-primary-50/50 dark:bg-primary-500/5'
        }`}
      >
        <NotificationIcon type={notification.type} />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="break-words text-sm font-semibold text-text">{notification.title}</span>
            {!notification.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
          </span>
          <span className="mt-1 block break-words text-sm text-muted-foreground">{notification.message}</span>
          <time className="mt-2 block text-xs text-muted-foreground" dateTime={notification.created_at}>
            {formatTanggal(notification.created_at, { withTime: true, timezone })}
          </time>
          <span className="sr-only">{notification.is_read ? messages.read : messages.unread}</span>
        </span>
      </button>
    </li>
  );
}

export function NotificationCenter() {
  const {
    currentOrg,
    notifications,
    unreadNotifsCount,
    notificationsLoading,
    notificationsError,
    notificationsRealtimeStatus,
    notificationsRealtimeError,
    notificationEventCount,
    reloadNotifications,
    handleMarkRead,
    handleMarkAllRead,
    projects,
    setActiveTab,
    openProjectDetail,
  } = useApp();
  const messages = getMessages().notifications;
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [announcement, setAnnouncement] = useState('');
  const visibleNotifications = useMemo(
    () => filter === 'unread'
      ? notifications.filter((notification) => !notification.is_read)
      : notifications,
    [filter, notifications],
  );

  useEffect(() => {
    if (notificationEventCount > 0) {
      setAnnouncement(messages.newNotifications(notificationEventCount));
    }
  }, [messages, notificationEventCount]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => window.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [isOpen]);

  const navigateToNotification = (link: string | null) => {
    if (!link) return;
    let path: string;
    try {
      const target = new URL(link, window.location.origin);
      if (target.origin !== window.location.origin) return;
      path = target.pathname;
    } catch {
      return;
    }

    const projectMatch = /^\/projects\/([^/]+)$/.exec(path);
    if (projectMatch && projects.some((project) => project.id === projectMatch[1])) {
      openProjectDetail(projectMatch[1]);
      return;
    }

    const destinations: Record<string, 'dashboard' | 'projects' | 'procurement' | 'approvals' | 'settings'> = {
      '/': 'dashboard',
      '/dashboard': 'dashboard',
      '/projects': 'projects',
      '/procurement': 'procurement',
      '/approvals': 'approvals',
      '/settings': 'settings',
    };
    const destination = destinations[path];
    if (destination) setActiveTab(destination);
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      try {
        await handleMarkRead(notification.id);
      } catch (error: unknown) {
        toast({
          title: messages.actionFailed,
          description: error instanceof Error ? error.message : messages.loadError,
          variant: 'error',
        });
      }
    }
    navigateToNotification(notification.link);
    setIsOpen(false);
  };

  const markAllRead = async () => {
    try {
      await handleMarkAllRead();
    } catch (error: unknown) {
      toast({
        title: messages.actionFailed,
        description: error instanceof Error ? error.message : messages.loadError,
        variant: 'error',
      });
    }
  };

  const realtimeLabel = notificationsRealtimeStatus === 'connected'
    ? messages.realtimeConnected
    : notificationsRealtimeStatus === 'connecting'
      ? messages.realtimeConnecting
      : notificationsRealtimeStatus === 'disabled'
        ? messages.realtimeDisabled
        : messages.realtimeUnavailable;
  const realtimeVariant = notificationsRealtimeStatus === 'connected'
    ? 'success'
    : notificationsRealtimeStatus === 'connecting'
      ? 'info'
      : 'warning';

  return (
    <div ref={containerRef} className="relative">
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative grid min-h-11 min-w-11 place-items-center rounded-xl text-muted-foreground transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label={`${messages.openCenter}${unreadNotifsCount > 0 ? `, ${messages.unreadCount(unreadNotifsCount)}` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="notification-center"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadNotifsCount > 0 && (
          <span className="absolute right-1 top-1 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-bold leading-4 text-accent-foreground" aria-hidden="true">
            {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          id="notification-center"
          role="dialog"
          aria-label={messages.title}
          className="absolute left-0 right-auto z-50 mt-2 grid w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:left-auto sm:right-0 sm:w-80"
        >
          <header className="grid gap-3 border-b border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-text">{messages.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{messages.unreadCount(unreadNotifsCount)}</p>
              </div>
              <Badge variant={realtimeVariant} className="shrink-0 whitespace-nowrap">{realtimeLabel}</Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1" role="group" aria-label={messages.title}>
                <Button
                  type="button"
                  variant={filter === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="min-h-11"
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                >
                  {messages.all}
                </Button>
                <Button
                  type="button"
                  variant={filter === 'unread' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="min-h-11"
                  aria-pressed={filter === 'unread'}
                  onClick={() => setFilter('unread')}
                >
                  {messages.unread}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11"
                disabled={unreadNotifsCount === 0}
                onClick={() => void markAllRead()}
              >
                {messages.markAllRead}
              </Button>
            </div>
          </header>

          <div className="max-h-96 overflow-y-auto">
            {notificationsError && (
              <div className="m-3 grid gap-2 rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">
                <p>{messages.loadError} {notificationsError}</p>
                <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => void reloadNotifications()}>
                  {messages.retry}
                </Button>
              </div>
            )}
            {notificationsRealtimeStatus === 'error' && (
              <p className="m-3 rounded-md border border-warning/30 bg-warning-bg p-3 text-sm text-warning" role="status">
                {messages.realtimeError} {notificationsRealtimeError}
              </p>
            )}
            {notificationsLoading ? (
              <div className="grid gap-2 p-4" role="status" aria-busy="true" aria-label={messages.loading}>
                <div className="h-14 animate-pulse rounded-md bg-surface-2" />
                <div className="h-14 animate-pulse rounded-md bg-surface-2" />
                <div className="h-14 animate-pulse rounded-md bg-surface-2" />
              </div>
            ) : visibleNotifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {filter === 'unread' ? messages.noUnread : messages.noNotifications}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {visibleNotifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    timezone={currentOrg?.timezone ?? 'WIB'}
                    onOpen={(item) => void openNotification(item)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
