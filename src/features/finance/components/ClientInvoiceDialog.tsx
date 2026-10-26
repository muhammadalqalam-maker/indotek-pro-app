import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { Project, ClientInvoice } from '../../../types/database';
import { formatRupiah } from '../../../utils/format';
import { clientInvoiceSchema, ClientInvoiceFormValues } from '../schemas/client-invoice.schema';

type ClientInvoiceDialogProps = {
  projects: Project[];
  organizationId: string;
  onClose: () => void;
  onSubmit: (invoice: Omit<ClientInvoice, 'id' | 'created_at'>) => Promise<ClientInvoice>;
};

const today = new Date().toISOString().slice(0, 10);
const dueInFourteenDays = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function ClientInvoiceDialog({ projects, organizationId, onClose, onSubmit }: ClientInvoiceDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const { register, handleSubmit, watch, setValue, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<ClientInvoiceFormValues>({
    defaultValues: {
      projectId: projects[0]?.id ?? '',
      invoiceType: 'progress',
      invoiceNumber: '',
      termLabel: 'Termin progres',
      invoiceDate: today,
      dueDate: dueInFourteenDays,
      progressBasisPercent: projects[0]?.actual_progress ?? 0,
      grossAmount: 0,
      advanceDeduction: 0,
      retentionDeduction: 0,
      vatPercent: 11,
      pphPercent: 2.65,
      notes: '',
    },
  });
  const values = watch();
  const project = projects.find((item) => item.id === values.projectId);
  const taxable = Math.max(0, values.grossAmount - values.advanceDeduction - values.retentionDeduction);
  const vatAmount = Math.round(taxable * values.vatPercent / 100);
  const pphAmount = Math.round(taxable * values.pphPercent / 100);
  const netAmount = taxable + vatAmount - pphAmount;
  const projectRetentionLimit = useMemo(
    () => Math.round(values.grossAmount * (project?.retention_percent ?? 0) / 100),
    [project?.retention_percent, values.grossAmount],
  );

  const submit = handleSubmit(async (formValues) => {
    setSubmitError('');
    clearErrors();
    const validation = clientInvoiceSchema.safeParse(formValues);
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && field in formValues) {
          setError(field as keyof ClientInvoiceFormValues, { message: issue.message });
        }
      }
      return;
    }
    const selectedProject = projects.find((item) => item.id === formValues.projectId);
    if (!selectedProject) {
      setSubmitError('Proyek yang dipilih tidak tersedia.');
      return;
    }
    if (formValues.retentionDeduction > projectRetentionLimit) {
      setError('retentionDeduction', { message: 'Potongan retensi melebihi persentase pada kontrak proyek.' });
      return;
    }
    try {
      await onSubmit({
        organization_id: organizationId,
        project_id: selectedProject.id,
        project_name: selectedProject.name,
        client_name: selectedProject.client_name,
        invoice_number: formValues.invoiceNumber.trim(),
        invoice_type: formValues.invoiceType,
        term_label: formValues.termLabel.trim(),
        invoice_date: formValues.invoiceDate,
        due_date: formValues.dueDate,
        progress_basis_percent: formValues.progressBasisPercent,
        gross_amount: formValues.grossAmount,
        retention_deduction: formValues.retentionDeduction,
        dp_deduction: formValues.advanceDeduction,
        advance_deduction: formValues.advanceDeduction,
        subtotal_taxable: taxable,
        vat_percent: formValues.vatPercent,
        ppn_amount: vatAmount,
        pph_percent: formValues.pphPercent,
        pph_amount: pphAmount,
        net_receivable: netAmount,
        status: 'sent',
        notes: formValues.notes.trim(),
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Invoice gagal disimpan.');
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section
        aria-labelledby="client-invoice-title"
        aria-modal="true"
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-lg"
        role="dialog"
      >
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold text-text" id="client-invoice-title">Terbitkan invoice termin</h2>
            <p className="mt-1 text-sm text-muted-foreground">Nilai progres diverifikasi terhadap progres yang sudah disetujui.</p>
          </div>
          <button aria-label="Tutup dialog" className="min-h-11 min-w-11 rounded-md text-muted-foreground hover:bg-surface-2" onClick={onClose} type="button">
            <X aria-hidden="true" className="mx-auto h-5 w-5" />
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted-foreground">Buat proyek terlebih dahulu sebelum menerbitkan invoice.</p>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-text">
                <span>Proyek / klien</span>
                <select
                  className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base"
                  {...register('projectId', { onChange: (event) => {
                    const selected = projects.find((item) => item.id === event.target.value);
                    setValue('progressBasisPercent', selected?.actual_progress ?? 0);
                  } })}
                >
                  {projects.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.client_name}</option>)}
                </select>
                <span className="block text-xs text-muted-foreground">Progres disetujui saat ini: {project?.actual_progress ?? 0}%</span>
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>Jenis termin</span>
                <select className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" {...register('invoiceType')}>
                  <option value="advance">Uang muka</option>
                  <option value="progress">Termin progres</option>
                  <option value="retention">Pencairan retensi</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>Nomor invoice (opsional)</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" placeholder="Otomatis dibuat" {...register('invoiceNumber')} />
                {errors.invoiceNumber && <span className="text-xs text-danger">{errors.invoiceNumber.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>Keterangan termin</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" {...register('termLabel')} />
                {errors.termLabel && <span className="text-xs text-danger">{errors.termLabel.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>Tanggal invoice</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" type="date" {...register('invoiceDate')} />
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>Jatuh tempo</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" type="date" {...register('dueDate')} />
                {errors.dueDate && <span className="text-xs text-danger">{errors.dueDate.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>Basis progres (%)</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" max="100" min="0" step="0.01" type="number" {...register('progressBasisPercent', { valueAsNumber: true })} />
                {errors.progressBasisPercent && <span className="text-xs text-danger">{errors.progressBasisPercent.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>Nilai bruto (Rp)</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" min="1" step="1" type="number" {...register('grossAmount', { valueAsNumber: true })} />
                {errors.grossAmount && <span className="text-xs text-danger">{errors.grossAmount.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>Potongan uang muka (Rp)</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" min="0" step="1" type="number" {...register('advanceDeduction', { valueAsNumber: true })} />
                {errors.advanceDeduction && <span className="text-xs text-danger">{errors.advanceDeduction.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>Retensi (maks. {formatRupiah(projectRetentionLimit)})</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" min="0" step="1" type="number" {...register('retentionDeduction', { valueAsNumber: true })} />
                {errors.retentionDeduction && <span className="text-xs text-danger">{errors.retentionDeduction.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>PPN (%)</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" max="100" min="0" step="0.01" type="number" {...register('vatPercent', { valueAsNumber: true })} />
                {errors.vatPercent && <span className="text-xs text-danger">{errors.vatPercent.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>PPh (%)</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" max="100" min="0" step="0.01" type="number" {...register('pphPercent', { valueAsNumber: true })} />
                {errors.pphPercent && <span className="text-xs text-danger">{errors.pphPercent.message}</span>}
              </label>
            </div>

            <label className="block space-y-1 text-sm text-text">
              <span>Catatan invoice</span>
              <textarea className="min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base" maxLength={2000} {...register('notes')} />
            </label>

            <dl className="grid gap-x-5 gap-y-2 rounded-md border border-border bg-surface-2 p-4 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dasar kena pajak</dt><dd>{formatRupiah(taxable)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">PPN {values.vatPercent}%</dt><dd>{formatRupiah(vatAmount)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">PPh {values.pphPercent}%</dt><dd>- {formatRupiah(pphAmount)}</dd></div>
              <div className="flex justify-between gap-3 font-semibold"><dt>Tagihan bersih</dt><dd>{formatRupiah(netAmount)}</dd></div>
            </dl>

            {submitError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{submitError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
              <button className="min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={onClose} type="button">Batal</button>
              <button className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60" disabled={isSubmitting || projects.length === 0} type="submit">
                {isSubmitting ? 'Menyimpan…' : 'Terbitkan invoice'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
