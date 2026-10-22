import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Textarea } from '../../../components/ui';
import { subcontractorSchema, type SubcontractorFormValues } from '../schemas/subcontractor.schema';
import type { SubcontractorRecord } from '../types';

function values(record?: SubcontractorRecord): SubcontractorFormValues {
  return { code: record?.code ?? '', companyName: record?.company_name ?? '', tradeSpecialty: record?.trade_specialty ?? '', picName: record?.pic_name ?? '', phone: record?.phone ?? '', email: record?.email ?? '', address: record?.address ?? '', npwp: record?.npwp ?? '', bankName: record?.bank_name ?? '', bankAccountNo: record?.bank_account_no ?? '', bankAccountName: record?.bank_account_name ?? '' };
}
export function SubcontractorDialog({ open, record, onOpenChange, onSave }: { open: boolean; record?: SubcontractorRecord; onOpenChange: (open: boolean) => void; onSave: (values: SubcontractorFormValues) => Promise<void> }) {
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<SubcontractorFormValues>({ defaultValues: values(record) });
  useEffect(() => { if (open) reset(values(record)); }, [open, record, reset]);
  const submit = handleSubmit(async (input) => { const parsed = subcontractorSchema.safeParse(input); if (!parsed.success) { parsed.error.issues.forEach((issue) => { const key = issue.path[0]; if (typeof key === 'string') setError(key as keyof SubcontractorFormValues, { message: issue.message }); }); return; } await onSave(parsed.data); });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{record ? 'Ubah subkontraktor' : 'Tambah subkontraktor'}</DialogTitle><DialogDescription>Simpan data rekanan dan rekening pembayaran.</DialogDescription></DialogHeader><form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
    <Input label="Kode subkontraktor" error={errors.code?.message} {...register('code')} /><Input label="Nama perusahaan" error={errors.companyName?.message} {...register('companyName')} />
    <Input label="Bidang pekerjaan" error={errors.tradeSpecialty?.message} {...register('tradeSpecialty')} /><Input label="PIC / mandor" error={errors.picName?.message} {...register('picName')} />
    <Input label="Nomor telepon" type="tel" error={errors.phone?.message} {...register('phone')} /><Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
    <Input label="NPWP" error={errors.npwp?.message} {...register('npwp')} /><Input label="Nama bank" error={errors.bankName?.message} {...register('bankName')} />
    <Input label="Nomor rekening" error={errors.bankAccountNo?.message} {...register('bankAccountNo')} /><Input label="Nama pemilik rekening" error={errors.bankAccountName?.message} {...register('bankAccountName')} />
    <Textarea className="sm:col-span-2" label="Alamat" error={errors.address?.message} {...register('address')} /><DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button><Button type="submit" loading={isSubmitting}>Simpan</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
