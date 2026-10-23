import { getMessages } from '../../../i18n';
import { formatRupiah, formatTanggal } from '../../../utils/format';
import type { EquipmentMaintenanceLog } from '../types';

const messages = getMessages().equipment;

export function EquipmentMaintenanceCard({
  entry,
  assetName,
  projectName,
}: {
  entry: EquipmentMaintenanceLog;
  assetName: string;
  projectName: string;
}) {
  return (
    <article className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] sm:items-center">
      <div className="min-w-0">
        <h3 className="break-words font-semibold text-text">{entry.description}</h3>
        <p className="text-sm text-muted">{assetName} · {projectName}</p>
      </div>
      <p className="text-sm text-muted">
        {messages.maintenanceDate}: {formatTanggal(entry.maintenance_date)}
        {entry.next_maintenance_date && ` · ${messages.nextMaintenanceDate}: ${formatTanggal(entry.next_maintenance_date)}`}
      </p>
      <p className="font-semibold tabular-nums text-text">{formatRupiah(entry.cost_amount)}</p>
    </article>
  );
}
