import { getSupabase } from '../../../lib/supabase';
import type { CreateProjectPayableInput, ProjectPayable } from '../../../types/database';
import type { ProjectPayablePaymentValues } from '../schemas/payable.schema';

type PayableRow = {
  id: string;
  organization_id: string;
  project_id: string;
  vendor_id: string | null;
  subcontractor_id: string | null;
  payable_number: string;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  notes: string;
  created_at: string;
};

export type PayableSubcontractorOption = {
  id: string;
  name: string;
};

function getClient() {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase diperlukan untuk mengelola hutang proyek.');
  return client;
}

function parsePayableStatus(value: string): ProjectPayable['status'] {
  if (value === 'sent' || value === 'partially_paid' || value === 'paid') return value;
  throw new Error('Status tagihan hutang dari server tidak dikenal.');
}

export async function fetchProjectPayables(
  organizationId: string,
  projectId?: string,
): Promise<ProjectPayable[]> {
  if (!getSupabase()) return [];
  const client = getClient();
  let query = client.from('project_payables')
    .select('id, organization_id, project_id, vendor_id, subcontractor_id, payable_number, supplier_invoice_number, invoice_date, due_date, amount, paid_amount, status, notes, created_at')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('due_date', { ascending: true });
  if (projectId && projectId !== 'all') query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  if (data.length === 0) return [];

  const projectIds = [...new Set(data.map((row: PayableRow) => row.project_id))];
  const vendorIds = [...new Set(data.flatMap((row: PayableRow) => row.vendor_id ? [row.vendor_id] : []))];
  const subcontractorIds = [...new Set(data.flatMap((row: PayableRow) => row.subcontractor_id ? [row.subcontractor_id] : []))];
  const [projectResult, vendorResult, subcontractorResult] = await Promise.all([
    client.from('projects').select('id, name').eq('organization_id', organizationId).in('id', projectIds),
    vendorIds.length
      ? client.from('vendors').select('id, name').eq('organization_id', organizationId).in('id', vendorIds)
      : Promise.resolve({ data: [], error: null }),
    subcontractorIds.length
      ? client.from('subcontractors').select('id, company_name').eq('organization_id', organizationId).in('id', subcontractorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (projectResult.error) throw projectResult.error;
  if (vendorResult.error) throw vendorResult.error;
  if (subcontractorResult.error) throw subcontractorResult.error;

  const projects = new Map(projectResult.data.map((project) => [project.id, project.name]));
  const vendors = new Map(vendorResult.data.map((vendor) => [vendor.id, vendor.name]));
  const subcontractors = new Map(subcontractorResult.data.map((subcontractor) => [subcontractor.id, subcontractor.company_name]));
  const today = new Date().toISOString().slice(0, 10);

  return data.map((row: PayableRow) => {
    const isVendor = row.vendor_id !== null;
    const counterpartyName = isVendor
      ? vendors.get(row.vendor_id ?? '')
      : subcontractors.get(row.subcontractor_id ?? '');
    const projectName = projects.get(row.project_id);
    if (!counterpartyName || !projectName) {
      throw new Error('Data proyek atau rekanan pada tagihan hutang tidak tersedia.');
    }
    const storedStatus = parsePayableStatus(row.status);
    const status: ProjectPayable['status'] = storedStatus === 'paid'
      ? 'paid'
      : row.due_date < today
        ? 'overdue'
        : storedStatus;
    return {
      ...row,
      project_name: projectName,
      counterparty_type: isVendor ? 'vendor' : 'subcontractor',
      counterparty_name: counterpartyName,
      amount: Number(row.amount),
      paid_amount: Number(row.paid_amount),
      status,
    };
  });
}

export async function fetchPayableSubcontractors(
  organizationId: string,
): Promise<PayableSubcontractorOption[]> {
  if (!getSupabase()) return [];
  const { data, error } = await getClient().from('subcontractors')
    .select('id, company_name')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('company_name');
  if (error) throw error;
  return data.map((row) => ({ id: row.id, name: row.company_name }));
}

export async function createProjectPayable(
  input: CreateProjectPayableInput,
): Promise<ProjectPayable> {
  const { data: payableId, error } = await getClient().rpc('create_project_payable', {
    p_organization_id: input.organization_id,
    p_project_id: input.project_id,
    p_vendor_id: input.vendor_id,
    p_subcontractor_id: input.subcontractor_id,
    p_supplier_invoice_number: input.supplier_invoice_number,
    p_invoice_date: input.invoice_date,
    p_due_date: input.due_date,
    p_amount: input.amount,
    p_notes: input.notes,
  });
  if (error) throw error;
  const payables = await fetchProjectPayables(input.organization_id, input.project_id);
  const created = payables.find((payable) => payable.id === payableId);
  if (!created) throw new Error('Tagihan hutang tersimpan tetapi tidak dapat dimuat kembali.');
  return created;
}

export async function recordProjectPayablePayment(
  organizationId: string,
  payable: ProjectPayable,
  values: ProjectPayablePaymentValues,
): Promise<ProjectPayable> {
  const { error } = await getClient().rpc('record_project_payable_payment', {
    p_organization_id: organizationId,
    p_payable_id: payable.id,
    p_amount: Number(values.amount),
    p_payment_date: values.paymentDate,
    p_payment_method: values.paymentMethod,
    p_reference: values.reference.trim(),
  });
  if (error) throw error;
  const payables = await fetchProjectPayables(organizationId, payable.project_id);
  const updated = payables.find(({ id }) => id === payable.id);
  if (!updated) throw new Error('Pembayaran tersimpan tetapi status hutang tidak dapat dimuat kembali.');
  return updated;
}
