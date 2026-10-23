import { formatTanggal } from '../../../utils/format';
import { getMessages } from '../../../i18n';
import type { QcInspection } from '../types';

const messages = getMessages().safety;
const resultLabels = {
  pass: messages.qcPass,
  fail: messages.qcFail,
  not_applicable: messages.qcNotApplicable,
} as const;

export function QcInspectionList({
  inspections,
  projectNames,
  onCreate,
  canCreate,
}: {
  inspections: QcInspection[];
  projectNames: Map<string, string>;
  onCreate: () => void;
  canCreate: boolean;
}) {
  if (inspections.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-muted">{messages.qualityEmptyInspection}</p>
        {canCreate && (
          <button type="button" onClick={onCreate} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">
            {messages.addQcInspection}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {inspections.map((inspection) => (
        <article key={inspection.id} className="grid content-start gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-semibold text-text">{inspection.title}</h3>
              <p className="text-sm text-muted">{projectNames.get(inspection.project_id) ?? messages.project} · {inspection.location}</p>
            </div>
            <time dateTime={inspection.inspection_date} className="text-sm text-muted">
              {formatTanggal(inspection.inspection_date, { timezone: 'WIB' })}
            </time>
          </header>
          <p className="text-sm text-muted">{messages.inspector}: {inspection.inspector_name}</p>
          <p className="text-xs text-muted">{messages.qcItemCount(inspection.items.length)}</p>
          <ul className="grid gap-2">
            {inspection.items.map((item, index) => (
              <li key={`${inspection.id}-${index}`} className="grid gap-1 rounded-lg border border-border bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <p className="text-sm font-medium text-text">{item.label}</p>
                  {item.notes && <p className="mt-1 text-sm text-muted">{item.notes}</p>}
                </div>
                <span className={`text-sm font-semibold ${item.result === 'fail' ? 'text-danger' : item.result === 'pass' ? 'text-success' : 'text-muted'}`}>
                  {resultLabels[item.result]}
                </span>
              </li>
            ))}
          </ul>
          {inspection.overall_notes && <p className="border-t border-border pt-3 text-sm text-muted">{inspection.overall_notes}</p>}
        </article>
      ))}
    </div>
  );
}
