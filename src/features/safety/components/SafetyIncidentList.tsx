import { getMessages } from '../../../i18n';
import { formatTanggal } from '../../../utils/format';
import type { SafetyIncident, SafetyIncidentCategory, SafetyIncidentSeverity } from '../types';
import type { SafetyIncidentActionValues } from '../schemas/safety.schema';
import { SafetyIncidentActionForm } from './SafetyIncidentActionForm';
import { SafetyEmptyState } from './SafetyEmptyState';

const messages = getMessages().safety;
const categoryLabels: Record<SafetyIncidentCategory, string> = {
  'Near Miss (Hampir Celaka)': messages.categoryNearMiss,
  'First Aid (P3K)': messages.categoryFirstAid,
  'Medical Treatment': messages.categoryMedicalTreatment,
  'Lost Time Injury (LTI)': messages.categoryLostTimeInjury,
  'Kerusakan Alat': messages.categoryEquipmentDamage,
};
const severityLabels: Record<SafetyIncidentSeverity, string> = {
  Rendah: messages.severityLow,
  Sedang: messages.severityMedium,
  Tinggi: messages.severityHigh,
  Kritis: messages.severityCritical,
};
const statusLabels: Record<SafetyIncident['status'], string> = {
  investigating: messages.statusInvestigating,
  action_taken: messages.statusActionTaken,
  closed: messages.statusClosed,
};

export function SafetyIncidentList({
  incidents,
  projectNames,
  canCreate,
  canEdit,
  isSaving,
  activeActionId,
  onCreate,
  onStartAction,
  onCancelAction,
  onSaveAction,
  onCloseIncident,
}: {
  incidents: SafetyIncident[];
  projectNames: Map<string, string>;
  canCreate: boolean;
  canEdit: boolean;
  isSaving: boolean;
  activeActionId: string | null;
  onCreate: () => void;
  onStartAction: (incidentId: string) => void;
  onCancelAction: () => void;
  onSaveAction: (incidentId: string, values: SafetyIncidentActionValues) => Promise<void>;
  onCloseIncident: (incidentId: string) => void;
}) {
  if (incidents.length === 0) {
    return <SafetyEmptyState text={messages.noIncidents} canCreate={canCreate} onCreate={onCreate} action={messages.addIncident} />;
  }

  return incidents.map((incident) => (
    <article key={incident.id} className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-text">{incident.incident_number}</h3>
            <span className="rounded-md bg-info/10 px-2 py-1 text-xs font-semibold text-info">{categoryLabels[incident.category]}</span>
            <span className="rounded-md bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">{severityLabels[incident.severity]}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {projectNames.get(incident.project_id) ?? messages.project}
            {' · '}{incident.location}
            {' · '}{formatTanggal(incident.incident_date, { timezone: 'WIB' })}
          </p>
        </div>
        <span className="w-fit rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-text">
          {messages.status}: {statusLabels[incident.status]}
        </span>
      </header>
      <p className="text-sm text-text">{incident.description}</p>
      <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{messages.immediateAction}</p>
          <p className="mt-1 text-sm text-text">{incident.immediate_action}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{messages.correctiveAction}</p>
          <p className="mt-1 text-sm text-text">{incident.corrective_action || '—'}</p>
        </div>
      </div>
      <footer className="flex flex-col gap-2 border-t border-border pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">{messages.reporter}: {incident.reporter_name}</p>
        {canEdit && incident.status === 'investigating' && (
          <button
            type="button"
            onClick={() => onStartAction(incident.id)}
            className="min-h-11 rounded-md border border-border px-3 font-semibold text-text"
          >
            {messages.statusActionButton}
          </button>
        )}
        {canEdit && incident.status === 'action_taken' && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onCloseIncident(incident.id)}
            className="min-h-11 rounded-md border border-border px-3 font-semibold text-text disabled:opacity-60"
          >
            {messages.statusCloseButton}
          </button>
        )}
      </footer>
      {activeActionId === incident.id && incident.status === 'investigating' && (
        <div className="grid gap-2 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">{messages.statusActionDescription}</p>
          <SafetyIncidentActionForm
            isSaving={isSaving}
            onCancel={onCancelAction}
            onSave={(values) => onSaveAction(incident.id, values)}
          />
        </div>
      )}
    </article>
  ));
}
