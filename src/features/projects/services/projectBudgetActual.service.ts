import { getSupabase } from '../../../lib/supabase';
import type {
  BudgetActualBoqItem,
  BudgetActualExpense,
} from '../utils/projectBudgetActual.helpers';

export type ApprovedBoqVersion = {
  id: string;
  revision_number: number;
  title: string;
  grand_total: number;
};

export type ProjectBoqExpense = BudgetActualExpense & {
  id: string;
  amount: number;
  expense_date: string;
  description: string;
  created_by: string;
  verified_by: string | null;
  verified_at: string | null;
};

export type ProjectBudgetActualWorkspace = {
  items: BudgetActualBoqItem[];
  expenses: ProjectBoqExpense[];
};

function getProjectFinanceClient() {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum tersedia.');
  return client;
}

function toNumber(value: number | string | null): number {
  const result = Number(value ?? 0);
  if (!Number.isFinite(result)) throw new Error('Data biaya proyek tidak valid.');
  return result;
}

function toBoqItemType(value: string): BudgetActualBoqItem['item_type'] {
  if (value === 'division' || value === 'work_item') return value;
  throw new Error('Jenis item BOQ tidak dikenal.');
}

function toExpenseStatus(value: string): BudgetActualExpense['status'] {
  if (value === 'pending' || value === 'verified') return value;
  throw new Error('Status pengeluaran proyek tidak dikenal.');
}

export async function fetchApprovedBoqVersions(
  organizationId: string,
  projectId: string,
): Promise<ApprovedBoqVersion[]> {
  const { data, error } = await getProjectFinanceClient()
    .from('boq_versions')
    .select('id, revision_number, title, grand_total')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('status', 'approved')
    .is('deleted_at', null)
    .order('revision_number', { ascending: false });

  if (error) throw error;
  return data.map((version) => ({
    ...version,
    grand_total: toNumber(version.grand_total),
  }));
}

export async function fetchProjectBudgetActual(
  organizationId: string,
  projectId: string,
  boqVersionId: string,
): Promise<ProjectBudgetActualWorkspace> {
  const client = getProjectFinanceClient();
  const [itemsResult, expensesResult] = await Promise.all([
    client.from('boq_items')
      .select('id, parent_id, item_type, item_code, description, line_total, sort_order')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('boq_version_id', boqVersionId)
      .is('deleted_at', null)
      .order('sort_order'),
    client.from('project_boq_expenses')
      .select('id, boq_item_id, expense_date, amount, description, status, created_by, verified_by, verified_at')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('boq_version_id', boqVersionId)
      .is('deleted_at', null)
      .order('expense_date', { ascending: false }),
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (expensesResult.error) throw expensesResult.error;

  return {
    items: itemsResult.data.map((item) => ({
      ...item,
      item_type: toBoqItemType(item.item_type),
      line_total: item.line_total === null ? null : toNumber(item.line_total),
    })),
    expenses: expensesResult.data.map((expense) => ({
      ...expense,
      status: toExpenseStatus(expense.status),
      amount: toNumber(expense.amount),
    })),
  };
}

export async function recordProjectBoqExpense(
  organizationId: string,
  projectId: string,
  boqVersionId: string,
  boqItemId: string,
  expenseDate: string,
  amount: string,
  description: string,
): Promise<string> {
  const { data, error } = await getProjectFinanceClient().rpc('record_project_boq_expense', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_boq_version_id: boqVersionId,
    p_boq_item_id: boqItemId,
    p_expense_date: expenseDate,
    p_amount: amount,
    p_description: description,
  });

  if (error) throw error;
  return data;
}

export async function verifyProjectBoqExpense(
  organizationId: string,
  projectId: string,
  expenseId: string,
): Promise<void> {
  const { error } = await getProjectFinanceClient().rpc('verify_project_boq_expense', {
    p_organization_id: organizationId,
    p_project_id: projectId,
    p_expense_id: expenseId,
  });

  if (error) throw error;
}
