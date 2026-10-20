import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { getMessages } from '../../../i18n';
import {
  DAILY_REPORT_STATUSES,
  dailyReportDraftSchema,
  type DailyReportFormValues,
} from '../schemas/dailyReport.schema';
import {
  saveDailyReportDraft,
  uploadDailyReportPhoto,
  uploadDailyReportSignature,
  type DailyReportDetails,
  type DailyReportRecord,
} from '../services/dailyReport.service';
import { applyDailyReportValidationIssues } from '../utils/dailyReportValidation';
import { useDailyReportWorkflowActions } from './useDailyReportWorkflowActions';

const messages = getMessages().fieldReports;
type SaveState = 'saved' | 'pending' | 'saving' | 'error' | 'offline' | 'invalid';

function technicalError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export type DailyReportEditorState = {
  form: UseFormReturn<DailyReportFormValues>;
  editable: boolean;
  showApproverSignature: boolean;
  pendingPhotos: File[];
  changePendingPhotos: (files: File[]) => void;
  photoPreviewUrls: Record<string, string>;
  siteSignatureUrl: string | null;
  approverSignatureUrl: string | null;
  onSiteSignatureChange: (file: File | null) => void;
  onApproverSignatureChange: (file: File | null) => void;
  removePhoto: (path: string) => void;
  persistDraft: (showValidation?: boolean) => Promise<boolean>;
  submit: () => Promise<void>;
  approve: () => Promise<void>;
  hasUnsavedChanges: boolean;
  isOnline: boolean;
  isSaving: boolean;
  saveLabel: string;
  saveState: SaveState;
  saveError: string;
  saveErrorDetail: string;
  actionFeedback: string;
};

type UseDailyReportEditorOptions = {
  organizationId: string;
  projectId: string;
  reportId: string | null;
  report: DailyReportRecord | null;
  details: DailyReportDetails | undefined;
  defaultValues: DailyReportFormValues;
  canEdit: boolean;
  canApprove: boolean;
  reportsKey: QueryKey;
};

