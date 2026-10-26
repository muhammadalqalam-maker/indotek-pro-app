import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { PurchaseOrder } from '../../../types/database';
import { goodsReceiptSchema } from '../schemas/procurement.schema';
import type { CreateGoodsReceiptInput } from '../types';

const messages = getMessages().procurementWorkflow;

type FormValues = {
  deliveryNoteNumber: string;
  receivingLocation: string;
  receivedDate: string;
  receiverName: string;
  driverName: string;
  vehicleNumber: string;
  notes: string;
  items: Array<{
    purchaseOrderItemId: string;
    receivedQuantity: number;
    acceptedQuantity: number;
    conditionNotes: string;
  }>;
};

export function GoodsReceiptDialog({
  organizationId,
  order,
  onClose,
  onCreate,
}: {
  organizationId: string;
  order: PurchaseOrder;
  onClose: () => void;
  onCreate: (input: CreateGoodsReceiptInput) => Promise<void>;
}) {
  const form = useForm<FormValues>({
    defaultValues: {
      deliveryNoteNumber: '',
      receivingLocation: '',
      receivedDate: new Date().toISOString().slice(0, 10),
      receiverName: '',
      driverName: '',
      vehicleNumber: '',
      notes: '',
      items: order.items.map((item) => ({
        purchaseOrderItemId: item.id,
        receivedQuantity: 0,
        acceptedQuantity: 0,
        conditionNotes: '',
      })),
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const parsed = goodsReceiptSchema.safeParse(values);
    if (!parsed.success) {
      form.setError('root', { message: parsed.error.issues[0]?.message ?? messages.receiptFailed });
      return;
    }
    try {
      await onCreate({
        organizationId,
        purchaseOrderId: order.id,
        ...parsed.data,
        items: parsed.data.items.filter((item) => item.receivedQuantity > 0),
      });
      onClose();
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : messages.receiptFailed,
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="goods-receipt-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6"
      >
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="goods-receipt-title" className="text-lg font-semibold text-text">
              {messages.receivingTitle}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{order.po_number} · {order.vendor_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-surface-2"
            aria-label={messages.close}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={(event) => void submit(event)} className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-text">
              {messages.deliveryNoteNumber}
              <input
                required
                maxLength={100}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                {...form.register('deliveryNoteNumber')}
              />
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.receivingLocation}
              <input
                required
                maxLength={180}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                {...form.register('receivingLocation')}
              />
              {form.formState.errors.receivingLocation?.message && (
                <span className="text-xs text-danger">{form.formState.errors.receivingLocation.message}</span>
              )}
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.receivedOn}
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                {...form.register('receivedDate')}
              />
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.receiverName}
              <input
                required
                maxLength={120}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                {...form.register('receiverName')}
              />
            </label>
            <label className="grid gap-1 text-sm text-text">
              {messages.driverName}
              <input
                maxLength={120}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                {...form.register('driverName')}
              />
            </label>
            <label className="grid gap-1 text-sm text-text sm:col-span-2">
              {messages.vehicleNumber}
              <input
                maxLength={80}
                className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                {...form.register('vehicleNumber')}
              />
            </label>
          </div>

          <section className="grid gap-3" aria-labelledby="receipt-items-title">
            <div>
              <h3 id="receipt-items-title" className="text-sm font-semibold text-text">{messages.items}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{messages.itemsMatchHint}</p>
            </div>
            {order.items.map((item, index) => {
              const remaining = Math.max(0, item.quantity - item.received_quantity);
              return (
                <fieldset key={item.id} className="grid gap-3 rounded-xl border border-border p-3">
                  <legend className="px-1 text-sm font-semibold text-text">{item.item_name}</legend>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} {item.unit} · {messages.remaining}: {remaining} {item.unit}
                  </p>
                  <input
                    type="hidden"
                    {...form.register(`items.${index}.purchaseOrderItemId`)}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-xs text-text">
                      {messages.receivedQuantity}
                      <input
                        type="number"
                        min="0"
                        max="1000000"
                        step="0.001"
                        inputMode="decimal"
                        className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                        {...form.register(`items.${index}.receivedQuantity`, { valueAsNumber: true })}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-text">
                      {messages.acceptedQuantity}
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        step="0.001"
                        inputMode="decimal"
                        className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                        {...form.register(`items.${index}.acceptedQuantity`, { valueAsNumber: true })}
                      />
                    </label>
                  </div>
                  <label className="grid gap-1 text-xs text-text">
                    {messages.conditionNotes}
                    <input
                      maxLength={500}
                      className="min-h-11 rounded-md border border-border bg-surface px-3 text-base"
                      {...form.register(`items.${index}.conditionNotes`)}
                    />
                  </label>
                </fieldset>
              );
            })}
          </section>

          <label className="grid gap-1 text-sm text-text">
            {messages.receiptNotes}
            <textarea
              rows={3}
              maxLength={2000}
              className="rounded-md border border-border bg-surface px-3 py-2 text-base"
              {...form.register('notes')}
            />
          </label>

          {form.formState.errors.root?.message && (
            <p role="alert" className="text-sm text-danger">{form.formState.errors.root.message}</p>
          )}
          <footer className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-md border border-border px-4 text-sm text-text"
            >
              {messages.cancel}
            </button>
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {form.formState.isSubmitting ? messages.receiptSubmitting : messages.createReceipt}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
