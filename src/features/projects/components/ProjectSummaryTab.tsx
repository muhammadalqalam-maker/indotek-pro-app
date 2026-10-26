import type { ReactNode } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import { formatPersen, formatRupiah, formatTanggal } from '../../../utils/format';
import {
  calculateApprovedTimeExtensionDays,
  calculateEffectiveContractEndDate,
  calculateEffectiveProjectContractValue,
} from '../../../utils/projectCalculations';

const messages = getMessages('id').projects;

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium text-text">
        {children === undefined || children === null || children === '' ? '—' : children}
      </dd>
    </div>
  );
}

export function ProjectSummaryTab({ project }: { project: Project }) {
  const details = messages.detail;
  const location = [project.location_address, project.location_city, project.location_province]
    .filter(Boolean)
    .join(', ');
  const actualProgress = Number.isFinite(project.actual_progress) ? project.actual_progress : 0;
  const plannedProgress = Number.isFinite(project.planned_progress) ? project.planned_progress : 0;
  const addendums = project.addendums ?? [];
  const approvedExtensionDays = calculateApprovedTimeExtensionDays(addendums);
  const effectiveEndDate = calculateEffectiveContractEndDate(project.end_date, approvedExtensionDays);
  const effectiveContractValue = calculateEffectiveProjectContractValue(project);

  const metrics = [
    { label: details.effectiveContractValue, value: formatRupiah(effectiveContractValue) },
    { label: details.realizedCost, value: formatRupiah(project.realized_cost) },
    { label: details.actualProgress, value: formatPersen(actualProgress) },
  ];

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={details.projectInformation}>
        {metrics.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4 sm:p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 break-words text-xl font-bold tabular-nums text-text">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{details.projectInformation}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <DetailField label={details.client}>{project.client_name}</DetailField>
            <DetailField label={details.clientContact}>{project.client_contact}</DetailField>
            <DetailField label={details.contractNumber}>{project.contract_number}</DetailField>
            <DetailField label={details.baseContractValue}>{formatRupiah(project.contract_value)}</DetailField>
            <DetailField label={details.effectiveContractValue}>{formatRupiah(effectiveContractValue)}</DetailField>
            <DetailField label={details.category}>{messages.categoryLabels[project.category]}</DetailField>
            <DetailField label={details.location}>
              <span className="inline-flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {location || '—'}
              </span>
            </DetailField>
            <DetailField label={details.schedule}>
              <span className="inline-flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {messages.projectDateRange(formatTanggal(project.start_date), formatTanggal(effectiveEndDate))}
              </span>
              {approvedExtensionDays > 0 && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {details.approvedTimeExtension}: {approvedExtensionDays} {messages.days}
                </span>
              )}
            </DetailField>
            <DetailField label={details.maintenance}>
              {messages.maintenancePeriod(project.maintenance_days)}
            </DetailField>
            <DetailField label={details.retention}>
              {formatPersen(project.retention_percent)}
            </DetailField>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{details.progressComparison}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{details.actualProgress}</span>
            <span className="font-semibold tabular-nums text-text">{formatPersen(actualProgress)}</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label={details.actualProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.max(0, actualProgress))}
          >
            <div
              className="h-full rounded-full bg-primary-600 transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, actualProgress))}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {details.plannedProgress}: <span className="font-medium text-text">{formatPersen(plannedProgress)}</span>
          </p>
        </CardContent>
      </Card>

      {project.notes && (
        <Card>
          <CardHeader>
            <CardTitle>{details.notes}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-text">{project.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
