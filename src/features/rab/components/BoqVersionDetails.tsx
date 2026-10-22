import { Send, Save } from 'lucide-react';
import { Badge, Button, EmptyState } from '../../../components/ui';
import { formatRupiah } from '../../../utils/format';
import type { BoqDraftTotals } from '../boqCalculations';
import type { BoqItem, BoqVersion } from '../services/boq.service';
import type { MeasurementUnit } from '../types';
import { BoqTotalSummary } from './BoqTotalSummary';

type BoqMessages = ReturnType<typeof import('../../../i18n').getMessages>['rab'];

type BoqVersionDetailsProps = {
  version: BoqVersion;
  items: BoqItem[];
  units: MeasurementUnit[];
  totals: BoqDraftTotals;
  canEdit: boolean;
  messages: BoqMessages;
  onEdit: () => void;
  onRequestApproval: () => void;
  isRequestingApproval: boolean;
};

function getStatusLabel(version: BoqVersion, messages: BoqMessages) {
  switch (version.status) {
    case 'draft': return messages.boqStatusDraft;
    case 'pending_approval': return messages.boqStatusPending;
    case 'approved': return messages.boqStatusApproved;
    case 'rejected': return messages.boqStatusRejected;
    default: return version.status;
  }
}

export function BoqVersionDetails({
  version,
  items,
  units,
  totals,
  canEdit,
  messages,
  onEdit,
  onRequestApproval,
  isRequestingApproval,
}: BoqVersionDetailsProps) {
  const divisions = items.filter((item) => item.item_type === 'division');

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-text">{version.title}</h3>
          <Badge variant={version.status === 'approved' ? 'success' : 'neutral'}>{getStatusLabel(version, messages)}</Badge>
        </div>
        {canEdit && version.status === 'draft' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onRequestApproval} disabled={isRequestingApproval}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {isRequestingApproval ? messages.boqSubmittingApproval : messages.boqSubmitApproval}
            </Button>
            <Button onClick={onEdit}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {messages.boqEditorTitle}
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title={messages.boqNoItems} description={messages.boqNewDescription} />
      ) : (
        <div className="grid gap-3">
          {divisions.map((division) => {
            const workItems = items.filter((item) => item.parent_id === division.id && item.item_type === 'work_item');
            return (
              <section key={division.id} className="grid gap-2 rounded-xl border border-border bg-surface p-4">
                <h3 className="font-semibold text-text">{division.item_code} · {division.description}</h3>
                {workItems.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-sm">
                    <span className="min-w-0 flex-1 text-text">{item.item_code} · {item.description}</span>
                    <span className="text-muted">
                      {item.volume} {units.find((unit) => unit.id === item.unit_id)?.symbol ?? ''}
                      {' × '}{formatRupiah(Number(item.unit_price), true, 2)}
                    </span>
                    <strong className="tabular-nums text-text">{formatRupiah(Number(item.line_total), true, 2)}</strong>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}

      <BoqTotalSummary totals={totals} messages={messages} />
    </div>
  );
}
