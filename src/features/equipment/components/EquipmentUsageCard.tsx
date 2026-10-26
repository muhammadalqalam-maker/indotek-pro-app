import { getMessages } from '../../../i18n';
import { formatRupiah, formatTanggal, formatVolume } from '../../../utils/format';
import type { EquipmentUsageEntry } from '../types';

const messages = getMessages().equipment;

export function EquipmentUsageCard({
  entry,
  assetName,
  projectName,
}: {
  entry: EquipmentUsageEntry;
  assetName: string;
  projectName: string;
}) {
  const total = entry.rental_cost_snapshot + entry.fuel_cost_amount;
  return (
    <article className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] sm:items-center">
      <div className="min-w-0">
        <h3 className="break-words font-semibold text-text">{assetName}</h3>
        <p className="text-sm text-muted-foreground">{projectName} · {formatTanggal(entry.usage_date)}</p>
      </div>
      <p className="text-sm text-muted-foreground">{formatVolume(entry.operating_hours, 2)} jam · {formatVolume(entry.fuel_liters, 2)} liter</p>
      <p className="text-sm tabular-nums text-muted-foreground">
        {messages.rentalCost}: {formatRupiah(entry.rental_cost_snapshot)} · {messages.fuelCost}: {formatRupiah(entry.fuel_cost_amount)}
      </p>
      <p className="font-semibold tabular-nums text-text">{messages.usageCostTotal}: {formatRupiah(total)}</p>
      {entry.notes && <p className="text-sm text-muted-foreground sm:col-span-4">{entry.notes}</p>}
    </article>
  );
}
