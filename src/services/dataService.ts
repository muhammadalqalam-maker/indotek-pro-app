import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Organization,
  Project,
  OrganizationMember,
  AuditLog,
  NotificationItem,
  ProjectAddendum,
  ProjectAddendumInput,
} from '../types/database';
import type { Tables, TablesInsert, TablesUpdate } from '../types/database';
import {
  INITIAL_ORGANIZATION,
  INITIAL_MEMBERS,
  INITIAL_PROJECTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from './mockData';

import {
  AHSPResource,
  AHSPTemplate,
  ProjectBOQ,
  ProjectBOQItem,
  DailySiteReport,
  Vendor,
  PurchaseOrder,
  PurchaseRequest,
  GoodsReceiptNote,
  Subcontractor,
  SubcontractorContract,
  SubcontractorOpname,
  ClientInvoice,
  ProjectCashTransaction,
  KasbonReimbursement,
  CashAdvanceDecision,
  CreateCashAdvanceRequestInput,
  CreateProjectCashTransactionInput,
  CashPaymentMethod,
  FieldWorker,
  EquipmentAsset,
  SafetyIncident,
  ToolboxMeeting,
  ProjectDocument,
  ApprovalItem,
} from '../types/database';
import {
  INITIAL_RESOURCES,
  INITIAL_AHSP_TEMPLATES,
  INITIAL_BOQ,
  INITIAL_BOQ_ITEMS,
  INITIAL_DAILY_REPORTS,
} from './mockDataFase2';
import {
  INITIAL_VENDORS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_PURCHASE_REQUESTS,
  INITIAL_GOODS_RECEIPTS,
  INITIAL_SUBCONTRACTORS,
  INITIAL_SUBCON_CONTRACTS,
  INITIAL_SUBCON_OPNAMES,
  INITIAL_CLIENT_INVOICES,
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_KASBON,
  INITIAL_FIELD_WORKERS,
  INITIAL_EQUIPMENT_ASSETS,
  INITIAL_SAFETY_INCIDENTS,
  INITIAL_TOOLBOX_MEETINGS,
  INITIAL_DOCUMENTS,
  INITIAL_APPROVALS,
} from './mockDataModules';
import {
  archiveVendorRecord,
  createVendorRecord,
  fetchVendors as fetchPersistedVendors,
  updateVendorRecord,
} from '../features/procurement/services/vendor.service';
import type { VendorInput } from '../features/procurement/schemas/vendor.schema';
import {
  fetchProcurementPurchaseOrders,
  fetchProcurementPurchaseRequests,
  fetchProcurementGoodsReceipts,
  createProcurementGoodsReceipt,
  toLegacyPurchaseRequest,
} from '../features/procurement/services/procurement.service';
import type { CreateGoodsReceiptInput } from '../features/procurement/types';

// Local storage keys
const STORAGE_PREFIX = 'indotek_';
const KEY_ORGS = `${STORAGE_PREFIX}orgs`;
const KEY_PROJECTS = `${STORAGE_PREFIX}projects`;
const KEY_MEMBERS = `${STORAGE_PREFIX}members`;
const KEY_LOGS = `${STORAGE_PREFIX}logs`;
const KEY_NOTIFS = `${STORAGE_PREFIX}notifs`;
const KEY_RESOURCES = `${STORAGE_PREFIX}resources`;
const KEY_AHSP = `${STORAGE_PREFIX}ahsp_templates`;
const KEY_BOQS = `${STORAGE_PREFIX}boqs`;
const KEY_BOQ_ITEMS = `${STORAGE_PREFIX}boq_items`;
const KEY_DAILY_REPORTS = `${STORAGE_PREFIX}daily_reports`;

const KEY_VENDORS = `${STORAGE_PREFIX}vendors`;
const KEY_POS = `${STORAGE_PREFIX}pos`;
const KEY_PRS = `${STORAGE_PREFIX}prs`;
const KEY_GRNS = `${STORAGE_PREFIX}grns`;
const KEY_SUBCONS = `${STORAGE_PREFIX}subcons`;
const KEY_SUBCON_CONTRACTS = `${STORAGE_PREFIX}subcon_contracts`;
const KEY_SUBCON_OPNAMES = `${STORAGE_PREFIX}subcon_opnames`;
const KEY_INVOICES = `${STORAGE_PREFIX}invoices`;
const KEY_CASH_TRANSACTIONS = `${STORAGE_PREFIX}cash_transactions`;
const KEY_KASBON = `${STORAGE_PREFIX}kasbon`;
const KEY_WORKERS = `${STORAGE_PREFIX}workers`;
const KEY_EQUIPMENT = `${STORAGE_PREFIX}equipment`;
const KEY_INCIDENTS = `${STORAGE_PREFIX}incidents`;
const KEY_TOOLBOX = `${STORAGE_PREFIX}toolbox`;
const KEY_DOCUMENTS = `${STORAGE_PREFIX}documents`;
const KEY_APPROVALS = `${STORAGE_PREFIX}approvals`;

const memoryStore = new Map<string, unknown>();

function getLocal<T>(key: string, fallback: T): T {
  return (memoryStore.get(key) ?? fallback) as T;
}

function setLocal<T>(key: string, value: T): void {
  memoryStore.set(key, value);
}

// Initialize demo state in memory instead of localStorage so business data is not treated as a local database.
export function initLocalStorage(): void {
  const seedEntries = [
    [KEY_ORGS, [INITIAL_ORGANIZATION]],
    [KEY_PROJECTS, INITIAL_PROJECTS],
    [KEY_MEMBERS, INITIAL_MEMBERS],
    [KEY_LOGS, INITIAL_AUDIT_LOGS],
    [KEY_NOTIFS, INITIAL_NOTIFICATIONS],
    [KEY_RESOURCES, INITIAL_RESOURCES],
    [KEY_AHSP, INITIAL_AHSP_TEMPLATES],
    [KEY_BOQS, [INITIAL_BOQ]],
    [KEY_BOQ_ITEMS, INITIAL_BOQ_ITEMS],
    [KEY_DAILY_REPORTS, INITIAL_DAILY_REPORTS],
    [KEY_VENDORS, INITIAL_VENDORS],
    [KEY_POS, INITIAL_PURCHASE_ORDERS],
    [KEY_PRS, INITIAL_PURCHASE_REQUESTS],
    [KEY_GRNS, INITIAL_GOODS_RECEIPTS],
    [KEY_SUBCONS, INITIAL_SUBCONTRACTORS],
    [KEY_SUBCON_CONTRACTS, INITIAL_SUBCON_CONTRACTS],
    [KEY_SUBCON_OPNAMES, INITIAL_SUBCON_OPNAMES],
    [KEY_INVOICES, INITIAL_CLIENT_INVOICES],
    [KEY_CASH_TRANSACTIONS, INITIAL_CASH_TRANSACTIONS],
    [KEY_KASBON, INITIAL_KASBON],
    [KEY_WORKERS, INITIAL_FIELD_WORKERS],
    [KEY_EQUIPMENT, INITIAL_EQUIPMENT_ASSETS],
    [KEY_INCIDENTS, INITIAL_SAFETY_INCIDENTS],
    [KEY_TOOLBOX, INITIAL_TOOLBOX_MEETINGS],
    [KEY_DOCUMENTS, INITIAL_DOCUMENTS],
    [KEY_APPROVALS, INITIAL_APPROVALS],
  ] as const;

  for (const [key, value] of seedEntries) {
    if (!memoryStore.has(key)) {
      memoryStore.set(key, value);
    }
  }
}

// Reset data back to default demo seed
export function resetDemoData(): void {
  setLocal(KEY_ORGS, [INITIAL_ORGANIZATION]);
  setLocal(KEY_PROJECTS, INITIAL_PROJECTS);
  setLocal(KEY_MEMBERS, INITIAL_MEMBERS);
  setLocal(KEY_LOGS, INITIAL_AUDIT_LOGS);
  setLocal(KEY_NOTIFS, INITIAL_NOTIFICATIONS);
  setLocal(KEY_RESOURCES, INITIAL_RESOURCES);
  setLocal(KEY_AHSP, INITIAL_AHSP_TEMPLATES);
  setLocal(KEY_BOQS, [INITIAL_BOQ]);
  setLocal(KEY_BOQ_ITEMS, INITIAL_BOQ_ITEMS);
  setLocal(KEY_DAILY_REPORTS, INITIAL_DAILY_REPORTS);
  setLocal(KEY_VENDORS, INITIAL_VENDORS);
  setLocal(KEY_POS, INITIAL_PURCHASE_ORDERS);
  setLocal(KEY_PRS, INITIAL_PURCHASE_REQUESTS);
  setLocal(KEY_GRNS, INITIAL_GOODS_RECEIPTS);
  setLocal(KEY_SUBCONS, INITIAL_SUBCONTRACTORS);
  setLocal(KEY_SUBCON_CONTRACTS, INITIAL_SUBCON_CONTRACTS);
  setLocal(KEY_SUBCON_OPNAMES, INITIAL_SUBCON_OPNAMES);
  setLocal(KEY_INVOICES, INITIAL_CLIENT_INVOICES);
  setLocal(KEY_CASH_TRANSACTIONS, INITIAL_CASH_TRANSACTIONS);
  setLocal(KEY_KASBON, INITIAL_KASBON);
  setLocal(KEY_WORKERS, INITIAL_FIELD_WORKERS);
  setLocal(KEY_EQUIPMENT, INITIAL_EQUIPMENT_ASSETS);
  setLocal(KEY_INCIDENTS, INITIAL_SAFETY_INCIDENTS);
  setLocal(KEY_TOOLBOX, INITIAL_TOOLBOX_MEETINGS);
  setLocal(KEY_DOCUMENTS, INITIAL_DOCUMENTS);
  setLocal(KEY_APPROVALS, INITIAL_APPROVALS);
}

// -------------------------------------------------------------
// ORGANIZATIONS
// -------------------------------------------------------------
export async function fetchOrganizations(): Promise<Organization[]> {
  const supabase = getSupabase();
  if (!supabase) {
    initLocalStorage();
    return getLocal<Organization[]>(KEY_ORGS, [INITIAL_ORGANIZATION]);
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return [];
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Organization[];
}

export async function createOrganization(org: Omit<Organization, 'id' | 'created_at'>): Promise<Organization> {
  const newOrg: Organization = {
    ...org,
    id: `org-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.rpc('create_organization_with_owner', { org_data: org as unknown as Record<string, unknown> });
    if (error) throw error;
    return data as Organization;
  }

  const list = getLocal<Organization[]>(KEY_ORGS, [INITIAL_ORGANIZATION]);
  list.push(newOrg);
  setLocal(KEY_ORGS, list);
  return newOrg;
}

export async function updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Organization;
  }

  const list = getLocal<Organization[]>(KEY_ORGS, [INITIAL_ORGANIZATION]);
  const index = list.findIndex((o) => o.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates };
    setLocal(KEY_ORGS, list);
    return list[index];
  }
  throw new Error('Organisasi tidak ditemukan');
}

// -------------------------------------------------------------
// PROJECTS
// -------------------------------------------------------------
export async function fetchProjects(organizationId: string): Promise<Project[]> {
  initLocalStorage();
  const supabase = getSupabase();
  if (!supabase) return getLocal<Project[]>(KEY_PROJECTS, INITIAL_PROJECTS).filter((p) => p.organization_id === organizationId);
  const { data, error } = await supabase
    .from('projects')
    .select('*, addendums:project_addendums(*)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const projects = (data ?? []) as Project[];
  const addendumIds = projects.flatMap((project) => project.addendums ?? []).map(({ id }) => id);
  if (addendumIds.length === 0) return projects;

  const { data: approvalRequests, error: approvalError } = await supabase
    .from('approval_requests')
    .select('resource_id, status')
    .eq('organization_id', organizationId)
    .eq('resource_type', 'project_addendum')
    .in('resource_id', addendumIds)
    .is('deleted_at', null);
  if (approvalError) throw approvalError;
  const approvalStatuses = new Map(
    approvalRequests.map((request) => [request.resource_id, request.status]),
  );

  return projects.map((project) => ({
    ...project,
    addendums: (project.addendums ?? []).map((addendum) => ({
      ...addendum,
      approval_status: addendum.approved_at
        ? 'approved'
        : approvalStatuses.get(addendum.id) ?? 'pending',
    })),
  }));
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
  const newProject: Project = {
    ...project,
    id: `prj-${Date.now()}`,
    addendums: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const prefixMatch = /^(.+)-\d{4}-\d+$/.exec(project.code);
    const { data: generatedCode, error: numberingError } = await supabase.rpc('generate_document_number', {
      p_entity_type: 'project',
      p_organization_id: project.organization_id,
      p_prefix: prefixMatch?.[1] ?? '',
    });
    if (numberingError) throw numberingError;
    const projectRecord: TablesInsert<'projects'> = {
      organization_id: project.organization_id,
      code: generatedCode,
      name: project.name,
      client_name: project.client_name,
      client_contact: project.client_contact || null,
      contract_number: project.contract_number || null,
      category: project.category,
      location_address: project.location_address,
      location_city: project.location_city,
      location_province: project.location_province,
      latitude: project.latitude ?? null,
      longitude: project.longitude ?? null,
      contract_value: project.contract_value,
      realized_cost: project.realized_cost,
      start_date: project.start_date,
      end_date: project.end_date,
      maintenance_days: project.maintenance_days,
      retention_percent: project.retention_percent,
      planned_progress: project.planned_progress,
      actual_progress: project.actual_progress,
      status: project.status,
      project_manager_id: project.project_manager_id ?? null,
      site_manager_id: project.site_manager_id ?? null,
      notes: project.notes || null,
      created_by: authData.user?.id ?? null,
    };
    const { data, error } = await supabase
      .from('projects')
      .insert(projectRecord)
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  }

  const list = getLocal<Project[]>(KEY_PROJECTS, INITIAL_PROJECTS);
  list.unshift(newProject);
  setLocal(KEY_PROJECTS, list);

  // Add audit log
  await createAuditLog({
    organization_id: newProject.organization_id,
    project_id: newProject.id,
    project_name: newProject.name,
    user_name: 'Ir. Bambang Suryono, MT',
    user_role: 'owner',
    action: 'CREATE_PROJECT',
    entity_type: 'project',
    entity_id: newProject.code,
    details: `Membuat proyek baru: ${newProject.name} dengan nilai ${newProject.contract_value}`,
  });

  return newProject;
}

export async function updateProject(
  id: string,
  organizationId: string,
  updates: Partial<Project>,
): Promise<Project> {
  const supabase = getSupabase();
  if (supabase) {
    const projectUpdates: TablesUpdate<'projects'> = {
      ...(updates.code !== undefined && { code: updates.code }),
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.client_name !== undefined && { client_name: updates.client_name }),
      ...(updates.client_contact !== undefined && { client_contact: updates.client_contact || null }),
      ...(updates.contract_number !== undefined && { contract_number: updates.contract_number || null }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.location_address !== undefined && { location_address: updates.location_address }),
      ...(updates.location_city !== undefined && { location_city: updates.location_city }),
      ...(updates.location_province !== undefined && { location_province: updates.location_province }),
      ...(updates.latitude !== undefined && { latitude: updates.latitude }),
      ...(updates.longitude !== undefined && { longitude: updates.longitude }),
      ...(updates.contract_value !== undefined && { contract_value: updates.contract_value }),
      ...(updates.realized_cost !== undefined && { realized_cost: updates.realized_cost }),
      ...(updates.start_date !== undefined && { start_date: updates.start_date }),
      ...(updates.end_date !== undefined && { end_date: updates.end_date }),
      ...(updates.maintenance_days !== undefined && { maintenance_days: updates.maintenance_days }),
      ...(updates.retention_percent !== undefined && { retention_percent: updates.retention_percent }),
      ...(updates.planned_progress !== undefined && { planned_progress: updates.planned_progress }),
      ...(updates.actual_progress !== undefined && { actual_progress: updates.actual_progress }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.project_manager_id !== undefined && { project_manager_id: updates.project_manager_id }),
      ...(updates.site_manager_id !== undefined && { site_manager_id: updates.site_manager_id }),
      ...(updates.notes !== undefined && { notes: updates.notes || null }),
    };
    const { data, error } = await supabase
      .from('projects')
      .update({ ...projectUpdates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .select()
      .single();
    if (error) throw error;
    return data as Project;
  }

  const list = getLocal<Project[]>(KEY_PROJECTS, INITIAL_PROJECTS);
  const index = list.findIndex((p) => p.id === id && p.organization_id === organizationId);
  if (index !== -1) {
    list[index] = { ...list[index], ...updates, updated_at: new Date().toISOString() };
    setLocal(KEY_PROJECTS, list);
    return list[index];
  }
  throw new Error('Proyek tidak ditemukan');
}

export async function deleteProject(id: string, organizationId: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase
      .from('projects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null);
    if (error) throw error;
    return;
  }

  const list = getLocal<Project[]>(KEY_PROJECTS, INITIAL_PROJECTS);
  const target = list.find((project) => (
    project.id === id && project.organization_id === organizationId
  ));
  if (!target) throw new Error('Proyek tidak ditemukan.');
  const filtered = list.filter((project) => (
    project.id !== id || project.organization_id !== organizationId
  ));
  setLocal(KEY_PROJECTS, filtered);

  if (target) {
    await createAuditLog({
      organization_id: organizationId,
      project_id: id,
      project_name: target.name,
      user_name: 'Ir. Bambang Suryono, MT',
      user_role: 'owner',
      action: 'DELETE_PROJECT',
      entity_type: 'project',
      entity_id: target.code,
      details: `Menghapus proyek ${target.name} (${target.code})`,
    });
  }
}

export async function addProjectAddendum(
  projectId: string,
  organizationId: string,
  addendum: ProjectAddendumInput,
): Promise<ProjectAddendum> {
  const supabase = getSupabase();
  if (supabase) {
    const { data: addendumId, error } = await supabase.rpc('create_project_addendum_with_approval', {
      p_organization_id: organizationId,
      p_project_id: projectId,
      p_addendum_number: addendum.addendum_number,
      p_title: addendum.title,
      p_description: addendum.description ?? '',
      p_amount: addendum.amount,
      p_time_extension_days: addendum.time_extension_days,
      p_comment: '',
    });
    if (error) throw error;

    const { data, error: fetchError } = await supabase
      .from('project_addendums')
      .select()
      .eq('id', addendumId)
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .single();
    if (fetchError) throw fetchError;
    return { ...data, approval_status: 'pending' } as ProjectAddendum;
  }

  initLocalStorage();
  const newAdd: ProjectAddendum = {
    ...addendum,
    id: `add-${Date.now()}`,
    organization_id: organizationId,
    project_id: projectId,
    approved_at: null,
    approved_by: null,
    created_by: null,
    created_at: new Date().toISOString(),
  };

  const list = getLocal<Project[]>(KEY_PROJECTS, INITIAL_PROJECTS);
  const index = list.findIndex((p) => p.id === projectId && p.organization_id === organizationId);
  if (index !== -1) {
    if (!list[index].addendums) list[index].addendums = [];
    list[index].addendums!.push(newAdd);
    list[index].updated_at = new Date().toISOString();
    setLocal(KEY_PROJECTS, list);

    await createAuditLog({
      organization_id: organizationId,
      project_id: projectId,
      project_name: list[index].name,
      user_name: 'Pengguna demo',
      user_role: 'owner',
      action: 'CREATE_ADDENDUM',
      entity_type: 'addendum',
      entity_id: newAdd.addendum_number,
      details: `Membuat addendum ${newAdd.addendum_number}; menunggu persetujuan.`,
    });

    return newAdd;
  }
  throw new Error('Proyek tidak ditemukan');
}

// -------------------------------------------------------------
// MEMBERS & USERS
// -------------------------------------------------------------
export async function fetchMembers(organizationId: string): Promise<OrganizationMember[]> {
  initLocalStorage();
  const supabase = getSupabase();
  if (!supabase) return getLocal<OrganizationMember[]>(KEY_MEMBERS, INITIAL_MEMBERS).filter((m) => m.organization_id === organizationId);
  const { data, error } = await supabase
    .from('organization_members')
    .select('*, user:profiles!organization_members_user_id_fkey(*)')
    .eq('organization_id', organizationId);
  if (error) throw error;
  return (data ?? []) as OrganizationMember[];
}

export async function inviteDemoMember(data: {
  organization_id: string;
  full_name: string;
  email: string;
  role: OrganizationMember['role'];
  department: string;
  job_title?: string;
}): Promise<OrganizationMember> {
  const timestamp = Date.now();
  const createdAt = new Date().toISOString();
  const userId = `usr-${timestamp}`;
  const newMember: OrganizationMember = {
    id: `mem-${timestamp}`,
    organization_id: data.organization_id,
    user_id: userId,
    role: data.role,
    department: data.department,
    job_title: data.job_title ?? '',
    is_active: true,
    joined_at: createdAt,
    user: {
      id: userId,
      full_name: data.full_name,
      email: data.email,
      created_at: createdAt,
    },
  };

  const list = getLocal<OrganizationMember[]>(KEY_MEMBERS, INITIAL_MEMBERS);
  list.push(newMember);
  setLocal(KEY_MEMBERS, list);
  return newMember;
}

export async function updateDemoMemberRole(
  memberId: string,
  role: OrganizationMember['role']
): Promise<void> {
  const list = getLocal<OrganizationMember[]>(KEY_MEMBERS, INITIAL_MEMBERS);
  const target = list.find((m) => m.id === memberId);
  if (!target) throw new Error('Anggota tidak ditemukan.');
  target.role = role;
  setLocal(KEY_MEMBERS, list);
}

export async function setDemoMemberStatus(memberId: string, isActive: boolean): Promise<void> {
  const list = getLocal<OrganizationMember[]>(KEY_MEMBERS, INITIAL_MEMBERS);
  const target = list.find((m) => m.id === memberId);
  if (!target) throw new Error('Anggota tidak ditemukan.');
  target.is_active = isActive;
  setLocal(KEY_MEMBERS, list);
}

// -------------------------------------------------------------
// AUDIT LOGS
// -------------------------------------------------------------
export async function fetchAuditLogs(organizationId: string): Promise<AuditLog[]> {
  initLocalStorage();
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('audit_logs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as AuditLog[];
  }
  return getLocal<AuditLog[]>(KEY_LOGS, INITIAL_AUDIT_LOGS).filter((l) => l.organization_id === organizationId);
}

export async function createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
  const newLog: AuditLog = {
    ...log,
    id: `log-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const list = getLocal<AuditLog[]>(KEY_LOGS, INITIAL_AUDIT_LOGS);
  list.unshift(newLog);
  setLocal(KEY_LOGS, list.slice(0, 100)); // keep last 100 in local
  return newLog;
}

// -------------------------------------------------------------
// NOTIFICATIONS
// -------------------------------------------------------------
function mapNotification(row: Tables<'notifications'>): NotificationItem {
  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    link: row.link ?? null,
    is_read: row.is_read,
    created_at: row.created_at,
  };
}

export async function fetchNotifications(organizationId: string): Promise<NotificationItem[]> {
  initLocalStorage();
  const supabase = getSupabase();
  if (supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Sesi pengguna tidak tersedia untuk memuat notifikasi.');
    const { data, error } = await supabase
      .from('notifications')
      .select('id, organization_id, user_id, title, message, type, link, is_read, created_at')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map(mapNotification);
  }
  return getLocal<NotificationItem[]>(KEY_NOTIFS, INITIAL_NOTIFICATIONS)
    .filter((notification) => notification.organization_id === organizationId);
}

export async function markNotificationAsRead(id: string, organizationId: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Sesi pengguna tidak tersedia untuk memperbarui notifikasi.');
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .eq('user_id', user.id);
    if (error) throw error;
    return;
  }
  const list = getLocal<NotificationItem[]>(KEY_NOTIFS, INITIAL_NOTIFICATIONS);
  const target = list.find((notification) => notification.id === id
    && notification.organization_id === organizationId);
  if (target) {
    target.is_read = true;
    setLocal(KEY_NOTIFS, list);
  }
}

export async function markAllNotificationsAsRead(organizationId: string): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Sesi pengguna tidak tersedia untuk memperbarui notifikasi.');
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) throw error;
    return;
  }
  const list = getLocal<NotificationItem[]>(KEY_NOTIFS, INITIAL_NOTIFICATIONS);
  let changed = false;
  for (const notification of list) {
    if (notification.organization_id === organizationId && !notification.is_read) {
      notification.is_read = true;
      changed = true;
    }
  }
  if (changed) setLocal(KEY_NOTIFS, list);
}

