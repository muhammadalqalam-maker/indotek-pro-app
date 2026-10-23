import { ArrowUpRight } from 'lucide-react';
import type { Project } from '../../../types/database';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '../../../components/ui';
import { formatPersen, formatRupiah, formatTanggal } from '../../../utils/format';
import {
  dashboardProjectStatusLabels,
  dashboardProjectStatusVariants,
} from '../dashboardProjectStatus';
import { calculateEffectiveProjectContractValue } from '../../../utils/projectCalculations';

export function DashboardProjectList({
  title,
  emptyMessage,
  projects,
  onOpenProject,
  openProjectLabel,
}: {
  title: string;
  emptyMessage: string;
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  openProjectLabel: (projectName: string) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{emptyMessage}</p>
        ) : (
          <ul className="divide-y divide-border">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  aria-label={openProjectLabel(project.name)}
                  className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-text">{project.name}</span>
                      <Badge variant={dashboardProjectStatusVariants[project.status]}>
                        {dashboardProjectStatusLabels[project.status]}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {project.code} · {formatTanggal(project.start_date)} – {formatTanggal(project.end_date)}
                    </span>
                    <span className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <span
                          className="block h-full rounded-full bg-primary-500"
                          style={{ width: `${Math.min(Math.max(project.actual_progress, 0), 100)}%` }}
                        />
                      </span>
                      <span className="w-12 text-right text-xs tabular-nums text-muted">
                        {formatPersen(project.actual_progress)}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted">
                    {formatRupiah(calculateEffectiveProjectContractValue(project))}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
