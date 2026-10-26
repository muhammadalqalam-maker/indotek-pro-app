export const NAVIGATION_ROUTES = [
  { tab: 'dashboard', path: '/dashboard' },
  { tab: 'projects', path: '/projects' },
  { tab: 'rab', path: '/rab' },
  { tab: 'field_reports', path: '/field-reports' },
  { tab: 'procurement', path: '/procurement' },
  { tab: 'warehouse', path: '/warehouse' },
  { tab: 'subcontractors', path: '/subcontractors' },
  { tab: 'finance', path: '/finance' },
  { tab: 'hr_manpower', path: '/hr-manpower' },
  { tab: 'equipment', path: '/equipment' },
  { tab: 'safety_qc', path: '/safety-qc' },
  { tab: 'documents', path: '/documents' },
  { tab: 'approvals', path: '/approvals' },
  { tab: 'reports', path: '/reports' },
  { tab: 'settings', path: '/settings' },
] as const;

export type NavigationTab = (typeof NAVIGATION_ROUTES)[number]['tab'];

export function getPathForTab(tab: NavigationTab): string {
  const route = NAVIGATION_ROUTES.find((entry) => entry.tab === tab);
  if (!route) throw new Error(`No route configured for tab: ${tab}`);
  return route.path;
}

export function getTabForPathname(pathname: string): NavigationTab {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const route = NAVIGATION_ROUTES.find(({ path }) => path === normalizedPath);
  if (route) return route.tab;

  if (/^\/projects\/[^/]+$/.test(normalizedPath)) return 'projects';
  return 'dashboard';
}

export function getProjectIdForPathname(pathname: string): string | null {
  const normalizedPath = pathname.replace(/\/+$/, '');
  const match = normalizedPath.match(/^\/projects\/([^/]+)$/);
  return match?.[1] ?? null;
}

export function getProjectDetailPath(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}`;
}