// -------------------------------------------------------------
// FASE 2: AHSP & MASTER HARGA SATUAN
// -------------------------------------------------------------
export async function fetchAHSPResources(organizationId: string): Promise<AHSPResource[]> {
  initLocalStorage();
  const list = getLocal<AHSPResource[]>(KEY_RESOURCES, INITIAL_RESOURCES);
  return list.filter((r) => r.organization_id === organizationId);
}

export async function addAHSPResource(resource: Omit<AHSPResource, 'id'>): Promise<AHSPResource> {
  const newRes: AHSPResource = {
    ...resource,
    id: `res-${Date.now()}`,
  };
  const list = getLocal<AHSPResource[]>(KEY_RESOURCES, INITIAL_RESOURCES);
  list.push(newRes);
  setLocal(KEY_RESOURCES, list);
  return newRes;
}

export async function fetchAHSPTemplates(organizationId: string): Promise<AHSPTemplate[]> {
  initLocalStorage();
  const list = getLocal<AHSPTemplate[]>(KEY_AHSP, INITIAL_AHSP_TEMPLATES);
  return list.filter((t) => t.organization_id === organizationId);
}

// -------------------------------------------------------------
// FASE 2: BOQ & RAB
// -------------------------------------------------------------
export async function fetchProjectBOQ(projectId: string): Promise<ProjectBOQ | null> {
  initLocalStorage();
  const list = getLocal<ProjectBOQ[]>(KEY_BOQS, [INITIAL_BOQ]);
  return list.find((b) => b.project_id === projectId) || null;
}

