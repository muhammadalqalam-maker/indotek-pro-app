import type { FormEventHandler } from 'react';
import { FormProvider, useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Plus, Save } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import type { BoqDraftTotals } from '../boqCalculations';
import type { BoqDraftFormValues } from '../schemas/boq.schema';
import type { AhspDetail, MeasurementUnit } from '../types';
import { BoqDivisionFields } from './BoqDivisionFields';
import { BoqTotalSummary } from './BoqTotalSummary';

type BoqMessages = ReturnType<typeof getMessages>['rab'];

type BoqDraftEditorProps = {
  form: UseFormReturn<BoqDraftFormValues>;
  units: MeasurementUnit[];
  analyses: AhspDetail[];
  totals: BoqDraftTotals;
  messages: BoqMessages;
  readOnly: boolean;
  isSaving: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
};

export function BoqDraftEditor({
  form,
  units,
  analyses,
  totals,
  messages,
  readOnly,
  isSaving,
  onSubmit,
  onCancel,
}: BoqDraftEditorProps) {
  const divisions = useFieldArray({
    control: form.control,
    name: 'divisions',
    keyName: 'fieldKey',
  });
  const nextItemCode = (divisionIndex: number) => {
    const count = form.getValues(`divisions.${divisionIndex}.work_items`).length + 1;
    return `${divisionIndex + 1}.${count}`;
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <section className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h3 className="text-base font-semibold text-text">{messages.boqEditorTitle}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={messages.boqDraftTitle} maxLength={180} error={form.formState.errors.title?.message} disabled={readOnly} {...form.register('title')} />
            <Input label={messages.boqOverhead} type="number" min="0" max="100" step="0.01" inputMode="decimal" suffix="%" error={form.formState.errors.overhead_percent?.message} disabled={readOnly} {...form.register('overhead_percent')} />
            <Input label={messages.boqProfit} type="number" min="0" max="100" step="0.01" inputMode="decimal" suffix="%" error={form.formState.errors.profit_percent?.message} disabled={readOnly} {...form.register('profit_percent')} />
            <Input label={messages.boqPpn} type="number" min="0" max="100" step="0.01" inputMode="decimal" suffix="%" error={form.formState.errors.ppn_percent?.message} disabled={readOnly} {...form.register('ppn_percent')} />
          </div>
          {units.length === 0 && <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-muted">{messages.boqNoUnits}</p>}
        </section>

        <div className="grid gap-4">
          {divisions.fields.map((division, index) => (
            <BoqDivisionFields
              key={division.fieldKey}
              divisionIndex={index}
              units={units}
              analyses={analyses}
              readOnly={readOnly}
              onRemove={() => divisions.remove(index)}
              nextItemCode={nextItemCode}
            />
          ))}
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-fit"
              onClick={() => divisions.append({
                id: crypto.randomUUID(),
                item_code: `DIV-${divisions.fields.length + 1}`,
                description: '',
                sort_order: divisions.fields.length,
                work_items: [],
              })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {messages.boqAddDivision}
            </Button>
          )}
        </div>

        <BoqTotalSummary totals={totals} messages={messages} live />

        {!readOnly && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>{getMessages().common.cancel}</Button>
            <Button type="submit" loading={isSaving}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {isSaving ? messages.boqSaving : messages.boqSave}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  );
}
