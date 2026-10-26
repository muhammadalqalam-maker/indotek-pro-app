import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { cn } from './utils';

export function ErrorState({
  title = 'Terjadi kendala',
  description,
  onRetry,
  retryLabel = 'Coba lagi',
  className,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-danger/30 bg-surface px-5 py-10 text-center', className)} role="alert">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-danger-bg text-danger">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && <Button variant="outline" onClick={onRetry}>{retryLabel}</Button>}
    </section>
  );
}
