import React, { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, useLocation, useNavigationType, useParams, useRoutes } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { AuthView } from './features/auth/AuthView';
import { authMessages as messages, organizationMessages } from './i18n/id';
import { Project } from './types/database';
import { NAVIGATION_MODULES } from './utils/permissions';
import type { AppModule } from './utils/permissions';
import { useCan } from './hooks/useCan';
import { ShieldAlert } from 'lucide-react';
import { ToastProvider, TooltipProvider } from './components/ui';
import { AppErrorBoundary } from './components/shared/AppErrorBoundary';
import { RouteStatusPage } from './components/shared/RouteStatusPage';
import { UnhandledErrorNotifications } from './components/shared/UnhandledErrorNotifications';
import {
  AppSidebar,
  getAppSidebarDefaultOpen,
  hasSavedAppSidebarState,
} from './components/layout/AppSidebar';
import { SidebarProvider } from './components/shadcn/sidebar';
import { getPathForTab, NAVIGATION_ROUTES, type NavigationTab } from './routes/navigation';

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
const OrganizationInvitationInbox = lazy(() => import('./features/settings/OrganizationInvitationInbox').then((module) => ({ default: module.OrganizationInvitationInbox })));
const OrganizationOnboardingPage = lazy(() => import('./features/organizations/OrganizationOnboardingPage').then((module) => ({ default: module.OrganizationOnboardingPage })));
const TopNavbar = lazy(() => import('./components/layout/TopNavbar').then((module) => ({ default: module.TopNavbar })));
const Sidebar = lazy(() => import('./components/layout/Sidebar').then((module) => ({ default: module.Sidebar })));
const MobileBottomNav = lazy(() => import('./components/layout/MobileBottomNav').then((module) => ({ default: module.MobileBottomNav })));
const CommandPalette = lazy(() => import('./components/layout/CommandPalette').then((module) => ({ default: module.CommandPalette })));
const OfflineIndicator = lazy(() => import('./components/pwa/OfflineIndicator').then((module) => ({ default: module.OfflineIndicator })));
const CreateOrgModal = lazy(() => import('./components/modals/CreateOrgModal').then((module) => ({ default: module.CreateOrgModal })));
const OfflineSyncBridge = lazy(() => import('./components/pwa/OfflineSyncBridge').then((module) => ({ default: module.OfflineSyncBridge })));

function ProjectDetailRoute({ onEdit, onBack }: {
  onEdit: (project: Project) => void;
  onBack: () => void;
}) {
  const { projectId } = useParams();
  if (!projectId) return <Navigate to="/projects" replace />;
  return (
    <ProjectDetailView
      key={projectId}
      projectId={projectId}
      onEdit={onEdit}
      onBack={onBack}
    />
  );
}

function RoutePermissionGuard({ module, children }: {
  module: AppModule;
  children: React.ReactNode;
}) {
  const canView = useCan(module, 'view');
  return canView ? children : <RouteStatusPage status="forbidden" />;
}

function RootRouteRedirect() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const requestedTab = searchParams.get('tab');
  const route = NAVIGATION_ROUTES.find(({ tab }) => tab === requestedTab);
  searchParams.delete('tab');
  const remainingSearch = searchParams.toString();

  return (
    <Navigate
      replace
      to={{
        pathname: route ? getPathForTab(route.tab) : '/dashboard',
        search: remainingSearch ? `?${remainingSearch}` : '',
      }}
    />
  );
}

function AuthenticatedRouteViews({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes);
}

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

function RouteScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, number>());

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('main[aria-busy]');
    if (!main) return;

    const savePosition = () => positions.current.set(location.key, main.scrollTop);
    main.addEventListener('scroll', savePosition, { passive: true });
    return () => main.removeEventListener('scroll', savePosition);
  }, [location.key]);

  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>('main[aria-busy]');
    if (!main) return;

    main.scrollTop = navigationType === 'POP'
      ? positions.current.get(location.key) ?? 0
      : 0;
  }, [location.key, navigationType]);

  return null;
}

