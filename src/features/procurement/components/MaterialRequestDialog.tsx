import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2, X } from 'lucide-react';
import type { Project } from '../../../types/database';
import type { WarehouseInventoryItem } from '../../warehouse/types';
import { materialRequestSchema } from '../schemas/material-request.schema';
import { createMaterialRequest } from '../services/procurement.service';

type FormValues = {
  projectId: string;
  requiredDate: string;
  locationName: string;
  purpose: string;
  items: Array<{ inventoryItemId: string; quantity: number; notes: string }>;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MaterialRequestDialog({
  organizationId,
  projects,
  inventoryItems,
  onClose,
  onCreated,
}: {
  organizationId: string;
  projects: Project[];
  inventoryItems: WarehouseInventoryItem[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const form = useForm<FormValues>({
    defaultValues: { projectId: projects[0]?.id ?? '', requiredDate: today(), locationName: '', purpose: '', items: [{ inventoryItemId: '', quantity: 1, notes: '' }] },
  });
  const projectId = form.watch('projectId');
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });
  const projectItems = inventoryItems.filter((item) => item.project_id === projectId);
  const submit = form.handleSubmit(async (values) => {
    const parsed = materialRequestSchema.safeParse(values);
    if (!parsed.success) {
      form.setError('root', { message: parsed.error.issues[0]?.message ?? 'Periksa kembali permintaan material.' });
      return;
    }
    try {
      await createMaterialRequest({ organizationId, ...parsed.data });
      await onCreated();
      onClose();
    } catch (error) {
      form.setError('root', { message: error instanceof Error ? error.message : 'Permintaan material gagal dibuat.' });
    }
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="material-request-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6">
        <header className="mb-5 flex items-start justify-between gap-3">
          <div><h2 id="material-request-title" className="text-lg font-semibold text-text">Permintaan material lapangan</h2><p className="mt-1 text-sm text-muted-foreground">Permintaan dikirim ke PM untuk persetujuan.</p></div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-surface-2" aria-label="Tutup"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-text">Proyek<select className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('projectId')}><option value="">Pilih proyek</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><span className="text-xs text-danger">{form.formState.errors.projectId?.message}</span></label>
            <label className="grid gap-1 text-sm text-text">Tanggal dibutuhkan<input type="date" min={today()} className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register('requiredDate')} /></label>
            <label className="grid gap-1 text-sm text-text">Lokasi pemakaian<input className="min-h-11 rounded-md border border-border bg-surface px-3" maxLength={180} {...form.register('locationName')} /><span className="text-xs text-danger">{form.formState.errors.locationName?.message}</span></label>
            <label className="grid gap-1 text-sm text-text">Keperluan<textarea className="min-h-20 rounded-md border border-border bg-surface px-3 py-2" maxLength={1000} {...form.register('purpose')} /><span className="text-xs text-danger">{form.formState.errors.purpose?.message}</span></label>
          </div>
          <div className="grid gap-3"><div className="flex items-center justify-between"><h3 className="font-semibold text-text">Material</h3><button type="button" onClick={() => append({ inventoryItemId: '', quantity: 1, notes: '' })} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm text-text"><Plus className="h-4 w-4" />Tambah</button></div>
            {fields.map((field, index) => <fieldset key={field.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-3"><label className="grid gap-1 text-sm text-text sm:col-span-2">Item stok<select className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register(`items.${index}.inventoryItemId`)}><option value="">Pilih item</option>{projectItems.map((item) => <option key={item.id} value={item.id}>{item.item_name} · {item.location_name} · stok {item.current_stock} {item.unit}</option>)}</select><span className="text-xs text-danger">{form.formState.errors.items?.[index]?.inventoryItemId?.message}</span></label><label className="grid gap-1 text-sm text-text">Kuantitas<input type="number" min="0.001" step="0.001" className="min-h-11 rounded-md border border-border bg-surface px-3" {...form.register(`items.${index}.quantity`, { valueAsNumber: true })} /></label><label className="grid gap-1 text-sm text-text sm:col-span-2">Catatan item<input className="min-h-11 rounded-md border border-border bg-surface px-3" maxLength={500} {...form.register(`items.${index}.notes`)} /></label><button type="button" disabled={fields.length === 1} onClick={() => remove(index)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md text-sm text-danger disabled:opacity-40"><Trash2 className="h-4 w-4" />Hapus</button></fieldset>)}</div>
          {projectId && projectItems.length === 0 && <p className="rounded-md bg-warning-bg p-3 text-sm text-warning">Belum ada item stok pada proyek ini.</p>}
          {form.formState.errors.root && <p role="alert" className="rounded-md bg-danger-bg p-3 text-sm text-danger">{form.formState.errors.root.message}</p>}
          <footer className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm font-medium text-text">Batal</button><button type="submit" disabled={form.formState.isSubmitting || projectItems.length === 0} className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{form.formState.isSubmitting ? 'Mengajukan…' : 'Ajukan ke PM'}</button></footer>
        </form>
      </section>
    </div>
  );
}
