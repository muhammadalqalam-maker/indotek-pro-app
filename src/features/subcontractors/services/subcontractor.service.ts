import { getSupabase } from '../../../lib/supabase';
import type { SubcontractFormValues, SubcontractOpnameFormValues, SubcontractorFormValues } from '../schemas/subcontractor.schema';
import type { SubcontractOpnameRecord, SubcontractOpnameStatus, SubcontractRecord, SubcontractStatus, SubcontractorRecord } from '../types';

function getClient() {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum tersedia.');
  return client;
}

function parseStatus(value: string): SubcontractStatus {
  if (value === 'draft' || value === 'active' || value === 'completed' || value === 'cancelled') return value;
  throw new Error('Status SPK dari server tidak dikenal.');
}

function parseOpnameStatus(value: string): SubcontractOpnameStatus {
  if (value === 'draft' || value === 'submitted' || value === 'approved' || value === 'rejected') return value;
  throw new Error('Status opname dari server tidak dikenal.');
}

export async function fetchSubcontractors(organizationId: string): Promise<SubcontractorRecord[]> {
  const { data, error } = await getClient().from('subcontractors').select('*')
    .eq('organization_id', organizationId).is('deleted_at', null).order('company_name');
  if (error) throw error;
  return data.map((row) => ({
    id: row.id, code: row.code, company_name: row.company_name, trade_specialty: row.trade_specialty,
    pic_name: row.pic_name, phone: row.phone, email: row.email, address: row.address, npwp: row.npwp,
    bank_name: row.bank_name, bank_account_no: row.bank_account_no, bank_account_name: row.bank_account_name,
    is_active: row.is_active,
  }));
}

export async function fetchSubcontracts(organizationId: string): Promise<SubcontractRecord[]> {
  const { data, error } = await getClient().from('subcontracts').select('*, subcontractors(*)')
    .eq('organization_id', organizationId).is('deleted_at', null).order('contract_date', { ascending: false });
  if (error) throw error;
  return data.map((row) => {
    const subcontractor = Array.isArray(row.subcontractors) ? row.subcontractors[0] : row.subcontractors;
    if (!subcontractor) throw new Error('Subkontraktor SPK tidak tersedia.');
    return {
      id: row.id, project_id: row.project_id, subcontractor_id: row.subcontractor_id, spk_number: row.spk_number,
      work_description: row.work_description, contract_date: row.contract_date, start_date: row.start_date,
      end_date: row.end_date, contract_amount: Number(row.contract_amount), retention_percent: Number(row.retention_percent),
      status: parseStatus(row.status), notes: row.notes,
      subcontractor: {
        id: subcontractor.id, code: subcontractor.code, company_name: subcontractor.company_name,
        trade_specialty: subcontractor.trade_specialty, pic_name: subcontractor.pic_name, phone: subcontractor.phone,
        email: subcontractor.email, address: subcontractor.address, npwp: subcontractor.npwp,
        bank_name: subcontractor.bank_name, bank_account_no: subcontractor.bank_account_no,
        bank_account_name: subcontractor.bank_account_name, is_active: subcontractor.is_active,
      },
    };
  });
}

export async function fetchSubcontractOpnames(organizationId: string): Promise<SubcontractOpnameRecord[]> {
  const { data, error } = await getClient().from('subcontract_opnames')
    .select('*, subcontracts!inner(spk_number, work_description, subcontractors!inner(*)), subcontract_opname_deductions(*)')
    .eq('organization_id', organizationId).is('deleted_at', null).order('period_end', { ascending: false });
  if (error) throw error;
  return data.map((row) => {
    const subcontract = Array.isArray(row.subcontracts) ? row.subcontracts[0] : row.subcontracts;
    const subcontractor = Array.isArray(subcontract.subcontractors) ? subcontract.subcontractors[0] : subcontract.subcontractors;
    return {
      id: row.id, project_id: row.project_id, subcontract_id: row.subcontract_id, opname_number: row.opname_number,
      period_start: row.period_start, period_end: row.period_end, gross_amount: Number(row.gross_amount),
      retention_percent: Number(row.retention_percent), retention_amount: Number(row.retention_amount),
      deduction_amount: Number(row.deduction_amount), net_amount: Number(row.net_amount), status: parseOpnameStatus(row.status),
      notes: row.notes, rejection_comment: row.rejection_comment,
      subcontract: { spk_number: subcontract.spk_number, work_description: subcontract.work_description, subcontractor: {
        id: subcontractor.id, code: subcontractor.code, company_name: subcontractor.company_name, trade_specialty: subcontractor.trade_specialty,
        pic_name: subcontractor.pic_name, phone: subcontractor.phone, email: subcontractor.email, address: subcontractor.address,
        npwp: subcontractor.npwp, bank_name: subcontractor.bank_name, bank_account_no: subcontractor.bank_account_no,
        bank_account_name: subcontractor.bank_account_name, is_active: subcontractor.is_active,
      } },
      deductions: (row.subcontract_opname_deductions as Array<{ id: string; description: string; amount: number }>).map((deduction) => ({ id: deduction.id, description: deduction.description, amount: Number(deduction.amount) })),
    };
  });
}

export async function saveSubcontractor(
  organizationId: string, values: SubcontractorFormValues, subcontractorId: string | null,
): Promise<string> {
  const { data, error } = await getClient().rpc('save_subcontractor', {
    p_organization_id: organizationId, p_subcontractor_id: subcontractorId, p_code: values.code,
    p_company_name: values.companyName, p_trade_specialty: values.tradeSpecialty, p_pic_name: values.picName,
    p_phone: values.phone, p_email: values.email, p_address: values.address, p_npwp: values.npwp,
    p_bank_name: values.bankName, p_bank_account_no: values.bankAccountNo, p_bank_account_name: values.bankAccountName,
  });
  if (error) throw error;
  return data;
}

export async function saveSubcontract(
  organizationId: string, values: SubcontractFormValues, subcontractId: string | null,
): Promise<string> {
  const { data, error } = await getClient().rpc('save_subcontract', {
    p_organization_id: organizationId, p_subcontract_id: subcontractId, p_project_id: values.projectId,
    p_subcontractor_id: values.subcontractorId, p_spk_number: values.spkNumber,
    p_work_description: values.workDescription, p_contract_date: values.contractDate, p_start_date: values.startDate,
    p_end_date: values.endDate, p_contract_amount: values.contractAmount, p_retention_percent: values.retentionPercent,
    p_status: values.status, p_notes: values.notes,
  });
  if (error) throw error;
  return data;
}

export async function saveSubcontractOpname(organizationId: string, values: SubcontractOpnameFormValues, opnameId: string | null): Promise<string> {
  const { data, error } = await getClient().rpc('save_subcontract_opname', {
    p_organization_id: organizationId, p_opname_id: opnameId, p_subcontract_id: values.subcontractId,
    p_opname_number: values.opnameNumber, p_period_start: values.periodStart, p_period_end: values.periodEnd,
    p_gross_amount: values.grossAmount, p_notes: values.notes,
    p_deductions: values.deductions.map((item) => ({ description: item.description, amount: item.amount })),
  });
  if (error) throw error;
  return data;
}

export async function submitSubcontractOpname(opnameId: string): Promise<void> {
  const { error } = await getClient().rpc('submit_subcontract_opname', { p_opname_id: opnameId });
  if (error) throw error;
}

export async function decideSubcontractOpname(opnameId: string, decision: 'approved' | 'rejected', comment: string): Promise<void> {
  const { error } = await getClient().rpc('decide_subcontract_opname', { p_opname_id: opnameId, p_decision: decision, p_comment: comment });
  if (error) throw error;
}
