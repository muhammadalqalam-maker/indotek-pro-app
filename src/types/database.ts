import { UserRole } from '../utils/permissions';

export type { Database, Json, Tables, TablesInsert, TablesUpdate } from './database.types';

export type ProjectStatus = 'planning' | 'active' | 'delayed' | 'completed' | 'maintenance';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  company_code: string;
  logo_url?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  npwp?: string;
  nib?: string;
  letterhead_url?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_account_name?: string;
  timezone: 'WIB' | 'WITA' | 'WIT';
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  department?: string;
  job_title?: string;
  is_active: boolean;
  joined_at: string;
  user?: Profile;
}

export interface ProjectAddendum {
  id: string;
  organization_id: string;
  project_id: string;
  addendum_number: string;
  title: string;
  description?: string;
  amount: number;
  time_extension_days: number;
  approved_by?: string | null;
  approved_at?: string | null;
  created_by?: string | null;
  approved_by_name?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export type ProjectAddendumInput = Pick<
  ProjectAddendum,
  'addendum_number' | 'title' | 'description' | 'amount' | 'time_extension_days'
>;

export interface Project {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  client_name: string;
  client_contact?: string;
  contract_number: string;
  category: 'Gedung' | 'Infrastruktur' | 'Renovasi' | 'MEP' | 'Perumahan' | 'Lainnya';
  location_address: string;
  location_city: string;
  location_province: string;
  latitude?: number;
  longitude?: number;
  contract_value: number;
  realized_cost: number;
  start_date: string;
  end_date: string;
  maintenance_days: number;
  retention_percent: number;
  planned_progress: number;
  actual_progress: number;
  status: ProjectStatus;
  project_manager_id?: string | null;
  site_manager_id?: string | null;
  project_manager_name?: string;
  site_manager_name?: string;
  notes?: string;
  addendums?: ProjectAddendum[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  project_id?: string;
  project_name?: string;
  user_name: string;
  user_role: UserRole;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ==========================================
// FASE 2 TYPES: RAB, BOQ, AHSP, LAPORAN & KURVA S
// ==========================================

export type ResourceCategory = 'bahan' | 'upah' | 'alat';

export interface AHSPResource {
  id: string;
  organization_id: string;
  category: ResourceCategory;
  code: string;
  name: string;
  unit: string;
  unit_price: number;
  source?: string;
}

export interface AHSPComponent {
  resource_code: string;
  name: string;
  category: ResourceCategory;
  coef: number;
  unit: string;
  unit_price: number;
  subtotal: number;
}

export interface AHSPTemplate {
  id: string;
  organization_id: string;
  code: string;
  title: string;
  unit: string;
  division: string;
  overhead_percent: number;
  unit_price: number;
  components: AHSPComponent[];
}

export interface ProjectBOQ {
  id: string;
  organization_id: string;
  project_id: string;
  version_number: number;
  title: string;
  is_approved: boolean;
  overhead_percent: number;
  ppn_percent: number;
  subtotal_direct_cost: number;
  overhead_amount: number;
  ppn_amount: number;
  grand_total: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectBOQItem {
  id: string;
  organization_id: string;
  boq_id: string;
  project_id: string;
  division_code: string;
  division_name: string;
  item_code: string;
  description: string;
  unit: string;
  volume: number;
  unit_price: number;
  total_price: number;
  weight_percent: number;
  installed_volume: number;
  installed_percent: number;
}

export interface DailyReportManpower {
  id: string;
  report_id: string;
  trade_type: string;
  headcount: number;
  work_hours: number;
}

export interface DailyReportEquipment {
  id: string;
  report_id: string;
  equipment_name: string;
  quantity: number;
  active_hours: number;
  standby_hours: number;
  remarks?: string;
}

export interface DailyReportMaterial {
  id: string;
  report_id: string;
  material_name: string;
  volume: number;
  unit: string;
  supplier_name?: string;
  delivery_note_no?: string;
}

export interface DailyReportPhoto {
  id: string;
  report_id: string;
  photo_url: string;
  caption: string;
  zone_location?: string;
  created_at: string;
}

export interface DailySiteReport {
  id: string;
  organization_id: string;
  project_id: string;
  report_number: string;
  report_date: string;
  weather_morning: string;
  weather_afternoon: string;
  weather_evening: string;
  work_description: string;
  obstacles?: string;
  solutions?: string;
  site_manager_name: string;
  inspector_name?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  signature_site_manager?: string;
  signature_inspector?: string;
  manpower?: DailyReportManpower[];
  equipment?: DailyReportEquipment[];
  materials?: DailyReportMaterial[];
  photos?: DailyReportPhoto[];
  created_at: string;
}

// ==========================================
// PENGADAAN & PROCUREMENT TYPES
// ==========================================
export interface Vendor {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  category: 'Beton' | 'Besi' | 'Finishing' | 'Mekanikal-Elektrikal' | 'Alat Berat' | 'Umum';
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  npwp?: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  rating: number; // 1-5
  payment_terms_days: number;
  is_active?: boolean;
  evaluation_count?: number;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  item_code: string;
  item_name: string;
  specification: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity: number;
}

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  po_number: string;
  pr_number?: string;
  vendor_id: string;
  vendor_name: string;
  vendor_contact: string;
  order_date: string;
  delivery_deadline: string;
  delivery_address: string;
  subtotal: number;
  ppn_percent: number;
  ppn_amount: number;
  grand_total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'received' | 'closed';
  approved_by_name?: string;
  approved_at?: string;
  approval_notes?: string;
  items: PurchaseOrderItem[];
  created_at: string;
}

export interface PurchaseRequest {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  pr_number: string;
  request_date: string;
  required_date: string;
  requester_name: string;
  department: string;
  urgency: 'normal' | 'urgent' | 'critical';
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'converted_to_po';
  total_estimated_amount: number;
  items: Array<{
    id?: string;
    item_name: string;
    specification: string;
    unit: string;
    quantity: number;
    estimated_price: number;
    subtotal: number;
  }>;
  created_at: string;
}

export interface GoodsReceiptNote {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  purchase_order_id?: string;
  grn_number: string;
  po_number: string;
  vendor_name: string;
  delivery_note_number: string; // Nomor Surat Jalan dari vendor
  receiving_location?: string | null;
  received_date: string;
  receiver_name: string;
  driver_name?: string;
  vehicle_number?: string;
  status: 'full' | 'partial' | 'rejected';
  notes?: string;
  items: Array<{
    item_name: string;
    unit: string;
    purchase_order_item_id?: string;
    po_quantity: number;
    received_quantity: number;
    accepted_quantity: number;
    rejected_quantity: number;
    condition_notes?: string;
  }>;
  created_at: string;
}

// ==========================================
// GUDANG & MATERIAL TYPES
// ==========================================
export interface MaterialStockItem {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  average_price: number;
  location_rack: string;
  status: 'safe' | 'low' | 'out_of_stock';
  last_movement_date: string;
}

export interface StockMovement {
  id: string;
  organization_id: string;
  project_id: string;
  movement_number: string;
  movement_date: string;
  item_name: string;
  unit: string;
  type: 'in' | 'out' | 'transfer_in' | 'transfer_out' | 'adjustment';
  quantity: number;
  reference_doc: string; // e.g. PO/0142, Surat Jalan, Request
  recipient_or_supplier: string;
  notes?: string;
}

export interface MaterialRequest {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  request_number: string;
  request_date: string;
  required_date: string;
  zone_location: string;
  foreman_name: string;
  status: 'pending' | 'approved' | 'issued' | 'rejected';
  items: Array<{
    item_name: string;
    unit: string;
    requested_qty: number;
    approved_qty: number;
  }>;
}

// ==========================================
// SUBKONTRAKTOR & MANDOR TYPES
// ==========================================
export interface Subcontractor {
  id: string;
  organization_id: string;
  code: string;
  company_name: string;
  pic_name: string;
  trade_specialty: 'Pembesian & Bekisting' | 'Finishing & Pasangan' | 'Mekanikal Elektrikal' | 'Baja Struktur' | 'Pondasi Dalam' | 'Pengecatan' | 'Lainnya';
  phone: string;
  email: string;
  address: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  created_at: string;
}

export interface SubcontractorContract {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  subcontractor_id: string;
  subcontractor_name: string;
  spk_number: string;
  scope_of_work: string;
  contract_amount: number;
  retention_percent: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'terminated';
  cumulative_progress_percent: number;
  total_paid: number;
  created_at: string;
}

export interface SubcontractorOpname {
  id: string;
  organization_id: string;
  project_id: string;
  contract_id: string;
  spk_number: string;
  subcontractor_name: string;
  opname_number: string;
  period_label: string;
  cutoff_date: string;
  progress_this_period: number; // in %
  cumulative_progress: number; // in %
  gross_amount: number;
  retention_deduction: number;
  cash_advance_deduction: number;
  net_payable: number;
  status: 'submitted' | 'verified_by_qs' | 'approved_by_pm' | 'paid';
  created_at: string;
}

// ==========================================
// KEUANGAN PROYEK (FINANCE) TYPES
// ==========================================
export interface ClientInvoice {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  client_name: string;
  invoice_number: string;
  term_label: string; // e.g. "Termin 1 (Uang Muka 15%)", "Termin 2 (Progress 30%)"
  invoice_type?: 'advance' | 'progress' | 'retention';
  invoice_date: string;
  due_date: string;
  progress_basis_percent: number;
  gross_amount: number;
  retention_deduction: number; // 5%
  dp_deduction: number; // Potongan DP
  advance_deduction?: number;
  subtotal_taxable: number;
  vat_percent?: number;
  ppn_amount: number; // PPN 11%
  pph_percent?: number;
  pph_amount: number; // PPh Final Konstruksi (1.75% or 2.65%)
  net_receivable: number;
  paid_amount?: number;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
}

export interface ProjectPayable {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  vendor_id: string | null;
  subcontractor_id: string | null;
  counterparty_type: 'vendor' | 'subcontractor';
  counterparty_name: string;
  payable_number: string;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: 'sent' | 'partially_paid' | 'paid' | 'overdue';
  notes: string;
  created_at: string;
}

export interface CreateProjectPayableInput {
  organization_id: string;
  project_id: string;
  vendor_id: string | null;
  subcontractor_id: string | null;
  supplier_invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  notes: string;
}

export const CASH_TRANSACTION_TYPES = {
  inflow: 'inflow',
  outflow: 'outflow',
} as const;

export const CASH_TRANSACTION_CATEGORIES = {
  clientInvoice: 'Termin Klien',
  material: 'Material',
  wages: 'Upah Pekerja',
  subcontractor: 'Subkon',
  equipmentRental: 'Sewa Alat',
  siteOperations: 'Operasional Site',
  cashAdvance: 'Kasbon / Petty Cash',
  other: 'Lainnya',
} as const;

export const CASH_TRANSACTION_STATUSES = {
  pending: 'pending',
  verified: 'verified',
} as const;

export const CASH_ADVANCE_TYPES = {
  advance: 'kasbon',
  reimbursement: 'reimbursement',
} as const;

export const CASH_ADVANCE_STATUSES = {
  pendingApproval: 'pending_approval',
  approvedReadyPayout: 'approved_ready_payout',
  activeUnsettled: 'active_unsettled',
  settled: 'settled',
  rejected: 'rejected',
} as const;

export type CashPaymentMethod = 'Transfer Bank' | 'Kas Tunai' | 'Giro / Cek' | 'Lainnya';

export interface ProjectCashTransaction {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  transaction_number: string;
  transaction_date: string;
  type: typeof CASH_TRANSACTION_TYPES[keyof typeof CASH_TRANSACTION_TYPES];
  category: typeof CASH_TRANSACTION_CATEGORIES[keyof typeof CASH_TRANSACTION_CATEGORIES];
  amount: number;
  recipient_or_payer: string;
  description: string;
  payment_method: CashPaymentMethod;
  status: typeof CASH_TRANSACTION_STATUSES[keyof typeof CASH_TRANSACTION_STATUSES];
  reference?: string;
  invoice_id?: string | null;
  cash_advance_request_id?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  receipt_url?: string;
}

export interface KasbonReimbursement {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  ticket_number: string;
  employee_name: string;
  role: string;
  date: string;
  type: typeof CASH_ADVANCE_TYPES[keyof typeof CASH_ADVANCE_TYPES];
  amount: number;
  purpose: string;
  settlement_status: typeof CASH_ADVANCE_STATUSES[keyof typeof CASH_ADVANCE_STATUSES];
  approved_by_name?: string;
  decision_comment?: string;
  paid_amount?: number;
  paid_at?: string | null;
  payment_method?: CashPaymentMethod | null;
  settled_amount?: number;
  settled_at?: string | null;
  settlement_notes?: string;
  created_by?: string;
  created_at: string;
}

export type CreateProjectCashTransactionInput = Pick<
  ProjectCashTransaction,
  | 'organization_id'
  | 'project_id'
  | 'transaction_date'
  | 'type'
  | 'category'
  | 'amount'
  | 'recipient_or_payer'
  | 'description'
  | 'payment_method'
  | 'reference'
>;

export type CreateCashAdvanceRequestInput = Pick<
  KasbonReimbursement,
  'organization_id' | 'project_id' | 'employee_name' | 'role' | 'date' | 'type' | 'amount' | 'purpose'
>;

export type CashAdvanceDecision = 'approve' | 'reject';

// ==========================================
// SDM & ABSENSI LAPANGAN TYPES
// ==========================================
export interface FieldWorker {
  id: string;
  organization_id: string;
  project_id: string;
  nik: string;
  full_name: string;
  role_trade: 'Mandor' | 'Kepala Tukang' | 'Tukang Besi' | 'Tukang Kayu' | 'Tukang Batu' | 'Pekerja / Kenek' | 'Operator';
  daily_wage_rate: number;
  overtime_hourly_rate: number;
  phone?: string;
  origin_city?: string;
  status: 'active' | 'inactive';
}

export interface DailyAttendance {
  id: string;
  organization_id: string;
  project_id: string;
  date: string;
  worker_id: string;
  worker_name: string;
  role_trade: string;
  status: 'hadir' | 'lembur' | 'izin' | 'sakit' | 'alpa';
  work_hours: number;
  overtime_hours: number;
  daily_earnings: number;
}

export interface WeeklyPayroll {
  id: string;
  organization_id: string;
  project_id: string;
  period_label: string; // e.g. "Minggu Ke-41 (06 - 12 Okt 2026)"
  total_workers: number;
  total_mandays: number;
  total_base_wage: number;
  total_overtime: number;
  grand_total_payroll: number;
  status: 'calculated' | 'approved' | 'paid';
  paid_date?: string;
}

// ==========================================
// PERALATAN & ASET (EQUIPMENT) TYPES
// ==========================================
export interface EquipmentAsset {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  brand_model: string;
  category: 'Alat Berat' | 'Alat Angkat' | 'Alat Cor' | 'Genset & Daya' | 'Peralatan Survei' | 'Scaffolding';
  ownership: 'Internal Asset' | 'Sewa / Rental';
  assigned_project_id?: string;
  assigned_project_name?: string;
  daily_rental_rate: number;
  condition: 'Sangat Baik' | 'Baik' | 'Perlu Perawatan' | 'Rusak / Perbaikan';
  last_maintenance_date: string;
  next_maintenance_date: string;
  total_operating_hours: number;
  fuel_consumption_rate?: string;
}

// ==========================================
// K3, KUALITAS & PUNCH LIST TYPES
// ==========================================
export interface SafetyIncident {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  incident_number: string;
  incident_date: string;
  category: 'Near Miss (Hampir Celaka)' | 'First Aid (P3K)' | 'Medical Treatment' | 'Lost Time Injury (LTI)' | 'Kerusakan Alat';
  severity: 'Rendah' | 'Sedang' | 'Tinggi' | 'Kritis';
  location: string;
  description: string;
  immediate_action: string;
  corrective_action: string;
  reporter_name: string;
  status: 'investigating' | 'action_taken' | 'closed';
}

export interface ToolboxMeeting {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  meeting_date: string;
  topic: string;
  presenter_name: string;
  attendees_count: number;
  key_points: string[];
}

export interface PunchListItem {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  code: string;
  location_zone: string;
  category: 'Arsitektur' | 'Struktur' | 'MEP' | 'Finishing';
  defect_description: string;
  assigned_to_subcon: string;
  due_date: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'in_progress' | 'ready_for_inspection' | 'closed';
  before_photo?: string;
  after_photo?: string;
  reported_by: string;
  created_at: string;
}

// ==========================================
// DOKUMEN & GAMBAR KERJA TYPES
// ==========================================
export interface ProjectDocument {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  document_number: string;
  title: string;
  category: 'Kontrak & SPK' | 'Gambar Kerja (DED)' | 'Shop Drawing' | 'As-Built Drawing' | 'RFI (Klarifikasi)' | 'Berita Acara (BAST)' | 'Laporan K3 & Lingkungan';
  version_rev: string; // e.g. "Rev 0", "Rev 1", "Rev 2"
  file_name: string;
  file_size_mb: number;
  status: 'approved' | 'for_review' | 'rejected' | 'superseded';
  uploaded_by: string;
  approved_by?: string;
  upload_date: string;
}

// ==========================================
// APPROVAL ENGINE TYPES
// ==========================================
export interface ApprovalItem {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  module_type: 'purchase_order' | 'purchase_request' | 'variation_order' | 'kasbon' | 'subcon_opname';
  reference_number: string;
  title: string;
  requester_name: string;
  requester_role: string;
  amount: number;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  urgency: 'normal' | 'urgent';
  approval_level: string; // e.g. "Level 1 (Site Manager)", "Level 2 (Direktur)"
  comments?: string;
}