export async function fetchBOQItems(boqId: string): Promise<ProjectBOQItem[]> {
  initLocalStorage();
  const list = getLocal<ProjectBOQItem[]>(KEY_BOQ_ITEMS, INITIAL_BOQ_ITEMS);
  return list.filter((bi) => bi.boq_id === boqId);
}

export async function addBOQItem(item: Omit<ProjectBOQItem, 'id'>): Promise<ProjectBOQItem> {
  const newItem: ProjectBOQItem = {
    ...item,
    id: `bi-${Date.now()}`,
  };
  const list = getLocal<ProjectBOQItem[]>(KEY_BOQ_ITEMS, INITIAL_BOQ_ITEMS);
  list.push(newItem);
  setLocal(KEY_BOQ_ITEMS, list);
  return newItem;
}

export async function updateBOQItemProgress(
  itemId: string,
  installedVolume: number,
  installedPercent: number
): Promise<ProjectBOQItem> {
  const list = getLocal<ProjectBOQItem[]>(KEY_BOQ_ITEMS, INITIAL_BOQ_ITEMS);
  const index = list.findIndex((bi) => bi.id === itemId);
  if (index !== -1) {
    list[index].installed_volume = installedVolume;
    list[index].installed_percent = installedPercent;
    setLocal(KEY_BOQ_ITEMS, list);
    return list[index];
  }
  throw new Error('Item BOQ tidak ditemukan');
}

