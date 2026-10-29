import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole, ROLE_LABELS, NAVIGATION_MODULES } from '../../utils/permissions';
import type { NavigationTab } from '../../context/AppContext';
import {
  Search,
  LayoutDashboard,
  FolderKanban,
  Settings,
  BookOpen,
  PlusCircle,
  Moon,
  Sun,
  ShieldCheck,
  Building2,
  X,
  ArrowRight,
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    setActiveTab,
    openProjectDetail,
    projects,
    currentRole,
    setCurrentRole,
    isSupabaseLive,
    can,
    isDark,
    toggleTheme,
  } = useApp();

  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isCommandPaletteOpen) {
      setSearch('');
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', closeOnEscape);
      previousFocusRef.current?.focus();
    };
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const query = search.toLowerCase().trim();

  // Navigation Items
  const navItems = [
    {
      tab: 'dashboard' as NavigationTab,
      title: 'Buka Dashboard Eksekutif',
      category: 'Navigasi',
      icon: LayoutDashboard,
      action: () => {
        setActiveTab('dashboard');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'projects' as NavigationTab,
      title: 'Buka Manajemen Proyek',
      category: 'Navigasi',
      icon: FolderKanban,
      action: () => {
        setActiveTab('projects');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'rab' as NavigationTab,
      title: 'Buka RAB, BOQ & Analisa Harga Satuan (AHSP)',
      category: 'Navigasi',
      icon: LayoutDashboard,
      action: () => {
        setActiveTab('rab');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'field_reports' as NavigationTab,
      title: 'Buka Laporan Harian Lapangan & Kurva S',
      category: 'Navigasi',
      icon: FolderKanban,
      action: () => {
        setActiveTab('field_reports');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'procurement' as NavigationTab,
      title: 'Buka Pengadaan & Purchase Order (PO)',
      category: 'Navigasi',
      icon: LayoutDashboard,
      action: () => {
        setActiveTab('procurement');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'warehouse' as NavigationTab,
      title: 'Buka Gudang & Stok Material',
      category: 'Navigasi',
      icon: LayoutDashboard,
      action: () => {
        setActiveTab('warehouse');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'subcontractors' as NavigationTab,
      title: 'Buka Subkontraktor & SPK Opname',
      category: 'Navigasi',
      icon: FolderKanban,
      action: () => {
        setActiveTab('subcontractors');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'finance' as NavigationTab,
      title: 'Buka Keuangan Proyek, Invoice & Kasbon',
      category: 'Navigasi',
      icon: LayoutDashboard,
      action: () => {
        setActiveTab('finance');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'hr_manpower' as NavigationTab,
      title: 'Buka SDM & Absensi Pekerja Site',
      category: 'Navigasi',
      icon: FolderKanban,
      action: () => {
        setActiveTab('hr_manpower');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'equipment' as NavigationTab,
      title: 'Buka Peralatan & Alat Berat',
      category: 'Navigasi',
      icon: LayoutDashboard,
      action: () => {
        setActiveTab('equipment');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'safety_qc' as NavigationTab,
      title: 'Buka K3, QC & Punch List',
      category: 'Navigasi',
      icon: ShieldCheck,
      action: () => {
        setActiveTab('safety_qc');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'documents' as NavigationTab,
      title: 'Buka Dokumen & Gambar Kerja (DED)',
      category: 'Navigasi',
      icon: BookOpen,
      action: () => {
        setActiveTab('documents');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'approvals' as NavigationTab,
      title: 'Buka Pusat Persetujuan & Approvals',
      category: 'Navigasi',
      icon: ShieldCheck,
      action: () => {
        setActiveTab('approvals');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'reports' as NavigationTab,
      title: 'Buka Laporan & Ekspor Data Eksekutif',
      category: 'Navigasi',
      icon: LayoutDashboard,
      action: () => {
        setActiveTab('reports');
        setCommandPaletteOpen(false);
      },
    },
    {
      tab: 'settings' as NavigationTab,
      title: 'Buka Pengaturan & Tim',
      category: 'Navigasi',
      icon: Settings,
      action: () => {
        setActiveTab('settings');
        setCommandPaletteOpen(false);
      },
    },
    {
      title: isDark ? 'Ganti ke Tema Terang (Light Mode)' : 'Ganti ke Tema Gelap (Dark Mode)',
      category: 'Tampilan',
      icon: isDark ? Sun : Moon,
      action: () => {
        toggleTheme();
        setCommandPaletteOpen(false);
      },
    },
  ];

  // Projects
  const projectItems = projects.map((p) => ({
    title: `${p.code} - ${p.name}`,
    category: 'Proyek',
    icon: Building2,
    badge: p.status,
    module: 'projects' as const,
    action: () => {
      openProjectDetail(p.id);
      setCommandPaletteOpen(false);
    },
  }));

  // Role simulations
  const roles: UserRole[] = [
    'owner',
    'project_manager',
    'site_manager',
    'estimator',
    'finance',
    'procurement',
    'safety_officer',
  ];
  const roleItems = isSupabaseLive ? [] : roles.map((r) => ({
    title: `Simulasi Role: ${ROLE_LABELS[r]}`,
    category: 'Ganti Peran / Role',
    icon: ShieldCheck,
    isCurrent: currentRole === r,
    action: () => {
      setCurrentRole(r);
      setCommandPaletteOpen(false);
    },
  }));

  const allItems = [...navItems, ...projectItems, ...roleItems].filter((item) => {
    if ('tab' in item && item.tab) return can(NAVIGATION_MODULES[item.tab], 'view');
    if ('module' in item) return can(item.module, 'view');
    return true;
  });
  const filtered = query
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      )
    : allItems.slice(0, 8);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pencarian dan perintah"
        className="w-full max-w-xl rounded-2xl bg-surface dark:bg-surface border border-border dark:border-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border dark:border-border">
          <Search className="w-5 h-5 text-subtle shrink-0" />
          <input
            ref={inputRef}
            type="text"
            aria-label="Cari navigasi, proyek, atau perintah"
            placeholder={isSupabaseLive
              ? 'Cari navigasi atau proyek...'
              : 'Cari perintah, navigasi, proyek, atau simulasi role...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-text placeholder:text-subtle focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            aria-label="Tutup pencarian"
            className="text-subtle hover:text-muted-foreground dark:hover:text-muted-foreground p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto divide-y divide-border dark:divide-border/60 max-h-96">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Tidak ada hasil yang cocok dengan "{search}"
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="flex min-h-11 w-full items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-surface-2 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-surface-2 text-muted-foreground group-hover:bg-accent group-hover:text-text transition shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-text truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-subtle">{item.category}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-subtle group-hover:text-accent-600 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-bg dark:bg-surface/50 border-t border-border dark:border-border flex items-center justify-between text-[11px] text-subtle">
          <span>Ketik untuk mencari</span>
          <div className="flex items-center gap-2">
            <span>Tutup: <kbd className="px-1.5 py-0.5 rounded bg-surface-2 dark:bg-surface-2 text-muted-foreground dark:text-muted-foreground font-mono text-[10px]">ESC</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
};
