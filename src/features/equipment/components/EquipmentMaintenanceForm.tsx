import { useForm } from 'react-hook-form';
import { getMessages } from '../../../i18n';
import type { EquipmentAsset } from '../types';
import {
  equipmentMaintenanceSchema,
  type EquipmentMaintenanceFormValues,
} from '../schemas/equipment.schema';

const messages = getMessages().equipment;
const fieldClassName = 'min-h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-text';

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function EquipmentMaintenanceForm({
  assets,
  isSaving,
  onCancel,
  onSave,
}: {
  assets: EquipmentAsset[];
  isSaving: boolean;
  onCancel: () => void;
  onSave: (values: EquipmentMaintenanceFormValues) => Promise<void>;
}) {
  const form = useForm<EquipmentMaintenanceFormValues>({
    defaultValues: {
      equipment_id: assets[0]?.id ?? '',
      maintenance_date: localDate(),
      next_maintenance_date: '',
      description: '',
      cost_amount: 0,
    },
  });

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    const result = equipmentMaintenanceSchema.safeParse(values);
    if (!result.success) {
      form.setError('root', {
        message: result.error.issues[0]?.message ?? messages.saveError,
      });
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
      <h2 className="text-lg font-semibold text-text sm:col-span-2">{messages.recordMaintenance}</h2>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.equipment}
        <select {...form.register('equipment_id')} disabled={isSaving} className={fieldClassName}>
          {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} · {asset.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.maintenanceDate}
        <input type="date" {...form.register('maintenance_date')} disabled={isSaving} className={fieldClassName} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text sm:col-span-2">
        {messages.maintenanceDescription}
        <textarea {...form.register('description')} rows={2} disabled={isSaving} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-text" />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.maintenanceCostAmount}
        <input type="number" min="0" step="100" inputMode="decimal" {...form.register('cost_amount', { valueAsNumber: true })} disabled={isSaving} className={fieldClassName} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-text">
        {messages.nextMaintenanceDate}
        <input type="date" {...form.register('next_maintenance_date')} disabled={isSaving} className={fieldClassName} />
      </label>
      {form.formState.errors.root?.message && (
        <p role="alert" className="text-sm text-danger sm:col-span-2">{form.formState.errors.root.message}</p>
      )}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancel} disabled={isSaving} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">{messages.cancel}</button>
        <button type="submit" disabled={isSaving || assets.length === 0} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? messages.saving : messages.save}</button>
      </div>
    </form>
  );
}
