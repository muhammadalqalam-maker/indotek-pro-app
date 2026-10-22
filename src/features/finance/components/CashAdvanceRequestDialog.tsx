import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { Project, CreateCashAdvanceRequestInput } from '../../../types/database';
import { CASH_ADVANCE_TYPES } from '../../../types/database';
import { formatRupiah } from '../../../utils/format';
import { cashAdvanceRequestSchema, type CashAdvanceRequestFormValues } from '../schemas/cashbook.schema';

const messages = getMessages('id').finance;
const today = new Date().toISOString().slice(0, 10);

type CashAdvanceRequestDialogProps = {
  organizationId: string;
  projects: Project[];
  selectedProjectId: string;
  onClose: () => void;
  onSubmit: (data: CreateCashAdvanceRequestInput) => Promise<void>;
};

export function CashAdvanceRequestDialog({
  organizationId,
  projects,
  selectedProjectId,
  onClose,
  onSubmit,
}: CashAdvanceRequestDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const defaultProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const { register, handleSubmit, watch, setError, clearErrors, formState: { errors, isSubmitting } } =
    useForm<CashAdvanceRequestFormValues>({
      defaultValues: {
        projectId: defaultProject?.id ?? '',
        requestType: CASH_ADVANCE_TYPES.advance,
        employeeName: '',
        employeeRole: '',
        requestDate: today,
        amount: '',
        purpose: '',
      },
    });
  const requestType = watch('requestType');

  const submit = handleSubmit(async (values) => {
    setSubmitError('');
    clearErrors();
    const result = cashAdvanceRequestSchema.safeParse(values);
    if (!result.success) {
      const allowedFields: (keyof CashAdvanceRequestFormValues)[] = [
        'projectId', 'requestType', 'employeeName', 'employeeRole', 'requestDate', 'amount', 'purpose',
      ];
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && allowedFields.includes(field as keyof CashAdvanceRequestFormValues)) {
          setError(field as keyof CashAdvanceRequestFormValues, { message: issue.message });
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
        employee_name: result.data.employeeName,
        role: result.data.employeeRole,
        date: result.data.requestDate,
        type: result.data.requestType,
        amount: Number(result.data.amount),
        purpose: result.data.purpose,
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : messages.saveError);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section aria-labelledby="cash-advance-request-title" aria-modal="true" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-lg" role="dialog">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-semibold text-text" id="cash-advance-request-title">{messages.addCashAdvance}</h2>
            <p className="mt-1 text-sm text-muted">{messages.cashAdvanceTitle}</p>
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
                <span>{messages.type}</span>
                <select className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" {...register('requestType')}>
                  <option value={CASH_ADVANCE_TYPES.advance}>{messages.advance}</option>
                  <option value={CASH_ADVANCE_TYPES.reimbursement}>{messages.reimbursement}</option>
                </select>
                {errors.requestType && <span className="block text-xs text-danger">{errors.requestType.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.employeeName}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" maxLength={180} {...register('employeeName')} />
                {errors.employeeName && <span className="block text-xs text-danger">{errors.employeeName.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.employeeRole}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" maxLength={120} {...register('employeeRole')} />
                {errors.employeeRole && <span className="block text-xs text-danger">{errors.employeeRole.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.date}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" type="date" {...register('requestDate')} />
                {errors.requestDate && <span className="block text-xs text-danger">{errors.requestDate.message}</span>}
              </label>
              <label className="space-y-1 text-sm text-text">
                <span>{messages.amount}</span>
                <input className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-base" inputMode="decimal" {...register('amount')} />
                {errors.amount && <span className="block text-xs text-danger">{errors.amount.message}</span>}
                {Number(watch('amount')) > 0 && <span className="block text-xs text-muted">{formatRupiah(Number(watch('amount')))}</span>}
              </label>
              <label className="space-y-1 text-sm text-text sm:col-span-2">
                <span>{requestType === CASH_ADVANCE_TYPES.advance ? messages.purpose : messages.description}</span>
                <textarea className="min-h-24 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base" maxLength={500} {...register('purpose')} />
                {errors.purpose && <span className="block text-xs text-danger">{errors.purpose.message}</span>}
              </label>
            </div>
            {submitError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{submitError}</p>}
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
              <button className="min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={onClose} type="button">{messages.cancel}</button>
              <button className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60" disabled={isSubmitting} type="submit">
                {isSubmitting ? messages.saving : messages.submitRequest}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
