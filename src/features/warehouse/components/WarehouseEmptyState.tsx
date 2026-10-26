import type { LucideIcon } from 'lucide-react';

export function WarehouseEmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: () => void;
  actionLabel: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 text-center">
      <Icon className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-text">{title}</p>
      <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{description}</p>
      {action && (
        <button type="button" onClick={action} className="mt-4 min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
