import { AlertTriangle, ArrowRightLeft, Boxes, Package } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { WarehouseInventoryItem, WarehouseMovement } from '../types';
import { getInventoryStatus } from '../utils/warehouse.helpers';

const messages = getMessages().warehouse;

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'danger' | 'info';
}) {
  const toneClass = tone === 'warning'
    ? 'text-warning'
    : tone === 'danger'
      ? 'text-danger'
      : tone === 'info'
        ? 'text-info'
        : 'text-text';
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export function WarehouseSummaryCards({
  inventoryItems,
  movements,
}: {
  inventoryItems: WarehouseInventoryItem[];
  movements: WarehouseMovement[];
}) {
  const month = new Date().toISOString().slice(0, 7);
  const lowCount = inventoryItems.filter((item) => getInventoryStatus(item) === 'low').length;
  const outOfStockCount = inventoryItems.filter((item) => getInventoryStatus(item) === 'out_of_stock').length;
  const monthlyMovementCount = movements.filter((movement) => movement.movement_date.startsWith(month)).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryCard icon={Boxes} label={messages.totalItems} value={String(inventoryItems.length)} />
      <SummaryCard icon={AlertTriangle} label={messages.lowStock} value={String(lowCount)} tone="warning" />
      <SummaryCard icon={Package} label={messages.outOfStock} value={String(outOfStockCount)} tone="danger" />
      <SummaryCard icon={ArrowRightLeft} label={messages.movementsThisMonth} value={String(monthlyMovementCount)} tone="info" />
    </div>
  );
}
