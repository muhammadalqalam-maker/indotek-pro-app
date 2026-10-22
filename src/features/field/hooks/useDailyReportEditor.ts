import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { useApp } from '../../../context/AppContext';
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
import {
  enqueueDraftWithPhotos,
  removePhotoFromQueue,
  type OfflineDraftPayload,
  type OfflinePhotoQueueItem,
} from '../../../lib/offlineDb';
import { useOfflineQueueStore } from '../../../stores/offlineQueue.store';

const messages = getMessages().fieldReports;
type SaveState = 'saved' | 'pending' | 'saving' | 'error' | 'offline' | 'invalid';

function technicalError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export type DailyReportEditorState = {
  form: UseFormReturn<DailyReportFormValues>;
  editable: boolean;
  pendingPhotos: File[];
  changePendingPhotos: (files: File[]) => void;
  photoPreviewUrls: Record<string, string>;
  siteSignatureUrl: string | null;
  onSiteSignatureChange: (file: File | null) => void;
  removePhoto: (path: string) => void;
  persistDraft: (showValidation?: boolean) => Promise<boolean>;
  submit: () => Promise<void>;
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
  reportsKey,
}: UseDailyReportEditorOptions): DailyReportEditorState {
  const { authSession } = useApp();
  const authUserId = authSession?.user.id ?? '';
  const queryClient = useQueryClient();
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [pendingPhotoIds, setPendingPhotoIds] = useState<Map<File, string>>(() => new Map());
  const [siteSignatureFile, setSiteSignatureFile] = useState<File | null>(null);
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
      if (!authUserId) {
        setSaveState('error');
        setSaveError(messages.autosaveError);
        setSaveErrorDetail('Sesi pengguna tidak tersedia. Masuk kembali sebelum menyimpan secara offline.');
        return false;
      }

      const payload: OfflineDraftPayload = {
        report_date: parsed.data.report_date,
        site_manager_name: parsed.data.site_manager_name,
        weather_conditions: parsed.data.weather_conditions,
        work_summary: parsed.data.work_summary,
        obstacles: parsed.data.obstacles,
        solutions: parsed.data.solutions,
        site_manager_signature_path: parsed.data.site_manager_signature_path ?? null,
        photo_paths: [...parsed.data.photo_paths],
        manpower: parsed.data.manpower,
        equipment: parsed.data.equipment,
        materials: parsed.data.materials,
      };
      const queuedAt = new Date().toISOString();
      const photos: OfflinePhotoQueueItem[] = pendingPhotos.map((file) => {
        const photoId = pendingPhotoIds.get(file) ?? crypto.randomUUID();
        payload.photo_paths.push({ path: `offline:${photoId}`, caption: file.name });
        return {
          id: `${reportId}-${photoId}`,
          reportId,
          organizationId,
          projectId,
          userId: authUserId,
          photoId,
          fileName: file.name,
          blob: file,
          purpose: 'photo',
          queuedAt,
          attempts: 0,
          lastError: null,
        };
      });
      if (siteSignatureFile) {
        photos.push({
          id: `${reportId}-site-signature`,
          reportId,
          organizationId,
          projectId,
          userId: authUserId,
          photoId: 'site-manager',
          fileName: 'site-manager.png',
          blob: siteSignatureFile,
          purpose: 'site-signature',
          queuedAt,
          attempts: 0,
          lastError: null,
        });
      }
      await enqueueDraftWithPhotos({
        reportId,
        organizationId,
        projectId,
        userId: authUserId,
        payload,
        queuedAt,
        serverUpdatedAt: details?.report.id === reportId ? details.syncVersion : null,
        attempts: 0,
        lastError: null,
      }, photos);
      await useOfflineQueueStore.getState().refreshCounts(organizationId, authUserId);
      form.reset({ ...parsed.data, photo_paths: payload.photo_paths });
      setPendingPhotos([]);
      setPendingPhotoIds(new Map());
      setSiteSignatureFile(null);
      setSaveState('offline');
      return true;
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
    details,
  ]);

  const workflow = useDailyReportWorkflowActions({
    organizationId,
    projectId,
    reportId,
    form,
    isOnline,
    hasSiteSignatureFile: siteSignatureFile !== null,
    persistDraft,
    queryClient,
    reportsKey,
    setIsSaving,
    setSaveError,
    setSaveErrorDetail,
    setActionFeedback,
  });

  useEffect(() => {
    if (!editable || !hasUnsavedChanges) return;
    if (!isOnline) {
      setSaveState('offline');
      const timer = window.setTimeout(() => {
        void persistDraft();
      }, 900);
      return () => window.clearTimeout(timer);
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

  const removeQueuedPhoto = async (id: string) => {
    try {
      await removePhotoFromQueue(id);
      await useOfflineQueueStore.getState().refreshCounts(organizationId, authUserId);
    } catch (error: unknown) {
      setSaveError(messages.autosaveError);
      setSaveErrorDetail(technicalError(error));
      setSaveState('error');
    }
  };

  const onSiteSignatureChange = (file: File | null) => {
    setSiteSignatureFile(file);
    if (!file) form.setValue('site_manager_signature_path', null, { shouldDirty: true });
    if (!file && reportId) {
      void removeQueuedPhoto(`${reportId}-site-signature`);
    }
  };

  const removePhoto = (path: string) => {
    if (path.startsWith('offline:') && reportId) {
      const photoId = path.slice('offline:'.length);
      void removeQueuedPhoto(`${reportId}-${photoId}`);
    }
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
    pendingPhotos,
    changePendingPhotos,
    photoPreviewUrls: details?.photoPreviewUrls ?? {},
    siteSignatureUrl: details?.siteSignatureUrl ?? null,
    onSiteSignatureChange,
    removePhoto,
    persistDraft,
    submit: workflow.submit,
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
