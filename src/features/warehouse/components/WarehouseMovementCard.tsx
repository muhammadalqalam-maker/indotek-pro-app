import { ArrowDownRight, ArrowRightLeft, ArrowUpRight, Wrench, type LucideIcon } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { formatTanggal, formatVolume } from '../../../utils/format';
import type { Project } from '../../../types/database';
import type { WarehouseMovement, WarehouseMovementType } from '../types';

const messages = getMessages().warehouse;

function movementIcon(type: WarehouseMovementType): LucideIcon {
  if (type === 'in') return ArrowDownRight;
  if (type === 'out') return ArrowUpRight;
  if (type === 'transfer') return ArrowRightLeft;
  return Wrench;
}

function movementLabel(type: WarehouseMovementType): string {
  if (type === 'in') return messages.in;
  if (type === 'out') return messages.out;
  if (type === 'transfer') return messages.transfer;
  return messages.adjustment;
}

export function WarehouseMovementCard({
  movement,
  projects,
}: {
  movement: WarehouseMovement;
  projects: Project[];
}) {
  const Icon = movementIcon(movement.movement_type);
  const source = movement.source_item;
  const destination = movement.destination_item;
  const movementProjectId = movement.destination_project_id ?? movement.source_project_id;
  const projectName = (projectId: string | null) =>
    projects.find((project) => project.id === projectId)?.name ?? projectId ?? '—';
  const itemName = destination?.item_name ?? source?.item_name ?? messages.inventory;
  const itemUnit = destination?.unit ?? source?.unit ?? '';

  return (
    <article className="min-w-0 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-text">{movement.movement_number}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatTanggal(movement.movement_date)}</p>
        </div>
        <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 text-xs font-semibold text-text">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {movementLabel(movement.movement_type)}
        </span>
      </div>
      <p className="mt-3 break-words text-sm font-medium text-text">
        {itemName} · {formatVolume(movement.quantity)} {itemUnit}
      </p>
      <p className="mt-1 break-words text-xs text-muted-foreground">
        {projectName(movementProjectId)}
        {source && <> · {messages.from}: {source.location_name}</>}
        {destination && <> · {messages.to}: {projectName(destination.project_id)} / {destination.location_name}</>}
      </p>
      <div className="mt-3 grid gap-1 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-2">
        <p className="break-words">{messages.referenceDoc}: {movement.reference_doc || '—'}</p>
        <p className="break-words">{messages.recipientOrSupplier}: {movement.recipient_or_supplier || '—'}</p>
        {movement.notes && <p className="break-words sm:col-span-2">{messages.notes}: {movement.notes}</p>}
      </div>
    </article>
  );
}
