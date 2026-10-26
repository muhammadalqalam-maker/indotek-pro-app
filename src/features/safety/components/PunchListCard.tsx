import { useState } from 'react';
import { formatTanggal } from '../../../utils/format';
import { getMessages } from '../../../i18n';
import type { QualityPunchListItem, PunchListSeverity, PunchListStatus } from '../types';
import { PunchListClosureForm } from './PunchListClosureForm';

const messages = getMessages().safety;
const statusLabels: Record<PunchListStatus, string> = {
  open: messages.punchOpen,
  in_progress: messages.punchInProgress,
  ready_for_inspection: messages.punchReadyInspection,
  closed: messages.punchClosed,
};
const severityLabels: Record<PunchListSeverity, string> = {
  minor: messages.punchSeverityMinor,
  major: messages.punchSeverityMajor,
  critical: messages.punchSeverityCritical,
};

export function PunchListCard({
  item,
  projectName,
  canEdit,
  canClose,
  isSaving,
  onAdvance,
  onClose,
}: {
  item: QualityPunchListItem;
  projectName: string;
  canEdit: boolean;
  canClose: boolean;
  isSaving: boolean;
  onAdvance: (item: QualityPunchListItem, nextStatus: 'in_progress' | 'ready_for_inspection') => Promise<void>;
  onClose: (item: QualityPunchListItem, photo: File) => Promise<void>;
}) {
  const [showClosureForm, setShowClosureForm] = useState(false);
  const isClosed = item.status === 'closed';

  return (
    <article className="grid content-start gap-4 rounded-xl border border-border bg-surface p-4 shadow-xs">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-warning/10 px-2 py-1 text-xs font-semibold text-warning">{item.code}</span>
            <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-semibold text-muted-foreground">{severityLabels[item.severity]}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-text">{item.category} · {item.location_zone}</h3>
          <p className="text-xs text-muted-foreground">{projectName}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-text">
          {statusLabels[item.status]}
        </span>
      </header>
      <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-text">{item.defect_description}</p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{messages.punchOwner}</p>
          <p className="mt-1 break-words font-medium text-text">{item.assigned_to_subcon}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{messages.punchDueDate}</p>
          <p className="mt-1 font-medium text-text">{formatTanggal(item.due_date, { timezone: 'WIB' })}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <figure className="grid gap-1">
          <img src={item.before_photo_url} alt={messages.punchBeforePhotoAlt} className="aspect-video w-full rounded-md border border-border object-cover" />
          <figcaption className="text-xs text-muted-foreground">{messages.punchBeforePhoto}</figcaption>
        </figure>
        {item.after_photo_url ? (
          <figure className="grid gap-1">
            <img src={item.after_photo_url} alt={messages.punchAfterPhotoAlt} className="aspect-video w-full rounded-md border border-border object-cover" />
            <figcaption className="text-xs text-muted-foreground">{messages.punchAfterPhoto}</figcaption>
          </figure>
        ) : (
          <p className="grid min-h-24 place-items-center rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            {messages.punchAfterPhoto}
          </p>
        )}
      </div>
      <footer className="grid gap-3 border-t border-border pt-3 text-xs sm:flex sm:items-center sm:justify-between">
        <span className="text-muted-foreground">{messages.punchReporter}: {item.reported_by}</span>
        {canEdit && !isClosed && (
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {item.status === 'open' && (
              <button
                type="button"
                onClick={() => void onAdvance(item, 'in_progress')}
                disabled={isSaving}
                className="min-h-11 rounded-md border border-border px-3 text-sm font-semibold text-text disabled:opacity-60"
              >
                {messages.punchStartRepair}
              </button>
            )}
            {item.status === 'in_progress' && (
              <button
                type="button"
                onClick={() => void onAdvance(item, 'ready_for_inspection')}
                disabled={isSaving}
                className="min-h-11 rounded-md border border-border px-3 text-sm font-semibold text-text disabled:opacity-60"
              >
                {messages.punchReadyButton}
              </button>
            )}
            {item.status === 'ready_for_inspection' && canClose && (
              <button
                type="button"
                onClick={() => setShowClosureForm((open) => !open)}
                disabled={isSaving}
                className="min-h-11 rounded-md bg-success px-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {messages.punchCloseButton}
              </button>
            )}
          </div>
        )}
      </footer>
      {!isClosed && item.status === 'ready_for_inspection' && !canClose && (
        <p className="text-xs text-muted-foreground">{messages.punchClosureRoleHint}</p>
      )}
      {showClosureForm && (
        <PunchListClosureForm
          isSaving={isSaving}
          onCancel={() => setShowClosureForm(false)}
          onClose={async (photo) => {
            await onClose(item, photo);
            setShowClosureForm(false);
          }}
        />
      )}
    </article>
  );
}
