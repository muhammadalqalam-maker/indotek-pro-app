import React, { lazy, Suspense, useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopNavbar } from './components/layout/TopNavbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { CommandPalette } from './components/layout/CommandPalette';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { SupabaseConnectionModal } from './components/modals/SupabaseConnectionModal';
import { CreateOrgModal } from './components/modals/CreateOrgModal';
import { OrganizationInvitationInbox } from './features/settings/OrganizationInvitationInbox';
import { authMessages as messages, organizationMessages } from './i18n/id';
import { Project } from './types/database';
import { NAVIGATION_MODULES } from './utils/permissions';
import { useCan } from './hooks/useCan';
import { ShieldAlert } from 'lucide-react';
import { ToastProvider, TooltipProvider } from './components/ui';
import { AppErrorBoundary } from './components/shared/AppErrorBoundary';
import { UnhandledErrorNotifications } from './components/shared/UnhandledErrorNotifications';

const CreateProjectModal = lazy(() => import('./features/projects/CreateProjectModal').then((module) => ({ default: module.CreateProjectModal })));
const DashboardView = lazy(() => import('./features/dashboard/DashboardView').then((module) => ({ default: module.DashboardView })));
const ProjectListView = lazy(() => import('./features/projects/ProjectListView').then((module) => ({ default: module.ProjectListView })));
const ProjectDetailView = lazy(() => import('./features/projects/ProjectDetailView').then((module) => ({ default: module.ProjectDetailView })));
const RabBoqView = lazy(() => import('./features/rab/RabBoqView').then((module) => ({ default: module.RabBoqView })));
const DailyReportsView = lazy(() => import('./features/field/DailyReportsView').then((module) => ({ default: module.DailyReportsView })));
const ProcurementView = lazy(() => import('./features/procurement/ProcurementView').then((module) => ({ default: module.ProcurementView })));
const WarehouseView = lazy(() => import('./features/warehouse/WarehouseView').then((module) => ({ default: module.WarehouseView })));
const SubcontractorsView = lazy(() => import('./features/subcontractors/SubcontractorsView').then((module) => ({ default: module.SubcontractorsView })));
const FinanceView = lazy(() => import('./features/finance/FinanceView').then((module) => ({ default: module.FinanceView })));
const HrManpowerView = lazy(() => import('./features/hr/HrManpowerView').then((module) => ({ default: module.HrManpowerView })));
const EquipmentView = lazy(() => import('./features/equipment/EquipmentView').then((module) => ({ default: module.EquipmentView })));
const SafetyQcView = lazy(() => import('./features/safety/SafetyQcView').then((module) => ({ default: module.SafetyQcView })));
const DocumentsView = lazy(() => import('./features/documents/DocumentsView').then((module) => ({ default: module.DocumentsView })));
const ApprovalsView = lazy(() => import('./features/approvals/ApprovalsView').then((module) => ({ default: module.ApprovalsView })));
const ReportsAnalyticsView = lazy(() => import('./features/reports/ReportsAnalyticsView').then((module) => ({ default: module.ReportsAnalyticsView })));
const SettingsView = lazy(() => import('./features/settings/SettingsView').then((module) => ({ default: module.SettingsView })));
const SetupGuideView = lazy(() => import('./features/guide/SetupGuideView').then((module) => ({ default: module.SetupGuideView })));
const AuthView = lazy(() => import('./features/auth/AuthView').then((module) => ({ default: module.AuthView })));
const OrganizationOnboardingPage = lazy(() => import('./features/organizations/OrganizationOnboardingPage').then((module) => ({ default: module.OrganizationOnboardingPage })));

function ViewLoadingFallback() {
  return (
    <section className="space-y-4" role="status" aria-busy="true" aria-label={organizationMessages.organizationDataLoading}>
      <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </section>
  );
}

