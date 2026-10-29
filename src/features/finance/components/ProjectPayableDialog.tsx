import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { Project, Vendor, CreateProjectPayableInput } from '../../../types/database';
import type { PayableSubcontractorOption } from '../services/payables.service';
import { projectPayableSchema, type ProjectPayableFormValues } from '../schemas/payable.schema';

const messages = getMessages('id').finance;
const today = new Date().toISOString().slice(0, 10);

type ProjectPayableDialogProps = {
  organizationId: string;
  projects: Project[];
  vendors: Vendor[];
  subcontractors: PayableSubcontractorOption[];
  selectedProjectId: string;
  onClose: () => void;
  onSubmit: (data: CreateProjectPayableInput) => Promise<void>;
};

export function ProjectPayableDialog({
  organizationId,
  projects,
  vendors,
  subcontractors,
  selectedProjectId,
  onClose,
  onSubmit,
}: ProjectPayableDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const defaultProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const availableVendors = vendors.filter((vendor) => vendor.is_active !== false && !vendor.deleted_at);
  const defaultType = availableVendors.length > 0 ? 'vendor' : 'subcontractor';
  const defaultCounterparty = defaultType === 'vendor' ? availableVendors[0]?.id : subcontractors[0]?.id;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ProjectPayableFormValues>({
    defaultValues: {
      projectId: defaultProject?.id ?? '',
      counterpartyType: defaultType,
      counterpartyId: defaultCounterparty ?? '',
      supplierInvoiceNumber: '',
      invoiceDate: today,
      dueDate: today,
      amount: '',
      notes: '',
    },
  });
  const counterpartyType = watch('counterpartyType');
  const counterparties = counterpartyType === 'vendor'
    ? availableVendors.map(({ id, name }) => ({ id, name }))
    : subcontractors;
  const hasCounterparties = counterparties.length > 0;

  const submit = handleSubmit(async (values) => {
    setSubmitError('');
    clearErrors();
    const result = projectPayableSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && field in values) {
          setError(field as keyof ProjectPayableFormValues, { message: issue.message });
        }
      }
      return;
    }
    if (!projects.some((project) => project.id === result.data.projectId)) {
      setSubmitError(messages.validation.project);
      return;
    }
    try {
      await onSubmit({
        organization_id: organizationId,
        project_id: result.data.projectId,
        vendor_id: result.data.counterpartyType === 'vendor' ? result.data.counterpartyId : null,
        subcontractor_id: result.data.counterpartyType === 'subcontractor' ? result.data.counterpartyId : null,
        supplier_invoice_number: result.data.supplierInvoiceNumber,
        invoice_date: result.data.invoiceDate,
        due_date: result.data.dueDate,
        amount: Number(result.data.amount),
        notes: result.data.notes.trim(),
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : messages.saveError);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section aria-labelledby="project-payable-title" aria-modal="true" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-lg" role="dialog">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold text-text" id="project-payable-title">{messages.payableTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{messages.payableDescription}</p>
          </div>
          <button aria-label={messages.close} className="min-h-11 min-w-11 rounded-md text-muted-foreground hover:bg-surface-2" onClick={onClose} type="button">
            <X aria-hidden="true" className="mx-auto h-5 w-5" />
          </button>
        </div>
        {projects.length === 0 ? (
          <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted-foreground">{messages.noProjects}</p>
        ) : !hasCounterparties ? (
          <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted-foreground">{messages.noPayableCounterparties}</p>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm text-text">
                <span>{messages.project}</span>
                <select className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" {...register('projectId')}>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
                {errors.projectId && <span className="block text-xs text-danger">{errors.projectId.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.counterpartyType}</span>
                <select
                  className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base"
                  {...register('counterpartyType', {
                    onChange: (event) => {
                      const nextType = event.target.value as ProjectPayableFormValues['counterpartyType'];
                      const first = nextType === 'vendor'
                        ? availableVendors[0]?.id
                        : subcontractors[0]?.id;
                      setValue('counterpartyId', first ?? '');
                      clearErrors('counterpartyId');
                    },
                  })}
                >
                  {availableVendors.length > 0 && <option value="vendor">{messages.vendor}</option>}
                  {subcontractors.length > 0 && <option value="subcontractor">{messages.subcontractor}</option>}
                </select>
                {errors.counterpartyType && <span className="block text-xs text-danger">{errors.counterpartyType.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.payableCounterparty}</span>
                <select className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" {...register('counterpartyId')}>
                  {counterparties.map((counterparty) => <option key={counterparty.id} value={counterparty.id}>{counterparty.name}</option>)}
                </select>
                {errors.counterpartyId && <span className="block text-xs text-danger">{errors.counterpartyId.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.supplierInvoiceNumber}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" maxLength={80} {...register('supplierInvoiceNumber')} />
                {errors.supplierInvoiceNumber && <span className="block text-xs text-danger">{errors.supplierInvoiceNumber.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.invoiceDate}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" type="date" {...register('invoiceDate')} />
                {errors.invoiceDate && <span className="block text-xs text-danger">{errors.invoiceDate.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.dueDate}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" type="date" {...register('dueDate')} />
                {errors.dueDate && <span className="block text-xs text-danger">{errors.dueDate.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.amountPayable}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" inputMode="decimal" {...register('amount')} />
                {errors.amount && <span className="block text-xs text-danger">{errors.amount.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text sm:col-span-2">
                <span>{messages.notes}</span>
                <textarea className="min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base" maxLength={2000} {...register('notes')} />
                {errors.notes && <span className="block text-xs text-danger">{errors.notes.message}</span>}
              </label>
            </div>
            {submitError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{submitError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
              <button className="min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={onClose} type="button">{messages.cancel}</button>
              <button className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60" disabled={isSubmitting} type="submit">
                {isSubmitting ? messages.saving : messages.savePayable}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
