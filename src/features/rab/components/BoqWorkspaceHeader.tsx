import { Select } from '../../../components/ui';
import type { BoqVersion } from '../services/boq.service';

type BoqMessages = ReturnType<typeof import('../../../i18n').getMessages>['rab'];

type BoqWorkspaceHeaderProps = {
  projectCode: string;
  projectName: string;
  versions: BoqVersion[];
  selectedVersionId: string | null;
  messages: BoqMessages;
  onVersionChange: (versionId: string | null) => void;
};

export function BoqWorkspaceHeader({
  projectCode,
  projectName,
  versions,
  selectedVersionId,
  messages,
  onVersionChange,
}: BoqWorkspaceHeaderProps) {
  return (
    <header className="grid gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-[minmax(14rem,1fr)_minmax(14rem,20rem)] sm:items-end sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-text">{messages.boqTitle}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{messages.boqDescription}</p>
        <p className="mt-2 text-sm text-muted-foreground">{projectCode} · {projectName}</p>
      </div>
      {versions.length > 0 && (
        <Select
          name="boq-version-selector"
          label={messages.boqVersion}
          value={selectedVersionId ?? ''}
          onChange={(event) => onVersionChange(event.target.value || null)}
        >
          {versions.map((version) => (
            <option key={version.id} value={version.id}>
              {version.title} — Rev {version.revision_number}
            </option>
          ))}
        </Select>
      )}
    </header>
  );
}
