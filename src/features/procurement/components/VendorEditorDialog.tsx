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
} from '../../../components/ui';
import { getMessages } from '../../../i18n';
import type { Vendor } from '../../../types/database';
import { vendorCategories, vendorSchema, type VendorInput } from '../schemas/vendor.schema';

const messages = getMessages().vendorManagement;

function getValues(vendor?: Vendor): VendorInput {
  return {
    code: vendor?.code ?? '',
    name: vendor?.name ?? '',
    category: vendor?.category ?? 'Umum',
    contact_person: vendor?.contact_person ?? '',
    phone: vendor?.phone ?? '',
    email: vendor?.email ?? '',
    address: vendor?.address ?? '',
    npwp: vendor?.npwp ?? '',
    payment_terms_days: vendor?.payment_terms_days ?? 0,
  };
}

export function VendorEditorDialog({
  open,
  vendor,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  vendor?: Vendor;
  onOpenChange: (open: boolean) => void;
  onSave: (values: VendorInput) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VendorInput>({
    defaultValues: getValues(vendor),
  });

  useEffect(() => {
    if (open) reset(getValues(vendor));
  }, [open, reset, vendor]);

  const submit = handleSubmit(async (values) => {
    const parsed = vendorSchema.safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const message = issue.message;
        switch (issue.path[0]) {
          case 'code': setError('code', { type: 'validation', message }); break;
          case 'name': setError('name', { type: 'validation', message }); break;
          case 'category': setError('category', { type: 'validation', message }); break;
          case 'contact_person': setError('contact_person', { type: 'validation', message }); break;
          case 'phone': setError('phone', { type: 'validation', message }); break;
          case 'email': setError('email', { type: 'validation', message }); break;
          case 'address': setError('address', { type: 'validation', message }); break;
          case 'npwp': setError('npwp', { type: 'validation', message }); break;
          case 'payment_terms_days': setError('payment_terms_days', { type: 'validation', message }); break;
        }
      }
      return;
    }
    await onSave(parsed.data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vendor ? messages.editVendor : messages.addVendor}</DialogTitle>
          <DialogDescription>{messages.description}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Input label={messages.code} error={errors.code?.message} {...register('code')} />
          <Input label={messages.name} error={errors.name?.message} {...register('name')} />
          <Select label={messages.category} error={errors.category?.message} {...register('category')}>
            {vendorCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </Select>
          <Input label={messages.contactPerson} error={errors.contact_person?.message} {...register('contact_person')} />
          <Input label={messages.phone} type="tel" error={errors.phone?.message} {...register('phone')} />
          <Input label={messages.email} type="email" error={errors.email?.message} {...register('email')} />
          <Input label={messages.npwp} error={errors.npwp?.message} {...register('npwp')} />
          <Input
            label={messages.paymentTerms}
            type="number"
            min={0}
            max={365}
            error={errors.payment_terms_days?.message}
            {...register('payment_terms_days', { valueAsNumber: true })}
          />
          <Input
            className="sm:col-span-2"
            label={messages.address}
            error={errors.address?.message}
            {...register('address')}
          />
          <DialogFooter className="sm:col-span-2">
            <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              {messages.cancel}
            </Button>
            <Button type="submit" loading={isSubmitting}>{messages.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
