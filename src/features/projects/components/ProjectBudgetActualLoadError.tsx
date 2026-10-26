import { RefreshCw } from 'lucide-react';
import { Button } from '../../../components/ui';
import { getMessages } from '../../../i18n';

const messages = getMessages('id').projects.budgetActual;

export function ProjectBudgetActualLoadError({
  detail,
  onRetry,
}: {
  detail: string;
  onRetry: () => void;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-danger bg-surface p-4" role="alert">
      <p className="text-sm text-danger">{messages.loadFailed}</p>
      <p className="break-words text-xs text-muted-foreground">{detail}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />{messages.retry}
      </Button>
    </section>
  );
}
