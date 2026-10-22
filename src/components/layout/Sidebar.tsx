import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import { Can } from '../shared/Can';
import { NAVIGATION_MODULES } from '../../utils/permissions';
import { shellMessages } from '../../i18n/id';
import {
  LayoutDashboard,
  FolderKanban,
  Calculator,
  HardHat,
  ShoppingCart,
  Boxes,
  Users2,
  DollarSign,
  ShieldAlert,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Building2,
  X,
  FileCheck2,
  Truck,
  Users,
  FolderArchive,
  BarChart3,
  CheckCircle,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { activeTab, setActiveTab, projects, currentOrg, closeProjectDetail } = useApp();
  const isNavigationCollapsed = isCollapsed && !isMobileOpen;

  const handleNav = (tab: NavigationTab) => {
    setActiveTab(tab);
    closeProjectDetail();
    setIsMobileOpen(false);
  };

  const navGroups = [
    {
      label: 'Operasional Proyek',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard Eksekutif',
          icon: LayoutDashboard,
          active: activeTab === 'dashboard',
          badge: null,
          onClick: () => handleNav('dashboard'),
        },
        {
          id: 'projects',
          label: 'Manajemen Proyek',
          icon: FolderKanban,
          active: activeTab === 'projects',
          badge: `${projects.length}`,
          onClick: () => handleNav('projects'),
        },
        {
          id: 'rab',
          label: 'RAB, BOQ & AHSP',
          icon: Calculator,
          active: activeTab === 'rab',
          badge: null,
          onClick: () => handleNav('rab'),
        },
        {
          id: 'field_reports',
          label: 'Laporan Lapangan & Kurva S',
          icon: HardHat,
          active: activeTab === 'field_reports',
          badge: null,
          onClick: () => handleNav('field_reports'),
        },
        {
          id: 'subcontractors',
          label: 'Subkontraktor & Mandor',
          icon: Users2,
          active: activeTab === 'subcontractors',
          badge: null,
          onClick: () => handleNav('subcontractors'),
        },
        {
          id: 'hr_manpower',
          label: 'SDM & Absensi Pekerja',
          icon: Users,
          active: activeTab === 'hr_manpower',
          badge: null,
          onClick: () => handleNav('hr_manpower'),
        },
        {
          id: 'equipment',
          label: 'Peralatan & Aset Alat Berat',
          icon: Truck,
          active: activeTab === 'equipment',
          badge: null,
          onClick: () => handleNav('equipment'),
        },
        {
          id: 'safety_qc',
          label: 'K3, Mutu & Punch List',
          icon: ShieldAlert,
          active: activeTab === 'safety_qc',
          badge: null,
          onClick: () => handleNav('safety_qc'),
        },
      ],
    },
    {
      label: 'Pengadaan & Logistik',
      items: [
        {
          id: 'procurement',
          label: 'Procurement / PO',
          icon: ShoppingCart,
          active: activeTab === 'procurement',
          badge: null,
          onClick: () => handleNav('procurement'),
        },
        {
          id: 'warehouse',
          label: 'Gudang & Stok Material',
          icon: Boxes,
          active: activeTab === 'warehouse',
          badge: null,
          onClick: () => handleNav('warehouse'),
        },
        {
          id: 'documents',
          label: 'Dokumen & Gambar Kerja',
          icon: FolderArchive,
          active: activeTab === 'documents',
          badge: null,
          onClick: () => handleNav('documents'),
        },
      ],
    },
    {
      label: 'Keuangan & Approval',
      items: [
        {
          id: 'finance',
          label: 'Keuangan & Kasbon Proyek',
          icon: DollarSign,
          active: activeTab === 'finance',
          badge: null,
          onClick: () => handleNav('finance'),
        },
        {
          id: 'approvals',
          label: 'Pusat Approval Berjenjang',
          icon: CheckCircle,
          active: activeTab === 'approvals',
          badge: null,
          onClick: () => handleNav('approvals'),
        },
        {
          id: 'reports',
          label: 'Laporan & Analitik',
          icon: BarChart3,
          active: activeTab === 'reports',
          badge: null,
          onClick: () => handleNav('reports'),
        },
      ],
    },
    {
      label: 'Administrasi & Konfigurasi',
      items: [
        {
          id: 'settings',
          label: 'Pengaturan & Tim',
          icon: Settings,
          active: activeTab === 'settings',
          badge: null,
          onClick: () => handleNav('settings'),
        },
        {
          id: 'guide',
          label: 'Panduan Setup Supabase',
          icon: BookOpen,
          active: activeTab === 'guide',
          badge: null,
          onClick: () => handleNav('guide'),
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        role="navigation"
        aria-label={shellMessages.sidebarNavigation}
        className={`fixed bottom-0 left-0 top-28 z-40 flex flex-col border-r border-white/10 bg-primary-900 text-white transition-all duration-300 ease-in-out lg:top-16 ${
          isMobileOpen ? 'w-72 translate-x-0' : '-translate-x-full sm:translate-x-0'
        } ${isCollapsed ? 'sm:w-18' : 'sm:w-64'}`}
      >
        {/* Mobile Header in Drawer */}
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent-500" />
            <span className="truncate text-xs font-bold text-white">
              {currentOrg?.name}
            </span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            aria-label={shellMessages.closeMenu}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isNavigationCollapsed && (
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/55">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Can key={item.id} module={NAVIGATION_MODULES[item.id]} action="view">
                      <button
                        onClick={item.onClick}
                        title={isNavigationCollapsed ? item.label : undefined}
                        aria-current={item.active ? 'page' : undefined}
                        className={`relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
                          item.active
                            ? 'bg-white/10 font-bold text-white before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-accent-500'
                            : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 transition ${
                            item.active
                              ? 'text-accent-500'
                              : 'text-white/55 group-hover:text-white'
                          }`}
                        />
                        {!isNavigationCollapsed && (
                          <div className="flex items-center justify-between flex-1 truncate">
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 ml-1.5 ${
                                  item.active ? 'bg-white/15 text-white' : 'bg-white/10 text-white/70'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    </Can>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Collapse Toggle on Desktop */}
        <div className="hidden items-center justify-between border-t border-white/10 p-3 sm:flex">
          {!isNavigationCollapsed && (
            <div className="flex items-center gap-2 text-[11px] text-white/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Indotek Pro Enterprise</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mx-auto flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            aria-label={isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
