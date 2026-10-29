import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import type { Project } from '../../../types/database';
import {
  equipmentAssetSchema,
  type EquipmentAssetFormValues,
} from '../schemas/equipment.schema';
import { EQUIPMENT_CATEGORIES, EQUIPMENT_CONDITIONS, type EquipmentAsset } from '../types';

const messages = getMessages().equipment;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';

export function EquipmentAssetForm({
  asset,
  projects,
  defaultProjectId,
  isSaving,
  onCancel,
  onSave,
}: {
  asset: EquipmentAsset | null;
  projects: Project[];
  defaultProjectId: string;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (values: EquipmentAssetFormValues) => Promise<void>;
}) {
  const form = useForm<EquipmentAssetFormValues>({
    defaultValues: {
      code: asset?.code ?? '',
      name: asset?.name ?? '',
      brand_model: asset?.brand_model ?? '',
      category: asset?.category ?? 'Alat Berat',
      ownership: asset?.ownership ?? 'internal_asset',
      assigned_project_id: asset?.assigned_project_id ?? defaultProjectId,
      daily_rental_rate: asset?.daily_rental_rate ?? 0,
      condition: asset?.condition ?? 'Baik',
      fuel_consumption_rate: asset?.fuel_consumption_rate ?? '',
      next_maintenance_date: asset?.next_maintenance_date ?? '',
    },
  });
  const ownership = form.watch('ownership');

  useEffect(() => {
    form.reset({
      code: asset?.code ?? '',
      name: asset?.name ?? '',
      brand_model: asset?.brand_model ?? '',
      category: asset?.category ?? 'Alat Berat',
      ownership: asset?.ownership ?? 'internal_asset',
      assigned_project_id: asset?.assigned_project_id ?? defaultProjectId,
      daily_rental_rate: asset?.daily_rental_rate ?? 0,
      condition: asset?.condition ?? 'Baik',
      fuel_consumption_rate: asset?.fuel_consumption_rate ?? '',
      next_maintenance_date: asset?.next_maintenance_date ?? '',
    });
  }, [asset, defaultProjectId, form]);

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    const result = equipmentAssetSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (typeof path === 'string') {
          form.setError(path as keyof EquipmentAssetFormValues, { message: issue.message });
        }
      }
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

  const fieldError = (name: keyof EquipmentAssetFormValues) => form.formState.errors[name]?.message;

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:grid-cols-2 sm:p-5">
      <div className="sm:col-span-2">
        <h2 className="text-lg font-semibold text-text">{asset ? messages.editAsset : messages.addAsset}</h2>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.code}
        <input {...form.register('code')} disabled={isSaving} className={fieldClassName} />
        {fieldError('code') && <span className="text-xs text-danger">{fieldError('code')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.name}
        <input {...form.register('name')} disabled={isSaving} className={fieldClassName} />
        {fieldError('name') && <span className="text-xs text-danger">{fieldError('name')}</span>}
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.model}
        <input {...form.register('brand_model')} disabled={isSaving} className={fieldClassName} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.category}
        <select {...form.register('category')} disabled={isSaving} className={fieldClassName}>
          {EQUIPMENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.ownership}
        <select
          {...form.register('ownership', {
            onChange: (event) => {
              if (event.target.value === 'internal_asset') {
                form.setValue('daily_rental_rate', 0);
              }
            },
          })}
          disabled={isSaving}
          className={fieldClassName}
        >
          <option value="internal_asset">{messages.internalAsset}</option>
          <option value="rental">{messages.rental}</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.condition}
        <select {...form.register('condition')} disabled={isSaving} className={fieldClassName}>
          {EQUIPMENT_CONDITIONS.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.assignedProject}
        <select {...form.register('assigned_project_id')} disabled={isSaving} className={fieldClassName}>
          <option value="">{messages.unassigned}</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </label>
      {ownership === 'rental' && (
        <label className="grid gap-1.5 text-sm font-medium text-text">
          {messages.dailyRentalRate}
          <input type="number" min="0" step="100" inputMode="decimal" {...form.register('daily_rental_rate', { valueAsNumber: true })} disabled={isSaving} className={fieldClassName} />
          {fieldError('daily_rental_rate') && <span className="text-xs text-danger">{fieldError('daily_rental_rate')}</span>}
        </label>
      )}
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.nextMaintenanceDate}
        <input type="date" {...form.register('next_maintenance_date')} disabled={isSaving} className={fieldClassName} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.fuelConsumptionRate}
        <input {...form.register('fuel_consumption_rate')} disabled={isSaving} className={fieldClassName} />
      </label>
      {form.formState.errors.root?.message && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">{form.formState.errors.root.message}</p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">
          {messages.cancel}
        </button>
        <button type="submit" disabled={isSaving} className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {isSaving ? messages.saving : messages.save}
        </button>
      </div>
    </form>
  );
}