function MainApp() {
  const {
    activeTab,
    activeProjectDetailId,
    closeProjectDetail,
    isSupabaseLive,
    authLoading,
    authSession,
    authError,
    authNotice,
    authMode,
    clearAuthFeedback,
    signOut,
    organizations,
    organizationsLoading,
    organizationsError,
    reloadOrganizations,
    pendingInvitations,
    pendingInvitationsLoading,
    pendingInvitationsError,
    isLoading,
    organizationDataError,
    reloadAllData,
    permissionsLoading,
    permissionsError,
    reloadPermissions,
    can,
  } = useApp();
  const canViewActiveTab = useCan(NAVIGATION_MODULES[activeTab], 'view');
  const [continueToOrganizationSetup, setContinueToOrganizationSetup] = useState(false);

  useEffect(() => {
    setContinueToOrganizationSetup(false);
  }, [authSession?.user.id]);

  // Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.matchMedia('(max-width: 1023px)').matches,
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const tabletOrSmaller = window.matchMedia('(max-width: 1023px)');
    const syncSidebarForViewport = (event: MediaQueryListEvent) => {
      setIsSidebarCollapsed(event.matches);
    };
    tabletOrSmaller.addEventListener('change', syncSidebarForViewport);
    return () => tabletOrSmaller.removeEventListener('change', syncSidebarForViewport);
  }, []);

  // Modals
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const handleOpenCreateProject = () => {
    if (!can('projects', 'create')) return;
    setProjectToEdit(null);
    setIsCreateProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    if (!can('projects', 'edit')) return;
    setProjectToEdit(project);
    setIsCreateProjectModalOpen(true);
  };

  if (isSupabaseLive && authLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900" role="status" aria-busy="true" aria-label={messages.checkingSession}>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-3 pt-2">
              <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-11 w-full rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-11 w-full rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-11 w-full rounded-lg bg-blue-200 dark:bg-blue-900" />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (isSupabaseLive && (!authSession || authMode === 'update_password')) {
    return <Suspense fallback={<ViewLoadingFallback />}><AuthView /></Suspense>;
  }

  if (isSupabaseLive && authSession && organizationsLoading) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <section className="w-full max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900" role="status" aria-busy="true" aria-label={organizationMessages.orgLoadingTitle}>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-7 w-56 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-64 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="h-16 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-16 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-24 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-11 rounded bg-blue-200 dark:bg-blue-900" />
          </div>
          <p className="sr-only">{organizationMessages.orgLoadingText}</p>
        </section>
      </main>
    );
  }

  if (isSupabaseLive && authSession && organizationsError) {
    return (
      <main className="min-h-screen grid place-items-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <section className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{organizationMessages.orgLoadErrorTitle}</h1>
          <p role="alert" className="text-sm text-red-600">{organizationsError}</p>
          <button className="min-h-11 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700" type="button" onClick={reloadOrganizations}>
            {organizationMessages.retry}
          </button>
        </section>
      </main>
    );
  }

  if (isSupabaseLive && authSession && organizations.length === 0) {
    if (!continueToOrganizationSetup && (
      pendingInvitationsLoading
      || pendingInvitationsError
      || pendingInvitations.length > 0
    )) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
          <OrganizationInvitationInbox
            standalone
            onContinueWithoutInvitations={() => setContinueToOrganizationSetup(true)}
          />
        </main>
      );
    }
    return <Suspense fallback={<ViewLoadingFallback />}><OrganizationOnboardingPage /></Suspense>;
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col font-sans transition-colors duration-150">
      {/* Top Navbar */}
      <TopNavbar
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenCreateOrgModal={() => setIsCreateOrgModalOpen(true)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      {(authError || authNotice) && (
        <div className="mx-3 mt-3 flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:mx-6 lg:mx-8 dark:border-slate-800 dark:bg-slate-900">
          {authError ? (
            <p role="alert" className="text-red-600">{authError}</p>
          ) : (
            <p role="status" className="text-emerald-700 dark:text-emerald-300">{authNotice}</p>
          )}
          <button className="shrink-0 text-slate-500 hover:text-slate-900 dark:hover:text-white" type="button" onClick={clearAuthFeedback} aria-label={messages.closeMessage}>
            {messages.closeMessage}
          </button>
        </div>
      )}
      <OrganizationInvitationInbox />
      {organizationDataError && (
        <div className="mx-3 mt-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm shadow-sm sm:mx-6 lg:mx-8 dark:border-red-900 dark:bg-slate-900">
          <p role="alert" className="text-red-700 dark:text-red-300">{organizationDataError}</p>
          <button
            className="shrink-0 rounded px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            type="button"
            onClick={() => void reloadAllData()}
          >
            {organizationMessages.retry}
          </button>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />

        {/* Content View Container */}
        <main
          aria-busy={isLoading}
          className={`mx-auto min-w-0 max-w-7xl flex-1 px-3 pt-4 pb-20 transition-all duration-300 ease-in-out sm:px-6 sm:pb-8 md:px-8 ${
            isSidebarCollapsed ? 'sm:ml-18' : 'sm:ml-64'
          }`}
        >
          {isLoading || permissionsLoading ? (
            <section role="status" aria-label={organizationMessages.organizationDataLoading} className="space-y-4">
              <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            </section>
          ) : permissionsError ? (
            <section className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900 dark:bg-slate-900" role="alert">
              <ShieldAlert className="h-8 w-8 text-red-500" aria-hidden="true" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{organizationMessages.permissionDeniedTitle}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{permissionsError}</p>
              <button
                className="min-h-11 rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
                type="button"
                onClick={reloadPermissions}
              >
                {organizationMessages.retry}
              </button>
            </section>
          ) : !canViewActiveTab ? (
            <section className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900" role="status">
              <ShieldAlert className="h-8 w-8 text-slate-400" aria-hidden="true" />
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{organizationMessages.permissionDeniedTitle}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{organizationMessages.permissionDeniedDescription}</p>
            </section>
          ) : activeTab === 'projects' && activeProjectDetailId ? (
            <Suspense fallback={<ViewLoadingFallback />}>
            <ProjectDetailView
              key={activeProjectDetailId}
              projectId={activeProjectDetailId}
              onEdit={handleEditProject}
              onBack={closeProjectDetail}
            />
            </Suspense>
          ) : activeTab === 'dashboard' ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <DashboardView onOpenCreateProject={handleOpenCreateProject} />
            </Suspense>
          ) : activeTab === 'projects' ? (
            <Suspense fallback={<ViewLoadingFallback />}>
            <ProjectListView
              onOpenCreateProject={handleOpenCreateProject}
              onEditProject={handleEditProject}
            />
            </Suspense>
          ) : activeTab === 'rab' ? (
            <Suspense fallback={<ViewLoadingFallback />}><RabBoqView /></Suspense>
          ) : activeTab === 'field_reports' ? (
            <Suspense fallback={<ViewLoadingFallback />}><DailyReportsView /></Suspense>
          ) : activeTab === 'procurement' ? (
            <Suspense fallback={<ViewLoadingFallback />}><ProcurementView /></Suspense>
          ) : activeTab === 'warehouse' ? (
            <Suspense fallback={<ViewLoadingFallback />}><WarehouseView /></Suspense>
          ) : activeTab === 'subcontractors' ? (
            <Suspense fallback={<ViewLoadingFallback />}><SubcontractorsView /></Suspense>
          ) : activeTab === 'finance' ? (
            <Suspense fallback={<ViewLoadingFallback />}><FinanceView /></Suspense>
          ) : activeTab === 'hr_manpower' ? (
            <Suspense fallback={<ViewLoadingFallback />}><HrManpowerView /></Suspense>
          ) : activeTab === 'equipment' ? (
            <Suspense fallback={<ViewLoadingFallback />}><EquipmentView /></Suspense>
          ) : activeTab === 'safety_qc' ? (
            <Suspense fallback={<ViewLoadingFallback />}><SafetyQcView /></Suspense>
          ) : activeTab === 'documents' ? (
            <Suspense fallback={<ViewLoadingFallback />}><DocumentsView /></Suspense>
          ) : activeTab === 'approvals' ? (
            <Suspense fallback={<ViewLoadingFallback />}><ApprovalsView /></Suspense>
          ) : activeTab === 'reports' ? (
            <Suspense fallback={<ViewLoadingFallback />}><ReportsAnalyticsView /></Suspense>
          ) : activeTab === 'settings' ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <SettingsView onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)} />
            </Suspense>
          ) : activeTab === 'guide' ? (
            <Suspense fallback={<ViewLoadingFallback />}>
              <SetupGuideView onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)} />
            </Suspense>
          ) : (
            <Suspense fallback={<ViewLoadingFallback />}>
              <DashboardView onOpenCreateProject={handleOpenCreateProject} />
            </Suspense>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        onOpenCreateProject={handleOpenCreateProject}
        onToggleMobileDrawer={() => setIsMobileSidebarOpen(true)}
        isMenuOpen={isMobileSidebarOpen}
      />

      {/* Offline Status Pill */}
      <OfflineIndicator />

      {/* Global Command Palette */}
      <CommandPalette />

      {/* Modals */}
      <SupabaseConnectionModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      <CreateOrgModal
        isOpen={isCreateOrgModalOpen}
        onClose={() => setIsCreateOrgModalOpen(false)}
      />

      {isCreateProjectModalOpen && (
        <Suspense fallback={null}>
          <CreateProjectModal
            isOpen={isCreateProjectModalOpen}
            onClose={() => setIsCreateProjectModalOpen(false)}
            projectToEdit={projectToEdit}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <ToastProvider>
          <TooltipProvider>
            <UnhandledErrorNotifications />
            <MainApp />
          </TooltipProvider>
        </ToastProvider>
      </AppProvider>
    </AppErrorBoundary>
  );
}
