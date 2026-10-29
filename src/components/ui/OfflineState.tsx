import { CloudOff } from 'lucide-react';
import { getMessages } from '../../i18n';
import { Button } from './Button';
import { cn } from './utils';

const messages = getMessages('id').common;

export function OfflineState({
  title = messages.offlineUnavailableTitle,
  description = messages.offlineUnavailableDescription,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <section
      className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-surface px-5 py-10 text-center', className)}
      role="status"
      aria-live="polite"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-muted-foreground">
        <CloudOff className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && <Button variant="outline" onClick={onRetry}>{messages.retry}</Button>}
    </section>
  );
}
