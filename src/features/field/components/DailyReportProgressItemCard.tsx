import type { FieldArrayWithId, FieldPath, UseFormReturn } from 'react-hook-form';
import { Input } from '../../../components/ui/Input';
import { getMessages } from '../../../i18n';
import { formatVolume } from '../../../utils/format';
import type { DailyReportProgressFormValues } from '../schemas/dailyReportProgress.schema';
import type { DailyReportProgressItem } from '../services/dailyReportProgress.service';

const messages = getMessages().fieldReports;

type DailyReportProgressItemCardProps = {
  field: FieldArrayWithId<DailyReportProgressFormValues, 'entries', 'id'>;
  form: UseFormReturn<DailyReportProgressFormValues>;
  index: number;
  item: DailyReportProgressItem;
  unit?: string;
  cumulativeVolume: number;
  remainingVolume: number;
  editable: boolean;
  isOnline: boolean;
  onValidate: (index: number) => void;
};

export function DailyReportProgressItemCard({
  field,
  form,
  index,
  item,
  unit,
  cumulativeVolume,
  remainingVolume,
  editable,
  isOnline,
  onValidate,
}: DailyReportProgressItemCardProps) {
  const volumePath = `entries.${index}.installed_volume` as const;
  const remarksPath = `entries.${index}.remarks` as const;
  const volumeField = form.register(volumePath);
  const remarksField = form.register(remarksPath);

  return (
    <article className="space-y-3 rounded-lg border border-border p-3 sm:p-4">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-text">{item.description}</p>
        <p className="mt-1 text-xs text-muted">
          <span className="font-mono">{item.item_code}</span>
          {unit ? ` · ${unit}` : ''}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-md bg-surface-2 p-2">
          <dt className="text-muted">{messages.progressBudgetVolume}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-text">{formatVolume(item.volume)}{unit ? ` ${unit}` : ''}</dd>
        </div>
        <div className="rounded-md bg-surface-2 p-2">
          <dt className="text-muted">{messages.progressCumulativeVolume}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-text">{formatVolume(cumulativeVolume)}{unit ? ` ${unit}` : ''}</dd>
        </div>
        <div className="rounded-md bg-surface-2 p-2">
          <dt className="text-muted">{messages.progressRemainingVolume}</dt>
          <dd className="mt-1 font-semibold tabular-nums text-text">{formatVolume(remainingVolume)}{unit ? ` ${unit}` : ''}</dd>
        </div>
      </dl>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          {...volumeField}
          type="number"
          min={0}
          max={field.maximum_volume}
          step="0.0001"
          label={messages.progressReportVolume}
          suffix={unit}
          disabled={!editable || !isOnline || form.formState.isSubmitting}
          error={form.formState.errors.entries?.[index]?.installed_volume?.message}
          onBlur={(event) => {
            void volumeField.onBlur(event);
            onValidate(index);
          }}
        />
        <Input
          {...remarksField}
          label={messages.progressItemRemarks}
          maxLength={1000}
          disabled={!editable || !isOnline || form.formState.isSubmitting}
          error={form.formState.errors.entries?.[index]?.remarks?.message}
          onBlur={(event) => {
            void remarksField.onBlur(event);
            onValidate(index);
          }}
        />
      </div>
    </article>
  );
}
