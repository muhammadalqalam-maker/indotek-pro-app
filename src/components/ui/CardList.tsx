import type { ReactNode } from 'react';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { cn } from './utils';

export type CardListField<Row> = {
  label: string;
  value: (row: Row) => ReactNode;
};

export function CardList<Row>({
  rows,
  rowKey,
  title,
  description,
  fields,
  actions,
  loading = false,
  emptyTitle = 'Belum ada data',
  emptyDescription,
  className,
}: {
  rows: Row[];
  rowKey: (row: Row) => string;
  title: (row: Row) => ReactNode;
  description?: (row: Row) => ReactNode;
  fields?: CardListField<Row>[];
  actions?: (row: Row) => ReactNode;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn('grid gap-3', className)} role="status" aria-label="Memuat daftar">
        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-36 w-full" />)}
      </div>
    );
  }
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />;
  }
  return (
    <ul className={cn('grid gap-3', className)}>
      {rows.map((row) => (
        <li key={rowKey(row)}>
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h3 className="break-words text-sm font-semibold text-text">{title(row)}</h3>
                {description && <div className="text-xs text-muted-foreground">{description(row)}</div>}
              </div>
              {actions && <div className="shrink-0">{actions(row)}</div>}
            </div>
            {fields && fields.length > 0 && (
              <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-border pt-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.label} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{field.label}</dt>
                    <dd className="mt-0.5 break-words text-sm text-text">{field.value(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
