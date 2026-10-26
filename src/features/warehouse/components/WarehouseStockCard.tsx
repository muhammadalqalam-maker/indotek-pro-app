import { MapPin } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { formatTanggal, formatVolume } from '../../../utils/format';
import type { Project } from '../../../types/database';
import type { WarehouseInventoryItem } from '../types';
import { getInventoryStatus } from '../utils/warehouse.helpers';

const messages = getMessages().warehouse;

export function WarehouseStockCard({
  item,
  projects,
  canEdit,
  onEditMinimum,
}: {
  item: WarehouseInventoryItem;
  projects: Project[];
  canEdit: boolean;
  onEditMinimum: (item: WarehouseInventoryItem) => void;
}) {
  const status = getInventoryStatus(item);
  const statusText = status === 'out_of_stock'
    ? messages.statusOut
    : status === 'low'
      ? messages.statusLow
      : messages.statusSafe;
  const statusClass = status === 'out_of_stock'
    ? 'border-danger/30 bg-danger/10 text-danger'
    : status === 'low'
      ? 'border-warning/30 bg-warning/10 text-warning'
      : 'border-success/30 bg-success/10 text-success';

  return (
    <article className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-text">{item.item_name}</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">{item.item_code} · {item.category}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>
          {statusText}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{messages.currentStock}</p>
          <p className="mt-1 font-semibold tabular-nums text-text">
            {formatVolume(item.current_stock)} {item.unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{messages.minimumStock}</p>
          <p className="mt-1 font-semibold tabular-nums text-text">
            {formatVolume(item.minimum_stock)} {item.unit}
          </p>
        </div>
      </div>
      <div className="mt-3 flex min-w-0 items-start justify-between gap-3 text-xs text-muted-foreground">
        <div className="min-w-0 space-y-1">
          <p className="flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{projects.find((candidate) => candidate.id === item.project_id)?.name ?? item.project_id} · {item.location_name}</span>
          </p>
          <p>{messages.lastMovement}: {item.last_movement_date ? formatTanggal(item.last_movement_date) : '—'}</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => onEditMinimum(item)}
            className="min-h-11 shrink-0 rounded-md px-2 text-left font-semibold text-primary-500 hover:bg-surface-2"
          >
            {messages.minimumLabel}
          </button>
        )}
      </div>
    </article>
  );
}
