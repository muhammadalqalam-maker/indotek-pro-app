import { CalendarDays, Fuel, Timer, Wrench } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { formatRupiah, formatVolume } from '../../../utils/format';
import type { EquipmentSummary } from '../utils/equipmentSummary';

const messages = getMessages().equipment;

export function EquipmentSummaryPanel({ summary }: { summary: EquipmentSummary }) {
  const stats = [
    { label: messages.assets, value: String(summary.assetCount), Icon: Wrench },
    { label: messages.ready, value: String(summary.readyCount), Icon: Timer },
    { label: messages.dueMaintenance, value: String(summary.dueMaintenanceCount), Icon: CalendarDays },
    { label: messages.operatingHours, value: `${formatVolume(summary.operatingHours, 2)} jam`, Icon: Fuel },
  ];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, Icon }) => (
          <article key={label} className="grid min-w-0 gap-2 rounded-xl border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <Icon className="size-4 shrink-0 text-primary-500" aria-hidden="true" />
            </div>
            <p className="break-words text-xl font-bold tabular-nums text-text">{value}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-2 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3 sm:p-5">
        <div>
          <p className="text-sm text-muted-foreground">{messages.rentalCost}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-text">{formatRupiah(summary.rentalCost)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{messages.fuelCost}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-text">{formatRupiah(summary.fuelCost)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{messages.maintenanceCost}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-text">{formatRupiah(summary.maintenanceCost)}</p>
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-3">{messages.costSummaryNote}</p>
      </section>
    </>
  );
}
