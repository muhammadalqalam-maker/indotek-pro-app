import type { ReactNode } from 'react';
import { cn } from './utils';

export function PageShell({
  header,
  filters,
  children,
  footer,
  className,
}: {
  header?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('w-full space-y-6', className)}>
      {header}
      {filters}
      {children}
      {footer}
    </div>
  );
}
