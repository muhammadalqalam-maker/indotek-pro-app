import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Organization,
  Project,
  ProjectAddendum,
  ProjectAddendumInput,
  OrganizationMember,
  AuditLog,
  NotificationItem,
  Vendor,
  PurchaseOrder,
  PurchaseRequest,
  GoodsReceiptNote,
  MaterialStockItem,
  StockMovement,
  Subcontractor,
  SubcontractorContract,
  SubcontractorOpname,
  ClientInvoice,
  ProjectCashTransaction,
  KasbonReimbursement,
  FieldWorker,
  DailyAttendance,
  EquipmentAsset,
  SafetyIncident,
  ToolboxMeeting,
  PunchListItem,
  ProjectDocument,
  ApprovalItem,
} from '../types/database';
import {
  hasPermission,
  type AppAction,
  type AppModule,
  type InvitableMemberRole,
  type UserRole,
} from '../utils/permissions';
import {
  fetchOrganizations,
  fetchProjects,
  fetchMembers,
  fetchAuditLogs,
  createProject,
  updateProject,
  deleteProject,
  addProjectAddendum,
  approveProjectAddendum,
  resetDemoData,
  fetchAHSPResources,
  fetchAHSPTemplates,
  fetchProjectBOQ,
  fetchBOQItems,
  addBOQItem,
  updateBOQItemProgress,
  fetchDailyReports,
  createDailyReport,
  fetchSCurveData,
  updateSCurveWeekActual,
  fetchVendors,
  createVendor,
  fetchPurchaseOrders,
  createPurchaseOrder,
  updatePOStatus,
  fetchPurchaseRequests,
  fetchGoodsReceipts,
  createGoodsReceipt,
  fetchMaterialStocks,
  fetchStockMovements,
  addStockMovement,
  fetchSubcontractors,
  fetchSubconContracts,
  fetchSubconOpnames,
  createSubconOpname,
  fetchClientInvoices,
  createClientInvoice,
  markInvoicePaid,
  fetchCashTransactions,
  createCashTransaction,
  fetchKasbonList,
  createKasbon,
  fetchFieldWorkers,
  fetchDailyAttendance,
  fetchEquipmentAssets,
  fetchSafetyIncidents,
  fetchToolboxMeetings,
  fetchPunchList,
  updatePunchListStatus,
  fetchDocuments,
  fetchApprovals,
  processApproval,
} from '../services/dataService';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/dataService';
import {
  applyNotificationRealtimeEvent,
  subscribeToNotifications,
  type NotificationRealtimeStatus,
} from '../features/notifications/services/notification.service';
import {
  acceptOrganizationInvitation,
  fetchPendingOrganizationInvitations,
  sendMemberInvitation,
  setOrganizationMemberStatus,
  updateOrganizationMemberRole,
} from '../features/settings/services/member.service';
import {
  type MemberInvitationInput,
  type PendingOrganizationInvitation,
} from '../features/settings/schemas/member.schema';
import type { MemberInvitationSendResult } from '../features/settings/services/member.service';
import {
  fetchRolePermissionOverrides,
  type PermissionOverrides,
} from '../features/permissions/services/permission.service';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { authMessages as messages, memberMessages, organizationMessages } from '../i18n/id';
import { getMessages } from '../i18n';

export type NavigationTab =
  | 'dashboard'
  | 'projects'
  | 'rab'
  | 'field_reports'
  | 'procurement'
  | 'warehouse'
  | 'subcontractors'
  | 'finance'
  | 'hr_manpower'
  | 'equipment'
  | 'safety_qc'
  | 'documents'
  | 'approvals'
  | 'reports'
  | 'settings'
  | 'guide';

export type AuthMode = 'sign_in' | 'sign_up' | 'forgot_password' | 'update_password';
const AUTH_RECOVERY_STORAGE_KEY = 'indotek_auth_recovery';

interface AppContextType {
  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Connection
  isSupabaseLive: boolean;
  authLoading: boolean;
  authSession: Session | null;
  authError: string;
  authNotice: string;
  authBusy: boolean;
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  clearAuthFeedback: () => void;
  submitAuth: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshConnectionStatus: () => void;

  // Active Context
  currentOrg: Organization | null;
  organizations: Organization[];
  organizationsLoading: boolean;
  organizationsError: string;
  organizationDataError: string;
  currentMemberRole: UserRole | null;
  permissionOverrides: PermissionOverrides;
  permissionsLoading: boolean;
  permissionsError: string;
  reloadPermissions: () => void;
  reloadOrganizations: () => void;
  setCurrentOrgId: (id: string) => void;
  completeOrganization: (organization: Organization) => void;
  updateCurrentOrganization: (organization: Organization) => void;

  // Role simulation
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  can: (module: AppModule, action: AppAction) => boolean;

  // Active Project Filter
  selectedProjectId: string; // 'all' or project ID
  setSelectedProjectId: (id: string) => void;

  // Navigation
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  activeProjectDetailId: string | null;
  openProjectDetail: (projectId: string) => void;
  closeProjectDetail: () => void;

