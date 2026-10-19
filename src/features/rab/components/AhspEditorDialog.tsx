import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import { formatRupiah } from '../../../utils/format';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '../../../components/ui';
import { calculateAhspTotal } from '../ahspCalculations';
import { ahspSchema } from '../schemas/ahsp.schema';
import type { AhspFormValues } from '../schemas/ahsp.schema';
import type { AhspDetail, AhspPriceItem, MeasurementUnit } from '../types';
import { AhspComponentFields } from './AhspComponentFields';

type Props = {
  open: boolean;
  initial: AhspDetail | null;
  priceItems: AhspPriceItem[];
  units: MeasurementUnit[];
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: AhspFormValues) => Promise<void>;
};

function getDefaultValues(initial: AhspDetail | null): AhspFormValues {
  return {
    code: initial?.code ?? '',
    title: initial?.title ?? '',
    division: initial?.division ?? '',
    unit_id: initial?.unit_id ?? '',
    components: initial?.components.map((component) => ({
      component_id: component.id,
      price_item_id: component.price_item_id,
      coefficient: component.coefficient,
    })) ?? [{ price_item_id: '', coefficient: 1 }],
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
}

export function AhspEditorDialog({
  open,
  initial,
  priceItems,
  units,
  saving,
  onOpenChange,
  onSave,
}: Props) {
  const messages = getMessages().rab;
  const form = useForm<AhspFormValues>({ defaultValues: getDefaultValues(initial) });
  const watchedComponents = useWatch({ control: form.control, name: 'components' }) ?? [];
  const priceItemsById = useMemo(() => new Map(priceItems.map((item) => [item.id, item])), [priceItems]);
  const selectedUnitId = form.watch('unit_id');
  const total = calculateAhspTotal(watchedComponents.map((component) => ({
    coefficient: Number.isFinite(component.coefficient) ? component.coefficient : 0,
    unitPrice: priceItemsById.get(component.price_item_id)?.unit_price ?? 0,
  })));

  useEffect(() => {
    if (open) form.reset(getDefaultValues(initial));
  }, [form, initial, open]);

  const validateAndSave = form.handleSubmit(async (values) => {
    form.clearErrors();
    const result = ahspSchema.safeParse(values);
    if (!result.success) {
      form.setError('root.validation', {
        type: 'validation',
        message: messages.validationSummary,
      });
      const reportedFields = new Set<string>();
      for (const issue of result.error.issues) {
        const [field, index, child] = issue.path;
        const fieldKey = issue.path.join('.');
        if (reportedFields.has(fieldKey)) continue;
        reportedFields.add(fieldKey);
        if (field === 'code' || field === 'title' || field === 'division' || field === 'unit_id') {
          form.setError(field, { type: 'validation', message: issue.message });
        } else if (field === 'components' && typeof index === 'number' && child === 'price_item_id') {
          form.setError(`components.${index}.price_item_id`, { type: 'validation', message: issue.message });
        } else if (field === 'components' && typeof index === 'number' && child === 'coefficient') {
          form.setError(`components.${index}.coefficient`, { type: 'validation', message: issue.message });
        } else {
          form.setError('root.validation', { type: 'validation', message: issue.message });
        }
      }
      const [firstField, firstIndex, firstChild] = result.error.issues[0]?.path ?? [];
      if (firstField === 'code' || firstField === 'title' || firstField === 'division' || firstField === 'unit_id') {
        form.setFocus(firstField);
      } else if (firstField === 'components' && typeof firstIndex === 'number' && firstChild === 'coefficient') {
        form.setFocus(`components.${firstIndex}.coefficient`);
      } else if (firstField === 'components' && typeof firstIndex === 'number') {
        form.setFocus(`components.${firstIndex}.price_item_id`);
      }
      return;
    }

    try {
      await onSave(result.data);
    } catch (error: unknown) {
      form.setError('root.validation', {
        type: 'server',
        message: getErrorMessage(error, messages.saveFailed),
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial ? messages.editTitle : messages.createTitle}</DialogTitle>
          <DialogDescription>{messages.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={validateAndSave} noValidate className="grid gap-5">
          {form.formState.errors.root?.validation?.message && (
            <p className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
              {form.formState.errors.root.validation.message}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={messages.code}
              maxLength={40}
              autoComplete="off"
              error={form.formState.errors.code?.message}
              {...form.register('code', { onChange: () => { form.clearErrors('code'); form.clearErrors('root.validation'); } })}
            />
            <Input
              label={messages.titleField}
              maxLength={180}
              error={form.formState.errors.title?.message}
              {...form.register('title', { onChange: () => { form.clearErrors('title'); form.clearErrors('root.validation'); } })}
            />
            <Input
              label={messages.division}
              maxLength={120}
              error={form.formState.errors.division?.message}
              {...form.register('division', { onChange: () => { form.clearErrors('division'); form.clearErrors('root.validation'); } })}
            />
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-text" htmlFor="ahsp-unit">{messages.unit}</label>
              <select
                id="ahsp-unit"
                aria-invalid={Boolean(form.formState.errors.unit_id)}
                aria-describedby={form.formState.errors.unit_id ? 'ahsp-unit-error' : undefined}
                className="min-h-11 rounded-md border border-border-strong bg-surface px-3 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                {...form.register('unit_id', {
                  onChange: () => { form.clearErrors('unit_id'); form.clearErrors('root.validation'); },
                })}
              >
                <option value="">{messages.chooseUnit}</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id} disabled={unit.deleted_at !== null && unit.id !== selectedUnitId}>
                    {unit.name} ({unit.symbol}){unit.deleted_at !== null ? ` — ${messages.archived}` : ''}
                  </option>
                ))}
              </select>
              {form.formState.errors.unit_id?.message && (
                <p id="ahsp-unit-error" className="text-xs text-danger" role="alert">{form.formState.errors.unit_id.message}</p>
              )}
            </div>
          </div>

          <AhspComponentFields form={form} priceItems={priceItems} units={units} />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-50 p-4 dark:bg-primary-900/40">
            <div>
              <p className="text-xs font-medium text-muted">{messages.calculatedPrice}</p>
              <p className="text-sm font-semibold text-text">{messages.analysisUnitPrice} / {units.find((unit) => unit.id === selectedUnitId)?.symbol ?? '—'}</p>
            </div>
            <output className="font-mono text-xl font-bold text-primary-700 dark:text-primary-500" aria-live="polite">
              {formatRupiah(total)}
            </output>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>{messages.cancel}</Button>
            <Button type="submit" loading={saving}>{saving ? messages.saving : messages.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
