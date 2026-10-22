import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { UseFormReturn } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import {
  dailyReportDraftSchema,
  dailyReportSubmissionSchema,
  type DailyReportFormValues,
} from '../schemas/dailyReport.schema';
import {
  submitDailyReport,
} from '../services/dailyReport.service';
import { applyDailyReportValidationIssues } from '../utils/dailyReportValidation';

const messages = getMessages().fieldReports;

type UseDailyReportWorkflowActionsOptions = {
  organizationId: string;
  projectId: string;
  reportId: string | null;
  form: UseFormReturn<DailyReportFormValues>;
  isOnline: boolean;
  hasSiteSignatureFile: boolean;
  persistDraft: (showValidation?: boolean) => Promise<boolean>;
  queryClient: QueryClient;
  reportsKey: QueryKey;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setSaveError: Dispatch<SetStateAction<string>>;
  setSaveErrorDetail: Dispatch<SetStateAction<string>>;
  setActionFeedback: Dispatch<SetStateAction<string>>;
};

function technicalError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export function useDailyReportWorkflowActions({
  organizationId,
  projectId,
  reportId,
  form,
  isOnline,
  hasSiteSignatureFile,
  persistDraft,
  queryClient,
  reportsKey,
  setIsSaving,
  setSaveError,
  setSaveErrorDetail,
  setActionFeedback,
}: UseDailyReportWorkflowActionsOptions) {
  const invalidateReport = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: reportsKey });
    await queryClient.invalidateQueries({
      queryKey: ['daily-report-details', organizationId, projectId, reportId],
    });
  }, [organizationId, projectId, queryClient, reportId, reportsKey]);

  const submit = useCallback(async () => {
    const parsed = dailyReportDraftSchema.safeParse(form.getValues());
    if (!parsed.success) {
      applyDailyReportValidationIssues(form, parsed.error.issues);
      return;
    }
    const submission = dailyReportSubmissionSchema.safeParse(parsed.data);
    if (!submission.success) {
      applyDailyReportValidationIssues(form, submission.error.issues);
      return;
    }
    if (!parsed.data.site_manager_signature_path && !hasSiteSignatureFile) {
      form.setError('root.validation', { type: 'validation', message: messages.validation.signature });
      return;
    }
    if (!isOnline || !(await persistDraft(true)) || !organizationId || !projectId || !reportId) return;

    setIsSaving(true);
    setSaveError('');
    setSaveErrorDetail('');
    try {
      await submitDailyReport(organizationId, projectId, reportId);
      setActionFeedback(messages.submitSuccess);
      await invalidateReport();
    } catch (error: unknown) {
      setSaveError(messages.submitError);
      setSaveErrorDetail(technicalError(error));
    } finally {
      setIsSaving(false);
    }
  }, [
    form,
    hasSiteSignatureFile,
    invalidateReport,
    isOnline,
    organizationId,
    persistDraft,
    projectId,
    reportId,
    setActionFeedback,
    setIsSaving,
    setSaveError,
    setSaveErrorDetail,
  ]);

  return { submit };
}
