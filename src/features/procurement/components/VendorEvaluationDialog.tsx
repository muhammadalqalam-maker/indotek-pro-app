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
import { vendorEvaluationSchema, type VendorEvaluationInput } from '../schemas/vendor.schema';

const messages = getMessages().vendorManagement;
const scoreFields = [
  ['quality_score', messages.quality],
  ['price_score', messages.price],
  ['delivery_score', messages.delivery],
  ['service_score', messages.service],
] as const;

export function VendorEvaluationDialog({
  open,
  vendorName,
  isSaving,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  vendorName: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: VendorEvaluationInput) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VendorEvaluationInput>({
    defaultValues: {
      transaction_reference: '',
      quality_score: 3,
      price_score: 3,
      delivery_score: 3,
      service_score: 3,
      comment: '',
    },
  });

  useEffect(() => {
    if (open) reset({
      transaction_reference: '',
      quality_score: 3,
      price_score: 3,
      delivery_score: 3,
      service_score: 3,
      comment: '',
    });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    const parsed = vendorEvaluationSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const message = issue.message;
        switch (issue.path[0]) {
          case 'transaction_reference': setError('transaction_reference', { type: 'validation', message }); break;
          case 'quality_score': setError('quality_score', { type: 'validation', message }); break;
          case 'price_score': setError('price_score', { type: 'validation', message }); break;
          case 'delivery_score': setError('delivery_score', { type: 'validation', message }); break;
          case 'service_score': setError('service_score', { type: 'validation', message }); break;
          case 'comment': setError('comment', { type: 'validation', message }); break;
        }
      }
      return;
    }
    await onSave(parsed.data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.evaluateVendor}</DialogTitle>
          <DialogDescription>{vendorName}. {messages.scoreHint}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Input
            label={messages.transactionReference}
            hint={messages.transactionReferenceHint}
            error={errors.transaction_reference?.message}
            {...register('transaction_reference')}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {scoreFields.map(([field, label]) => (
              <Select
                key={field}
                label={label}
                error={errors[field]?.message}
                {...register(field, { valueAsNumber: true })}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </Select>
            ))}
          </div>
          <Textarea label={messages.comment} error={errors.comment?.message} {...register('comment')} />
          <DialogFooter>
            <Button variant="outline" disabled={isSubmitting || isSaving} onClick={() => onOpenChange(false)}>
              {messages.cancel}
            </Button>
            <Button type="submit" loading={isSubmitting || isSaving}>{messages.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
