import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, CurrencyInput, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Select, Textarea } from '../../../components/ui';
import type { Project } from '../../../types/database';
import { subcontractSchema, type SubcontractFormValues } from '../schemas/subcontractor.schema';
import type { SubcontractRecord, SubcontractorRecord } from '../types';

function today() { return new Date().toISOString().slice(0, 10); }
function values(record: SubcontractRecord | undefined, projectId: string): SubcontractFormValues { return { projectId: record?.project_id ?? projectId, subcontractorId: record?.subcontractor_id ?? '', spkNumber: record?.spk_number ?? '', workDescription: record?.work_description ?? '', contractDate: record?.contract_date ?? today(), startDate: record?.start_date ?? today(), endDate: record?.end_date ?? today(), contractAmount: record?.contract_amount ?? 0, retentionPercent: record?.retention_percent ?? 5, status: record?.status ?? 'draft', notes: record?.notes ?? '' }; }
export function SubcontractDialog({ open, record, projects, subcontractors, defaultProjectId, onOpenChange, onSave }: { open: boolean; record?: SubcontractRecord; projects: Project[]; subcontractors: SubcontractorRecord[]; defaultProjectId: string; onOpenChange: (open: boolean) => void; onSave: (values: SubcontractFormValues) => Promise<void> }) {
  const { register, handleSubmit, reset, setValue, watch, setError, formState: { errors, isSubmitting } } = useForm<SubcontractFormValues>({ defaultValues: values(record, defaultProjectId) });
  useEffect(() => { if (open) reset(values(record, defaultProjectId)); }, [open, record, defaultProjectId, reset]);
  const submit = handleSubmit(async (input) => { const parsed = subcontractSchema.safeParse(input); if (!parsed.success) { parsed.error.issues.forEach((issue) => { const key = issue.path[0]; if (typeof key === 'string') setError(key as keyof SubcontractFormValues, { message: issue.message }); }); return; } await onSave(parsed.data); });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{record ? 'Ubah SPK' : 'Buat SPK'}</DialogTitle><DialogDescription>Nilai SPK disimpan sebagai nilai kontrak sebelum opname.</DialogDescription></DialogHeader><form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
    <Select label="Proyek" error={errors.projectId?.message} {...register('projectId')}><option value="">Pilih proyek</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.code} · {project.name}</option>)}</Select>
    <Select label="Subkontraktor" error={errors.subcontractorId?.message} {...register('subcontractorId')}><option value="">Pilih subkontraktor</option>{subcontractors.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.company_name}</option>)}</Select>
    <Input label="Nomor SPK" error={errors.spkNumber?.message} {...register('spkNumber')} /><Select label="Status" error={errors.status?.message} {...register('status')}><option value="draft">Draf</option><option value="active">Aktif</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></Select>
    <Input label="Tanggal kontrak" type="date" error={errors.contractDate?.message} {...register('contractDate')} /><Input label="Tanggal mulai" type="date" error={errors.startDate?.message} {...register('startDate')} />
    <Input label="Tanggal selesai" type="date" error={errors.endDate?.message} {...register('endDate')} /><Input label="Retensi (%)" type="number" step="0.01" min="0" max="100" error={errors.retentionPercent?.message} {...register('retentionPercent', { valueAsNumber: true })} />
    <CurrencyInput label="Nilai kontrak" value={watch('contractAmount')} onValueChange={(value) => setValue('contractAmount', value, { shouldDirty: true })} error={errors.contractAmount?.message} />
    <Textarea className="sm:col-span-2" label="Uraian pekerjaan" error={errors.workDescription?.message} {...register('workDescription')} /><Textarea className="sm:col-span-2" label="Catatan" error={errors.notes?.message} {...register('notes')} />
    <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button><Button type="submit" loading={isSubmitting}>Simpan SPK</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
