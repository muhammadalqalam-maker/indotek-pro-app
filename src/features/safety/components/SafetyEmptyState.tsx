import { getMessages } from '../../../i18n';

const messages = getMessages().safety;

export function SafetyEmptyState({
  text,
  canCreate,
  onCreate,
  action,
}: {
  text: string;
  canCreate: boolean;
  onCreate: () => void;
  action: string;
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {canCreate && (
        <button type="button" onClick={onCreate} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">
          {action}
        </button>
      )}
    </div>
  );
}