function MainApp() {
  const location = useLocation();
  const {
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
  const [continueToOrganizationSetup, setContinueToOrganizationSetup] = useState(false);

  useEffect(() => {
    setContinueToOrganizationSetup(false);
  }, [authSession?.user.id]);

  // Layout states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.matchMedia('(max-width: 1023px)').matches,
  );
  const [sidebarOpen, setSidebarOpen] = useState(getAppSidebarDefaultOpen);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const tabletOrSmaller = window.matchMedia('(max-width: 1023px)');
    const syncSidebarForViewport = (event: MediaQueryListEvent) => {
      setIsSidebarCollapsed(event.matches);
    };
    tabletOrSmaller.addEventListener('change', syncSidebarForViewport);
    return () => tabletOrSmaller.removeEventListener('change', syncSidebarForViewport);
  }, []);

  useEffect(() => {
    const tabletOrSmaller = window.matchMedia('(max-width: 1023px)');
    const syncNewSidebarForViewport = (event: MediaQueryListEvent) => {
      if (!hasSavedAppSidebarState()) setSidebarOpen(!event.matches);
    };
    tabletOrSmaller.addEventListener('change', syncNewSidebarForViewport);
    return () => tabletOrSmaller.removeEventListener('change', syncNewSidebarForViewport);
  }, []);

  // Modals
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

  const renderNavigationTab = (tab: NavigationTab) => {
    switch (tab) {
      case 'dashboard':
        return <DashboardView onOpenCreateProject={handleOpenCreateProject} />;
      case 'projects':
        return (
          <ProjectListView
            onOpenCreateProject={handleOpenCreateProject}
            onEditProject={handleEditProject}
          />
        );
      case 'rab':
        return <RabBoqView />;
      case 'field_reports':
        return <DailyReportsView />;
      case 'procurement':
        return <ProcurementView />;
      case 'warehouse':
        return <WarehouseView />;
      case 'subcontractors':
        return <SubcontractorsView />;
      case 'finance':
        return <FinanceView />;
      case 'hr_manpower':
        return <HrManpowerView />;
      case 'equipment':
        return <EquipmentView />;
      case 'safety_qc':
        return <SafetyQcView />;
      case 'documents':
        return <DocumentsView />;
      case 'approvals':
        return <ApprovalsView />;
      case 'reports':
        return <ReportsAnalyticsView />;
      case 'settings':
        return <SettingsView />;
    }
  };

  const routes: RouteObject[] = [
    ...NAVIGATION_ROUTES.map(({ path, tab }) => ({
      path,
      element: (
        <Suspense fallback={<ViewLoadingFallback />}>
          <RoutePermissionGuard module={NAVIGATION_MODULES[tab]}>
            {renderNavigationTab(tab)}
          </RoutePermissionGuard>
        </Suspense>
      ),
    })),
    {
      path: '/projects/:projectId',
      element: (
        <Suspense fallback={<ViewLoadingFallback />}>
          <RoutePermissionGuard module="projects">
            <ProjectDetailRoute onEdit={handleEditProject} onBack={closeProjectDetail} />
          </RoutePermissionGuard>
        </Suspense>
      ),
    },
    { path: '*', element: <RouteStatusPage status="not-found" /> },
  ];

  if (import.meta.env.PROD && !isSupabaseLive) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <section className="w-full max-w-md space-y-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{messages.appName}</h1>
          <p role="alert" className="text-sm text-slate-600 dark:text-slate-300">{messages.applicationUnavailableDescription}</p>
        </section>
      </main>
    );
  }

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
          <Suspense fallback={<ViewLoadingFallback />}>
            <OrganizationInvitationInbox
              standalone
              onContinueWithoutInvitations={() => setContinueToOrganizationSetup(true)}
            />
          </Suspense>
        </main>
      );
    }
    return <Suspense fallback={<ViewLoadingFallback />}><OrganizationOnboardingPage /></Suspense>;
  }

  if (location.pathname === '/') return <RootRouteRedirect />;

  return (
    <div className="h-dvh overflow-hidden bg-bg text-text flex flex-col font-sans transition-colors duration-150">
      <RouteScrollRestoration />
      <Suspense fallback={null}>
        <OfflineSyncBridge />
      </Suspense>
      {/* Top Navbar */}
      <Suspense fallback={null}>
        <TopNavbar
          onOpenCreateOrgModal={() => setIsCreateOrgModalOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          isMobileSidebarOpen={isMobileSidebarOpen}
        />
      </Suspense>
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
      <Suspense fallback={null}>
        <OrganizationInvitationInbox />
      </Suspense>
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
      <div className="min-h-0 flex-1 overflow-hidden">
        <SidebarProvider
          className="h-full min-h-0"
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          style={{ '--sidebar-width-icon': '4.5rem' } as React.CSSProperties}
        >
          {/* Sidebar Navigation */}
          <AppSidebar />
          <Suspense fallback={null}>
            <div className="md:hidden">
              <Sidebar
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
                isMobileOpen={isMobileSidebarOpen}
                setIsMobileOpen={setIsMobileSidebarOpen}
              />
            </div>
          </Suspense>

          {/* Content View Container */}
          <main
            aria-busy={isLoading}
            className={`safe-area-main mx-auto min-h-0 min-w-0 max-w-7xl flex-1 overflow-y-auto px-3 pt-4 transition-all duration-300 ease-in-out sm:px-6 md:px-8 ${
              isSidebarCollapsed ? 'sm:ml-18 md:ml-0' : 'sm:ml-64 md:ml-0'
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
            ) : (
              <AuthenticatedRouteViews routes={routes} />
            )}
          </main>
        </SidebarProvider>
      </div>

      {/* Mobile Bottom Navigation */}
      <Suspense fallback={null}>
        <MobileBottomNav
          onOpenCreateProject={handleOpenCreateProject}
          onToggleMobileDrawer={() => setIsMobileSidebarOpen(true)}
          isMenuOpen={isMobileSidebarOpen}
        />
      </Suspense>

      {/* Offline Status Pill */}
      <Suspense fallback={null}>
        <OfflineIndicator />
      </Suspense>

      {/* Global Command Palette */}
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>

      {/* Modals */}
      <Suspense fallback={null}>
        <CreateOrgModal
          isOpen={isCreateOrgModalOpen}
          onClose={() => setIsCreateOrgModalOpen(false)}
        />
      </Suspense>

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
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
