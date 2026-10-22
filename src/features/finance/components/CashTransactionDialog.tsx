import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { Project, CreateProjectCashTransactionInput } from '../../../types/database';
import { CASH_TRANSACTION_CATEGORIES, CASH_TRANSACTION_TYPES } from '../../../types/database';
import { formatRupiah } from '../../../utils/format';
import { cashTransactionSchema, type CashTransactionFormValues } from '../schemas/cashbook.schema';

const messages = getMessages('id').finance;
const today = new Date().toISOString().slice(0, 10);

type CashTransactionDialogProps = {
  organizationId: string;
  projects: Project[];
  selectedProjectId: string;
  onClose: () => void;
  onSubmit: (data: CreateProjectCashTransactionInput) => Promise<void>;
};

export function CashTransactionDialog({
  organizationId,
  projects,
  selectedProjectId,
  onClose,
  onSubmit,
}: CashTransactionDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const defaultProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const { register, handleSubmit, watch, setError, clearErrors, formState: { errors, isSubmitting } } =
    useForm<CashTransactionFormValues>({
      defaultValues: {
        projectId: defaultProject?.id ?? '',
        transactionDate: today,
        type: CASH_TRANSACTION_TYPES.outflow,
        category: CASH_TRANSACTION_CATEGORIES.material,
        amount: '',
        recipientOrPayer: '',
        description: '',
        paymentMethod: 'Transfer Bank',
        reference: '',
      },
    });
  const flowType = watch('type');

  const submit = handleSubmit(async (values) => {
    setSubmitError('');
    clearErrors();
    const result = cashTransactionSchema.safeParse(values);
    if (!result.success) {
      const allowedFields: (keyof CashTransactionFormValues)[] = [
        'projectId', 'transactionDate', 'type', 'category', 'amount',
        'recipientOrPayer', 'description', 'paymentMethod', 'reference',
      ];
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && allowedFields.includes(field as keyof CashTransactionFormValues)) {
          setError(field as keyof CashTransactionFormValues, { message: issue.message });
        }
      }
      return;
    }
    const project = projects.find((item) => item.id === result.data.projectId);
    if (!project) {
      setSubmitError(messages.validation.project);
      return;
    }
    try {
      await onSubmit({
        organization_id: organizationId,
        project_id: project.id,
        transaction_date: result.data.transactionDate,
        type: result.data.type,
        category: result.data.category,
        amount: Number(result.data.amount),
        recipient_or_payer: result.data.recipientOrPayer,
        description: result.data.description,
        payment_method: result.data.paymentMethod,
        reference: result.data.reference.trim(),
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : messages.saveError);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section aria-labelledby="cash-transaction-title" aria-modal="true" className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-lg" role="dialog">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold text-text" id="cash-transaction-title">{messages.cashbookTitle}</h2>
            <p className="mt-1 text-sm text-muted">{messages.cashbookDescription}</p>
          </div>
          <button aria-label={messages.close} className="min-h-11 min-w-11 rounded-md text-muted hover:bg-surface-2" onClick={onClose} type="button">
            <X aria-hidden="true" className="mx-auto h-5 w-5" />
          </button>
        </div>
        {projects.length === 0 ? (
          <p className="rounded-md border border-border bg-surface-2 p-4 text-sm text-muted">{messages.noProjects}</p>
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
                <span>{messages.date}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" type="date" {...register('transactionDate')} />
                {errors.transactionDate && <span className="block text-xs text-danger">{errors.transactionDate.message}</span>}
              </label>
              <fieldset className="space-y-2 sm:col-span-2">
                <legend className="text-sm text-text">{messages.flow}</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${flowType === CASH_TRANSACTION_TYPES.outflow ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:text-white' : 'border-border bg-surface text-text'}`}>
                    <input className="accent-primary-700" type="radio" value={CASH_TRANSACTION_TYPES.outflow} {...register('type')} />
                    {messages.outflow}
                  </label>
                  <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${flowType === CASH_TRANSACTION_TYPES.inflow ? 'border-primary-500 bg-primary-50 text-primary-900 dark:bg-primary-900/30 dark:text-white' : 'border-border bg-surface text-text'}`}>
                    <input className="accent-primary-700" type="radio" value={CASH_TRANSACTION_TYPES.inflow} {...register('type')} />
                    {messages.inflow}
                  </label>
                </div>
                {errors.type && <span className="block text-xs text-danger">{errors.type.message}</span>}
              </fieldset>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.category}</span>
                <select className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" {...register('category')}>
                  <option value={CASH_TRANSACTION_CATEGORIES.material}>{messages.categories.material}</option>
                  <option value={CASH_TRANSACTION_CATEGORIES.wages}>{messages.categories.wages}</option>
                  <option value={CASH_TRANSACTION_CATEGORIES.subcontractor}>{messages.categories.subcontractor}</option>
                  <option value={CASH_TRANSACTION_CATEGORIES.equipmentRental}>{messages.categories.equipmentRental}</option>
                  <option value={CASH_TRANSACTION_CATEGORIES.siteOperations}>{messages.categories.siteOperations}</option>
                  <option value={CASH_TRANSACTION_CATEGORIES.other}>{messages.categories.other}</option>
                </select>
                {errors.category && <span className="block text-xs text-danger">{errors.category.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.amount}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" inputMode="decimal" {...register('amount')} />
                {errors.amount && <span className="block text-xs text-danger">{errors.amount.message}</span>}
                {Number(watch('amount')) > 0 && <span className="block text-xs text-muted">{formatRupiah(Number(watch('amount')))}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.counterparty}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" maxLength={180} {...register('recipientOrPayer')} />
                {errors.recipientOrPayer && <span className="block text-xs text-danger">{errors.recipientOrPayer.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.paymentMethod}</span>
                <select className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" {...register('paymentMethod')}>
                  <option value="Transfer Bank">{messages.paymentMethods.bankTransfer}</option>
                  <option value="Kas Tunai">{messages.paymentMethods.cash}</option>
                  <option value="Giro / Cek">{messages.paymentMethods.cheque}</option>
                  <option value="Lainnya">{messages.paymentMethods.other}</option>
                </select>
              </label>
              <label className="space-y-1 text-sm text-text sm:col-span-2">
                <span>{messages.description}</span>
                <textarea className="min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base" maxLength={500} {...register('description')} />
                {errors.description && <span className="block text-xs text-danger">{errors.description.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text sm:col-span-2">
                <span>{messages.reference}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" maxLength={180} {...register('reference')} />
                {errors.reference && <span className="block text-xs text-danger">{errors.reference.message}</span>}
              </label>
            </div>
            {submitError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{submitError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
              <button className="min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={onClose} type="button">{messages.cancel}</button>
              <button className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60" disabled={isSubmitting} type="submit">
                {isSubmitting ? messages.saving : messages.recordTransaction}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