// -------------------------------------------------------------
// FASE 2: LAPORAN HARIAN LAPANGAN (DAILY SITE REPORTS)
// -------------------------------------------------------------
export async function fetchDailyReports(projectId: string): Promise<DailySiteReport[]> {
  initLocalStorage();
  const list = getLocal<DailySiteReport[]>(KEY_DAILY_REPORTS, INITIAL_DAILY_REPORTS);
  return list
    .filter((r) => r.project_id === projectId)
    .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime());
}

export async function createDailyReport(
  report: Omit<DailySiteReport, 'id' | 'created_at'>
): Promise<DailySiteReport> {
  const newReport: DailySiteReport = {
    ...report,
    id: `rep-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  const list = getLocal<DailySiteReport[]>(KEY_DAILY_REPORTS, INITIAL_DAILY_REPORTS);
  list.unshift(newReport);
  setLocal(KEY_DAILY_REPORTS, list);

  // Add audit log
  await createAuditLog({
    organization_id: newReport.organization_id,
    project_id: newReport.project_id,
    user_name: newReport.site_manager_name,
    user_role: 'site_manager',
    action: 'SUBMIT_DAILY_REPORT',
    entity_type: 'daily_report',
    entity_id: newReport.report_number,
    details: `Mengirim Laporan Harian ${newReport.report_number} untuk tanggal ${newReport.report_date}`,
  });

  return newReport;
}

// -------------------------------------------------------------
// PENGADAAN (PROCUREMENT) & VENDOR
// -------------------------------------------------------------
export async function fetchVendors(orgId: string): Promise<Vendor[]> {
  initLocalStorage();
  if (getSupabase()) return fetchPersistedVendors(orgId);
  const list = getLocal<Vendor[]>(KEY_VENDORS, INITIAL_VENDORS);
  return list.filter((v) => v.organization_id === orgId);
}

export async function createVendor(data: Omit<Vendor, 'id' | 'created_at'>): Promise<Vendor> {
  if (getSupabase()) {
    const {
      organization_id: organizationId,
      code,
      name,
      category,
      contact_person,
      phone,
      email,
      address,
      npwp,
      payment_terms_days,
    } = data;
    return createVendorRecord(organizationId, {
      code,
      name,
      category,
      contact_person,
      phone,
      email,
      address,
      npwp: npwp ?? '',
      payment_terms_days,
    });
  }
  const newVendor: Vendor = {
    ...data,
    id: `vnd-${Date.now()}`,
    created_at: new Date().toISOString(),
    is_active: data.is_active ?? true,
    evaluation_count: data.evaluation_count ?? 0,
  };
  const list = getLocal<Vendor[]>(KEY_VENDORS, INITIAL_VENDORS);
  list.unshift(newVendor);
  setLocal(KEY_VENDORS, list);
  return newVendor;
}

export async function updateVendor(
  vendorId: string,
  organizationId: string,
  values: VendorInput,
): Promise<Vendor> {
  if (getSupabase()) return updateVendorRecord(organizationId, vendorId, values);
  const list = getLocal<Vendor[]>(KEY_VENDORS, INITIAL_VENDORS);
  const index = list.findIndex((vendor) => vendor.id === vendorId && vendor.organization_id === organizationId);
  if (index < 0) throw new Error('Vendor tidak ditemukan.');
  const updated: Vendor = { ...list[index], ...values, updated_at: new Date().toISOString() };
  list[index] = updated;
  setLocal(KEY_VENDORS, list);
  return updated;
}

export async function archiveVendor(vendorId: string, organizationId: string): Promise<void> {
  if (getSupabase()) return archiveVendorRecord(organizationId, vendorId);
  const list = getLocal<Vendor[]>(KEY_VENDORS, INITIAL_VENDORS);
  const index = list.findIndex((vendor) => vendor.id === vendorId && vendor.organization_id === organizationId);
  if (index < 0) throw new Error('Vendor tidak ditemukan.');
  list[index] = { ...list[index], is_active: false, deleted_at: new Date().toISOString() };
  setLocal(KEY_VENDORS, list);
}

export async function fetchPurchaseOrders(orgId: string, projectId?: string): Promise<PurchaseOrder[]> {
  if (getSupabase()) return fetchProcurementPurchaseOrders(orgId, projectId);
  initLocalStorage();
  const list = getLocal<PurchaseOrder[]>(KEY_POS, INITIAL_PURCHASE_ORDERS);
  return list
    .filter((po) => po.organization_id === orgId && (!projectId || projectId === 'all' || po.project_id === projectId))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createPurchaseOrder(data: Omit<PurchaseOrder, 'id' | 'created_at'>): Promise<PurchaseOrder> {
  if (getSupabase()) {
    throw new Error('PO hanya dapat dibuat dari penawaran vendor yang dipilih pada PR yang disetujui.');
  }
  const newPO: PurchaseOrder = {
    ...data,
    id: `po-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const list = getLocal<PurchaseOrder[]>(KEY_POS, INITIAL_PURCHASE_ORDERS);
  list.unshift(newPO);
  setLocal(KEY_POS, list);

  // If status is pending_approval, create approval item
  if (newPO.status === 'pending_approval') {
    await createApprovalItem({
      organization_id: newPO.organization_id,
      project_id: newPO.project_id,
      project_name: newPO.project_name,
      module_type: 'purchase_order',
      reference_number: newPO.po_number,
      title: `PO Pengadaan Material - ${newPO.vendor_name}`,
      requester_name: 'Procurement Specialist',
      requester_role: 'procurement',
      amount: newPO.grand_total,
      submitted_at: newPO.created_at,
      status: 'pending',
      urgency: newPO.grand_total > 100000000 ? 'urgent' : 'normal',
      approval_level: newPO.grand_total > 100000000 ? 'Level 2 (Direktur)' : 'Level 1 (Project Manager)',
    });
  }

  return newPO;
}

export async function updatePOStatus(
  poId: string,
  status: PurchaseOrder['status'],
  approverName?: string,
  notes?: string
): Promise<PurchaseOrder> {
  if (getSupabase()) {
    throw new Error('Status persetujuan PO dikelola melalui Pusat Persetujuan.');
  }
  const list = getLocal<PurchaseOrder[]>(KEY_POS, INITIAL_PURCHASE_ORDERS);
  const index = list.findIndex((p) => p.id === poId);
  if (index !== -1) {
    list[index].status = status;
    if (approverName) list[index].approved_by_name = approverName;
    if (notes) list[index].approval_notes = notes;
    if (status === 'approved') list[index].approved_at = new Date().toISOString();
    setLocal(KEY_POS, list);
    return list[index];
  }
  throw new Error('PO tidak ditemukan');
}

export async function fetchPurchaseRequests(orgId: string, projectId?: string): Promise<PurchaseRequest[]> {
  if (getSupabase()) {
    const requests = await fetchProcurementPurchaseRequests(orgId, projectId);
    return requests.map(toLegacyPurchaseRequest);
  }
  initLocalStorage();
  const list = getLocal<PurchaseRequest[]>(KEY_PRS, INITIAL_PURCHASE_REQUESTS);
  return list.filter((pr) => pr.organization_id === orgId && (!projectId || projectId === 'all' || pr.project_id === projectId));
}

export async function fetchGoodsReceipts(orgId: string, projectId?: string): Promise<GoodsReceiptNote[]> {
  if (getSupabase()) return fetchProcurementGoodsReceipts(orgId, projectId);
  initLocalStorage();
  const list = getLocal<GoodsReceiptNote[]>(KEY_GRNS, INITIAL_GOODS_RECEIPTS);
  return list.filter((grn) => grn.organization_id === orgId && (!projectId || projectId === 'all' || grn.project_id === projectId));
}

export async function createGoodsReceipt(input: CreateGoodsReceiptInput): Promise<GoodsReceiptNote> {
  if (!getSupabase()) throw new Error('Pencatatan penerimaan barang memerlukan koneksi Supabase.');
  const receiptId = await createProcurementGoodsReceipt(input);
  const receipts = await fetchProcurementGoodsReceipts(input.organizationId);
  const receipt = receipts.find(({ id }) => id === receiptId);
  if (!receipt) throw new Error('GRN berhasil disimpan tetapi tidak dapat dimuat kembali.');
  return receipt;
}

// -------------------------------------------------------------
// SUBKONTRAKTOR & MANDOR
// -------------------------------------------------------------
export async function fetchSubcontractors(orgId: string): Promise<Subcontractor[]> {
  initLocalStorage();
  const list = getLocal<Subcontractor[]>(KEY_SUBCONS, INITIAL_SUBCONTRACTORS);
  return list.filter((s) => s.organization_id === orgId);
}

export async function fetchSubconContracts(orgId: string, projectId?: string): Promise<SubcontractorContract[]> {
  initLocalStorage();
  const list = getLocal<SubcontractorContract[]>(KEY_SUBCON_CONTRACTS, INITIAL_SUBCON_CONTRACTS);
  return list.filter((c) => c.organization_id === orgId && (!projectId || projectId === 'all' || c.project_id === projectId));
}

export async function fetchSubconOpnames(orgId: string, projectId?: string): Promise<SubcontractorOpname[]> {
  initLocalStorage();
  const list = getLocal<SubcontractorOpname[]>(KEY_SUBCON_OPNAMES, INITIAL_SUBCON_OPNAMES);
  return list.filter((o) => o.organization_id === orgId && (!projectId || projectId === 'all' || o.project_id === projectId));
}

export async function createSubconOpname(data: Omit<SubcontractorOpname, 'id' | 'created_at'>): Promise<SubcontractorOpname> {
  const newOpname: SubcontractorOpname = {
    ...data,
    id: `opn-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const list = getLocal<SubcontractorOpname[]>(KEY_SUBCON_OPNAMES, INITIAL_SUBCON_OPNAMES);
  list.unshift(newOpname);
  setLocal(KEY_SUBCON_OPNAMES, list);
  return newOpname;
}

// -------------------------------------------------------------
// KEUANGAN PROYEK (FINANCE)
// -------------------------------------------------------------
export async function fetchClientInvoices(orgId: string, projectId?: string): Promise<ClientInvoice[]> {
  const supabase = getSupabase();
  if (supabase) {
    let query = supabase
      .from('client_invoices')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('invoice_date', { ascending: false });
    if (projectId && projectId !== 'all') query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;
    const projectIds = [...new Set(data.map((row) => row.project_id))];
    const projectResult = projectIds.length
      ? await supabase.from('projects').select('id, name, client_name').eq('organization_id', orgId).in('id', projectIds)
      : { data: [], error: null };
    if (projectResult.error) throw projectResult.error;
    const projectsById = new Map(projectResult.data.map((project) => [project.id, project]));
    const today = new Date().toISOString().slice(0, 10);
    return data.map((row) => {
      const project = projectsById.get(row.project_id);
      const status = (row.status === 'sent' || row.status === 'partially_paid') && row.due_date < today
        ? 'overdue'
        : row.status;
      if (!['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'].includes(status)) {
        throw new Error('Status invoice dari server tidak dikenal.');
      }
      return {
        id: row.id,
        organization_id: row.organization_id,
        project_id: row.project_id,
        project_name: project?.name ?? 'Proyek tidak tersedia',
        client_name: project?.client_name ?? 'Klien tidak tersedia',
        invoice_number: row.invoice_number,
        invoice_type: row.invoice_type as ClientInvoice['invoice_type'],
        term_label: row.term_label,
        invoice_date: row.invoice_date,
        due_date: row.due_date,
        progress_basis_percent: Number(row.progress_basis_percent),
        gross_amount: Number(row.gross_amount),
        retention_deduction: Number(row.retention_deduction),
        dp_deduction: Number(row.advance_deduction),
        advance_deduction: Number(row.advance_deduction),
        subtotal_taxable: Number(row.taxable_amount),
        vat_percent: Number(row.vat_percent),
        ppn_amount: Number(row.vat_amount),
        pph_percent: Number(row.pph_percent),
        pph_amount: Number(row.pph_amount),
        net_receivable: Number(row.total_amount),
        paid_amount: Number(row.paid_amount),
        status,
        payment_date: row.paid_at?.slice(0, 10),
        payment_reference: row.payment_reference,
        notes: row.notes,
        created_at: row.created_at,
      };
    });
  }
  initLocalStorage();
  const list = getLocal<ClientInvoice[]>(KEY_INVOICES, INITIAL_CLIENT_INVOICES);
  return list.filter((inv) => inv.organization_id === orgId && (!projectId || projectId === 'all' || inv.project_id === projectId));
}

export async function createClientInvoice(data: Omit<ClientInvoice, 'id' | 'created_at'>): Promise<ClientInvoice> {
  const supabase = getSupabase();
  if (supabase) {
    const { data: invoiceId, error } = await supabase.rpc('save_client_invoice', {
      p_organization_id: data.organization_id,
      p_invoice_id: null,
      p_project_id: data.project_id,
      p_invoice_number: data.invoice_number,
      p_invoice_type: data.invoice_type ?? 'progress',
      p_term_label: data.term_label,
      p_invoice_date: data.invoice_date,
      p_due_date: data.due_date,
      p_progress_basis_percent: data.progress_basis_percent,
      p_gross_amount: data.gross_amount,
      p_advance_deduction: data.advance_deduction ?? data.dp_deduction,
      p_retention_deduction: data.retention_deduction,
      p_vat_percent: data.vat_percent ?? 11,
      p_pph_percent: data.pph_percent ?? 2.65,
      p_status: data.status === 'draft' ? 'draft' : 'sent',
      p_notes: data.notes ?? '',
    });
    if (error) throw error;
    const invoices = await fetchClientInvoices(data.organization_id, data.project_id);
    const created = invoices.find((invoice) => invoice.id === invoiceId);
    if (!created) throw new Error('Invoice tersimpan tetapi tidak dapat dimuat ulang.');
    return created;
  }
  const newInv: ClientInvoice = {
    ...data,
    id: `inv-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const list = getLocal<ClientInvoice[]>(KEY_INVOICES, INITIAL_CLIENT_INVOICES);
  list.unshift(newInv);
  setLocal(KEY_INVOICES, list);
  return newInv;
}

export async function markInvoicePaid(
  invId: string,
  paymentRef: string,
  amount?: number,
  paymentMethod: CashPaymentMethod = 'Transfer Bank',
): Promise<ClientInvoice> {
  const supabase = getSupabase();
  if (supabase) {
    const { data: invoice, error: readError } = await supabase
      .from('client_invoices')
      .select('organization_id, total_amount, paid_amount')
      .eq('id', invId)
      .is('deleted_at', null)
      .single();
    if (readError) throw readError;
    const paymentAmount = amount ?? Number(invoice.total_amount) - Number(invoice.paid_amount);
    const { error } = await supabase.rpc('record_client_invoice_payment', {
      p_invoice_id: invId,
      p_amount: paymentAmount,
      p_payment_reference: paymentRef,
      p_payment_method: paymentMethod,
    });
    if (error) throw error;
    const invoices = await fetchClientInvoices(invoice.organization_id);
    const updated = invoices.find((item) => item.id === invId);
    if (!updated) throw new Error('Pembayaran tersimpan tetapi invoice tidak dapat dimuat ulang.');
    return updated;
  }
  const list = getLocal<ClientInvoice[]>(KEY_INVOICES, INITIAL_CLIENT_INVOICES);
  const target = list.find((i) => i.id === invId);
  if (target) {
    const remaining = target.net_receivable - (target.paid_amount ?? (target.status === 'paid' ? target.net_receivable : 0));
    target.paid_amount = (target.paid_amount ?? 0) + (amount ?? remaining);
    target.status = target.paid_amount >= target.net_receivable ? 'paid' : 'partially_paid';
    if (target.status === 'paid') target.payment_date = new Date().toISOString().split('T')[0];
    target.payment_reference = paymentRef;
    setLocal(KEY_INVOICES, list);
    const transactions = getLocal<ProjectCashTransaction[]>(KEY_CASH_TRANSACTIONS, INITIAL_CASH_TRANSACTIONS);
    transactions.unshift({
      id: `ctx-invoice-${Date.now()}`,
      organization_id: target.organization_id,
      project_id: target.project_id,
      project_name: target.project_name,
      transaction_number: `BKM-${Date.now()}`,
      transaction_date: new Date().toISOString().slice(0, 10),
      type: 'inflow',
      category: 'Termin Klien',
      amount: amount ?? remaining,
      recipient_or_payer: target.client_name,
      description: `Penerimaan invoice ${target.invoice_number}`,
      payment_method: paymentMethod,
      status: 'verified',
      reference: paymentRef,
      invoice_id: target.id,
    });
    setLocal(KEY_CASH_TRANSACTIONS, transactions);
    return target;
  }
  throw new Error('Invoice tidak ditemukan');
}

export async function fetchCashTransactions(orgId: string, projectId?: string): Promise<ProjectCashTransaction[]> {
  const supabase = getSupabase();
  if (supabase) {
    let query = supabase
      .from('project_cash_transactions')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false });
    if (projectId && projectId !== 'all') query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;
    const projectIds = [...new Set(data.map((row) => row.project_id))];
    const projectResult = projectIds.length
      ? await supabase.from('projects').select('id, name').eq('organization_id', orgId).in('id', projectIds)
      : { data: [], error: null };
    if (projectResult.error) throw projectResult.error;
    const projectsById = new Map(projectResult.data.map((project) => [project.id, project.name]));
    return data.map((row) => {
      if (!['inflow', 'outflow'].includes(row.type)
        || !['Termin Klien', 'Material', 'Upah Pekerja', 'Subkon', 'Sewa Alat', 'Operasional Site', 'Kasbon / Petty Cash', 'Lainnya'].includes(row.category)
        || !['Transfer Bank', 'Kas Tunai', 'Giro / Cek', 'Lainnya'].includes(row.payment_method)
        || !['pending', 'verified'].includes(row.status)) {
        throw new Error('Data transaksi buku kas dari server tidak dikenal.');
      }
      return {
        id: row.id,
        organization_id: row.organization_id,
        project_id: row.project_id,
        project_name: projectsById.get(row.project_id) ?? 'Proyek tidak tersedia',
        transaction_number: row.transaction_number,
        transaction_date: row.transaction_date,
        type: row.type as ProjectCashTransaction['type'],
        category: row.category as ProjectCashTransaction['category'],
        amount: Number(row.amount),
        recipient_or_payer: row.recipient_or_payer,
        description: row.description,
        payment_method: row.payment_method as CashPaymentMethod,
        status: row.status as ProjectCashTransaction['status'],
        reference: row.reference,
        invoice_id: row.invoice_id,
        cash_advance_request_id: row.cash_advance_request_id,
        verified_by: row.verified_by,
        verified_at: row.verified_at,
      };
    });
  }
  initLocalStorage();
  const list = getLocal<ProjectCashTransaction[]>(KEY_CASH_TRANSACTIONS, INITIAL_CASH_TRANSACTIONS);
  return list.filter((t) => t.organization_id === orgId && (!projectId || projectId === 'all' || t.project_id === projectId));
}

