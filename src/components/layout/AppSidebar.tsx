import { useState } from 'react';
import {
  BarChart3,
  Boxes,
  Building2,
  Calculator,
  CheckCircle,
  DollarSign,
  FolderArchive,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Truck,
  Users,
  Users2,
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
import { useIsMobile } from '../../hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const { state } = useSidebar();
  const { currentOrg, projects } = useApp();
  const location = useLocation();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const knownTab = navigationGroups
    .flatMap((group) => group.items)
    .some(({ tab }) => getPathForTab(tab) === normalizedPath);
  const isProjectDetail = /^\/projects\/[^/]+$/.test(normalizedPath);
  const activeTab = knownTab || isProjectDetail
    ? getTabForPathname(normalizedPath)
    : null;

  if (isMobile) return null;

  return (
    <Sidebar
      aria-label={shellMessages.sidebarNavigation}
      className="top-16 bottom-0 h-auto"
      collapsible="icon"
      id="app-sidebar"
      role="navigation"
    >
      <SidebarHeader>
        <div className="flex min-w-0 items-center gap-2 px-2 py-1">
          <Building2 aria-hidden="true" className="size-5 shrink-0" />
          <span className={`truncate text-sm font-semibold ${state === 'collapsed' ? 'sr-only' : ''}`}>
            {currentOrg?.name || 'Indotek Pro'}
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
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
                          tooltip={label}
                        >
                          <Link
                            aria-current={isActive ? 'page' : undefined}
                            to={getPathForTab(tab)}
                          >
                            <Icon aria-hidden="true" />
                            <span className={state === 'collapsed' ? 'sr-only' : undefined}>
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
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

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
    </Sidebar>
  );
}
