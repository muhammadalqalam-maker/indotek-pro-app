import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card } from './Card';
import { cn } from './utils';

export function KpiCard({
  label,
  value,
  description,
  icon,
  delta,
  sparkline,
  className,
}: {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: ReactNode;
  delta?: { value: string; direction: 'up' | 'down' | 'neutral'; label?: string };
  sparkline?: number[];
  className?: string;
}) {
  const max = Math.max(...(sparkline ?? [0]), 1);
  const min = Math.min(...(sparkline ?? [0]));
  const range = max - min || 1;
  const points = (sparkline ?? []).map((point, index) => {
    const x = sparkline && sparkline.length > 1 ? (index / (sparkline.length - 1)) * 100 : 50;
    const y = 30 - ((point - min) / range) * 26;
    return `${x},${y}`;
  }).join(' ');
  const DeltaIcon = delta?.direction === 'up'
    ? ArrowUpRight
    : delta?.direction === 'down'
      ? ArrowDownRight
      : Minus;

  return (
    <Card className={cn('relative overflow-hidden p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-500">{icon}</span>}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="min-w-0 break-words text-2xl font-bold leading-tight tabular-nums text-text">{value}</p>
        {points && <svg viewBox="0 0 100 32" role="img" aria-label={`Tren ${label}`} className="h-8 w-20 shrink-0 text-primary-500"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>}
      </div>
      {(delta || description) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          {delta && (
            <span className={cn('inline-flex items-center gap-0.5 font-semibold', delta.direction === 'up' ? 'text-success' : delta.direction === 'down' ? 'text-danger' : 'text-muted-foreground')}>
              <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {delta.value}
              {delta.label && <span className="font-normal text-muted-foreground">{delta.label}</span>}
            </span>
          )}
          {description && <span className="text-muted-foreground">{description}</span>}
        </div>
      )}
    </Card>
  );
}
