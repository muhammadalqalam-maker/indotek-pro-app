import { getMessages } from '../../../i18n';
import { formatTanggal } from '../../../utils/format';
import type { SafetyInspection } from '../types';
import { SafetyEmptyState } from './SafetyEmptyState';

const messages = getMessages().safety;
const resultLabels = {
  compliant: messages.resultCompliant,
  non_compliant: messages.resultNonCompliant,
  not_applicable: messages.resultNotApplicable,
} as const;

export function SafetyInspectionList({
  inspections,
  projectNames,
  canCreate,
  onCreate,
}: {
  inspections: SafetyInspection[];
  projectNames: Map<string, string>;
  canCreate: boolean;
  onCreate: () => void;
}) {
  if (inspections.length === 0) {
    return <SafetyEmptyState text={messages.noInspections} canCreate={canCreate} onCreate={onCreate} action={messages.addInspection} />;
  }

  return inspections.map((inspection) => (
    <article key={inspection.id} className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-text">{inspection.title}</h3>
          <p className="text-sm text-muted">
            {projectNames.get(inspection.project_id) ?? messages.project}
            {' · '}{inspection.location}
          </p>
        </div>
        <p className="text-sm text-muted">{formatTanggal(inspection.inspection_date, { timezone: 'WIB' })}</p>
      </header>
      <p className="text-sm text-muted">{messages.inspector}: {inspection.inspector_name}</p>
      <ul className="grid gap-2">
        {inspection.items.map((item, index) => (
          <li key={`${inspection.id}-${index}`} className="grid gap-1 rounded-lg border border-border bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="text-sm font-medium text-text">{item.label}</p>
              {item.notes && <p className="mt-1 text-sm text-muted">{item.notes}</p>}
              {item.follow_up && <p className="mt-1 text-sm text-text">{messages.followUp}: {item.follow_up}</p>}
            </div>
            <span className={`text-sm font-semibold ${item.result === 'non_compliant' ? 'text-danger' : item.result === 'compliant' ? 'text-success' : 'text-muted'}`}>
              {resultLabels[item.result]}
            </span>
          </li>
        ))}
      </ul>
      {inspection.overall_notes && <p className="border-t border-border pt-3 text-sm text-muted">{inspection.overall_notes}</p>}
    </article>
  ));
}
