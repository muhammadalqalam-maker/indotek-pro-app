import type { FormEvent } from 'react';
import { useFieldArray, useWatch, type UseFormReturn } from 'react-hook-form';
import { AlertCircle, Check, LoaderCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { getMessages } from '../../../i18n';
import { formatVolume } from '../../../utils/format';
import type { DailyReportProgressFormValues } from '../schemas/dailyReportProgress.schema';
import {
  sumProgressEntries,
} from '../utils/dailyReportProgress.helpers';
import type {
  DailyReportProgressEntry,
  DailyReportProgressItem,
} from '../services/dailyReportProgress.service';
import { DailyReportProgressItemCard } from './DailyReportProgressItemCard';

const messages = getMessages().fieldReports;

type DailyReportProgressFormProps = {
  form: UseFormReturn<DailyReportProgressFormValues>;
  entries: DailyReportProgressEntry[];
  reportId: string;
  workItems: DailyReportProgressItem[];
  unitSymbols: Record<string, string>;
  editable: boolean;
  isOnline: boolean;
  includeReportVolumeInTotal: boolean;
  canSave: boolean;
  saveError: string;
  saveErrorDetail: string;
  saveFeedback: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onValidateEntry: (index: number) => void;
};

export function DailyReportProgressForm({
  form,
  entries,
  reportId,
  workItems,
  unitSymbols,
  editable,
  isOnline,
  includeReportVolumeInTotal,
  canSave,
  saveError,
  saveErrorDetail,
  saveFeedback,
  onSubmit,
  onValidateEntry,
}: DailyReportProgressFormProps) {
  const { fields } = useFieldArray({ control: form.control, name: 'entries' });
  const watchedEntries = useWatch({ control: form.control, name: 'entries' }) ?? [];
  const itemsById = new Map(workItems.map((item) => [item.id, item]));

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="space-y-3">
        {fields.map((field, index) => {
          const item = itemsById.get(field.boq_item_id);
          if (!item || item.volume === null) return null;
          const unit = item.unit_id ? unitSymbols[item.unit_id] : undefined;
          const previousVolume = sumProgressEntries(entries, item.id, reportId);
          const enteredVolume = Number(watchedEntries[index]?.installed_volume ?? 0);
          const currentVolume = includeReportVolumeInTotal && Number.isFinite(enteredVolume) ? enteredVolume : 0;
          const cumulativeVolume = previousVolume + currentVolume;
          const remainingVolume = Math.max(0, Number(item.volume) - cumulativeVolume);

          return (
            <DailyReportProgressItemCard
              key={field.id}
              field={field}
              form={form}
              index={index}
              item={item}
              unit={unit}
              cumulativeVolume={cumulativeVolume}
              remainingVolume={remainingVolume}
              editable={editable}
              isOnline={isOnline}
              onValidate={onValidateEntry}
            />
          );
        })}
      </div>

      {saveError && (
        <div className="space-y-1 rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">
          <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" aria-hidden="true" />{saveError}</p>
          {saveErrorDetail && saveErrorDetail !== saveError && (
            <details className="text-xs">
              <summary>Detail teknis</summary>
              <p className="mt-2 break-words">{saveErrorDetail}</p>
            </details>
          )}
        </div>
      )}
      {saveFeedback && (
        <p className="flex items-center gap-2 rounded-md bg-success-bg p-3 text-sm text-success" role="status">
          <Check className="h-4 w-4" aria-hidden="true" />{saveFeedback}
        </p>
      )}
      {form.formState.errors.root?.message && (
        <p className="rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">
          {form.formState.errors.root.message}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={!canSave}>
          {form.formState.isSubmitting
            ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />{messages.progressSaving}</>
            : messages.progressSave}
        </Button>
      </div>
    </form>
  );
}
