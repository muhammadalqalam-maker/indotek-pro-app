import {
  CLIENT_INVOICE_STATUSES,
  CASH_TRANSACTION_STATUSES,
  CASH_TRANSACTION_TYPES,
  PROJECT_PAYABLE_STATUSES,
  type ClientInvoice,
  type ProjectCashTransaction,
  type ProjectPayable,
} from '../../../types/database';

type CashFlowMonth = {
  month: string;
  actualInflow: number;
  actualOutflow: number;
  actualNet: number | null;
  scheduledInflow: number;
  scheduledOutflow: number;
  scheduledNet: number | null;
};

export type CashFlowForecast = {
  months: CashFlowMonth[];
  scheduledInflow: number;
  scheduledOutflow: number;
  scheduledNet: number;
};

const FORECASTABLE_INVOICE_STATUSES: ReadonlySet<ClientInvoice['status']> = new Set([
  CLIENT_INVOICE_STATUSES.sent,
  CLIENT_INVOICE_STATUSES.partiallyPaid,
  CLIENT_INVOICE_STATUSES.overdue,
]);
const FORECASTABLE_PAYABLE_STATUSES: ReadonlySet<ProjectPayable['status']> = new Set([
  PROJECT_PAYABLE_STATUSES.sent,
  PROJECT_PAYABLE_STATUSES.partiallyPaid,
  PROJECT_PAYABLE_STATUSES.overdue,
]);

function getMonthKey(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(date.slice(8, 10));
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    month < 1
    || month > 12
    || parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() !== month - 1
    || parsedDate.getUTCDate() !== day
  ) return null;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function addMonths(year: number, month: number, offset: number): string {
  const date = new Date(Date.UTC(year, month + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function remainingAmount(amount: number, paidAmount: number | undefined): number {
  if (!Number.isFinite(amount)) return 0;
  const paid = Number.isFinite(paidAmount) ? paidAmount ?? 0 : 0;
  return Math.max(0, amount - paid);
}

export function buildCashFlowForecast(
  transactions: ProjectCashTransaction[],
  invoices: ClientInvoice[],
  payables: ProjectPayable[],
  asOfDate = new Date(),
): CashFlowForecast {
  const year = asOfDate.getUTCFullYear();
  const month = asOfDate.getUTCMonth();
  const currentMonth = addMonths(year, month, 0);
  const months: CashFlowMonth[] = Array.from({ length: 5 }, (_, index) => {
    const monthKey = addMonths(year, month, index - 2);
    return {
      month: monthKey,
      actualInflow: 0,
      actualOutflow: 0,
      actualNet: null,
      scheduledInflow: 0,
      scheduledOutflow: 0,
      scheduledNet: null,
    };
  });
  const monthIndexes = new Map(months.map((item, index) => [item.month, index]));
  const today = asOfDate.toISOString().slice(0, 10);

  for (const transaction of transactions) {
    if (transaction.status !== CASH_TRANSACTION_STATUSES.verified || transaction.transaction_date > today) continue;
    const index = monthIndexes.get(getMonthKey(transaction.transaction_date) ?? '');
    if (index === undefined) continue;
    if (!Number.isFinite(transaction.amount) || transaction.amount < 0) continue;
    if (transaction.type === CASH_TRANSACTION_TYPES.inflow) months[index].actualInflow += transaction.amount;
    if (transaction.type === CASH_TRANSACTION_TYPES.outflow) months[index].actualOutflow += transaction.amount;
  }

  const addScheduledAmount = (dueDate: string, amount: number, type: 'inflow' | 'outflow') => {
    const dueMonth = getMonthKey(dueDate);
    if (!dueMonth) return;
    const scheduleMonth = dueDate < today ? currentMonth : dueMonth;
    const index = monthIndexes.get(scheduleMonth);
    if (index === undefined || !Number.isFinite(amount) || amount <= 0) return;
    if (type === 'inflow') months[index].scheduledInflow += amount;
    else months[index].scheduledOutflow += amount;
  };

  for (const invoice of invoices) {
    if (!FORECASTABLE_INVOICE_STATUSES.has(invoice.status)) continue;
    addScheduledAmount(
      invoice.due_date,
      remainingAmount(invoice.net_receivable, invoice.paid_amount),
      'inflow',
    );
  }

  for (const payable of payables) {
    if (!FORECASTABLE_PAYABLE_STATUSES.has(payable.status)) continue;
    addScheduledAmount(
      payable.due_date,
      remainingAmount(payable.amount, payable.paid_amount),
      'outflow',
    );
  }

  for (const [index, item] of months.entries()) {
    if (index <= 2) item.actualNet = item.actualInflow - item.actualOutflow;
    if (index >= 2) item.scheduledNet = item.scheduledInflow - item.scheduledOutflow;
  }

  const forecastMonths = months.slice(2);
  const scheduledInflow = forecastMonths.reduce((total, item) => total + item.scheduledInflow, 0);
  const scheduledOutflow = forecastMonths.reduce((total, item) => total + item.scheduledOutflow, 0);

  return {
    months,
    scheduledInflow,
    scheduledOutflow,
    scheduledNet: scheduledInflow - scheduledOutflow,
  };
}
