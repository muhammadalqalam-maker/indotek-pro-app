import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Can } from '../shared/Can';
import {
  LayoutDashboard,
  FolderKanban,
  Plus,
  ListTodo,
  Menu,
  Camera,
  ClipboardList,
  PackagePlus,
  X,
} from 'lucide-react';
import { shellMessages } from '../../i18n/id';
import { useSidebar } from '../shadcn/sidebar';

export const MobileBottomNav: React.FC<{
  onOpenCreateProject: () => void;
}> = ({ onOpenCreateProject }) => {
  const { activeTab, setActiveTab, can } = useApp();
  const { openMobile, setOpenMobile } = useSidebar();
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const hasQuickActions = can('projects', 'create')
    || can('field_reports', 'create')
    || can('warehouse', 'create');

  useEffect(() => {
    if (!fabMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFabMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [fabMenuOpen]);

  const handleNav = (tab: 'dashboard' | 'projects' | 'approvals') => {
    setActiveTab(tab);
  };

  return (
    <>
      {/* Floating Action Button (FAB) Menu Overlay */}
      {fabMenuOpen && hasQuickActions && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm sm:hidden"
          onClick={() => setFabMenuOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setFabMenuOpen(false);
          }}
        >
          <div
            className="absolute bottom-20 right-4 flex flex-col items-end gap-3 animate-in slide-in-from-bottom-5 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label={shellMessages.quickActions}
            onClick={(e) => e.stopPropagation()}
          >
            <Can module="projects" action="create">
              <button
                onClick={() => {
                  setFabMenuOpen(false);
                  onOpenCreateProject();
                }}
                className="flex min-h-11 items-center gap-2.5 rounded-full bg-accent-500 px-4 py-2.5 text-xs font-bold text-primary-900 shadow-xl active:scale-95"
              >
                <span>+ Proyek Baru</span>
                <FolderKanban className="w-4 h-4" />
              </button>
            </Can>

            <Can module="field_reports" action="create">
              <button
                onClick={() => {
                  setFabMenuOpen(false);
                  setActiveTab('field_reports');
                }}
                  className="flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-text shadow-xl active:scale-95"
              >
                <span>+ Laporan Harian Lapangan</span>
                  <ClipboardList className="h-4 w-4 text-accent-500" />
              </button>
            </Can>

            <Can module="projects" action="create">
              <button
                onClick={() => {
                  setFabMenuOpen(false);
                  setActiveTab('documents');
                }}
                className="flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-text shadow-xl active:scale-95"
              >
                <span>+ Gambar & Dokumen</span>
                <Camera className="h-4 w-4 text-primary-500" />
              </button>
            </Can>

            <Can module="warehouse" action="create">
              <button
                onClick={() => {
                  setFabMenuOpen(false);
                  setActiveTab('warehouse');
                }}
                className="flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-text shadow-xl active:scale-95"
              >
                <span>+ Mutasi & Stok Gudang</span>
                <PackagePlus className="h-4 w-4 text-success" />
              </button>
            </Can>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav
        aria-label={shellMessages.primaryNavigation}
        className="safe-area-bottom-nav fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-surface/95 px-2 backdrop-blur-md sm:hidden"
      >
        <Can module="dashboard" action="view">
          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 text-xs font-semibold transition ${
              activeTab === 'dashboard' ? 'text-accent-600' : 'text-muted-foreground'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>{shellMessages.home}</span>
          </button>
        </Can>

        <Can module="projects" action="view">
          <button
            type="button"
            onClick={() => handleNav('projects')}
            aria-current={activeTab === 'projects' ? 'page' : undefined}
            className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 text-xs font-semibold transition ${
              activeTab === 'projects' ? 'text-accent-600' : 'text-muted-foreground'
            }`}
          >
            <FolderKanban className="h-5 w-5" />
            <span>{shellMessages.projects}</span>
          </button>
        </Can>

        {hasQuickActions && (
          <div className="relative -top-3">
            <button
              type="button"
              onClick={() => setFabMenuOpen((prev) => !prev)}
              aria-label={shellMessages.quickActions}
              aria-expanded={fabMenuOpen}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-500 text-primary-900 shadow-lg transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {fabMenuOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6 stroke-[3]" />}
            </button>
          </div>
        )}

        <Can module="approvals" action="view">
          <button
            type="button"
            onClick={() => handleNav('approvals')}
            aria-current={activeTab === 'approvals' ? 'page' : undefined}
            className={`flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 text-xs font-semibold transition ${
              activeTab === 'approvals' ? 'text-accent-600' : 'text-muted-foreground'
            }`}
          >
            <ListTodo className="h-5 w-5" />
            <span>{shellMessages.approvals}</span>
          </button>
        </Can>

        <button
          type="button"
          onClick={() => {
            setFabMenuOpen(false);
            setOpenMobile(true);
          }}
          className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-1 text-xs font-semibold text-muted-foreground transition"
          aria-label={shellMessages.openMenu}
          aria-expanded={openMobile}
          aria-controls="app-sidebar"
        >
          <Menu className="h-5 w-5" />
          <span>{shellMessages.menu}</span>
        </button>
      </nav>
    </>
  );
};