export async function createCashTransaction(data: CreateProjectCashTransactionInput): Promise<ProjectCashTransaction> {
  const supabase = getSupabase();
  if (supabase) {
    const { data: transactionId, error } = await supabase.rpc('create_project_cash_transaction', {
      p_organization_id: data.organization_id,
      p_project_id: data.project_id,
      p_transaction_date: data.transaction_date,
      p_type: data.type,
      p_category: data.category,
      p_amount: data.amount,
      p_recipient_or_payer: data.recipient_or_payer,
      p_description: data.description,
      p_payment_method: data.payment_method,
      p_reference: data.reference ?? '',
    });
    if (error) throw error;
    const transactions = await fetchCashTransactions(data.organization_id, data.project_id);
    const created = transactions.find((transaction) => transaction.id === transactionId);
    if (!created) throw new Error('Transaksi tersimpan tetapi tidak dapat dimuat ulang.');
    return created;
  }
  const newCtx: ProjectCashTransaction = {
    ...data,
    id: `ctx-${Date.now()}`,
    project_name: INITIAL_CASH_TRANSACTIONS.find((item) => item.project_id === data.project_id)?.project_name ?? '',
    transaction_number: `BK-${Date.now()}`,
    status: 'pending',
  };
  const list = getLocal<ProjectCashTransaction[]>(KEY_CASH_TRANSACTIONS, INITIAL_CASH_TRANSACTIONS);
  list.unshift(newCtx);
  setLocal(KEY_CASH_TRANSACTIONS, list);
  return newCtx;
}

