/**
 * Role-Based Access Control (RBAC) definitions and permission checkers
 */

export type UserRole =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'site_manager'
  | 'estimator'
  | 'procurement'
  | 'finance'
  | 'warehouse'
  | 'safety_officer'
  | 'subcontractor'
  | 'client_viewer';

export const INVITABLE_MEMBER_ROLES = [
  'admin',
  'project_manager',
  'site_manager',
  'estimator',
  'procurement',
  'finance',
  'warehouse',
  'safety_officer',
  'subcontractor',
  'client_viewer',
] as const satisfies readonly Exclude<UserRole, 'owner'>[];

export const HR_WORKER_MANAGEMENT_ROLES: readonly UserRole[] = [
  'owner',
  'admin',
  'project_manager',
];

export const HR_WORKFORCE_ACCESS_ROLES: readonly UserRole[] = [
  ...HR_WORKER_MANAGEMENT_ROLES,
  'site_manager',
];

export const PUNCH_LIST_CLOSURE_ROLES: readonly UserRole[] = [
  'owner',
  'admin',
  'project_manager',
  'safety_officer',
];

export type InvitableMemberRole = (typeof INVITABLE_MEMBER_ROLES)[number];

export type AppModule =
  | 'dashboard'
  | 'projects'
  | 'rab'
  | 'field_reports'
  | 'procurement'
  | 'warehouse'
  | 'finance'
  | 'safety'
  | 'approvals'
  | 'users'
  | 'settings';

export type AppAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export const NAVIGATION_MODULES: Record<string, AppModule> = {
  dashboard: 'dashboard',
  projects: 'projects',
  rab: 'rab',
  field_reports: 'field_reports',
  procurement: 'procurement',
  warehouse: 'warehouse',
  subcontractors: 'procurement',
  finance: 'finance',
  hr_manpower: 'users',
  equipment: 'warehouse',
  safety_qc: 'safety',
  documents: 'projects',
  approvals: 'approvals',
  reports: 'dashboard',
  settings: 'settings',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Direktur / Pemilik',
  admin: 'Administrator Sistem',
  project_manager: 'Project Manager (PM)',
  site_manager: 'Site Manager / Pelaksana',
  estimator: 'QS / Estimator (RAB)',
  procurement: 'Procurement / Purchasing',
  finance: 'Admin Keuangan & Kasir',
  warehouse: 'Logistik & Gudang',
  safety_officer: 'Petugas K3 / HSE',
  subcontractor: 'Subkontraktor',
  client_viewer: 'Klien / Pengawas Owner',
};

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  owner: 'bg-neutral/10 text-neutral border-neutral/30',
  admin: 'bg-neutral/10 text-neutral border-neutral/30',
  project_manager: 'bg-neutral/10 text-neutral border-neutral/30',
  site_manager: 'bg-neutral/10 text-neutral border-neutral/30',
  estimator: 'bg-neutral/10 text-neutral border-neutral/30',
  procurement: 'bg-neutral/10 text-neutral border-neutral/30',
  finance: 'bg-neutral/10 text-neutral border-neutral/30',
  warehouse: 'bg-neutral/10 text-neutral border-neutral/30',
  safety_officer: 'bg-neutral/10 text-neutral border-neutral/30',
  subcontractor: 'bg-neutral/10 text-neutral border-neutral/30',
  client_viewer: 'bg-neutral/10 text-neutral border-neutral/30',
};

