import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import type { BoqDraftFormValues } from '../schemas/boq.schema';
import type { AhspDetail, MeasurementUnit } from '../types';
import { BoqWorkItemFields } from './BoqWorkItemFields';

type BoqDivisionFieldsProps = {
  divisionIndex: number;
  units: MeasurementUnit[];
  analyses: AhspDetail[];
  readOnly: boolean;
  onRemove: () => void;
  nextItemCode: (divisionIndex: number) => string;
};

export function BoqDivisionFields({
  divisionIndex,
  units,
  analyses,
  readOnly,
  onRemove,
  nextItemCode,
}: BoqDivisionFieldsProps) {
  const messages = getMessages().rab;
  const form = useFormContext<BoqDraftFormValues>();
  const basePath = `divisions.${divisionIndex}` as const;
  const workItems = useFieldArray({
    control: form.control,
    name: `${basePath}.work_items`,
    keyName: 'fieldKey',
  });
  const errors = form.formState.errors.divisions?.[divisionIndex];

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-surface-2 p-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(6rem,0.7fr)_minmax(12rem,2fr)_auto] sm:items-end">
        <Input
          label={messages.boqDivisionCode}
          maxLength={40}
          error={errors?.item_code?.message}
          disabled={readOnly}
          {...form.register(`${basePath}.item_code`)}
        />
        <Input
          label={messages.boqDivisionName}
          maxLength={500}
          error={errors?.description?.message}
          disabled={readOnly}
          {...form.register(`${basePath}.description`)}
        />
        {!readOnly && (
          <Button type="button" variant="ghost" onClick={onRemove} aria-label={messages.boqRemoveDivision(divisionIndex)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Hapus divisi
          </Button>
        )}
      </div>

      <div className="grid gap-3">
        {workItems.fields.map((field, itemIndex) => (
          <BoqWorkItemFields
            key={field.fieldKey}
            divisionIndex={divisionIndex}
            itemIndex={itemIndex}
            units={units}
            analyses={analyses}
            readOnly={readOnly}
            onRemove={() => workItems.remove(itemIndex)}
          />
        ))}
        {!readOnly && units.length > 0 && (
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => workItems.append({
                id: crypto.randomUUID(),
                item_code: nextItemCode(divisionIndex),
                description: '',
                unit_id: '',
                ahsp_id: null,
                volume: '',
                unit_price: '',
                sort_order: workItems.fields.length,
              })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {messages.boqAddWork}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