export async function verifyCashTransaction(transactionId: string, organizationId: string): Promise<ProjectCashTransaction> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc('verify_project_cash_transaction', {
      p_organization_id: organizationId,
      p_transaction_id: transactionId,
    });
    if (error) throw error;
    const transactions = await fetchCashTransactions(organizationId);
    const updated = transactions.find((transaction) => transaction.id === transactionId);
    if (!updated) throw new Error('Transaksi diverifikasi tetapi tidak dapat dimuat ulang.');
    return updated;
  }
  const list = getLocal<ProjectCashTransaction[]>(KEY_CASH_TRANSACTIONS, INITIAL_CASH_TRANSACTIONS);
  const target = list.find((transaction) => transaction.id === transactionId && transaction.organization_id === organizationId);
  if (!target) throw new Error('Transaksi kas tidak ditemukan.');
  target.status = 'verified';
  setLocal(KEY_CASH_TRANSACTIONS, list);
  return target;
}

export async function fetchKasbonList(orgId: string, projectId?: string): Promise<KasbonReimbursement[]> {
  const supabase = getSupabase();
  if (supabase) {
    let query = supabase
      .from('cash_advance_requests')
      .select('*')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .order('request_date', { ascending: false });
    if (projectId && projectId !== 'all') query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;
    const projectIds = [...new Set(data.map((row) => row.project_id))];
    const projectResult = projectIds.length
      ? await supabase.from('projects').select('id, name').eq('organization_id', orgId).in('id', projectIds)
      : { data: [], error: null };
    if (projectResult.error) throw projectResult.error;
    const projectsById = new Map(projectResult.data.map((project) => [project.id, project.name]));
    return data.map((row) => {
      if (!['kasbon', 'reimbursement'].includes(row.request_type)
        || !['pending_approval', 'approved_ready_payout', 'active_unsettled', 'settled', 'rejected'].includes(row.status)) {
        throw new Error('Status pengajuan kasbon dari server tidak dikenal.');
      }
      return {
        id: row.id,
        organization_id: row.organization_id,
        project_id: row.project_id,
        project_name: projectsById.get(row.project_id) ?? 'Proyek tidak tersedia',
        ticket_number: row.ticket_number,
        employee_name: row.employee_name,
        role: row.employee_role,
        date: row.request_date,
        type: row.request_type as KasbonReimbursement['type'],
        amount: Number(row.amount),
        purpose: row.purpose,
        settlement_status: row.status as KasbonReimbursement['settlement_status'],
        decision_comment: row.decision_comment,
        paid_amount: Number(row.paid_amount),
        paid_at: row.paid_at,
        payment_method: row.payment_method as CashPaymentMethod | null,
        settled_amount: Number(row.settled_amount),
        settled_at: row.settled_at,
        settlement_notes: row.settlement_notes,
        created_by: row.created_by,
        created_at: row.created_at,
      };
    });
  }
  initLocalStorage();
  const list = getLocal<KasbonReimbursement[]>(KEY_KASBON, INITIAL_KASBON);
  return list.filter((k) => k.organization_id === orgId && (!projectId || projectId === 'all' || k.project_id === projectId));
}