// Default permissions matrix per role
export const ROLE_PERMISSIONS: Record<UserRole, Record<AppModule, AppAction[]>> = {
  owner: {
    dashboard: ['view'],
    projects: ['view', 'create', 'edit', 'delete', 'approve'],
    rab: ['view', 'create', 'edit', 'delete', 'approve'],
    field_reports: ['view', 'create', 'edit', 'approve'],
    procurement: ['view', 'approve'],
    warehouse: ['view'],
    finance: ['view', 'create', 'edit', 'approve'],
    safety: ['view', 'create', 'edit', 'approve'],
    approvals: ['view', 'approve'],
    users: ['view', 'create', 'edit', 'delete', 'approve'],
    settings: ['view', 'edit'],
  },
  admin: {
    dashboard: ['view'],
    projects: ['view', 'create', 'edit', 'delete', 'approve'],
    rab: ['view', 'create', 'edit', 'delete', 'approve'],
    field_reports: ['view', 'create', 'edit', 'delete', 'approve'],
    procurement: ['view', 'create', 'edit', 'delete', 'approve'],
    warehouse: ['view', 'create', 'edit', 'delete'],
    finance: ['view', 'create', 'edit', 'approve'],
    safety: ['view', 'create', 'edit'],
    approvals: ['view', 'approve'],
    users: ['view', 'create', 'edit', 'delete'],
    settings: ['view', 'edit'],
  },
  project_manager: {
    dashboard: ['view'],
    projects: ['view', 'create', 'edit', 'approve'],
    rab: ['view', 'edit', 'approve'],
    field_reports: ['view', 'approve'],
    procurement: ['view', 'create', 'approve'],
    warehouse: ['view'],
    finance: ['view', 'create'],
    safety: ['view', 'create', 'edit', 'approve'],
    approvals: ['view', 'approve'],
    users: ['view'],
    settings: ['view'],
  },
  site_manager: {
    dashboard: ['view'],
    projects: ['view', 'edit'],
    rab: ['view'],
    field_reports: ['view', 'create', 'edit'],
    procurement: ['view', 'create'],
    warehouse: ['view', 'create'],
    finance: ['view'],
    safety: ['view', 'create', 'edit'],
    approvals: ['view'],
    users: ['view'],
    settings: [],
  },
  estimator: {
    dashboard: ['view'],
    projects: ['view'],
    rab: ['view', 'create', 'edit'],
    field_reports: ['view'],
    procurement: ['view'],
    warehouse: ['view'],
    finance: ['view'],
    safety: ['view'],
    approvals: ['view'],
    users: [],
    settings: [],
  },
  procurement: {
    dashboard: ['view'],
    projects: ['view'],
    rab: ['view'],
    field_reports: ['view'],
    procurement: ['view', 'create', 'edit'],
    warehouse: ['view', 'create', 'edit'],
    finance: ['view'],
    safety: ['view'],
    approvals: ['view'],
    users: [],
    settings: [],
  },
  finance: {
    dashboard: ['view'],
    projects: ['view'],
    rab: ['view'],
    field_reports: ['view'],
    procurement: ['view'],
    warehouse: ['view'],
    finance: ['view', 'create', 'edit', 'approve'],
    safety: ['view'],
    approvals: ['view', 'approve'],
    users: [],
    settings: [],
  },
  warehouse: {
    dashboard: ['view'],
    projects: ['view'],
    rab: [],
    field_reports: ['view'],
    procurement: ['view'],
    warehouse: ['view', 'create', 'edit'],
    finance: [],
    safety: ['view'],
    approvals: ['view'],
    users: [],
    settings: [],
  },
  safety_officer: {
    dashboard: ['view'],
    projects: ['view'],
    rab: [],
    field_reports: ['view'],
    procurement: [],
    warehouse: [],
    finance: [],
    safety: ['view', 'create', 'edit', 'approve'],
    approvals: ['view', 'approve'],
    users: [],
    settings: [],
  },
  subcontractor: {
    dashboard: ['view'],
    projects: ['view'],
    rab: [],
    field_reports: ['view'],
    procurement: [],
    warehouse: [],
    finance: ['view'],
    safety: ['view'],
    approvals: [],
    users: [],
    settings: [],
  },
  client_viewer: {
    dashboard: ['view'],
    projects: ['view'],
    rab: ['view'],
    field_reports: ['view'],
    procurement: [],
    warehouse: [],
    finance: ['view'],
    safety: ['view'],
    approvals: [],
    users: [],
    settings: [],
  },
};

/**
 * Check if a role can perform an action on a module
 */
export function hasPermission(role: UserRole, module: AppModule, action: AppAction): boolean {
  const modulePerms = ROLE_PERMISSIONS[role]?.[module];
  if (!modulePerms) return false;
  return modulePerms.includes(action);
}