export function useDailyReportEditor({
  organizationId,
  projectId,
  reportId,
  report,
  details,
  defaultValues,
  canEdit,
  canApprove,
  reportsKey,
}: UseDailyReportEditorOptions): DailyReportEditorState {
  const queryClient = useQueryClient();
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPhotoIds, setPendingPhotoIds] = useState<Map<File, string>>(() => new Map());
  const [siteSignatureFile, setSiteSignatureFile] = useState<File | null>(null);
  const [approverSignatureFile, setApproverSignatureFile] = useState<File | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState('');
  const [saveErrorDetail, setSaveErrorDetail] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSaving, setIsSaving] = useState(false);
  const saveLock = useRef(false);
  const form = useForm<DailyReportFormValues>({ defaultValues, mode: 'onBlur' });
  const watchedValues = useWatch({ control: form.control });
  const editable = Boolean(canEdit && report?.status === DAILY_REPORT_STATUSES.draft);
  const showApproverSignature = Boolean(
    canApprove && report?.status === DAILY_REPORT_STATUSES.submitted,
  );
  const hasUnsavedChanges = form.formState.isDirty
    || pendingPhotos.length > 0
    || siteSignatureFile !== null;

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const loadedValues = details?.report.id === reportId ? details.values : defaultValues;
  useEffect(() => {
    if (form.formState.isDirty && details?.report.id === reportId) return;
    form.reset(loadedValues);
    setPendingPhotos([]);
    setPendingPhotoIds(new Map());
    setSiteSignatureFile(null);
    setApproverSignatureFile(null);
    setSaveState('saved');
    setSaveError('');
    setSaveErrorDetail('');
  }, [defaultValues, details?.report.id, form, form.formState.isDirty, loadedValues, organizationId, projectId, reportId]);

  const persistDraft = useCallback(async (showValidation = false): Promise<boolean> => {
    if (!organizationId || !projectId || !reportId || !editable || saveLock.current) return false;
    const parsed = dailyReportDraftSchema.safeParse(form.getValues());
    if (!parsed.success) {
      if (showValidation) applyDailyReportValidationIssues(form, parsed.error.issues);
      setSaveState('invalid');
      return false;
    }
    if (!isOnline) {
      setSaveState('offline');
      return false;
    }

    saveLock.current = true;
    setIsSaving(true);
    setSaveState('saving');
    setSaveError('');
    setSaveErrorDetail('');
    setActionFeedback('');
    try {
      const values: DailyReportFormValues = {
        ...parsed.data,
        photo_paths: [...parsed.data.photo_paths],
      };
      for (const file of pendingPhotos) {
        const photoId = pendingPhotoIds.get(file);
        if (!photoId) throw new Error('ID foto belum tersedia. Pilih ulang foto lalu coba lagi.');
        const path = await uploadDailyReportPhoto(
          organizationId,
          projectId,
          reportId,
          photoId,
          file,
        );
        values.photo_paths.push({ path, caption: file.name });
      }
      if (siteSignatureFile) {
        values.site_manager_signature_path = await uploadDailyReportSignature(
          organizationId,
          projectId,
          reportId,
          'site-manager',
          siteSignatureFile,
        );
      }

      await saveDailyReportDraft(organizationId, projectId, reportId, values);
      form.reset(values);
      setPendingPhotos([]);
      setPendingPhotoIds(new Map());
      setSiteSignatureFile(null);
      setSaveState('saved');
      await queryClient.invalidateQueries({ queryKey: reportsKey });
      await queryClient.invalidateQueries({
        queryKey: ['daily-report-details', organizationId, projectId, reportId],
      });
      return true;
    } catch (error: unknown) {
      const detail = technicalError(error);
      const missingSchema = /function .* does not exist|schema cache|column .* does not exist/i.test(detail);
      setSaveState('error');
      setSaveError(missingSchema ? messages.noSchema : messages.autosaveError);
      setSaveErrorDetail(detail);
      return false;
    } finally {
      saveLock.current = false;
      setIsSaving(false);
    }
  }, [
    editable,
    form,
    isOnline,
    organizationId,
    pendingPhotoIds,
    pendingPhotos,
    projectId,
    queryClient,
    reportId,
    reportsKey,
    siteSignatureFile,
  ]);

  const workflow = useDailyReportWorkflowActions({
    organizationId,
    projectId,
    reportId,
    form,
    isOnline,
    canApprove: showApproverSignature,
    hasSiteSignatureFile: siteSignatureFile !== null,
    approverSignatureFile,
    persistDraft,
    queryClient,
    reportsKey,
    setIsSaving,
    setSaveError,
    setSaveErrorDetail,
    setActionFeedback,
    setApproverSignatureFile,
  });

  useEffect(() => {
    if (!editable || !hasUnsavedChanges) return;
    if (!isOnline) {
      setSaveState('offline');
      return;
    }
    if (!dailyReportDraftSchema.safeParse(watchedValues).success) {
      setSaveState('pending');
      return;
    }
    setSaveState('pending');
    const timer = window.setTimeout(() => {
      void persistDraft();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [editable, hasUnsavedChanges, isOnline, persistDraft, watchedValues]);

  const changePendingPhotos = (files: File[]) => {
    setPendingPhotoIds((existing) => {
      const next = new Map<File, string>();
      files.forEach((file) => next.set(file, existing.get(file) ?? crypto.randomUUID()));
      return next;
    });
    setPendingPhotos(files);
  };

  const onSiteSignatureChange = (file: File | null) => {
    setSiteSignatureFile(file);
    if (!file) form.setValue('site_manager_signature_path', null, { shouldDirty: true });
  };

  const removePhoto = (path: string) => {
    form.setValue(
      'photo_paths',
      form.getValues('photo_paths').filter((photo) => photo.path !== path),
      { shouldDirty: true },
    );
  };

  const saveLabel = saveState === 'saving'
    ? messages.saving
    : saveState === 'saved'
      ? messages.saved
      : saveState === 'offline'
        ? messages.offline
        : saveState === 'error'
          ? messages.autosaveError
          : messages.pendingSave;

  return {
    form,
    editable,
    showApproverSignature,
    pendingPhotos,
    changePendingPhotos,
    photoPreviewUrls: details?.photoPreviewUrls ?? {},
    siteSignatureUrl: details?.siteSignatureUrl ?? null,
    approverSignatureUrl: details?.approverSignatureUrl ?? null,
    onSiteSignatureChange,
    onApproverSignatureChange: setApproverSignatureFile,
    removePhoto,
    persistDraft,
    submit: workflow.submit,
    approve: workflow.approve,
    hasUnsavedChanges,
    isOnline,
    isSaving,
    saveLabel,
    saveState,
    saveError,
    saveErrorDetail,
    actionFeedback,
  };
}