export async function createKasbon(data: CreateCashAdvanceRequestInput): Promise<KasbonReimbursement> {
  const supabase = getSupabase();
  if (supabase) {
    const { data: requestId, error } = await supabase.rpc('create_cash_advance_request', {
      p_organization_id: data.organization_id,
      p_project_id: data.project_id,
      p_request_type: data.type,
      p_employee_name: data.employee_name,
      p_employee_role: data.role,
      p_request_date: data.date,
      p_amount: data.amount,
      p_purpose: data.purpose,
    });
    if (error) throw error;
    const requests = await fetchKasbonList(data.organization_id, data.project_id);
    const created = requests.find((request) => request.id === requestId);
    if (!created) throw new Error('Pengajuan tersimpan tetapi tidak dapat dimuat ulang.');
    return created;
  }
  const newKasbon: KasbonReimbursement = {
    ...data,
    id: `ksb-${Date.now()}`,
    project_name: INITIAL_KASBON.find((item) => item.project_id === data.project_id)?.project_name ?? '',
    ticket_number: `KSB-${Date.now()}`,
    settlement_status: 'pending_approval',
    created_at: new Date().toISOString(),
  };
  const list = getLocal<KasbonReimbursement[]>(KEY_KASBON, INITIAL_KASBON);
  list.unshift(newKasbon);
  setLocal(KEY_KASBON, list);
  return newKasbon;
}