  // Command palette
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Data & Actions
  projects: Project[];
  members: OrganizationMember[];
  membersLoading: boolean;
  membersError: string;
  reloadMembers: () => Promise<void>;
  pendingInvitations: PendingOrganizationInvitation[];
  pendingInvitationsLoading: boolean;
  pendingInvitationsError: string;
  reloadPendingInvitations: () => Promise<void>;
  handleAcceptInvitation: (invitationId: string) => Promise<void>;
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  notificationsLoading: boolean;
  notificationsError: string;
  notificationsRealtimeStatus: NotificationRealtimeStatus;
  notificationsRealtimeError: string;
  notificationEventCount: number;
  reloadNotifications: () => Promise<void>;
  isLoading: boolean;

  // Fase 2 Data & Actions
  resources: any[];
  ahspTemplates: any[];
  activeBoq: any;
  boqItems: any[];
  dailyReports: any[];
  scurvePoints: any[];
  handleAddBOQItem: (item: any) => Promise<any>;
  handleUpdateBOQProgress: (itemId: string, vol: number, pct: number) => Promise<any>;
  handleCreateDailyReport: (report: any) => Promise<any>;
  handleUpdateSCurve: (weekId: string, actualWeekly: number, actualCumulative: number) => Promise<any>;

  // Module Entities & Actions
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  purchaseRequests: PurchaseRequest[];
  goodsReceipts: GoodsReceiptNote[];
  materialStocks: MaterialStockItem[];
  stockMovements: StockMovement[];
  subcontractors: Subcontractor[];
  subconContracts: SubcontractorContract[];
  subconOpnames: SubcontractorOpname[];
  clientInvoices: ClientInvoice[];
  cashTransactions: ProjectCashTransaction[];
  kasbonList: KasbonReimbursement[];
  fieldWorkers: FieldWorker[];
  dailyAttendances: DailyAttendance[];
  equipmentAssets: EquipmentAsset[];
  safetyIncidents: SafetyIncident[];
  toolboxMeetings: ToolboxMeeting[];
  punchList: PunchListItem[];
  documents: ProjectDocument[];
  approvals: ApprovalItem[];

  // Module Handlers
  handleCreateVendor: (data: Omit<Vendor, 'id' | 'created_at'>) => Promise<Vendor>;
  handleCreatePO: (data: Omit<PurchaseOrder, 'id' | 'created_at'>) => Promise<PurchaseOrder>;
  handleUpdatePOStatus: (id: string, status: PurchaseOrder['status'], approverName?: string, notes?: string) => Promise<PurchaseOrder>;
  handleCreateGRN: (data: Omit<GoodsReceiptNote, 'id' | 'created_at'>) => Promise<GoodsReceiptNote>;
  handleAddStockMovement: (data: Omit<StockMovement, 'id'>) => Promise<StockMovement>;
  handleCreateSubconOpname: (data: Omit<SubcontractorOpname, 'id' | 'created_at'>) => Promise<SubcontractorOpname>;
  handleCreateInvoice: (data: Omit<ClientInvoice, 'id' | 'created_at'>) => Promise<ClientInvoice>;
  handleMarkInvoicePaid: (id: string, ref: string) => Promise<ClientInvoice>;
  handleCreateCashTransaction: (data: Omit<ProjectCashTransaction, 'id'>) => Promise<ProjectCashTransaction>;
  handleCreateKasbon: (data: Omit<KasbonReimbursement, 'id' | 'created_at'>) => Promise<KasbonReimbursement>;
  handleUpdatePunchListStatus: (id: string, status: PunchListItem['status']) => Promise<PunchListItem>;
  handleProcessApproval: (id: string, status: 'approved' | 'rejected', notes?: string) => Promise<ApprovalItem>;

  // Project Actions
  handleCreateProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<Project>;
  handleUpdateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  handleDeleteProject: (id: string) => Promise<void>;
  handleAddAddendum: (projectId: string, addendum: ProjectAddendumInput) => Promise<ProjectAddendum>;
  handleApproveAddendum: (projectId: string, addendumId: string) => Promise<ProjectAddendum>;

  // Member Actions
  handleInviteMember: (data: MemberInvitationInput) => Promise<MemberInvitationSendResult>;
  handleUpdateRole: (memberId: string, role: InvitableMemberRole) => Promise<void>;
  handleToggleMember: (memberId: string, isActive: boolean) => Promise<void>;

  // Notification Actions
  handleMarkRead: (id: string) => Promise<void>;
  handleMarkAllRead: () => Promise<void>;

