import type { FieldPath, UseFormSetError } from 'react-hook-form';
import type { ZodIssue } from 'zod';
import { getMessages } from '../../../i18n';
import { DAILY_REPORT_STATUSES } from '../schemas/dailyReport.schema';
import type { DailyReportProgressFormValues } from '../schemas/dailyReportProgress.schema';
import type { DailyReportProgressEntry } from '../services/dailyReportProgress.service';

const messages = getMessages().fieldReports;

export const BOQ_VERSION_STATUS = {
  draft: 'draft',
  pendingApproval: 'pending_approval',
  approved: 'approved',
  rejected: 'rejected',
} as const;

export function versionStatusLabel(status: string): string {
  if (status === BOQ_VERSION_STATUS.draft) return messages.progressVersionDraft;
  if (status === BOQ_VERSION_STATUS.pendingApproval) return messages.progressVersionPending;
  if (status === BOQ_VERSION_STATUS.approved) return messages.progressVersionApproved;
  if (status === BOQ_VERSION_STATUS.rejected) return messages.progressVersionRejected;
  return status;
}

export function sumProgressEntries(
  entries: DailyReportProgressEntry[],
  itemId: string,
  excludingReportId?: string,
): number {
  return entries.reduce((sum, entry) => (
    entry.report_status !== DAILY_REPORT_STATUSES.rejected
      && entry.boq_item_id === itemId
      && entry.report_id !== excludingReportId
      ? sum + Number(entry.installed_volume)
      : sum
  ), 0);
}

export function applyProgressValidationErrors(
  issues: ZodIssue[],
  setError: UseFormSetError<DailyReportProgressFormValues>,
): void {
  for (const issue of issues) {
    const [root, index, field] = issue.path;
    if (root === 'entries' && typeof index === 'number' && (field === 'installed_volume' || field === 'remarks')) {
      const path = `entries.${index}.${field}` as FieldPath<DailyReportProgressFormValues>;
      setError(path, { type: 'validate', message: issue.message });
    }
  }
}
