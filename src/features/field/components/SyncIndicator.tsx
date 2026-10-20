import { Cloud, CloudOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { useOfflineQueueStore } from '../../../stores/offlineQueue.store';

const messages = getMessages().fieldReports;

type SyncIndicatorProps = {
  isOnline: boolean;
  onRetry?: () => void;
};

export function SyncIndicator({ isOnline, onRetry }: SyncIndicatorProps) {
  const draftCount = useOfflineQueueStore((s) => s.draftCount);
  const photoCount = useOfflineQueueStore((s) => s.photoCount);
  const syncStatus = useOfflineQueueStore((s) => s.syncStatus);
  const count = draftCount + photoCount;

  const status = !isOnline
    ? 'offline'
    : syncStatus === 'conflict'
      ? 'conflict'
      : syncStatus === 'error'
        ? 'error'
        : syncStatus === 'syncing'
          ? 'syncing'
          : count > 0
            ? 'pending'
            : 'online';

  const style = status === 'error' || status === 'conflict'
    ? 'border-destructive/30 bg-destructive/10 text-destructive'
    : status === 'offline' || status === 'pending' || status === 'syncing'
      ? 'border-warning/30 bg-warning/10 text-warning-foreground'
      : 'border-success/30 bg-success/10 text-success-foreground';

  const label = status === 'offline'
    ? messages.syncOffline
    : status === 'conflict'
      ? messages.syncConflict
      : status === 'error'
        ? messages.syncError
        : status === 'syncing'
          ? messages.syncRunning
          : status === 'pending'
            ? messages.syncPending(count)
            : messages.syncOnline;

  const Icon = status === 'offline'
    ? CloudOff
    : status === 'conflict'
      ? AlertTriangle
      : status === 'error'
        ? AlertTriangle
        : status === 'syncing'
          ? RefreshCw
          : status === 'pending'
            ? Cloud
            : Check;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium ${style}`}
    >
      <Icon aria-hidden="true" className={`size-4 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span>{label}</span>
      {(status === 'error' || status === 'pending') && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 rounded px-2 py-1 text-xs underline underline-offset-2"
        >
          {messages.syncRetry}
        </button>
      )}
    </div>
  );
}
