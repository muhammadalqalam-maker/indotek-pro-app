import { useCallback, useEffect, useState } from 'react';
import { FileUp, Plus, X } from 'lucide-react';
import { Button, ConfirmDialog, Input, Select, useToast } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { priceItemSchema, type PriceItemFormInput } from '../schemas/settings.schema';
import { PriceItemsImportDialog } from './PriceItemsImportDialog';
import { PriceItemsList } from './PriceItemsList';
import {
  createPriceItem,
  fetchPriceItems,
  softDeletePriceItem,
  updatePriceItem,
  missingSettingsMigrationMessage,
} from '../services/settings.service';
import type { MeasurementUnit, PriceItem } from '../types';

const newPriceItem = (): PriceItemFormInput => ({
  category: 'bahan',
  code: '',
  name: '',
  unit_id: '',
  unit_price: 0,
  region: '',
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: '',
  source: '',
});

const categories = ['bahan', 'upah', 'alat'] as const;

export function PriceItemsPanel({
  organizationId,
  canEdit,
  units,
}: {
  organizationId: string;
  canEdit: boolean;
  units: MeasurementUnit[];
}) {
  const messages = getMessages().settings;
  const { toast } = useToast();
  const activeUnits = units.filter((unit) => !unit.deleted_at);
  const [items, setItems] = useState<PriceItem[]>([]);
  const [form, setForm] = useState<PriceItemFormInput>(newPriceItem);
  const [editing, setEditing] = useState<PriceItem | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof PriceItemFormInput, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<PriceItem | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      setItems(await fetchPriceItems(organizationId));
    } catch (error: unknown) {
      setLoadError(
        missingSettingsMigrationMessage(error)
          ? messages.catalogMigrationMissing
          : error instanceof Error ? error.message : messages.loadSettingsFailed,
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages.loadSettingsFailed, organizationId]);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setForm(newPriceItem());
    setErrors({});
  };

  const editItem = (item: PriceItem) => {
    setEditing(item);
    setForm({
      category: item.category,
      code: item.code,
      name: item.name,
      unit_id: item.unit_id,
      unit_price: item.unit_price,
      region: item.region ?? '',
      valid_from: item.valid_from,
      valid_until: item.valid_until ?? '',
      source: item.source ?? '',
    });
    setErrors({});
  };

  const save = async (event: import('react').FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = priceItemSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Partial<Record<keyof PriceItemFormInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && field in form) {
          nextErrors[field as keyof PriceItemFormInput] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setErrors({});
    try {
      const payload = {
        ...parsed.data,
        region: parsed.data.region || null,
        valid_until: parsed.data.valid_until || null,
        source: parsed.data.source || null,
      };
      if (editing) {
        await updatePriceItem(editing.id, organizationId, payload);
      } else {
        await createPriceItem(organizationId, payload);
      }
      resetForm();
      await load();
      toast({ title: messages.priceItemSaved, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.priceItemSaveFailed,
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
      await softDeletePriceItem(archiveTarget.id, organizationId);
      setArchiveTarget(null);
      await load();
      toast({ title: messages.priceItemArchived, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.priceItemArchiveFailed,
        description: error instanceof Error ? error.message : messages.unexpectedError,
        variant: 'error',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <section className="grid gap-4" aria-labelledby="price-items-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="price-items-title" className="text-base font-semibold text-text">{messages.priceItems}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{messages.estimatingCatalogHint}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {messages.importExcel}
            </Button>
          )}
          {editing && <Button variant="outline" size="sm" onClick={resetForm}><X className="h-4 w-4" aria-hidden="true" />{messages.cancel}</Button>}
        </div>
      </div>

      {canEdit && (
        <form onSubmit={(event) => void save(event)} className="grid gap-3 rounded-md bg-surface-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label={messages.category}
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as PriceItemFormInput['category'] }))}
          >
            {categories.map((category) => <option key={category} value={category}>{messages.categoryNames[category]}</option>)}
          </Select>
          <Input label={messages.code} value={form.code} maxLength={40} error={errors.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          <Input label={messages.name} value={form.name} maxLength={180} error={errors.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Select
            label={messages.unit}
            value={form.unit_id}
            error={errors.unit_id}
            disabled={activeUnits.length === 0}
            onChange={(event) => setForm((current) => ({ ...current, unit_id: event.target.value }))}
          >
            <option value="">{messages.unit}</option>
            {activeUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>)}
          </Select>
          <Input
            label={messages.unitPrice}
            type="number"
            min="0"
            step="0.01"
            value={Number.isFinite(form.unit_price) ? form.unit_price : ''}
            error={errors.unit_price}
            onChange={(event) => setForm((current) => ({
              ...current,
              unit_price: event.currentTarget.value === '' ? Number.NaN : Number(event.currentTarget.value),
            }))}
          />
          <Input label={messages.region} value={form.region} maxLength={120} error={errors.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} />
          <Input label={messages.validFrom} type="date" value={form.valid_from} error={errors.valid_from} onChange={(event) => setForm((current) => ({ ...current, valid_from: event.target.value }))} />
          <Input label={messages.validUntil} type="date" value={form.valid_until} error={errors.valid_until} onChange={(event) => setForm((current) => ({ ...current, valid_until: event.target.value }))} />
          <Input label={messages.source} value={form.source} maxLength={160} error={errors.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Button type="submit" variant="accent" loading={isSaving} disabled={activeUnits.length === 0}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {editing ? messages.savePriceItem : messages.addPriceItem}
            </Button>
          </div>
          {activeUnits.length === 0 && (
            <p className="sm:col-span-2 lg:col-span-3 text-sm text-muted-foreground">{messages.emptyUnits}</p>
          )}
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
      ) : items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">{messages.emptyPriceItems}</p>
      ) : (
        <PriceItemsList items={items} units={units} canEdit={canEdit} onEdit={editItem} onArchive={setArchiveTarget} />
      )}

      <PriceItemsImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        organizationId={organizationId}
        units={units}
        existingItems={items}
        onImported={load}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open && !isArchiving) setArchiveTarget(null); }}
        title={messages.archivePriceItem}
        description={archiveTarget ? `${archiveTarget.code} — ${archiveTarget.name}` : undefined}
        confirmLabel={messages.archive}
        destructive
        loading={isArchiving}
        onConfirm={() => void archive()}
      />
    </section>
  );
}
