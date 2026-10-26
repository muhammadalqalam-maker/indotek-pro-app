import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';
import { Button, ConfirmDialog, Input, useToast } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { measurementUnitSchema } from '../schemas/settings.schema';
import {
  createMeasurementUnit,
  fetchMeasurementUnits,
  softDeleteMeasurementUnit,
  updateMeasurementUnit,
  missingSettingsMigrationMessage,
} from '../services/settings.service';
import type { MeasurementUnit } from '../types';

type UnitForm = { code: string; name: string; symbol: string };
const emptyForm: UnitForm = { code: '', name: '', symbol: '' };

export function MeasurementUnitsPanel({
  organizationId,
  canEdit,
  onUnitsChange,
}: {
  organizationId: string;
  canEdit: boolean;
  onUnitsChange: (units: MeasurementUnit[]) => void;
}) {
  const messages = getMessages().settings;
  const { toast } = useToast();
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [form, setForm] = useState<UnitForm>(emptyForm);
  const [editing, setEditing] = useState<MeasurementUnit | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof UnitForm, string>>>({});
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<MeasurementUnit | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const result = await fetchMeasurementUnits(organizationId);
      setUnits(result);
      onUnitsChange(result);
    } catch (error: unknown) {
      setLoadError(
        missingSettingsMigrationMessage(error)
          ? messages.catalogMigrationMissing
          : error instanceof Error ? error.message : messages.loadSettingsFailed,
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages.loadSettingsFailed, onUnitsChange, organizationId]);

  useEffect(() => { void load(); }, [load]);

  const startEdit = (unit: MeasurementUnit) => {
    setEditing(unit);
    setForm({ code: unit.code, name: unit.name, symbol: unit.symbol });
    setErrors({});
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
  };

  const save = async (event: import('react').FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = measurementUnitSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof UnitForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'code' || field === 'name' || field === 'symbol') nextErrors[field] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    setIsSaving(true);
    setErrors({});
    try {
      if (editing) {
        await updateMeasurementUnit(editing.id, organizationId, parsed.data);
      } else {
        await createMeasurementUnit(organizationId, parsed.data);
      }
      cancelEdit();
      await load();
      toast({ title: messages.unitSaved, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.unitSaveFailed,
        description: error instanceof Error ? error.message : messages.unexpectedError,
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const archive = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    try {
      await softDeleteMeasurementUnit(archiveTarget.id, organizationId);
      setArchiveTarget(null);
      await load();
      toast({ title: messages.unitArchived, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.unitArchiveFailed,
        description: error instanceof Error ? error.message : messages.unexpectedError,
        variant: 'error',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <section className="grid gap-4" aria-labelledby="measurement-units-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="measurement-units-title" className="text-base font-semibold text-text">{messages.units}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{messages.emptyUnits}</p>
        </div>
        {editing && <Button variant="outline" size="sm" onClick={cancelEdit}><X className="h-4 w-4" aria-hidden="true" />{messages.cancel}</Button>}
      </div>

      {canEdit && (
        <form onSubmit={(event) => void save(event)} className="grid gap-3 rounded-md bg-surface-2 p-3 sm:grid-cols-[1fr_2fr_1fr_auto] sm:items-end">
          <Input label={messages.code} value={form.code} maxLength={20} error={errors.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          <Input label={messages.name} value={form.name} maxLength={80} error={errors.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Input label={messages.symbol} value={form.symbol} maxLength={16} error={errors.symbol} onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value }))} />
          <Button type="submit" variant="accent" loading={isSaving}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {editing ? messages.saveUnit : messages.addUnit}
          </Button>
        </form>
      )}

      {isLoading ? (
        <div className="grid gap-2" role="status" aria-busy="true" aria-label={messages.loadingSettings}>
          <div className="h-12 animate-pulse rounded-md bg-surface-2" />
          <div className="h-12 animate-pulse rounded-md bg-surface-2" />
        </div>
      ) : loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          <span>{messages.loadSettingsFailed} {loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>{messages.retry}</Button>
        </div>
      ) : units.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">{messages.emptyUnits}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-3">{messages.code}</th>
                <th scope="col" className="px-3 py-3">{messages.name}</th>
                <th scope="col" className="px-3 py-3">{messages.symbol}</th>
                <th scope="col" className="px-3 py-3">{messages.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {units.map((unit) => (
                <tr key={unit.id} className={unit.deleted_at ? 'text-muted-foreground' : 'text-text'}>
                  <td className="px-3 py-3 font-mono">{unit.code}</td>
                  <td className="px-3 py-3">{unit.name}{unit.deleted_at ? ` — ${messages.archive}` : ''}</td>
                  <td className="px-3 py-3">{unit.symbol}</td>
                  <td className="px-3 py-3">
                    {!unit.deleted_at && canEdit && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(unit)}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />{messages.edit}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setArchiveTarget(unit)}>{messages.archive}</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open && !isArchiving) setArchiveTarget(null); }}
        title={messages.deleteUnit}
        description={archiveTarget ? `${archiveTarget.name} (${archiveTarget.symbol})` : undefined}
        confirmLabel={messages.archive}
        destructive
        loading={isArchiving}
        onConfirm={() => void archive()}
      />
    </section>
  );
}
