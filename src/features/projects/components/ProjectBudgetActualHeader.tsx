import { Button, Select } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import type { ApprovedBoqVersion } from '../services/projectBudgetActual.service';

const messages = getMessages('id').projects.budgetActual;

type ProjectBudgetActualHeaderProps = {
  versions: ApprovedBoqVersion[];
  selectedVersionId: string;
  canCreate: boolean;
  canAddExpense: boolean;
  onVersionChange: (versionId: string) => void;
  onAddExpense: () => void;
};

export function ProjectBudgetActualHeader({
  versions,
  selectedVersionId,
  canCreate,
  canAddExpense,
  onVersionChange,
  onAddExpense,
}: ProjectBudgetActualHeaderProps) {
  return (
    <header className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-text">{messages.title}</h2>
        <p className="mt-1 text-sm text-muted">{messages.overview}</p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-64">
        <Select
          label={messages.revision}
          value={selectedVersionId}
          onChange={(event) => onVersionChange(event.target.value)}
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {messages.revisionTitle(version.revision_number, version.title)}
            </option>
          ))}
        </Select>
        {canCreate && (
          <Button onClick={onAddExpense} disabled={!canAddExpense}>
            {messages.addExpense}
          </Button>
        )}
      </div>
    </header>
  );
}
