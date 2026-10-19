import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Building2 } from 'lucide-react';
import { Button, CurrencyInput, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Select, Textarea, useToast } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import type { Project } from '../../types/database';
import {
  projectCategories,
  projectSchema,
  projectStatuses,
  type ProjectFormValues,
} from './schemas/projectSchema';

const messages = getMessages('id').projects;
const categoryLabels: Record<(typeof projectCategories)[number], string> = messages.categoryLabels;
const statusLabels: Record<(typeof projectStatuses)[number], string> = messages.statusLabels;

function localDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function nextProjectCode(projects: Project[], companyCode: string): string {
  const prefix = `PRJ-${companyCode}-${new Date().getFullYear()}`;
  const nextSequence = projects.reduce((highest, project) => {
    const match = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)$`).exec(project.code);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;
  return `${prefix}-${String(nextSequence).padStart(3, '0')}`;
}

function toFormValues(project: Project): ProjectFormValues {
  return {
    code: project.code,
    name: project.name,
    client_name: project.client_name,
    client_contact: project.client_contact ?? '',
    contract_number: project.contract_number ?? '',
    category: project.category,
    location_address: project.location_address,
    location_city: project.location_city,
    location_province: project.location_province,
    contract_value: project.contract_value,
    start_date: project.start_date,
    end_date: project.end_date,
    maintenance_days: project.maintenance_days,
    retention_percent: project.retention_percent,
    status: project.status,
    project_manager_id: project.project_manager_id ?? '',
    site_manager_id: project.site_manager_id ?? '',
    notes: project.notes ?? '',
  };
}

export function CreateProjectModal({
  isOpen,
  onClose,
  projectToEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
}) {
  const {
    currentOrg,
    projects,
    members,
    membersLoading,
    membersError,
    reloadMembers,
    handleCreateProject,
    handleUpdateProject,
  } = useApp();
  const { toast } = useToast();
  const [saveError, setSaveError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    defaultValues: {
      code: '',
      name: '',
      client_name: '',
      client_contact: '',
      contract_number: '',
      category: 'Gedung',
      location_address: '',
      location_city: '',
      location_province: '',
      contract_value: 0,
      start_date: '',
      end_date: '',
      maintenance_days: 180,
      retention_percent: 5,
      status: 'planning',
      project_manager_id: '',
      site_manager_id: '',
      notes: '',
    },
  });
  const activeMembers = useMemo(
    () => members.filter((member) => member.is_active && member.user),
    [members],
  );

  useEffect(() => {
    if (!isOpen) return;
    setSaveError('');
    if (projectToEdit) {
      reset(toFormValues(projectToEdit));
      return;
    }
    reset({
      code: nextProjectCode(projects, currentOrg?.company_code || 'PRJ'),
      name: '',
      client_name: '',
      client_contact: '',
      contract_number: '',
      category: 'Gedung',
      location_address: '',
      location_city: currentOrg?.city ?? '',
      location_province: currentOrg?.province ?? '',
      contract_value: 0,
      start_date: localDateValue(new Date()),
      end_date: '',
      maintenance_days: 180,
      retention_percent: 5,
      status: 'planning',
      project_manager_id: '',
      site_manager_id: '',
      notes: '',
    });
  }, [isOpen, projectToEdit, projects, currentOrg, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const result = projectSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && field in values) {
          setError(field as keyof ProjectFormValues, { type: 'schema', message: issue.message });
        }
      }
      return;
    }
    if (!currentOrg) {
      setSaveError(messages.organizationRequired);
      return;
    }

    const form = { ...result.data, code: result.data.code.toUpperCase() };
    const duplicateCode = projects.some((project) => (
      project.organization_id === currentOrg.id
      && project.id !== projectToEdit?.id
      && project.code.toLocaleUpperCase('id-ID') === form.code
    ));
    if (duplicateCode) {
      setError('code', { type: 'validate', message: messages.duplicateCode });
      return;
    }
    clearErrors();
    const memberName = (memberId: string) => (
      activeMembers.find((member) => member.user_id === memberId)?.user?.full_name ?? ''
    );
    const payload = {
      ...form,
      organization_id: currentOrg.id,
      client_contact: form.client_contact || '',
      contract_number: form.contract_number || '',
      project_manager_id: form.project_manager_id || null,
      site_manager_id: form.site_manager_id || null,
      project_manager_name: memberName(form.project_manager_id),
      site_manager_name: memberName(form.site_manager_id),
      realized_cost: projectToEdit?.realized_cost ?? 0,
      planned_progress: projectToEdit?.planned_progress ?? 0,
      actual_progress: projectToEdit?.actual_progress ?? 0,
    };

    try {
      if (projectToEdit) {
        await handleUpdateProject(projectToEdit.id, payload);
        toast({ title: messages.updated, variant: 'success' });
      } else {
        await handleCreateProject(payload);
        toast({ title: messages.created, variant: 'success' });
      }
      onClose();
    } catch (error) {
      const detail = error instanceof Error ? error.message : messages.saveFailed;
      setSaveError(detail);
      toast({ title: messages.saveFailed, description: detail, variant: 'error' });
    }
  });

  const contractValue = watch('contract_value');
  const codeField = register('code');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{projectToEdit ? messages.editTitle : messages.createTitle}</DialogTitle>
          <DialogDescription>{messages.formDescription}</DialogDescription>
        </DialogHeader>

        {saveError && (
          <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">
            {saveError}
          </p>
        )}

        <form id="project-form" onSubmit={(event) => void onSubmit(event)} className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <Input
              label={messages.code}
              required
              maxLength={32}
              error={errors.code?.message}
              {...codeField}
              onChange={(event) => setValue('code', event.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })}
            />
            <Input label={messages.name} required error={errors.name?.message} {...register('name')} />
            <Input label={messages.client} required error={errors.client_name?.message} {...register('client_name')} />
            <Input label={messages.clientContact} error={errors.client_contact?.message} {...register('client_contact')} />
            <Input label={messages.contractNumber} error={errors.contract_number?.message} {...register('contract_number')} />
            <Select label={messages.category} error={errors.category?.message} {...register('category')}>
              {projectCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
            </Select>
            <Input label={messages.address} required error={errors.location_address?.message} {...register('location_address')} />
            <Input label={messages.city} required error={errors.location_city?.message} {...register('location_city')} />
            <Input label={messages.province} required error={errors.location_province?.message} {...register('location_province')} />
            <CurrencyInput
              label={messages.contractValue}
              value={contractValue}
              onValueChange={(value) => setValue('contract_value', value, { shouldDirty: true, shouldValidate: true })}
              error={errors.contract_value?.message}
            />
            <Input label={messages.startDate} type="date" required error={errors.start_date?.message} {...register('start_date')} />
            <Input label={messages.endDate} type="date" required error={errors.end_date?.message} {...register('end_date')} />
            <Input
              label={messages.maintenanceDays}
              type="number"
              min="0"
              max="3650"
              required
              error={errors.maintenance_days?.message}
              {...register('maintenance_days', { valueAsNumber: true })}
            />
            <Input
              label={messages.retention}
              type="number"
              min="0"
              max="100"
              step="0.1"
              required
              suffix="%"
              error={errors.retention_percent?.message}
              {...register('retention_percent', { valueAsNumber: true })}
            />
            <Select label={messages.status} error={errors.status?.message} {...register('status')}>
              {projectStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </Select>
          </section>

          <section className="grid gap-4 rounded-lg border border-border bg-surface-2 p-4 sm:grid-cols-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-text sm:col-span-2">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {messages.projectTeam}
            </h3>
            <Select label={messages.projectManager} error={errors.project_manager_id?.message} {...register('project_manager_id')}>
              <option value="">{messages.unassigned}</option>
              {activeMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>{member.user?.full_name}</option>
              ))}
            </Select>
            <Select label={messages.siteManager} error={errors.site_manager_id?.message} {...register('site_manager_id')}>
              <option value="">{messages.unassigned}</option>
              {activeMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>{member.user?.full_name}</option>
              ))}
            </Select>
            {membersError && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-danger sm:col-span-2" role="alert">
                <span>{messages.membersLoadFailed}: {membersError}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void reloadMembers()}>
                  {messages.retryMembers}
                </Button>
              </div>
            )}
            {membersLoading && <p className="text-sm text-muted sm:col-span-2">{messages.loadingMembers}</p>}
            {!membersLoading && !membersError && activeMembers.length === 0 && (
              <p className="text-sm text-muted sm:col-span-2">{messages.noMembers}</p>
            )}
          </section>

          <Textarea label={messages.notes} error={errors.notes?.message} {...register('notes')} />
        </form>

        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={onClose}>{messages.cancel}</Button>
          <Button type="submit" form="project-form" loading={isSubmitting}>
            {projectToEdit ? messages.saveChanges : messages.createTitle}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