  // System
  reloadAllData: () => Promise<void>;
  handleResetDemo: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('indotek_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('indotek_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('indotek_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Supabase live status
  const [isSupabaseLive, setIsSupabaseLive] = useState<boolean>(() => isSupabaseConfigured());
  const refreshConnectionStatus = () => {
    setIsSupabaseLive(isSupabaseConfigured());
  };


  // Organizations & current org
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsError, setOrganizationsError] = useState('');
  const [organizationsReloadToken, setOrganizationsReloadToken] = useState(0);
  const [currentOrgId, setCurrentOrgIdState] = useState<string>(() => localStorage.getItem('indotek_current_org_id') ?? '');

  useEffect(() => {
    if (currentOrgId) localStorage.setItem('indotek_current_org_id', currentOrgId);
    else localStorage.removeItem('indotek_current_org_id');
  }, [currentOrgId]);

  // Active Role (Defaults to Owner for full exploration, with switcher in header)
  const [demoRole, setDemoRole] = useState<UserRole>('owner');

  // Filter
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // Navigation
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    const shortcutTabs: NavigationTab[] = ['projects', 'field_reports', 'approvals'];
    return shortcutTabs.find((tab) => tab === requestedTab) ?? 'dashboard';
  });
  const [activeProjectDetailId, setActiveProjectDetailId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Entities
  const [projects, setProjects] = useState<Project[]>([]);
  const dataLoadRequestId = useRef(0);
  const [organizationDataError, setOrganizationDataError] = useState('');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState('');
  const membersRequestId = useRef(0);
  const [pendingInvitations, setPendingInvitations] = useState<PendingOrganizationInvitation[]>([]);
  const [pendingInvitationsLoading, setPendingInvitationsLoading] = useState(false);
  const [pendingInvitationsError, setPendingInvitationsError] = useState('');
  const pendingInvitationsRequestId = useRef(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationsRealtimeStatus, setNotificationsRealtimeStatus] = useState<NotificationRealtimeStatus>('disabled');
  const [notificationsRealtimeError, setNotificationsRealtimeError] = useState('');
  const [notificationEventCount, setNotificationEventCount] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const notificationRequestId = useRef(0);
  const notificationRealtimeRevision = useRef(0);
  const removedNotificationIds = useRef(new Set<string>());
  const notificationScope = useRef('');

  // Fase 2 states
  const [resources, setResources] = useState<any[]>([]);
  const [ahspTemplates, setAhspTemplates] = useState<any[]>([]);
  const [activeBoq, setActiveBoq] = useState<any>(null);
  const [boqItems, setBoqItems] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [scurvePoints, setScurvePoints] = useState<any[]>([]);

  // Module states
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceiptNote[]>([]);
  const [materialStocks, setMaterialStocks] = useState<MaterialStockItem[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [subconContracts, setSubconContracts] = useState<SubcontractorContract[]>([]);
  const [subconOpnames, setSubconOpnames] = useState<SubcontractorOpname[]>([]);
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);
  const [cashTransactions, setCashTransactions] = useState<ProjectCashTransaction[]>([]);
  const [kasbonList, setKasbonList] = useState<KasbonReimbursement[]>([]);
  const [fieldWorkers, setFieldWorkers] = useState<FieldWorker[]>([]);
  const [dailyAttendances, setDailyAttendances] = useState<DailyAttendance[]>([]);
  const [equipmentAssets, setEquipmentAssets] = useState<EquipmentAsset[]>([]);
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncident[]>([]);
  const [toolboxMeetings, setToolboxMeetings] = useState<ToolboxMeeting[]>([]);
  const [punchList, setPunchList] = useState<PunchListItem[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [permissionOverrides, setPermissionOverrides] = useState<PermissionOverrides>({});
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsError, setPermissionsError] = useState('');
  const [permissionReloadToken, setPermissionReloadToken] = useState(0);
  const permissionRequestId = useRef(0);

  const clearOrganizationData = () => {
    setProjects([]);
    setMembers([]);
    setMembersLoading(false);
    setMembersError('');
    setAuditLogs([]);
    setNotifications([]);
    setNotificationsLoading(false);
    setNotificationsError('');
    setResources([]);
    setAhspTemplates([]);
    setActiveBoq(null);
    setBoqItems([]);
    setDailyReports([]);
    setScurvePoints([]);
    setVendors([]);
    setPurchaseOrders([]);
    setPurchaseRequests([]);
    setGoodsReceipts([]);
    setMaterialStocks([]);
    setStockMovements([]);
    setSubcontractors([]);
    setSubconContracts([]);
    setSubconOpnames([]);
    setClientInvoices([]);
    setCashTransactions([]);
    setKasbonList([]);
    setFieldWorkers([]);
    setDailyAttendances([]);
    setEquipmentAssets([]);
    setSafetyIncidents([]);
    setToolboxMeetings([]);
    setPunchList([]);
    setDocuments([]);
    setApprovals([]);
  };

  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthModeState] = useState<AuthMode>(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('auth') !== 'reset') return 'sign_in';
    return sessionStorage.getItem(AUTH_RECOVERY_STORAGE_KEY) === 'true'
      ? 'update_password'
      : 'forgot_password';
  });

  const setAuthMode = (mode: AuthMode) => {
    setAuthModeState(mode);
    setAuthError('');
    setAuthNotice('');
  };

  const clearAuthFeedback = () => {
    setAuthError('');
    setAuthNotice('');
  };

  const authErrorMessage = (error: unknown) => {
    if (!(error instanceof Error)) return messages.authFailure;
    const message = error.message.toLowerCase();
    if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
      return messages.invalidCredentials;
    }
    if (message.includes('email not confirmed')) {
      return messages.emailNotConfirmed;
    }
    if (message.includes('password should be at least')) {
      return messages.passwordTooShort;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return messages.connectionFailure;
    }
    return error.message;
  };

  useEffect(() => {
    const supabase = isSupabaseConfigured() ? getSupabase() : null;
    if (!supabase) {
      setAuthSession(null);
      setAuthLoading(false);
      return;
    }
    setAuthLoading(true);
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(authErrorMessage(error));
      setAuthSession(data.session);
      setAuthLoading(false);
    }).catch((error: unknown) => {
      if (!mounted) return;
      setAuthError(authErrorMessage(error));
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthSession(session);
      setAuthError('');
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem(AUTH_RECOVERY_STORAGE_KEY, 'true');
        setAuthModeState('update_password');
        setAuthNotice('');
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(AUTH_RECOVERY_STORAGE_KEY);
        setAuthModeState('sign_in');
        setAuthNotice('');
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [isSupabaseLive]);

  const submitAuth = async (email: string, password: string) => {
    const supabase = getSupabase();
    setAuthError('');
    setAuthNotice('');
    if (!supabase) {
      setAuthError(messages.supabaseMissing);
      return;
    }
    if (authMode !== 'sign_in' && authMode !== 'sign_up') {
      setAuthError(messages.invalidFlow);
      return;
    }
    setAuthBusy(true);
    try {
      const result = authMode === 'sign_up'
        ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (authMode === 'sign_up' && !result.data.session) {
        setAuthModeState('sign_in');
        setAuthNotice(messages.signupSuccess);
      } else if (authMode === 'sign_in' && !result.data.session) {
        setAuthError(messages.noSession);
      }
    } catch (error: unknown) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    const supabase = getSupabase();
    setAuthError('');
    setAuthNotice('');
    if (!supabase) {
      setAuthError(messages.supabaseMissing);
      return;
    }
    setAuthBusy(true);
    try {
      const redirectTo = new URL(window.location.origin);
      redirectTo.searchParams.set('auth', 'reset');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo.toString(),
      });
      if (error) throw error;
      setAuthNotice(messages.resetNotice);
      setAuthModeState('sign_in');
    } catch (error: unknown) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const updatePassword = async (password: string) => {
    const supabase = getSupabase();
    setAuthError('');
    setAuthNotice('');
    if (!supabase) {
      setAuthError(messages.supabaseMissing);
      return;
    }
    if (!authSession || sessionStorage.getItem(AUTH_RECOVERY_STORAGE_KEY) !== 'true') {
      setAuthError(messages.recoverySessionMissing);
      return;
    }
    setAuthBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      sessionStorage.removeItem(AUTH_RECOVERY_STORAGE_KEY);
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      window.history.replaceState(window.history.state, '', url);
      setAuthModeState('sign_in');
      setAuthNotice(messages.passwordUpdated);
    } catch (error: unknown) {
      setAuthError(authErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setAuthError(messages.supabaseMissing);
      return;
    }
    setAuthError('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      sessionStorage.removeItem(AUTH_RECOVERY_STORAGE_KEY);
    } catch (error: unknown) {
      setAuthError(authErrorMessage(error));
    }
  };

  // Load organizations on start
  useEffect(() => {
    let active = true;
    async function init() {
      if (isSupabaseLive && authLoading) return;
      dataLoadRequestId.current += 1;
      clearOrganizationData();
      setSelectedProjectId('all');
      setActiveProjectDetailId(null);
      setOrganizations([]);
      setIsLoading(true);
      setOrganizationsLoading(true);
      setOrganizationsError('');
      if (isSupabaseLive && (!authSession || !authSession.user)) {
        setCurrentOrgIdState('');
        setOrganizationsLoading(false);
        setIsLoading(false);
        return;
      }
      try {
        const orgs = await fetchOrganizations();
        if (!active) return;
        setOrganizations(orgs);
        setCurrentOrgIdState((previousId) =>
          orgs.some((organization) => organization.id === previousId)
            ? previousId
            : orgs[0]?.id ?? '',
        );
      } catch (error: unknown) {
        if (!active) return;
        setOrganizations([]);
        setOrganizationsError(error instanceof Error ? error.message : 'Gagal memuat organisasi. Coba lagi.');
      } finally {
        if (active) {
          setOrganizationsLoading(false);
          setIsLoading(false);
        }
      }
    }
    void init();
    return () => { active = false; };
  }, [isSupabaseLive, authLoading, authSession?.user.id, organizationsReloadToken]);

  const currentOrg = useMemo(() => {
    return organizations.find((o) => o.id === currentOrgId) || organizations[0] || null;
  }, [organizations, currentOrgId]);
  const currentMemberRole = isSupabaseLive
    ? members.find((member) =>
      member.organization_id === currentOrg?.id
      && member.user_id === authSession?.user.id
      && member.is_active,
    )?.role ?? null
    : demoRole;
  const currentRole = currentMemberRole ?? (isSupabaseLive ? 'client_viewer' : demoRole);

  useEffect(() => {
    const requestId = ++permissionRequestId.current;
    setPermissionOverrides({});
    setPermissionsError('');

    if (!isSupabaseLive) {
      setPermissionsLoading(false);
      return () => {
        permissionRequestId.current += 1;
      };
    }

    if (!currentOrg || !currentMemberRole) {
      setPermissionsLoading(Boolean(currentOrg && membersLoading));
      return () => {
        permissionRequestId.current += 1;
      };
    }

    setPermissionsLoading(true);
    void fetchRolePermissionOverrides(currentOrg.id, currentMemberRole)
      .then((overrides) => {
        if (requestId === permissionRequestId.current) setPermissionOverrides(overrides);
      })
      .catch((error: unknown) => {
        if (requestId !== permissionRequestId.current) return;
        setPermissionsError(
          error instanceof Error ? error.message : 'Pengaturan izin gagal dimuat.',
        );
      })
      .finally(() => {
        if (requestId === permissionRequestId.current) setPermissionsLoading(false);
      });

    return () => {
      permissionRequestId.current += 1;
    };
  }, [currentOrg?.id, currentMemberRole, isSupabaseLive, membersLoading, permissionReloadToken]);

  const reloadPermissions = () => setPermissionReloadToken((token) => token + 1);

  const can = (module: AppModule, action: AppAction): boolean => {
    if (isSupabaseLive && (!currentMemberRole || permissionsLoading || permissionsError)) {
      return false;
    }
    return permissionOverrides[module]?.[action]
      ?? hasPermission(currentRole, module, action);
  };

  const reloadMembers = async () => {
    const requestId = ++membersRequestId.current;
    if (!currentOrg) {
      setMembers([]);
      setMembersError('');
      setMembersLoading(false);
      return;
    }
    setMembersLoading(true);
    setMembersError('');
    try {
      const results = await fetchMembers(currentOrg.id);
      if (requestId === membersRequestId.current) setMembers(results);
    } catch (error: unknown) {
      if (requestId === membersRequestId.current) {
        setMembersError(error instanceof Error ? error.message : memberMessages.memberLoadError);
      }
    } finally {
      if (requestId === membersRequestId.current) setMembersLoading(false);
    }
  };

  const reloadPendingInvitations = async () => {
    const requestId = ++pendingInvitationsRequestId.current;
    if (!isSupabaseLive || !authSession) {
      setPendingInvitations([]);
      setPendingInvitationsError('');
      setPendingInvitationsLoading(false);
      return;
    }
    setPendingInvitationsLoading(true);
    setPendingInvitationsError('');
    try {
      const results = await fetchPendingOrganizationInvitations();
      if (requestId === pendingInvitationsRequestId.current) setPendingInvitations(results);
    } catch (error: unknown) {
      if (requestId === pendingInvitationsRequestId.current) {
        setPendingInvitationsError(error instanceof Error ? error.message : memberMessages.invitationLoadError);
      }
    } finally {
      if (requestId === pendingInvitationsRequestId.current) setPendingInvitationsLoading(false);
    }
  };

  useEffect(() => {
    setMembers([]);
    void reloadMembers();
    return () => {
      membersRequestId.current += 1;
    };
  }, [currentOrg?.id]);

  useEffect(() => {
    void reloadPendingInvitations();
    return () => {
      pendingInvitationsRequestId.current += 1;
    };
  }, [isSupabaseLive, authSession?.user.id]);

  // Load org data when currentOrg changes
  const reloadAllData = async () => {
    const requestId = ++dataLoadRequestId.current;
    if (!currentOrg) {
      clearOrganizationData();
      setOrganizationDataError('');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setOrganizationDataError('');
    try {
      const [
        projData,
        logData,
        resData,
        ahspData,
        vnds,
        pos,
        prs,
        grns,
        stks,
        mvms,
        subcons,
        scContracts,
        scOpnames,
        invs,
        ctxs,
        ksb,
        wrks,
        att,
        eqs,
        incs,
        tbm,
        pnch,
        docs,
        apps,
      ] = await Promise.all([
        fetchProjects(currentOrg.id),
        fetchAuditLogs(currentOrg.id),
        fetchAHSPResources(currentOrg.id),
        fetchAHSPTemplates(currentOrg.id),
        fetchVendors(currentOrg.id),
        fetchPurchaseOrders(currentOrg.id, selectedProjectId),
        fetchPurchaseRequests(currentOrg.id, selectedProjectId),
        fetchGoodsReceipts(currentOrg.id, selectedProjectId),
        fetchMaterialStocks(currentOrg.id, selectedProjectId),
        fetchStockMovements(currentOrg.id, selectedProjectId),
        fetchSubcontractors(currentOrg.id),
        fetchSubconContracts(currentOrg.id, selectedProjectId),
        fetchSubconOpnames(currentOrg.id, selectedProjectId),
        fetchClientInvoices(currentOrg.id, selectedProjectId),
        fetchCashTransactions(currentOrg.id, selectedProjectId),
        fetchKasbonList(currentOrg.id, selectedProjectId),
        fetchFieldWorkers(currentOrg.id, selectedProjectId),
        fetchDailyAttendance(currentOrg.id, '2026-10-16', selectedProjectId),
        fetchEquipmentAssets(currentOrg.id),
        fetchSafetyIncidents(currentOrg.id, selectedProjectId),
        fetchToolboxMeetings(currentOrg.id, selectedProjectId),
        fetchPunchList(currentOrg.id, selectedProjectId),
        fetchDocuments(currentOrg.id, selectedProjectId),
        fetchApprovals(currentOrg.id),
      ]);

      let boqData: Awaited<ReturnType<typeof fetchProjectBOQ>> = null;
      let boqItemData: Awaited<ReturnType<typeof fetchBOQItems>> = [];
      let reportData: Awaited<ReturnType<typeof fetchDailyReports>> = [];
      let scurveData: Awaited<ReturnType<typeof fetchSCurveData>> = [];
      const targetProjId = selectedProjectId !== 'all'
        ? selectedProjectId
        : projData[0]?.id;
      if (targetProjId) {
        [boqData, reportData, scurveData] = await Promise.all([
          fetchProjectBOQ(targetProjId),
          fetchDailyReports(targetProjId),
          fetchSCurveData(targetProjId),
        ]);
        if (boqData) boqItemData = await fetchBOQItems(boqData.id);
      }
      if (requestId !== dataLoadRequestId.current) return;

      setProjects(projData);
      setAuditLogs(logData);
      setResources(resData);
      setAhspTemplates(ahspData);
      setVendors(vnds);
      setPurchaseOrders(pos);
      setPurchaseRequests(prs);
      setGoodsReceipts(grns);
      setMaterialStocks(stks);
      setStockMovements(mvms);
      setSubcontractors(subcons);
      setSubconContracts(scContracts);
      setSubconOpnames(scOpnames);
      setClientInvoices(invs);
      setCashTransactions(ctxs);
      setKasbonList(ksb);
      setFieldWorkers(wrks);
      setDailyAttendances(att);
      setEquipmentAssets(eqs);
      setSafetyIncidents(incs);
      setToolboxMeetings(tbm);
      setPunchList(pnch);
      setDocuments(docs);
      setApprovals(apps);
      setActiveBoq(boqData);
      setBoqItems(boqItemData);
      setDailyReports(reportData);
      setScurvePoints(scurveData);
    } catch (error: unknown) {
      if (requestId !== dataLoadRequestId.current) return;
      clearOrganizationData();
      setOrganizationDataError(
        error instanceof Error ? error.message : organizationMessages.organizationDataLoadError,
      );
    } finally {
      if (requestId === dataLoadRequestId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentOrg) {
      reloadAllData();
    }
  }, [currentOrg?.id, selectedProjectId]);

  const reloadNotifications = useCallback(async () => {
    const organizationId = currentOrg?.id;
    const userId = isSupabaseLive ? authSession?.user.id : undefined;
    const requestId = ++notificationRequestId.current;
    if (!organizationId) {
      setNotifications([]);
      setNotificationsError('');
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError('');
    const revisionAtStart = notificationRealtimeRevision.current;
    try {
      const result = await fetchNotifications(organizationId);
      if (requestId !== notificationRequestId.current) return;
      setNotifications((previous) => {
        const merged = new Map(result.map((notification) => [notification.id, notification]));
        if (notificationRealtimeRevision.current !== revisionAtStart) {
          for (const notification of previous) {
            if (
              notification.organization_id === organizationId
              && (!userId || notification.user_id === userId)
            ) {
              merged.set(notification.id, notification);
            }
          }
        }
        for (const id of removedNotificationIds.current) merged.delete(id);
        return [...merged.values()]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 50);
      });
    } catch (error: unknown) {
      if (requestId === notificationRequestId.current) {
        setNotificationsError(error instanceof Error ? error.message : getMessages().notifications.loadError);
      }
    } finally {
      if (requestId === notificationRequestId.current) setNotificationsLoading(false);
    }
  }, [authSession?.user.id, currentOrg?.id, isSupabaseLive]);

  useEffect(() => {
    const scope = `${currentOrg?.id ?? ''}:${authSession?.user.id ?? ''}`;
    if (scope !== notificationScope.current) {
      notificationScope.current = scope;
      notificationRealtimeRevision.current = 0;
      removedNotificationIds.current.clear();
      setNotifications([]);
    }
    void reloadNotifications();
  }, [authSession?.user.id, currentOrg?.id, reloadNotifications]);

  useEffect(() => {
    const userId = authSession?.user.id;
    const organizationId = currentOrg?.id;
    if (!isSupabaseLive || !userId || !organizationId) {
      setNotificationsRealtimeStatus('disabled');
      setNotificationsRealtimeError('');
      return;
    }

    let hasConnected = false;
    let disconnectedAfterConnection = false;
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToNotifications(
        organizationId,
        userId,
        (event) => {
          notificationRealtimeRevision.current += 1;
          if (event.type === 'DELETE') {
            removedNotificationIds.current.add(event.id);
            setNotifications((previous) => applyNotificationRealtimeEvent(previous, event));
            return;
          }

          removedNotificationIds.current.delete(event.notification.id);
          setNotifications((previous) => applyNotificationRealtimeEvent(previous, event));
          if (event.type === 'INSERT') setNotificationEventCount((count) => count + 1);
        },
        (status, error) => {
          setNotificationsRealtimeStatus(status);
          if (status === 'connected') {
            setNotificationsRealtimeError('');
            if (hasConnected && disconnectedAfterConnection) void reloadNotifications();
            hasConnected = true;
            disconnectedAfterConnection = false;
          } else if (status === 'error' || status === 'closed') {
            if (hasConnected) disconnectedAfterConnection = true;
            if (status === 'error') {
              setNotificationsRealtimeError(error || getMessages().notifications.realtimeError);
            }
          }
        },
      );
    } catch (error: unknown) {
      setNotificationsRealtimeStatus('error');
      setNotificationsRealtimeError(
        error instanceof Error ? error.message : getMessages().notifications.realtimeError,
      );
    }
    return () => unsubscribe?.();
  }, [authSession?.user.id, currentOrg?.id, isSupabaseLive, reloadNotifications]);

  // Module Handlers
  const handleCreateVendor = async (data: Omit<Vendor, 'id' | 'created_at'>) => {
    const created = await createVendor(data);
    setVendors((prev) => [created, ...prev]);
    return created;
  };

  const handleCreatePO = async (data: Omit<PurchaseOrder, 'id' | 'created_at'>) => {
    const created = await createPurchaseOrder(data);
    setPurchaseOrders((prev) => [created, ...prev]);
    await reloadAllData();
    return created;
  };

  const handleUpdatePOStatus = async (
    id: string,
    status: PurchaseOrder['status'],
    approverName?: string,
    notes?: string
  ) => {
    const updated = await updatePOStatus(id, status, approverName, notes);
    setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? updated : p)));
    await reloadAllData();
    return updated;
  };

  const handleCreateGRN = async (data: Omit<GoodsReceiptNote, 'id' | 'created_at'>) => {
    const created = await createGoodsReceipt(data);
    setGoodsReceipts((prev) => [created, ...prev]);
    return created;
  };

  const handleAddStockMovement = async (data: Omit<StockMovement, 'id'>) => {
    const created = await addStockMovement(data);
    setStockMovements((prev) => [created, ...prev]);
    await reloadAllData();
    return created;
  };

  const handleCreateSubconOpname = async (data: Omit<SubcontractorOpname, 'id' | 'created_at'>) => {
    const created = await createSubconOpname(data);
    setSubconOpnames((prev) => [created, ...prev]);
    return created;
  };

  const handleCreateInvoice = async (data: Omit<ClientInvoice, 'id' | 'created_at'>) => {
    const created = await createClientInvoice(data);
    setClientInvoices((prev) => [created, ...prev]);
    return created;
  };

  const handleMarkInvoicePaid = async (id: string, ref: string) => {
    const updated = await markInvoicePaid(id, ref);
    setClientInvoices((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  };

  const handleCreateCashTransaction = async (data: Omit<ProjectCashTransaction, 'id'>) => {
    const created = await createCashTransaction(data);
    setCashTransactions((prev) => [created, ...prev]);
    return created;
  };

  const handleCreateKasbon = async (data: Omit<KasbonReimbursement, 'id' | 'created_at'>) => {
    const created = await createKasbon(data);
    setKasbonList((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdatePunchListStatus = async (id: string, status: PunchListItem['status']) => {
    const updated = await updatePunchListStatus(id, status);
    setPunchList((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const handleProcessApproval = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    const updated = await processApproval(id, status, notes);
    setApprovals((prev) => prev.map((a) => (a.id === id ? updated : a)));
    await reloadAllData();
    return updated;
  };

  // Fase 2 Handlers
  const handleAddBOQItem = async (item: any) => {
    const created = await addBOQItem(item);
    setBoqItems((prev) => [...prev, created]);
    return created;
  };

  const handleUpdateBOQProgress = async (itemId: string, vol: number, pct: number) => {
    const updated = await updateBOQItemProgress(itemId, vol, pct);
    setBoqItems((prev) => prev.map((bi) => (bi.id === itemId ? updated : bi)));
    return updated;
  };

  const handleCreateDailyReport = async (reportData: any) => {
    const created = await createDailyReport(reportData);
    setDailyReports((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateSCurve = async (weekId: string, actualWeekly: number, actualCumulative: number) => {
    const updated = await updateSCurveWeekActual(weekId, actualWeekly, actualCumulative);
    setScurvePoints((prev) => prev.map((s) => (s.id === weekId ? updated : s)));
    return updated;
  };

  const setCurrentOrgId = (id: string) => {
    if (!organizations.some((organization) => organization.id === id)) return;
    if (currentOrgId === id) return;
    dataLoadRequestId.current += 1;
    clearOrganizationData();
    setOrganizationDataError('');
    setIsLoading(true);
    setCurrentOrgIdState(id);
    setSelectedProjectId('all');
    setActiveProjectDetailId(null);
  };

  const setCurrentRole = (role: UserRole) => {
    if (!isSupabaseLive) setDemoRole(role);
  };

  const reloadOrganizations = () => {
    setOrganizationsReloadToken((previous) => previous + 1);
  };

  const completeOrganization = (organization: Organization) => {
    dataLoadRequestId.current += 1;
    clearOrganizationData();
    setOrganizationDataError('');
    setIsLoading(true);
    setOrganizations((previous) => [
      ...previous.filter((item) => item.id !== organization.id),
      organization,
    ]);
    setOrganizationsError('');
    setCurrentOrgIdState(organization.id);
    setSelectedProjectId('all');
    setActiveProjectDetailId(null);
  };

  const updateCurrentOrganization = (organization: Organization) => {
    setOrganizations((previous) => previous.map((item) => (
      item.id === organization.id ? organization : item
    )));
  };

  const openProjectDetail = (projectId: string) => {
    setActiveProjectDetailId(projectId);
    setActiveTab('projects');
  };

  const closeProjectDetail = () => {
    setActiveProjectDetailId(null);
  };

  // Keyboard shortcut for Command Palette (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Project handlers
  const handleCreateProject = async (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => {
    const created = await createProject(data);
    setProjects((prev) => [created, ...prev]);
    return created;
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    if (!currentOrg) throw new Error('Organisasi aktif tidak ditemukan.');
    const updated = await updateProject(id, currentOrg.id, updates);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  };

  const handleDeleteProject = async (id: string) => {
    if (!currentOrg) return;
    await deleteProject(id, currentOrg.id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectDetailId === id) {
      setActiveProjectDetailId(null);
    }
  };

  const handleAddAddendum = async (projectId: string, addendumData: ProjectAddendumInput) => {
    if (!currentOrg) throw new Error('Organisasi aktif tidak ditemukan.');
    const created = await addProjectAddendum(projectId, currentOrg.id, addendumData);
    setProjects((previous) => previous.map((project) => (
      project.id === projectId
        ? { ...project, addendums: [...(project.addendums ?? []), created] }
        : project
    )));
    return created;
  };

  const handleApproveAddendum = async (projectId: string, addendumId: string) => {
    if (!currentOrg) throw new Error('Organisasi aktif tidak ditemukan.');
    const approved = await approveProjectAddendum(projectId, currentOrg.id, addendumId);
    setProjects((previous) => previous.map((project) => (
      project.id === projectId
        ? {
          ...project,
          addendums: (project.addendums ?? []).map((addendum) => (
            addendum.id === addendumId ? approved : addendum
          )),
        }
        : project
    )));
    return approved;
  };

  // Member handlers
  const handleInviteMember = async (data: MemberInvitationInput) => {
    const result = await sendMemberInvitation(data);
    if (result.delivery === 'demo') await reloadMembers();
    await reloadPendingInvitations();
    return result;
  };

  const handleUpdateRole = async (memberId: string, role: InvitableMemberRole) => {
    await updateOrganizationMemberRole(memberId, role);
    await reloadMembers();
  };

  const handleToggleMember = async (memberId: string, isActive: boolean) => {
    await setOrganizationMemberStatus(memberId, isActive);
    await reloadMembers();
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    await acceptOrganizationInvitation(invitationId);
    setPendingInvitations((previous) => previous.filter((invitation) => invitation.id !== invitationId));
    reloadOrganizations();
  };

  const handleMarkRead = async (id: string) => {
    if (!currentOrg) throw new Error(getMessages().notifications.organizationRequired);
    await markNotificationAsRead(id, currentOrg.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    if (!currentOrg) throw new Error(getMessages().notifications.organizationRequired);
    await markAllNotificationsAsRead(currentOrg.id);
    setNotifications((previous) => previous.map((notification) => ({ ...notification, is_read: true })));
  };

  const handleResetDemo = () => {
    resetDemoData();
    window.location.reload();
  };

  const unreadNotifsCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AppContext.Provider
      value={{
        isDark,
        toggleTheme,
        isSupabaseLive,
        authLoading,
        authSession,
        authError,
        authNotice,
        authBusy,
        authMode,
        setAuthMode,
        clearAuthFeedback,
        submitAuth,
        requestPasswordReset,
        updatePassword,
        signOut,
        refreshConnectionStatus,
        currentOrg,
        organizations,
        organizationsLoading,
        organizationsError,
        organizationDataError,
        currentMemberRole,
        permissionOverrides,
        permissionsLoading,
        permissionsError,
        reloadPermissions,
        reloadOrganizations,
        setCurrentOrgId,
        completeOrganization,
        updateCurrentOrganization,
        currentRole,
        setCurrentRole,
        can,
        selectedProjectId,
        setSelectedProjectId,
        activeTab,
        setActiveTab,
        activeProjectDetailId,
        openProjectDetail,
        closeProjectDetail,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        projects,
        members,
        membersLoading,
        membersError,
        reloadMembers,
        pendingInvitations,
        pendingInvitationsLoading,
        pendingInvitationsError,
        reloadPendingInvitations,
        handleAcceptInvitation,
        auditLogs,
        notifications,
        unreadNotifsCount,
        notificationsLoading,
        notificationsError,
        notificationsRealtimeStatus,
        notificationsRealtimeError,
        notificationEventCount,
        reloadNotifications,
        isLoading,
        resources,
        ahspTemplates,
        activeBoq,
        boqItems,
        dailyReports,
        scurvePoints,
        handleAddBOQItem,
        handleUpdateBOQProgress,
        handleCreateDailyReport,
        handleUpdateSCurve,
        vendors,
        purchaseOrders,
        purchaseRequests,
        goodsReceipts,
        materialStocks,
        stockMovements,
        subcontractors,
        subconContracts,
        subconOpnames,
        clientInvoices,
        cashTransactions,
        kasbonList,
        fieldWorkers,
        dailyAttendances,
        equipmentAssets,
        safetyIncidents,
        toolboxMeetings,
        punchList,
        documents,
        approvals,
        handleCreateVendor,
        handleCreatePO,
        handleUpdatePOStatus,
        handleCreateGRN,
        handleAddStockMovement,
        handleCreateSubconOpname,
        handleCreateInvoice,
        handleMarkInvoicePaid,
        handleCreateCashTransaction,
        handleCreateKasbon,
        handleUpdatePunchListStatus,
        handleProcessApproval,
        handleCreateProject,
        handleUpdateProject,
        handleDeleteProject,
        handleAddAddendum,
        handleApproveAddendum,
        handleInviteMember,
        handleUpdateRole,
        handleToggleMember,
        handleMarkRead,
        handleMarkAllRead,
        reloadAllData,
        handleResetDemo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