async function reloadCashAdvance(requestId: string, organizationId: string): Promise<KasbonReimbursement> {
  const requests = await fetchKasbonList(organizationId);
  const request = requests.find((item) => item.id === requestId);
  if (!request) throw new Error('Pengajuan diproses tetapi tidak dapat dimuat ulang.');
  return request;
}

export async function decideCashAdvance(
  requestId: string,
  organizationId: string,
  decision: CashAdvanceDecision,
  comment: string,
): Promise<KasbonReimbursement> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc('decide_cash_advance_request', {
      p_organization_id: organizationId,
      p_request_id: requestId,
      p_decision: decision,
      p_comment: comment,
    });
    if (error) throw error;
    return reloadCashAdvance(requestId, organizationId);
  }
  const list = getLocal<KasbonReimbursement[]>(KEY_KASBON, INITIAL_KASBON);
  const request = list.find((item) => item.id === requestId && item.organization_id === organizationId);
  if (!request || request.settlement_status !== 'pending_approval') throw new Error('Pengajuan tidak tersedia.');
  request.settlement_status = decision === 'approve' ? 'approved_ready_payout' : 'rejected';
  request.decision_comment = comment;
  setLocal(KEY_KASBON, list);
  return request;
}

export async function payCashAdvance(
  requestId: string,
  organizationId: string,
  paymentMethod: CashPaymentMethod,
  reference: string,
): Promise<KasbonReimbursement> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc('pay_cash_advance_request', {
      p_organization_id: organizationId,
      p_request_id: requestId,
      p_payment_method: paymentMethod,
      p_reference: reference,
    });
    if (error) throw error;
    return reloadCashAdvance(requestId, organizationId);
  }
  const list = getLocal<KasbonReimbursement[]>(KEY_KASBON, INITIAL_KASBON);
  const request = list.find((item) => item.id === requestId && item.organization_id === organizationId);
  if (!request || request.settlement_status !== 'approved_ready_payout') throw new Error('Pengajuan belum siap dibayar.');
  request.settlement_status = request.type === 'kasbon' ? 'active_unsettled' : 'settled';
  request.paid_amount = request.amount;
  request.paid_at = new Date().toISOString();
  request.payment_method = paymentMethod;
  if (request.type === 'reimbursement') {
    request.settled_amount = request.amount;
    request.settled_at = new Date().toISOString();
  }
  setLocal(KEY_KASBON, list);
  return request;
}

export async function settleCashAdvance(
  requestId: string,
  organizationId: string,
  settledAmount: number,
  notes: string,
): Promise<KasbonReimbursement> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc('settle_cash_advance_request', {
      p_organization_id: organizationId,
      p_request_id: requestId,
      p_settled_amount: settledAmount,
      p_settlement_notes: notes,
    });
    if (error) throw error;
    return reloadCashAdvance(requestId, organizationId);
  }
  const list = getLocal<KasbonReimbursement[]>(KEY_KASBON, INITIAL_KASBON);
  const request = list.find((item) => item.id === requestId && item.organization_id === organizationId);
  if (!request || request.settlement_status !== 'active_unsettled' || settledAmount > (request.paid_amount ?? request.amount)) {
    throw new Error('Kasbon belum dapat diselesaikan atau nilai realisasi tidak valid.');
  }
  request.settlement_status = 'settled';
  request.settled_amount = settledAmount;
  request.settled_at = new Date().toISOString();
  request.settlement_notes = notes;
  setLocal(KEY_KASBON, list);
  return request;
}

// -------------------------------------------------------------
// SDM & ABSENSI LAPANGAN
// -------------------------------------------------------------
export async function fetchFieldWorkers(orgId: string, projectId?: string): Promise<FieldWorker[]> {
  initLocalStorage();
  const list = getLocal<FieldWorker[]>(KEY_WORKERS, INITIAL_FIELD_WORKERS);
  return list.filter((w) => w.organization_id === orgId && (!projectId || projectId === 'all' || w.project_id === projectId));
}

// -------------------------------------------------------------
// PERALATAN & ASET
// -------------------------------------------------------------
export async function fetchEquipmentAssets(orgId: string): Promise<EquipmentAsset[]> {
  initLocalStorage();
  const list = getLocal<EquipmentAsset[]>(KEY_EQUIPMENT, INITIAL_EQUIPMENT_ASSETS);
  return list.filter((e) => e.organization_id === orgId);
}

// -------------------------------------------------------------
// K3, KUALITAS & PUNCH LIST
// -------------------------------------------------------------
export async function fetchSafetyIncidents(orgId: string, projectId?: string): Promise<SafetyIncident[]> {
  initLocalStorage();
  const list = getLocal<SafetyIncident[]>(KEY_INCIDENTS, INITIAL_SAFETY_INCIDENTS);
  return list.filter((i) => i.organization_id === orgId && (!projectId || projectId === 'all' || i.project_id === projectId));
}

export async function fetchToolboxMeetings(orgId: string, projectId?: string): Promise<ToolboxMeeting[]> {
  initLocalStorage();
  const list = getLocal<ToolboxMeeting[]>(KEY_TOOLBOX, INITIAL_TOOLBOX_MEETINGS);
  return list.filter((t) => t.organization_id === orgId && (!projectId || projectId === 'all' || t.project_id === projectId));
}

// -------------------------------------------------------------
// DOKUMEN & GAMBAR
// -------------------------------------------------------------
export async function fetchDocuments(orgId: string, projectId?: string): Promise<ProjectDocument[]> {
  initLocalStorage();
  const list = getLocal<ProjectDocument[]>(KEY_DOCUMENTS, INITIAL_DOCUMENTS);
  return list.filter((d) => d.organization_id === orgId && (!projectId || projectId === 'all' || d.project_id === projectId));
}

// -------------------------------------------------------------
// APPROVAL ENGINE
// -------------------------------------------------------------
export async function createApprovalItem(item: Omit<ApprovalItem, 'id'>): Promise<ApprovalItem> {
  const newItem: ApprovalItem = {
    ...item,
    id: `app-${Date.now()}`,
  };
  const list = getLocal<ApprovalItem[]>(KEY_APPROVALS, INITIAL_APPROVALS);
  list.unshift(newItem);
  setLocal(KEY_APPROVALS, list);
  return newItem;
}
