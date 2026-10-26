import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';
import { cn } from './utils';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-5 py-10 text-center', className)}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden="true" />}
      </span>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      </div>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </section>
  );
}
