import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { UserRole, ROLE_LABELS, ROLE_BADGE_COLORS } from '../../utils/permissions';
import { organizationMessages, shellMessages } from '../../i18n/id';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { NotificationCenter } from '../../features/notifications/components/NotificationCenter';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui';
import { NAVIGATION_ROUTES, getProjectIdForPathname } from '../../routes/navigation';
import {
  Building2,
  ChevronDown,
  Search,
  Moon,
  Sun,
  Plus,
  Check,
  Shield,
  Layers,
  LogOut,
} from 'lucide-react';

export const AppHeader: React.FC<{
  onOpenCreateOrgModal: () => void;
}> = ({ onOpenCreateOrgModal }) => {
  const location = useLocation();
  const {
    currentOrg,
    organizations,
    organizationsLoading,
    setCurrentOrgId,
    selectedProjectId,
    setSelectedProjectId,
    closeProjectDetail,
    projects,
    isLoading,
    currentRole,
    setCurrentRole,
    isDark,
    toggleTheme,
    isSupabaseLive,
    authSession,
    signOut,
    setCommandPaletteOpen,
  } = useApp();

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>('main[aria-busy]');
    const header = headerRef.current;
    if (!scrollContainer || !header) return;

    const updateScrollState = () => {
      const isScrolled = scrollContainer.scrollTop > 10;
      header.dataset.scrolled = String(isScrolled);
      header.classList.toggle('shadow-sm', isScrolled);
    };
    updateScrollState();
    scrollContainer.addEventListener('scroll', updateScrollState, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', updateScrollState);
  }, []);

  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const projectDetailId = getProjectIdForPathname(normalizedPath);
  const activeRoute = NAVIGATION_ROUTES.find(({ path }) => path === normalizedPath);
  const routeLabel = activeRoute
    ? shellMessages.navigationLabels[activeRoute.tab]
    : projectDetailId
      ? projects.find(({ id }) => id === projectDetailId)?.name ?? shellMessages.navigationLabels.projects
      : shellMessages.routeNotFound;

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    closeProjectDetail();
  };

  const roles: UserRole[] = [
    'owner',
    'project_manager',
    'site_manager',
    'estimator',
    'finance',
    'procurement',
    'safety_officer',
    'client_viewer',
  ];

  return (
    <header
      ref={headerRef}
      className="safe-area-topbar sticky top-0 z-30 flex min-h-14 w-full flex-nowrap items-center justify-between gap-2 border-b border-border bg-surface/95 px-2 py-2 backdrop-blur-md transition-shadow sm:flex-wrap sm:px-4 lg:h-16 lg:flex-nowrap lg:px-6 lg:py-0"
      data-scrolled="false"
    >
      {/* Left: Mobile Toggle & Brand & Org Selector */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-black tracking-wider text-sm">
            IP
          </div>
          <div className="block min-w-0 flex-1 truncate text-sm font-semibold sm:hidden">
            {routeLabel}
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                Indotek<span className="text-amber-500">Pro</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground -mt-0.5 font-medium">Manajemen Konstruksi</p>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Organization Switcher */}
        <div className="relative">
          <button
            type="button"
            aria-label={organizationMessages.switchOrganization}
            aria-haspopup="menu"
            aria-expanded={orgDropdownOpen}
            disabled={organizationsLoading}
            onClick={() => {
              setOrgDropdownOpen((prev) => !prev);
              setRoleDropdownOpen(false);
            }}
            className="flex size-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 p-0 text-left transition hover:bg-surface sm:min-h-0 sm:w-auto sm:max-w-[220px] sm:justify-start sm:p-2.5 disabled:cursor-wait disabled:opacity-70"
          >
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <div className="hidden truncate sm:block">
              <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                {currentOrg?.name || shellMessages.selectOrganization}
              </p>
              <p className="hidden text-xs text-muted-foreground leading-tight sm:block">
                Kode: {currentOrg?.company_code} • {currentOrg?.timezone}
              </p>
            </div>
            <ChevronDown className="hidden size-3.5 shrink-0 text-muted-foreground sm:block sm:ml-auto" />
          </button>

          {/* Org Dropdown */}
          {orgDropdownOpen && (
            <div role="menu" aria-label={organizationMessages.organizationList} className="absolute left-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 sm:w-72">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {shellMessages.organizationListTitle}
                </p>
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {organizations.map((org) => {
                  const isCurrent = org.id === currentOrg?.id;
                  return (
                    <button
                      key={org.id}
                      type="button"
                      role="menuitem"
                      aria-current={isCurrent ? 'true' : undefined}
                      onClick={() => {
                        setCurrentOrgId(org.id);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition ${
                        isCurrent ? 'bg-amber-500/10 text-amber-600 font-semibold' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs truncate">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.city || 'Indonesia'} • {org.company_code}
                        </p>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 px-2">
                <button
                  onClick={() => {
                    setOrgDropdownOpen(false);
                    onOpenCreateOrgModal();
                  }}
                  type="button"
                  role="menuitem"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {organizationMessages.addOrganization}
                </button>
              </div>
            </div>
          )}
        </div>

        <Breadcrumb className="hidden min-w-0 flex-1 px-2 md:block">
          <BreadcrumbList className="flex-nowrap overflow-hidden text-xs">
            {projectDetailId ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/projects">{shellMessages.navigationLabels.projects}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ) : activeRoute?.tab !== 'dashboard' && activeRoute ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard">{shellMessages.home}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ) : null}
            <BreadcrumbItem className="min-w-0 truncate">
              <BreadcrumbPage className="truncate">{routeLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Global Project Context Selector */}
        <div className="hidden items-center gap-1.5 lg:flex">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            disabled={isLoading || projects.length === 0}
            aria-label={shellMessages.projectContext}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[190px]"
          >
            <option value="all">{shellMessages.allProjects(projects.length)}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {/* Command Palette Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-2 text-muted-foreground transition hover:text-text md:min-w-0 md:px-3 md:py-1.5"
          title={shellMessages.commandPalette}
          aria-label={shellMessages.commandPalette}
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden text-xs md:inline">{shellMessages.commandPalettePlaceholder}</span>
          <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
            Ctrl/⌘ K
          </kbd>
        </button>

        {/* Role simulation is only available when no authenticated backend is active. */}
        {!isSupabaseLive && <div className="relative">
          <button
            onClick={() => {
              setRoleDropdownOpen((prev) => !prev);
              setOrgDropdownOpen(false);
            }}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
              ROLE_BADGE_COLORS[currentRole] || 'border-slate-200'
            }`}
            title="Ganti Peran Pengguna untuk Simulasi RBAC"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="font-semibold">{ROLE_LABELS[currentRole].split(' ')[0]}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Simulasi Akses Peran (RBAC)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Uji antarmuka berdasarkan hak akses jabatan
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {roles.map((r) => {
                  const isCurrent = currentRole === r;
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        setCurrentRole(r);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 transition ${
                        isCurrent ? 'bg-amber-500/10 text-amber-600 font-bold' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                        <span>{ROLE_LABELS[r]}</span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-amber-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>}

        {/* PWA Install Button */}
        <PWAInstallButton />

        <NotificationCenter />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition sm:min-h-0 sm:min-w-0"
          aria-label={isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {isSupabaseLive && authSession && (
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Keluar"
            className="hidden min-h-12 min-w-12 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:flex sm:h-auto sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-3 sm:py-2 sm:text-xs sm:font-semibold"
            title={authSession.user.email || 'Keluar'}
          >
            <LogOut className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        )}
        {/* User Avatar */}
        <div className="hidden items-center pl-1 sm:flex">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs ring-2 ring-amber-500/30">
            {(authSession?.user.email?.[0] || 'BS').toUpperCase()}
          </div>
        </div>
      </div>

      <label className="hidden min-h-12 w-full items-center gap-2 text-xs text-muted-foreground sm:flex lg:hidden">
        <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="shrink-0">{shellMessages.projectContext}</span>
        <select
          value={selectedProjectId}
          onChange={(event) => handleProjectChange(event.currentTarget.value)}
          disabled={isLoading || projects.length === 0}
          aria-label={shellMessages.projectContext}
          className="min-h-12 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
        >
          <option value="all">{shellMessages.allProjects(projects.length)}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} - {project.name}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
};
