export type AgingBucket = 'not_due' | '1_30' | '31_60' | '61_90' | 'over_90';

export type AgingTotals = Record<AgingBucket, number>;

type AgingRecord = {
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: string;
};

const dayMilliseconds = 24 * 60 * 60 * 1000;

function dateOrdinal(value: string): number {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) {
    throw new Error(`Tanggal aging tidak valid: ${value}`);
  }
  return Math.floor(timestamp / dayMilliseconds);
}

export function calculateAgingTotals(records: AgingRecord[], today: string): AgingTotals {
  const todayOrdinal = dateOrdinal(today);
  const totals: AgingTotals = { not_due: 0, '1_30': 0, '31_60': 0, '61_90': 0, over_90: 0 };

  for (const record of records) {
    if (!Number.isFinite(record.amount) || !Number.isFinite(record.paidAmount)
      || record.amount < 0 || record.paidAmount < 0 || record.paidAmount > record.amount) {
      throw new Error('Nilai tagihan untuk aging tidak valid.');
    }
    if (record.status === 'draft' || record.status === 'cancelled' || record.status === 'paid') continue;

    const balance = record.amount - record.paidAmount;
    if (balance === 0) continue;

    const daysOverdue = todayOrdinal - dateOrdinal(record.dueDate);
    const bucket: AgingBucket = daysOverdue <= 0
      ? 'not_due'
      : daysOverdue <= 30
        ? '1_30'
        : daysOverdue <= 60
          ? '31_60'
          : daysOverdue <= 90
            ? '61_90'
            : 'over_90';
    totals[bucket] += balance;
  }

  return totals;
}
