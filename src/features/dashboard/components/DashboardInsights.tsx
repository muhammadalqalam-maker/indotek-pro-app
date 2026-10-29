import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Project, ProjectStatus } from '../../../types/database';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatPersen, formatRupiah } from '../../../utils/format';
import type { DashboardMetrics } from '../dashboardMetrics';
import {
  dashboardProjectStatusLabels,
  dashboardProjectStatusVariants,
} from '../dashboardProjectStatus';
import { calculateEffectiveProjectContractValue } from '../../../utils/projectCalculations';

const messages = getMessages('id').dashboard;

export function DashboardInsights({
  projects,
  metrics,
}: {
  projects: Project[];
  metrics: DashboardMetrics;
}) {
  const progressChartData = useMemo(
    () => projects.map((project) => ({
      name: project.code,
      planned: project.planned_progress,
      actual: project.actual_progress,
    })),
    [projects],
  );
  const budgetChartData = useMemo(
    () => projects.map((project) => ({
      name: project.code,
      contractValue: calculateEffectiveProjectContractValue(project) / 1_000_000,
      realizedCost: project.realized_cost / 1_000_000,
    })),
    [projects],
  );
  const statusCounts = useMemo(
    () => ({
      planning: projects.filter(({ status }) => status === 'planning').length,
      active: projects.filter(({ status }) => status === 'active').length,
      delayed: projects.filter(({ status }) => status === 'delayed').length,
      completed: projects.filter(({ status }) => status === 'completed').length,
      maintenance: projects.filter(({ status }) => status === 'maintenance').length,
    }),
    [projects],
  );

  return (
    <>
      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle as="h2">{messages.progressChart}</CardTitle>
            <p className="text-sm text-muted-foreground">{messages.progressChartDescription}</p>
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="h-72 w-full min-w-0 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressChartData} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [formatPersen(Number(value)), '']}
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="planned" name={messages.plannedSeries} fill="var(--neutral)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="actual" name={messages.actualSeries} fill="var(--primary-500)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle as="h2">{messages.projectStatus}</CardTitle>
            <p className="text-sm text-muted-foreground">{messages.projectCount}: {metrics.projectCount}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {(Object.keys(statusCounts) as ProjectStatus[]).map((status) => (
                <li key={status} className="flex items-center justify-between gap-3">
                  <Badge variant={dashboardProjectStatusVariants[status]}>
                    {dashboardProjectStatusLabels[status]}
                  </Badge>
                  <span className="text-sm font-semibold tabular-nums text-text">{statusCounts[status]}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-md bg-surface-2 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-text">
                {metrics.delayedProjectCount > 0
                  ? <AlertTriangle className="h-4 w-4 text-danger" aria-hidden="true" />
                  : <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />}
                {messages.delayedProjects}: {metrics.delayedProjectCount}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{messages.delayedProjectsDescription}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle as="h2">{messages.budgetChart}</CardTitle>
          <p className="text-sm text-muted-foreground">{messages.budgetChartDescription}</p>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="h-72 w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetChartData} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis unit=" jt" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [
                    formatRupiah(Number(value) * 1_000_000),
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text)',
                  }}
                />
                <Legend />
                <Bar dataKey="contractValue" name={messages.contractSeries} fill="var(--primary-500)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="realizedCost" name={messages.costSeries} fill="var(--accent-500)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
