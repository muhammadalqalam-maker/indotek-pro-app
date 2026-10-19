import type { Project } from '../../types/database';

export type DashboardPeriod = 'all' | 'this_year' | 'last_year' | 'custom';

export interface DashboardDateRange {
  startDate: string;
  endDate: string;
  isValid: boolean;
}

export interface DashboardMetrics {
  projectCount: number;
  activeProjectCount: number;
  delayedProjectCount: number;
  contractValue: number;
  realizedCost: number;
  budgetUsagePercent: number;
  averageActualProgress: number;
  averagePlannedProgress: number;
}

function needsAttention(project: Project): boolean {
  return project.status === 'delayed'
    || (project.status === 'active' && project.actual_progress < project.planned_progress - 3);
}

function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  return date.getUTCFullYear() === Number(yearText)
    && date.getUTCMonth() === Number(monthText) - 1
    && date.getUTCDate() === Number(dayText);
}

export function getDashboardDateRange(
  period: DashboardPeriod,
  customStartDate: string,
  customEndDate: string,
  now = new Date(),
): DashboardDateRange {
  if (period === 'all') return { startDate: '', endDate: '', isValid: true };

  if (period === 'custom') {
    const isValid = isValidDate(customStartDate)
      && isValidDate(customEndDate)
      && customStartDate <= customEndDate;
    return { startDate: customStartDate, endDate: customEndDate, isValid };
  }

  const year = now.getFullYear() - (period === 'last_year' ? 1 : 0);
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    isValid: true,
  };
}

export function filterProjectsByPeriod(
  projects: Project[],
  dateRange: DashboardDateRange,
  selectedProjectId: string,
): Project[] {
  if (!dateRange.isValid) return [];

  return projects.filter((project) => {
    const matchesProject = selectedProjectId === 'all' || project.id === selectedProjectId;
    const matchesPeriod = (!dateRange.startDate || project.end_date >= dateRange.startDate)
      && (!dateRange.endDate || project.start_date <= dateRange.endDate);
    return matchesProject && matchesPeriod;
  });
}

export function calculateDashboardMetrics(projects: Project[]): DashboardMetrics {
  const activeProjects = projects.filter(
    ({ status }) => status === 'active' || status === 'delayed',
  );
  const contractValue = projects.reduce(
    (total, project) => total + (Number.isFinite(project.contract_value) ? project.contract_value : 0),
    0,
  );
  const realizedCost = projects.reduce(
    (total, project) => total + (Number.isFinite(project.realized_cost) ? project.realized_cost : 0),
    0,
  );
  const progressTotals = activeProjects.reduce(
    (totals, project) => ({
      actual: totals.actual + (Number.isFinite(project.actual_progress) ? project.actual_progress : 0),
      planned: totals.planned + (Number.isFinite(project.planned_progress) ? project.planned_progress : 0),
    }),
    { actual: 0, planned: 0 },
  );
  const progressCount = activeProjects.length;

  return {
    projectCount: projects.length,
    activeProjectCount: activeProjects.length,
    delayedProjectCount: projects.filter(needsAttention).length,
    contractValue,
    realizedCost,
    budgetUsagePercent: contractValue > 0 ? (realizedCost / contractValue) * 100 : 0,
    averageActualProgress: progressCount > 0 ? progressTotals.actual / progressCount : 0,
    averagePlannedProgress: progressCount > 0 ? progressTotals.planned / progressCount : 0,
  };
}

export function getProjectsNeedingAttention(projects: Project[]): Project[] {
  return projects.filter(needsAttention);
}
