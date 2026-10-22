import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { ROLE_LABELS } from '../../../utils/permissions';
import { approvalFlowSchema } from '../schemas/approval.schema';
import { saveApprovalFlow } from '../services/approval.service';
import type { ApprovalFlow, ApprovalResourceType } from '../types';

const messages = getMessages().approvals;
const resourceTypes: ApprovalResourceType[] = ['boq_revision', 'project_addendum', 'daily_report'];
const resourceLabels: Record<ApprovalResourceType, string> = {
  boq_revision: messages.typeBoq,
  project_addendum: messages.typeAddendum,
  daily_report: messages.typeDailyReport,
  purchase_request: messages.typePurchaseRequest,
  purchase_order: messages.typePurchaseOrder,
  material_request: messages.typeMaterialRequest,
};
const roles = Object.entries(ROLE_LABELS);

type FlowFormValues = {
  resourceType: ApprovalResourceType;
  name: string;
  isActive: boolean;
  steps: Array<{ roles: string[] }>;
};

function toFormValues(flow: ApprovalFlow): FlowFormValues {
  return {
    resourceType: flow.resource_type as ApprovalResourceType,
    name: flow.name,
    isActive: flow.is_active,
    steps: flow.steps.map((step) => ({ roles: step.approver_roles })),
  };
}

export function ApprovalFlowEditor({
  organizationId,
  flows,
}: {
  organizationId: string;
  flows: ApprovalFlow[];
}) {
  const [selectedType, setSelectedType] = useState<ApprovalResourceType>('boq_revision');
  const [feedback, setFeedback] = useState('');
  const [saveError, setSaveError] = useState('');
  const queryClient = useQueryClient();
  const selectedFlow = flows.find((flow) => flow.resource_type === selectedType);
  const form = useForm<FlowFormValues>({
    defaultValues: {
      resourceType: selectedType,
      name: '',
      isActive: true,
      steps: [{ roles: [] }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'steps' });
  const active = form.watch('isActive');
  const saveInProgress = form.formState.isSubmitting;

  useEffect(() => {
    if (!selectedFlow) return;
    form.reset(toFormValues(selectedFlow));
  }, [form, selectedFlow]);

  const submit = form.handleSubmit(async (values) => {
    const parsed = approvalFlowSchema.safeParse(values);
    if (!parsed.success) {
      setSaveError(messages.flowValidationFailed);
      setFeedback('');
      return;
    }
    setSaveError('');
    setFeedback('');
    try {
      await saveApprovalFlow(organizationId, {
        ...parsed.data,
        steps: parsed.data.steps.map(({ roles: selectedRoles }) => ({ roles: selectedRoles })),
      });
      await queryClient.invalidateQueries({ queryKey: ['approval-flows', organizationId] });
      setFeedback(messages.flowSaved);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : messages.flowSaveFailed);
    }
  });

  return (
    <section className="grid gap-4">
      <header>
        <h2 className="text-lg font-semibold text-text">{messages.flowsTitle}</h2>
        <p className="mt-1 text-sm text-muted">{messages.flowsDescription}</p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={messages.flowsTitle}>
        {resourceTypes.map((resourceType) => (
          <button
            key={resourceType}
            type="button"
            role="tab"
            aria-selected={selectedType === resourceType}
            onClick={() => {
              setSelectedType(resourceType);
              form.setValue('resourceType', resourceType);
              setFeedback('');
              setSaveError('');
            }}
            className={`min-h-11 rounded-md border px-3 text-sm font-medium transition ${
              selectedType === resourceType
                ? 'border-primary-700 bg-primary-700 text-white'
                : 'border-border bg-surface text-muted hover:text-text'
            }`}
          >
            {resourceLabels[resourceType]}
          </button>
        ))}
      </div>

      {!selectedFlow ? (
        <p className="rounded-md border border-danger/30 bg-danger-bg p-4 text-sm text-danger" role="alert">
          {messages.loadFailed}
        </p>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="grid gap-4 rounded-xl border border-border bg-surface p-4 sm:p-6">
          <Input
            label={messages.flowName}
            maxLength={120}
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />

          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-text">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => form.setValue('isActive', event.currentTarget.checked)}
              className="h-4 w-4 accent-primary"
            />
            {active ? messages.flowActive : messages.flowInactive}
          </label>

          <div className="grid gap-3">
            {fields.map((field, index) => {
              const selectedRoles = form.watch(`steps.${index}.roles`) ?? [];
              return (
                <fieldset key={field.id} className="grid gap-3 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <legend className="text-sm font-semibold text-text">{messages.stepLabel(index + 1)}</legend>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                      aria-label={`${messages.removeStep} ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {messages.removeStep}
                    </Button>
                  </div>
                  <p className="text-xs text-muted">{messages.approverRoles}</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {roles.map(([role, label]) => (
                      <label key={role} className="flex min-h-11 items-center gap-2 rounded-md bg-surface-2 px-3 text-sm text-text">
                        <input
                          type="checkbox"
                          checked={selectedRoles.includes(role)}
                          onChange={(event) => {
                            const nextRoles = event.currentTarget.checked
                              ? [...selectedRoles, role]
                              : selectedRoles.filter((value) => value !== role);
                            form.setValue(`steps.${index}.roles`, nextRoles, { shouldDirty: true });
                          }}
                          className="h-4 w-4 accent-primary"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {form.formState.errors.steps?.[index]?.roles && (
                    <p className="text-sm text-danger" role="alert">{messages.flowNeedsApprovalRole}</p>
                  )}
                </fieldset>
              );
            })}
          </div>

          {fields.length < 8 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ roles: [] })}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {messages.addStep}
            </Button>
          )}

          {feedback && <p className="rounded-md bg-success-bg p-3 text-sm text-success" role="status">{feedback}</p>}
          {saveError && <p className="rounded-md bg-danger-bg p-3 text-sm text-danger" role="alert">{saveError}</p>}
          <div>
            <Button type="submit" disabled={saveInProgress}>
              <Save className="h-4 w-4" aria-hidden="true" />
              {saveInProgress ? messages.savingFlow : messages.saveFlow}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
