import { useMemo } from 'react';
import { useFieldArray, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { formatRupiah } from '../../../utils/format';
import { Button, Input } from '../../../components/ui';
import { calculateAhspLineTotal } from '../ahspCalculations';
import type { AhspFormValues } from '../schemas/ahsp.schema';
import type { AhspPriceItem, MeasurementUnit } from '../types';

type Props = {
  form: UseFormReturn<AhspFormValues>;
  priceItems: AhspPriceItem[];
  units: MeasurementUnit[];
};

function getCategoryLabel(category: string, messages: ReturnType<typeof getMessages>['rab']): string {
  if (category === 'bahan') return messages.material;
  if (category === 'upah') return messages.labor;
  if (category === 'alat') return messages.equipment;
  return category;
}

export function AhspComponentFields({ form, priceItems, units }: Props) {
  const messages = getMessages().rab;
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'components' });
  const watchedComponents = useWatch({ control: form.control, name: 'components' }) ?? [];
  const priceItemsById = useMemo(() => new Map(priceItems.map((item) => [item.id, item])), [priceItems]);
  const hasActivePriceItems = priceItems.some((item) => item.deleted_at === null);

  return (
    <section className="grid gap-3" aria-labelledby="ahsp-components-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="ahsp-components-heading" className="text-sm font-semibold text-text">{messages.componentHeading}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{messages.componentHint}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => append({ price_item_id: '', coefficient: 1 })}
          disabled={fields.length >= 100 || !hasActivePriceItems}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {messages.addComponent}
        </Button>
      </div>

      {form.formState.errors.components?.message && (
        <p className="text-sm text-danger" role="alert">{form.formState.errors.components.message}</p>
      )}

      <div className="grid gap-3">
        {fields.map((field, index) => {
          const selectedItem = priceItemsById.get(watchedComponents[index]?.price_item_id ?? '');
          const coefficient = Number.isFinite(watchedComponents[index]?.coefficient)
            ? watchedComponents[index].coefficient
            : 0;
          const subtotal = selectedItem
            ? calculateAhspLineTotal(coefficient, selectedItem.unit_price)
            : 0;
          const priceItemError = form.formState.errors.components?.[index]?.price_item_id?.message;
          const coefficientError = form.formState.errors.components?.[index]?.coefficient?.message;
          const itemLabel = selectedItem?.name ?? messages.choosePriceItem;

          return (
            <fieldset key={field.id} className="grid gap-3 rounded-lg border border-border bg-surface-2/40 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end">
              {field.component_id && (
                <input type="hidden" {...form.register(`components.${index}.component_id`)} />
              )}
              <div className="grid min-w-0 gap-1.5">
                <label className="text-sm font-medium text-text" htmlFor={`ahsp-item-${field.id}`}>
                  {messages.choosePriceItem}
                </label>
                <select
                  id={`ahsp-item-${field.id}`}
                  aria-invalid={Boolean(priceItemError)}
                  aria-describedby={priceItemError ? `ahsp-item-error-${field.id}` : undefined}
                  className="min-h-11 min-w-0 rounded-md border border-border-strong bg-surface px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  {...form.register(`components.${index}.price_item_id`, {
                    onChange: () => {
                      form.clearErrors(`components.${index}.price_item_id`);
                      form.clearErrors('root.validation');
                    },
                  })}
                >
                  <option value="">{messages.choosePriceItem}</option>
                  {priceItems.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={item.deleted_at !== null && item.id !== watchedComponents[index]?.price_item_id}
                    >
                      {item.code} — {item.name} ({item.unitSymbol}){item.deleted_at !== null ? ` — ${messages.archived}` : ''}
                    </option>
                  ))}
                </select>
                {selectedItem && (
                  <p className="text-xs text-muted-foreground">
                    {messages.category}: {getCategoryLabel(selectedItem.category, messages)}
                    {' · '}{formatRupiah(selectedItem.unit_price)} / {selectedItem.unitSymbol}
                    {selectedItem.deleted_at !== null && ` · ${messages.archived}`}
                  </p>
                )}
                {priceItemError && (
                  <p id={`ahsp-item-error-${field.id}`} className="text-xs text-danger" role="alert">{priceItemError}</p>
                )}
              </div>

              <Input
                label={messages.coefficient}
                type="number"
                min="0.000001"
                max="999999999999.999999"
                step="0.000001"
                inputMode="decimal"
                error={coefficientError}
                {...form.register(`components.${index}.coefficient`, {
                  valueAsNumber: true,
                  onChange: () => {
                    form.clearErrors(`components.${index}.coefficient`);
                    form.clearErrors('root.validation');
                  },
                })}
              />

              <div className="flex min-h-11 items-center justify-between gap-3 sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-xs text-muted-foreground">{messages.subtotal}</p>
                  <p className="font-mono text-sm font-semibold text-text">{formatRupiah(subtotal)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="md"
                  className="h-11 w-11 shrink-0 p-0 text-danger"
                  aria-label={messages.removeComponent(itemLabel)}
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </fieldset>
          );
        })}
      </div>

      {(!hasActivePriceItems || !units.some((unit) => unit.deleted_at === null)) && (
        <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-muted-foreground">{messages.noCatalogItems}</p>
      )}
    </section>
  );
}
