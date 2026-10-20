import { Skeleton } from '../../../components/ui';
import { getMessages } from '../../../i18n';

const messages = getMessages('id').dashboard;

export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label={messages.loading}>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-80 rounded-lg" />
        ))}
      </div>
      <span className="sr-only">{messages.loading}</span>
    </div>
  );
}
