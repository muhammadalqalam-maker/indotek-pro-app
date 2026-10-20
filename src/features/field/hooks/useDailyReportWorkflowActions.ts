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
  approveDailyReport,
  submitDailyReport,
  uploadDailyReportSignature,
} from '../services/dailyReport.service';
import { applyDailyReportValidationIssues } from '../utils/dailyReportValidation';

const messages = getMessages().fieldReports;

type UseDailyReportWorkflowActionsOptions = {
  organizationId: string;
  projectId: string;
  reportId: string | null;
  form: UseFormReturn<DailyReportFormValues>;
  isOnline: boolean;
  canApprove: boolean;
  hasSiteSignatureFile: boolean;
  approverSignatureFile: File | null;
  persistDraft: (showValidation?: boolean) => Promise<boolean>;
  queryClient: QueryClient;
  reportsKey: QueryKey;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setSaveError: Dispatch<SetStateAction<string>>;
  setSaveErrorDetail: Dispatch<SetStateAction<string>>;
  setActionFeedback: Dispatch<SetStateAction<string>>;
  setApproverSignatureFile: Dispatch<SetStateAction<File | null>>;
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
  canApprove,
  hasSiteSignatureFile,
  approverSignatureFile,
  persistDraft,
  queryClient,
  reportsKey,
  setIsSaving,
  setSaveError,
  setSaveErrorDetail,
  setActionFeedback,
  setApproverSignatureFile,
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

  const approve = useCallback(async () => {
    if (!canApprove || !isOnline || !organizationId || !projectId || !reportId || !approverSignatureFile) {
      setSaveError(messages.approveError);
      return;
    }
    setIsSaving(true);
    setSaveError('');
    setSaveErrorDetail('');
    setActionFeedback('');
    try {
      const signaturePath = await uploadDailyReportSignature(
        organizationId,
        projectId,
        reportId,
        'approver',
        approverSignatureFile,
      );
      await approveDailyReport(organizationId, projectId, reportId, signaturePath);
      setApproverSignatureFile(null);
      setActionFeedback(messages.approveSuccess);
      await invalidateReport();
    } catch (error: unknown) {
      setSaveError(messages.approveError);
      setSaveErrorDetail(technicalError(error));
    } finally {
      setIsSaving(false);
    }
  }, [
    approverSignatureFile,
    canApprove,
    invalidateReport,
    isOnline,
    organizationId,
    projectId,
    reportId,
    setActionFeedback,
    setApproverSignatureFile,
    setIsSaving,
    setSaveError,
    setSaveErrorDetail,
  ]);

  return { submit, approve };
}
