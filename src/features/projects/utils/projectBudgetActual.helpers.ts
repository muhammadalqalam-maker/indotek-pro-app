export type BudgetActualBoqItem = {
  id: string;
  parent_id: string | null;
  item_type: 'division' | 'work_item';
  item_code: string;
  description: string;
  line_total: number | string | null;
  sort_order: number;
};

export type BudgetActualExpense = {
  boq_item_id: string;
  amount: number | string;
  status: 'pending' | 'verified';
};

export type BudgetActualLine = {
  item: BudgetActualBoqItem;
  budget: number;
  actual: number;
  pending: number;
  variance: number;
};

export type BudgetActualDivision = {
  division: BudgetActualBoqItem;
  items: BudgetActualLine[];
  budget: number;
  actual: number;
  pending: number;
  variance: number;
};

function toAmount(value: number | string | null): number {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Nilai biaya BOQ atau pengeluaran tidak valid.');
  }
  return amount;
}

export function calculateProjectBudgetActual(
  boqItems: BudgetActualBoqItem[],
  expenses: BudgetActualExpense[],
): BudgetActualDivision[] {
  const divisions = boqItems
    .filter((item) => item.item_type === 'division')
    .sort((left, right) => left.sort_order - right.sort_order);
  const workItems = boqItems
    .filter((item) => item.item_type === 'work_item')
    .sort((left, right) => left.sort_order - right.sort_order);
  const expensesByItem = new Map<string, { actual: number; pending: number }>();

  for (const expense of expenses) {
    const totals = expensesByItem.get(expense.boq_item_id) ?? { actual: 0, pending: 0 };
    if (expense.status === 'verified') {
      totals.actual += toAmount(expense.amount);
    } else if (expense.status === 'pending') {
      totals.pending += toAmount(expense.amount);
    } else {
      throw new Error('Status pengeluaran tidak dikenal.');
    }
    expensesByItem.set(expense.boq_item_id, totals);
  }

  const divisionById = new Map(divisions.map((division) => [division.id, division]));
  const workItemIds = new Set(workItems.map((item) => item.id));
  for (const expense of expenses) {
    if (!workItemIds.has(expense.boq_item_id)) {
      throw new Error('Pengeluaran tidak terhubung ke item pekerjaan aktif pada revisi ini.');
    }
  }

  const linesByDivision = new Map<string, BudgetActualLine[]>();
  for (const item of workItems) {
    if (!item.parent_id || !divisionById.has(item.parent_id)) {
      throw new Error(`Item BOQ "${item.description}" tidak terhubung ke divisi aktif.`);
    }
    const expenseTotals = expensesByItem.get(item.id) ?? { actual: 0, pending: 0 };
    const budget = toAmount(item.line_total);
    const line: BudgetActualLine = {
      item,
      budget,
      actual: expenseTotals.actual,
      pending: expenseTotals.pending,
      variance: expenseTotals.actual - budget,
    };
    const divisionLines = linesByDivision.get(item.parent_id) ?? [];
    divisionLines.push(line);
    linesByDivision.set(item.parent_id, divisionLines);
  }

  return divisions.map((division) => {
    const items = linesByDivision.get(division.id) ?? [];
    const budget = items.reduce((total, item) => total + item.budget, 0);
    const actual = items.reduce((total, item) => total + item.actual, 0);
    const pending = items.reduce((total, item) => total + item.pending, 0);
    return {
      division,
      items,
      budget,
      actual,
      pending,
      variance: actual - budget,
    };
  });
}
