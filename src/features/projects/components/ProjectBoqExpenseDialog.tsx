import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  Textarea,
} from '../../../components/ui';
import { getMessages } from '../../../i18n';
import {
  projectBoqExpenseSchema,
  type ProjectBoqExpenseFormValues,
} from '../schemas/projectBudgetActual.schema';
import type { BudgetActualBoqItem } from '../utils/projectBudgetActual.helpers';

const messages = getMessages('id').projects.budgetActual;

type ProjectBoqExpenseDialogProps = {
  open: boolean;
  items: BudgetActualBoqItem[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (values: ProjectBoqExpenseFormValues) => void;
};

function getLocalCalendarDate(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function ProjectBoqExpenseDialog({
  open,
  items,
  saving,
  error,
  onClose,
  onSave,
}: ProjectBoqExpenseDialogProps) {
  const form = useForm<ProjectBoqExpenseFormValues>({
    defaultValues: {
      boq_item_id: '',
      expense_date: getLocalCalendarDate(),
      amount: '',
      description: '',
    },
  });
  const divisionsById = new Map(
    items.filter((item) => item.item_type === 'division').map((item) => [item.id, item]),
  );
  const workItems = items.filter((item) => item.item_type === 'work_item');

  useEffect(() => {
    if (open) {
      form.reset({
        boq_item_id: '',
        expense_date: getLocalCalendarDate(),
        amount: '',
        description: '',
      });
      form.clearErrors();
    }
  }, [form, open]);

  const submit = form.handleSubmit(async (values) => {
    const parsed = projectBoqExpenseSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'boq_item_id' || field === 'expense_date' || field === 'amount' || field === 'description') {
          form.setError(field, { type: 'schema', message: issue.message });
        }
      }
      return;
    }
    onSave(parsed.data);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !saving) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{messages.createExpenseTitle}</DialogTitle>
          <DialogDescription>{messages.createExpenseDescription}</DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-md border border-danger bg-surface p-3 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <form id="project-boq-expense-form" onSubmit={(event) => void submit(event)} className="space-y-4">
          <Select
            label={messages.item}
            required
            error={form.formState.errors.boq_item_id?.message}
            {...form.register('boq_item_id')}
          >
            <option value="">{messages.selectItem}</option>
            {workItems.map((item) => {
              const division = item.parent_id ? divisionsById.get(item.parent_id) : undefined;
              return (
                <option key={item.id} value={item.id}>
                  {`${item.item_code} · ${item.description} — ${division?.description ?? ''}`}
                </option>
              );
            })}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={messages.expenseDate}
              type="date"
              required
              error={form.formState.errors.expense_date?.message}
              {...form.register('expense_date')}
            />
            <Input
              label={messages.amount}
              type="number"
              min="0.01"
              max="9999999999999999.99"
              step="0.01"
              inputMode="decimal"
              required
              error={form.formState.errors.amount?.message}
              {...form.register('amount')}
            />
          </div>

          <Textarea
            label={messages.description}
            maxLength={500}
            required
            error={form.formState.errors.description?.message}
            {...form.register('description')}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {messages.cancel}
          </Button>
          <Button
            type="submit"
            form="project-boq-expense-form"
            disabled={saving || workItems.length === 0}
          >
            {saving ? messages.loading : messages.savePending}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
