export type SubcontractStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface SubcontractorRecord {
  id: string;
  code: string;
  company_name: string;
  trade_specialty: string;
  pic_name: string;
  phone: string;
  email: string;
  address: string;
  npwp: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  is_active: boolean;
}

export interface SubcontractRecord {
  id: string;
  project_id: string;
  subcontractor_id: string;
  spk_number: string;
  work_description: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  retention_percent: number;
  status: SubcontractStatus;
  notes: string;
  subcontractor: SubcontractorRecord;
}

export type SubcontractOpnameStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface SubcontractOpnameDeduction {
  id: string;
  description: string;
  amount: number;
}

export interface SubcontractOpnameRecord {
  id: string;
  project_id: string;
  subcontract_id: string;
  opname_number: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  retention_percent: number;
  retention_amount: number;
  deduction_amount: number;
  net_amount: number;
  status: SubcontractOpnameStatus;
  notes: string;
  rejection_comment: string;
  subcontract: Pick<SubcontractRecord, 'spk_number' | 'work_description' | 'subcontractor'>;
  deductions: SubcontractOpnameDeduction[];
}
