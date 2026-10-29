import { useEffect, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Building2,
  Calculator,
  CheckCircle,
  ChevronDown,
  DollarSign,
  FolderArchive,
  FolderKanban,
  HardHat,
  Layers,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Truck,
  Users,
  Users2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Can } from '../shared/Can';
import { useApp } from '../../context/AppContext';
import { shellMessages } from '../../i18n/id';
import { getPathForTab, getTabForPathname, type NavigationTab } from '../../routes/navigation';
import { NAVIGATION_MODULES } from '../../utils/permissions';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '../shadcn/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../shadcn/collapsible';

type NavigationItem = {
  tab: NavigationTab;
  label: string;
  icon: LucideIcon;
};

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: 'Operasional Proyek',
    items: [
      { tab: 'dashboard', label: 'Dashboard Eksekutif', icon: LayoutDashboard },
      { tab: 'projects', label: 'Manajemen Proyek', icon: FolderKanban },
      { tab: 'rab', label: 'RAB, BOQ & AHSP', icon: Calculator },
      { tab: 'field_reports', label: 'Laporan Lapangan & Kurva S', icon: HardHat },
      { tab: 'subcontractors', label: 'Subkontraktor & Mandor', icon: Users2 },
      { tab: 'hr_manpower', label: 'SDM & Absensi Pekerja', icon: Users },
      { tab: 'equipment', label: 'Peralatan & Aset Alat Berat', icon: Truck },
      { tab: 'safety_qc', label: 'K3, Mutu & Punch List', icon: ShieldAlert },
    ],
  },
  {
    label: 'Pengadaan & Logistik',
    items: [
      { tab: 'procurement', label: 'Procurement / PO', icon: ShoppingCart },
      { tab: 'warehouse', label: 'Gudang & Stok Material', icon: Boxes },
      { tab: 'documents', label: 'Dokumen & Gambar Kerja', icon: FolderArchive },
    ],
  },
  {
    label: 'Keuangan & Approval',
    items: [
      { tab: 'finance', label: 'Keuangan & Kasbon Proyek', icon: DollarSign },
      { tab: 'approvals', label: 'Pusat Approval Berjenjang', icon: CheckCircle },
      { tab: 'reports', label: 'Laporan & Analitik', icon: BarChart3 },
    ],
  },
  {
    label: 'Administrasi & Konfigurasi',
    items: [
      { tab: 'settings', label: 'Pengaturan & Tim', icon: Settings },
    ],
  },
];

export function getAppSidebarDefaultOpen(): boolean {
  const savedState = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('sidebar_state='));

  if (savedState) return savedState === 'sidebar_state=true';
  return !window.matchMedia('(max-width: 1023px)').matches;
}

export function hasSavedAppSidebarState(): boolean {
  return document.cookie
    .split(';')
    .some((cookie) => cookie.trim().startsWith('sidebar_state='));
}

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const {
    authSession,
    closeProjectDetail,
    currentOrg,
    isSupabaseLive,
    projects,
    selectedProjectId,
    signOut,
    setSelectedProjectId,
  } = useApp();
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const knownTab = navigationGroups
    .flatMap((group) => group.items)
    .some(({ tab }) => getPathForTab(tab) === normalizedPath);
  const isProjectDetail = /^\/projects\/[^/]+$/.test(normalizedPath);
  const activeTab = knownTab || isProjectDetail
    ? getTabForPathname(normalizedPath)
    : null;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const activeGroup = navigationGroups.find((group) => (
      group.items.some(({ tab }) => tab === activeTab)
    ));
    if (activeGroup) {
      setExpandedGroups((previous) => ({ ...previous, [activeGroup.label]: true }));
    }
  }, [activeTab]);

  return (
    <Sidebar
      className="safe-area-sidebar md:top-16 md:bottom-0 md:h-auto"
      collapsible="icon"
      id="app-sidebar"
    >
      <SidebarHeader>
        <div className="flex min-w-0 items-center justify-between gap-2 px-2 py-1">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 aria-hidden="true" className="size-5 shrink-0" />
            <span className={`truncate text-sm font-semibold ${state === 'collapsed' && !isMobile ? 'sr-only' : ''}`}>
              {currentOrg?.name || 'Indotek Pro'}
            </span>
          </div>
          {isMobile && (
            <button
              aria-label={shellMessages.closeMenu}
              className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              onClick={() => setOpenMobile(false)}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {isMobile && (
        <div className="space-y-2 px-4 py-3">
          <label
            className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground"
            htmlFor="mobile-project-context"
          >
            <Layers aria-hidden="true" className="size-4 shrink-0" />
            <span>{shellMessages.projectContext}</span>
          </label>
          <select
            className="min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="mobile-project-context"
            onChange={(event) => {
              setSelectedProjectId(event.currentTarget.value);
              closeProjectDetail();
            }}
            value={selectedProjectId}
          >
            <option value="all">{shellMessages.allProjects(projects.length)}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} - {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <SidebarContent>
        <nav aria-label={shellMessages.sidebarNavigation}>
          {navigationGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <Collapsible
                open={isMobile || state === 'collapsed' ? true : expandedGroups[group.label] ?? true}
                onOpenChange={(open) => {
                  setExpandedGroups((previous) => ({ ...previous, [group.label]: open }));
                }}
              >
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger
                    className="sidebar-group-trigger w-full justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:pointer-events-none"
                    disabled={state === 'collapsed' && !isMobile}
                  >
                    <span>{group.label}</span>
                    <ChevronDown aria-hidden="true" className="sidebar-group-chevron size-4 shrink-0" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent className="sidebar-group-content">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map(({ tab, label, icon: Icon }) => {
                        const isActive = activeTab === tab;
                        return (
                          <Can key={tab} module={NAVIGATION_MODULES[tab]} action="view">
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                size="lg"
                                tooltip={isMobile ? undefined : label}
                              >
                                <Link
                                  aria-current={isActive ? 'page' : undefined}
                                  onClick={() => setOpenMobile(false)}
                                  to={getPathForTab(tab)}
                                >
                                  <Icon aria-hidden="true" />
                                  <span className={state === 'collapsed' && !isMobile ? 'sr-only' : undefined}>
                                    {label}
                                  </span>
                                  {tab === 'projects' && (
                                    <SidebarMenuBadge>{projects.length}</SidebarMenuBadge>
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </Can>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          ))}
        </nav>
      </SidebarContent>

      <SidebarSeparator />

      {!isMobile && (
        <>
          <SidebarFooter>
            <SidebarTrigger
              aria-label="Ciutkan atau lebarkan navigasi"
              className="size-10 self-end"
              title="Ciutkan atau lebarkan navigasi"
            />
          </SidebarFooter>
          <SidebarRail
            aria-label="Ciutkan atau lebarkan navigasi"
            title="Ciutkan atau lebarkan navigasi"
          />
        </>
      )}
      {isMobile && isSupabaseLive && authSession && (
        <SidebarFooter>
          <button
            aria-label="Keluar"
            className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            onClick={() => void signOut()}
            type="button"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Keluar
          </button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
