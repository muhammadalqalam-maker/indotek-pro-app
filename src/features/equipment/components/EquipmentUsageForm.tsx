import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import { formatRupiah } from '../../../utils/format';
import type { Project } from '../../../types/database';
import type { EquipmentAsset } from '../types';
import {
  equipmentUsageSchema,
  type EquipmentUsageFormValues,
} from '../schemas/equipment.schema';

const messages = getMessages().equipment;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function EquipmentUsageForm({
  assets,
  projects,
  defaultProjectId,
  isSaving,
  onCancel,
  onSave,
}: {
  assets: EquipmentAsset[];
  projects: Project[];
  defaultProjectId: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (values: EquipmentUsageFormValues) => Promise<void>;
}) {
  const form = useForm<EquipmentUsageFormValues>({
    defaultValues: {
      project_id: defaultProjectId || projects[0]?.id || '',
      equipment_id: '',
      usage_date: localDate(),
      operating_hours: 1,
      fuel_liters: 0,
      fuel_cost_amount: 0,
      notes: '',
    },
  });
  const projectId = form.watch('project_id');
  const eligibleAssets = assets.filter((asset) => (
    asset.assigned_project_id === null || asset.assigned_project_id === projectId
  ));

  useEffect(() => {
    if (!eligibleAssets.some((asset) => asset.id === form.getValues('equipment_id'))) {
      form.setValue('equipment_id', eligibleAssets[0]?.id ?? '');
    }
  }, [eligibleAssets, form]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    const result = equipmentUsageSchema.safeParse(values);
    if (!result.success) {
      const issue = result.error.issues[0];
      form.setError('root', { message: issue?.message ?? messages.saveError });
      return;
    }
    try {
      await onSave(result.data);
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : messages.saveError,
      });
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
      <h2 className="text-lg font-semibold text-text sm:col-span-2">{messages.recordUsage}</h2>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.project}
        <select {...form.register('project_id')} disabled={isSaving} className={fieldClassName}>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.equipment}
        <select {...form.register('equipment_id')} disabled={isSaving || eligibleAssets.length === 0} className={fieldClassName}>
          {eligibleAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} · {asset.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.usageDate}
        <input type="date" {...form.register('usage_date')} disabled={isSaving} className={fieldClassName} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.operatingHoursInput}
        <input type="number" min="0.01" max="24" step="0.01" inputMode="decimal" {...form.register('operating_hours', { valueAsNumber: true })} disabled={isSaving} className={fieldClassName} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.fuelLiters}
        <input type="number" min="0" step="0.1" inputMode="decimal" {...form.register('fuel_liters', { valueAsNumber: true })} disabled={isSaving} className={fieldClassName} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.fuelCostAmount}
        <input type="number" min="0" step="100" inputMode="decimal" {...form.register('fuel_cost_amount', { valueAsNumber: true })} disabled={isSaving} className={fieldClassName} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.notes}
        <textarea {...form.register('notes')} rows={2} disabled={isSaving} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text" />
      </label>
      <p className="text-sm text-muted sm:col-span-2">
        {messages.rentalSnapshot}: {formatRupiah(
          eligibleAssets.find((asset) => asset.id === form.watch('equipment_id'))?.ownership === 'rental'
            ? eligibleAssets.find((asset) => asset.id === form.watch('equipment_id'))?.daily_rental_rate ?? 0
            : 0,
        )}
      </p>
      {form.formState.errors.root?.message && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">{form.formState.errors.root.message}</p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">{messages.cancel}</button>
        <button type="submit" disabled={isSaving || eligibleAssets.length === 0} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? messages.saving : messages.save}</button>
      </div>
    </form>
  );
}
