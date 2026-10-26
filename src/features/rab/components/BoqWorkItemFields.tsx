import { useFormContext, useWatch } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { Button, Input, Select } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatRupiah } from '../../../utils/format';
import { calculateBoqDraftTotals } from '../boqCalculations';
import type { BoqDraftFormValues } from '../schemas/boq.schema';
import type { AhspDetail, MeasurementUnit } from '../types';

type BoqWorkItemFieldsProps = {
  divisionIndex: number;
  itemIndex: number;
  units: MeasurementUnit[];
  analyses: AhspDetail[];
  readOnly: boolean;
  onRemove: () => void;
};

export function BoqWorkItemFields({
  divisionIndex,
  itemIndex,
  units,
  analyses,
  readOnly,
  onRemove,
}: BoqWorkItemFieldsProps) {
  const messages = getMessages().rab;
  const form = useFormContext<BoqDraftFormValues>();
  const itemPath = `divisions.${divisionIndex}.work_items.${itemIndex}` as const;
  const item = useWatch({ control: form.control, name: itemPath });
  const errors = form.formState.errors.divisions?.[divisionIndex]?.work_items?.[itemIndex];
  const lineTotal = calculateBoqDraftTotals(
    [{ volume: item?.volume ?? '0', unit_price: item?.unit_price ?? '0' }],
    '0',
    '0',
    '0',
  ).directCost;

  return (
    <fieldset className="grid gap-3 rounded-lg border border-border bg-surface p-3">
      <legend className="sr-only">{`Item pekerjaan ${itemIndex + 1}`}</legend>
      <div className="grid gap-3 sm:grid-cols-[minmax(5rem,0.7fr)_minmax(12rem,2fr)]">
        <Input
          label={messages.boqWorkCode}
          maxLength={40}
          error={errors?.item_code?.message}
          disabled={readOnly}
          {...form.register(`${itemPath}.item_code`)}
        />
        <Input
          label={messages.boqWorkDescription}
          maxLength={500}
          error={errors?.description?.message}
          disabled={readOnly}
          {...form.register(`${itemPath}.description`)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label={messages.boqAhspReference}
          disabled={readOnly || analyses.length === 0}
          {...form.register(`${itemPath}.ahsp_id`, {
            onChange: (event) => {
              const selected = analyses.find((analysis) => analysis.id === event.target.value);
              if (!selected) return;
              form.setValue(`${itemPath}.unit_id`, selected.unit_id, { shouldDirty: true });
              form.setValue(`${itemPath}.unit_price`, String(selected.unitPrice), { shouldDirty: true });
            },
          })}
        >
          <option value="">{messages.boqManualEntry}</option>
          {analyses.map((analysis) => (
            <option key={analysis.id} value={analysis.id}>
              {analysis.code} — {analysis.title}
            </option>
          ))}
        </Select>

        <Select
          label={messages.boqUnit}
          error={errors?.unit_id?.message}
          disabled={readOnly}
          {...form.register(`${itemPath}.unit_id`)}
        >
          <option value="">{messages.boqChooseUnit}</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>
          ))}
        </Select>

        <Input
          label={messages.boqVolume}
          type="number"
          min="0"
          max="1000000"
          step="0.0001"
          inputMode="decimal"
          error={errors?.volume?.message}
          disabled={readOnly}
          {...form.register(`${itemPath}.volume`)}
        />

        <Input
          label={messages.boqUnitPrice}
          type="number"
          min="0"
          max="1000000000"
          step="0.01"
          inputMode="decimal"
          prefix="Rp"
          error={errors?.unit_price?.message}
          disabled={readOnly}
          {...form.register(`${itemPath}.unit_price`)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-sm text-muted-foreground">
          {messages.boqLineTotal}: <strong className="tabular-nums text-text">{formatRupiah(lineTotal, true, 2)}</strong>
        </p>
        {!readOnly && (
          <Button type="button" variant="ghost" size="md" onClick={onRemove} aria-label={messages.boqRemoveWork(itemIndex)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Hapus item
          </Button>
        )}
      </div>
    </fieldset>
  );
}
