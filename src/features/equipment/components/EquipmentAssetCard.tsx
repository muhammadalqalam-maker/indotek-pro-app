import { CalendarDays, Fuel, Pencil, Wrench } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { formatRupiah, formatTanggal, formatVolume } from '../../../utils/format';
import type { EquipmentAsset } from '../types';
import { getEquipmentTotalHours } from '../utils/equipmentSummary';
import type { EquipmentUsageEntry } from '../types';

const messages = getMessages().equipment;

function conditionLabel(condition: EquipmentAsset['condition']): string {
  if (condition === 'Sangat Baik') return messages.statusExcellent;
  if (condition === 'Perlu Perawatan') return messages.statusNeedsMaintenance;
  if (condition === 'Rusak / Perbaikan') return messages.statusRepair;
  return messages.statusGood;
}

export function EquipmentAssetCard({
  asset,
  projectName,
  usage,
  today,
  canEdit,
  onEdit,
}: {
  asset: EquipmentAsset;
  projectName: string;
  usage: EquipmentUsageEntry[];
  today: string;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const maintenanceDue = asset.next_maintenance_date !== null
    && asset.next_maintenance_date <= today;
  const maintenanceStatus = asset.next_maintenance_date === today
    ? messages.statusDue
    : messages.statusOverdue;

  return (
    <article className="grid gap-4 rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-accent-500/10 px-2 py-1 text-xs font-semibold text-accent-600">{asset.code}</span>
            <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-muted">{asset.category}</span>
          </div>
          <h3 className="mt-2 break-words font-semibold text-text">{asset.name}</h3>
          {asset.brand_model && <p className="text-sm text-muted">{asset.brand_model}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
          asset.condition === 'Rusak / Perbaikan'
            ? 'bg-danger/10 text-danger'
            : asset.condition === 'Perlu Perawatan' || maintenanceDue
              ? 'bg-warning/10 text-warning-foreground'
              : 'bg-success/10 text-success-foreground'
        }`}>
          {maintenanceDue ? maintenanceStatus : conditionLabel(asset.condition)}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2 p-3 text-sm">
        <div>
          <dt className="text-xs text-muted">{messages.ownership}</dt>
          <dd className="mt-1 font-medium text-text">{asset.ownership === 'rental' ? messages.rental : messages.internalAsset}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{messages.dailyRentalRate}</dt>
          <dd className="mt-1 font-medium tabular-nums text-text">{asset.ownership === 'rental' ? formatRupiah(asset.daily_rental_rate) : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{messages.assignedProject}</dt>
          <dd className="mt-1 break-words font-medium text-text">{projectName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{messages.totalOperatingHours}</dt>
          <dd className="mt-1 font-medium tabular-nums text-text">{formatVolume(getEquipmentTotalHours(asset.id, usage), 2)} jam</dd>
        </div>
      </dl>

      <div className="grid gap-2 text-sm text-muted sm:grid-cols-2">
        <p className="flex min-w-0 items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{messages.lastMaintenanceDate}: {formatTanggal(asset.last_maintenance_date)}</span>
        </p>
        <p className="flex min-w-0 items-start gap-2">
          <Wrench className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{messages.nextMaintenanceDate}: {formatTanggal(asset.next_maintenance_date)}</span>
        </p>
        <p className="flex min-w-0 items-start gap-2">
          <Fuel className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{asset.fuel_consumption_rate || messages.fuelConsumptionRate}</span>
        </p>
      </div>

      {canEdit && (
        <div className="flex justify-end border-t border-border pt-3">
          <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-text hover:bg-surface-2">
            <Pencil className="size-4" aria-hidden="true" />
            {messages.editAsset}
          </button>
        </div>
      )}
    </article>
  );
}
