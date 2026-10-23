import { Card, CardContent, Input, Select } from '../../components/ui';
import type { ReportType } from './reportData.service';

export type ReportProjectOption = {
  id: string;
  name: string;
};

type ReportFiltersProps = {
  reportTypes: ReportType[];
  reportType: ReportType;
  projects: ReportProjectOption[];
  projectId: string;
  startDate: string;
  endDate: string;
  status: string;
  statuses: string[];
  hasDataset: boolean;
  labels: {
    reportType: string;
    project: string;
    allProjects: string;
    startDate: string;
    endDate: string;
    status: string;
    allStatuses: string;
    statusLabel: (status: string) => string;
    reportTypeLabel: (type: ReportType) => string;
  };
  onReportTypeChange: (type: ReportType) => void;
  onProjectChange: (projectId: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onStatusChange: (status: string) => void;
};

export function ReportFilters({
  reportTypes,
  reportType,
  projects,
  projectId,
  startDate,
  endDate,
  status,
  statuses,
  hasDataset,
  labels,
  onReportTypeChange,
  onProjectChange,
  onStartDateChange,
  onEndDateChange,
  onStatusChange,
}: ReportFiltersProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-5">
        <Select
          label={labels.reportType}
          value={reportType}
          onChange={(event) => {
            const nextType = reportTypes.find((type) => type === event.target.value);
            if (nextType) onReportTypeChange(nextType);
          }}
        >
          {reportTypes.map((type) => (
            <option key={type} value={type}>{labels.reportTypeLabel(type)}</option>
          ))}
        </Select>
        <Select
          label={labels.project}
          value={projectId}
          onChange={(event) => onProjectChange(event.target.value)}
        >
          <option value="all">{labels.allProjects}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </Select>
        <Input
          label={labels.startDate}
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={(event) => onStartDateChange(event.target.value)}
        />
        <Input
          label={labels.endDate}
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(event) => onEndDateChange(event.target.value)}
        />
        <Select
          label={labels.status}
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          disabled={!hasDataset || statuses.length === 0}
        >
          <option value="all">{labels.allStatuses}</option>
          {statuses.map((statusOption) => (
            <option key={statusOption} value={statusOption}>{labels.statusLabel(statusOption)}</option>
          ))}
        </Select>
      </CardContent>
    </Card>
  );
}
