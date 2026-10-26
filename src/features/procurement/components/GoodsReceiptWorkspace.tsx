import { useState } from 'react';
import { CheckCircle2, Clock3, PackageCheck, Truck } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { useApp } from '../../../context/AppContext';
import { formatDateIndo } from '../../../utils/format';
import type { GoodsReceiptNote, PurchaseOrder } from '../../../types/database';
import type { CreateGoodsReceiptInput } from '../types';
import { GoodsReceiptDialog } from './GoodsReceiptDialog';

const messages = getMessages().procurementWorkflow;

function receiptStatusLabel(status: GoodsReceiptNote['status']): string {
  if (status === 'full') return messages.receiptFull;
  if (status === 'rejected') return messages.receiptRejected;
  return messages.receiptPartial;
}

export function GoodsReceiptWorkspace({
  organizationId,
  projectId,
  orders,
  receipts,
  canCreate,
  isSupabaseLive,
  isLoading,
  error,
  onRetry,
}: {
  organizationId: string;
  projectId: string;
  orders: PurchaseOrder[];
  receipts: GoodsReceiptNote[];
  canCreate: boolean;
  isSupabaseLive: boolean;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const { handleCreateGRN } = useApp();
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const openOrders = orders.filter((order) =>
    (projectId === 'all' || order.project_id === projectId)
    &&
    (order.status === 'approved' || order.status === 'ordered')
    && order.items.some((item) => item.received_quantity < item.quantity),
  );

  const submitReceipt = async (input: CreateGoodsReceiptInput) => {
    await handleCreateGRN(input);
    setSuccessMessage(messages.receiptCreated);
  };

  return (
    <section className="space-y-5" aria-labelledby="goods-receipt-workspace-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="goods-receipt-workspace-title" className="text-lg font-semibold text-text">
            {messages.receivingTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{messages.itemsMatchHint}</p>
        </div>
        {!isSupabaseLive && (
          <p role="status" className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            {messages.liveReceivingRequired}
          </p>
        )}
      </header>

      {successMessage && (
        <p role="status" className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          {successMessage}
        </p>
      )}
      {error && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-danger">{error}</p>
          <button type="button" onClick={onRetry} className="min-h-11 rounded-md border border-danger/30 px-4 text-sm font-semibold text-danger">
            {messages.retry}
          </button>
        </div>
      )}

      <section className="space-y-3" aria-labelledby="open-purchase-orders-title">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h3 id="open-purchase-orders-title" className="text-sm font-semibold text-text">
            {messages.openOrdersTitle}
          </h3>
        </div>
        {isLoading ? (
          <div className="grid gap-3" aria-label={messages.loading}>
            {[0, 1].map((key) => (
              <div key={key} className="h-24 animate-pulse rounded-xl border border-border bg-surface-2" />
            ))}
          </div>
        ) : openOrders.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-5 text-center">
            <PackageCheck className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-text">{messages.noOpenOrders}</p>
            <p className="mt-1 text-sm text-muted-foreground">{messages.noOpenOrdersHint}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {openOrders.map((order) => (
              <article key={order.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-text">{order.po_number} · {order.vendor_name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.project_name} · {messages.deliveryDeadline}: {formatDateIndo(order.delivery_deadline)}
                    </p>
                  </div>
                  {canCreate && (
                    <button
                      type="button"
                      disabled={!isSupabaseLive}
                      onClick={() => {
                        setSuccessMessage('');
                        setSelectedOrder(order);
                      }}
                      className="min-h-11 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {messages.receiveGoods}
                    </button>
                  )}
                </div>
                <ul className="mt-3 grid gap-2 border-t border-border pt-3 text-sm text-text sm:grid-cols-2">
                  {order.items.map((item) => {
                    const remaining = Math.max(0, item.quantity - item.received_quantity);
                    return (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span className="min-w-0 break-words">{item.item_name}</span>
                        <span className="text-right text-muted-foreground">
                          {item.received_quantity}/{item.quantity} {item.unit} · {messages.remaining}: {remaining}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="receipt-history-title">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h3 id="receipt-history-title" className="text-sm font-semibold text-text">
            {messages.receiptHistoryTitle} ({receipts.length})
          </h3>
        </div>
        {receipts.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-5 text-center">
            <p className="text-sm font-semibold text-text">{messages.noReceipts}</p>
            <p className="mt-1 text-sm text-muted-foreground">{messages.noReceiptsHint}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {receipts.map((receipt) => (
              <article key={receipt.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-text">{receipt.grn_number} · {receipt.po_number}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {receipt.vendor_name} · {messages.deliveryNoteShort} {receipt.delivery_note_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {receipt.project_name} · {formatDateIndo(receipt.received_date)} · {receipt.receiver_name}
                    </p>
                    {receipt.receiving_location && (
                      <p className="mt-1 text-sm text-muted-foreground">{messages.receivingLocation}: {receipt.receiving_location}</p>
                    )}
                  </div>
                  <span className="inline-flex min-h-8 items-center gap-1 self-start rounded-full bg-surface-2 px-3 text-xs font-semibold text-text">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {receiptStatusLabel(receipt.status)}
                  </span>
                </div>
                <ul className="mt-3 grid gap-2 border-t border-border pt-3 text-sm sm:grid-cols-2">
                  {receipt.items.map((item, index) => (
                    <li key={`${receipt.id}-${item.purchase_order_item_id ?? index}`} className="rounded-lg bg-surface-2 p-3">
                      <p className="font-medium text-text">{item.item_name}</p>
                      <p className="mt-1 text-muted-foreground">
                        {messages.deliveryNoteShort} {item.received_quantity} · {messages.acceptedShort} {item.accepted_quantity} · {messages.rejectedShort} {item.rejected_quantity} {item.unit}
                      </p>
                      {item.condition_notes && <p className="mt-1 break-words text-xs text-muted-foreground">{item.condition_notes}</p>}
                    </li>
                  ))}
                </ul>
                {receipt.notes && <p className="mt-3 break-words text-sm text-muted-foreground">{receipt.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedOrder && (
        <GoodsReceiptDialog
          organizationId={organizationId}
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onCreate={submitReceipt}
        />
      )}
    </section>
  );
}
