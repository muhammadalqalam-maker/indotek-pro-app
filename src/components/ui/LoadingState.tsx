import { getMessages } from '../../i18n';
import { Skeleton } from './Skeleton';
import { cn } from './utils';

const messages = getMessages('id').common;

export function LoadingState({
  label = messages.loadingPage,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <section
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn('space-y-6', className)}
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-2/3 max-w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 w-full" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </section>
  );
}
