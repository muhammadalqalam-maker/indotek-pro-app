import { useState } from 'react';
import { CheckCircle2, Download, X } from 'lucide-react';
import { Button, useToast } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatDateIndo, formatRupiah, formatVolume } from '../../../utils/format';
import type { Organization, PurchaseOrder } from '../../../types/database';
import { fetchOrganizationLogoDataUrl } from '../services/procurement.service';
import type { PurchaseOrderPdfLabels } from '../utils/purchaseOrderPdf';

type PurchaseOrderDetailsDialogProps = {
  organization: Organization;
  order: PurchaseOrder;
  onClose: () => void;
};

export function PurchaseOrderDetailsDialog({
  organization,
  order,
  onClose,
}: PurchaseOrderDetailsDialogProps) {
  const messages = getMessages().procurementWorkflow.purchaseOrderPdf;
  const commonMessages = getMessages().common;
  const { toast } = useToast();
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

  const downloadPdf = async () => {
    setIsPreparingPdf(true);
    try {
      const logoDataUrl = await fetchOrganizationLogoDataUrl(organization.logo_url);
      const { downloadPurchaseOrderPdf } = await import('../utils/purchaseOrderPdf');
      const labels: PurchaseOrderPdfLabels = {
        title: messages.documentTitle,
        continued: messages.continued,
        project: messages.project,
        requestReference: messages.requestReference,
        vendor: messages.vendor,
        orderDate: messages.orderDate,
        deliveryDeadline: messages.deliveryDeadline,
        deliveryAddress: messages.deliveryAddress,
        status: messages.status,
        subtotal: messages.subtotal,
        vat: messages.vat,
        grandTotal: messages.grandTotal,
        item: messages.item,
        specification: messages.specification,
        quantity: messages.quantity,
        unit: messages.unit,
        unitPrice: messages.unitPrice,
        lineTotal: messages.lineTotal,
        approvedBy: messages.approvedBy,
        approvalDate: messages.approvalDate,
        approvalNotes: messages.approvalNotes,
        npwp: messages.npwp,
        nib: messages.nib,
        page: messages.page,
        statuses: messages.statuses,
      };
      downloadPurchaseOrderPdf({ organization, order, labels, logoDataUrl });
      toast({ title: messages.downloaded, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.downloadFailed,
        description: error instanceof Error ? error.message : messages.downloadFailed,
        variant: 'error',
      });
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const companyAddress = [
    organization.address,
    organization.city,
    organization.province,
    organization.postal_code,
  ].filter(Boolean).join(', ');
  const companyContacts = [organization.phone, organization.email].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
      <section
        aria-labelledby="purchase-order-dialog-title"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-6"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
          <div className="min-w-0">
            <h2 id="purchase-order-dialog-title" className="text-lg font-bold text-text sm:text-xl">
              {organization.name}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{messages.detailTitle}</p>
            {(companyAddress || companyContacts || organization.npwp || organization.nib) && (
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                {[companyAddress, companyContacts, organization.npwp && `${messages.npwp}: ${organization.npwp}`, organization.nib && `${messages.nib}: ${organization.nib}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label={commonMessages.close}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-3 rounded-xl border border-border bg-surface-2 p-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{messages.orderNumber}</p>
            <p className="mt-1 font-bold text-text">{order.po_number}</p>
            <p className="mt-1 text-text-muted">{messages.orderDate}: {formatDateIndo(order.order_date)}</p>
            <p className="mt-1 text-text-muted">{messages.project}: {order.project_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{messages.supplier}</p>
            <p className="mt-1 font-bold text-text">{order.vendor_name}</p>
            <p className="mt-1 text-text-muted">{order.vendor_contact}</p>
            <p className="mt-1 text-text-muted">{messages.status}: {messages.statuses[order.status]}</p>
            <p className="mt-1 text-text-muted">{messages.deliveryDeadline}: {formatDateIndo(order.delivery_deadline)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{messages.deliveryAddress}</p>
            <p className="mt-1 text-text">{order.delivery_address}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-2 text-xs font-semibold text-text-muted">
              <tr>
                <th className="p-3">{messages.item} / {messages.specification}</th>
                <th className="p-3 text-right">{messages.quantity}</th>
                <th className="p-3 text-right">{messages.unit}</th>
                <th className="p-3 text-right">{messages.unitPrice}</th>
                <th className="p-3 text-right">{messages.lineTotal}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="max-w-72 p-3">
                    <p className="font-semibold text-text">{item.item_name}</p>
                    {item.specification && <p className="mt-1 text-xs text-text-muted">{item.specification}</p>}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right">{formatVolume(item.quantity)}</td>
                  <td className="p-3 text-right">{item.unit}</td>
                  <td className="whitespace-nowrap p-3 text-right">{formatRupiah(item.unit_price)}</td>
                  <td className="whitespace-nowrap p-3 text-right font-semibold">{formatRupiah(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-2">
              <tr>
                <td colSpan={4} className="p-3 text-right font-medium">{messages.subtotal}</td>
                <td className="whitespace-nowrap p-3 text-right">{formatRupiah(order.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={4} className="p-3 text-right font-medium">
                  {messages.vat} ({formatVolume(order.ppn_percent, 2)}%)
                </td>
                <td className="whitespace-nowrap p-3 text-right">{formatRupiah(order.ppn_amount)}</td>
              </tr>
              <tr className="border-t border-border text-base font-bold text-text">
                <td colSpan={4} className="p-3 text-right">{messages.grandTotal}</td>
                <td className="whitespace-nowrap p-3 text-right">{formatRupiah(order.grand_total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {order.approved_by_name && (
          <div className="rounded-xl border border-success/30 bg-success-bg p-3 text-sm text-success">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              {messages.approvedDigitally}: <strong>{order.approved_by_name}</strong>
            </p>
            {order.approved_at && (
              <p className="mt-1">{messages.approvalDate}: {formatDateIndo(order.approved_at)}</p>
            )}
            {order.approval_notes && <p className="mt-1">{messages.approvalNotes}: {order.approval_notes}</p>}
          </div>
        )}

        <footer className="flex flex-col-reverse justify-end gap-2 border-t border-border pt-4 sm:flex-row">
          <Button variant="outline" onClick={onClose}>{commonMessages.close}</Button>
          <Button variant="accent" loading={isPreparingPdf} onClick={() => void downloadPdf()}>
            {!isPreparingPdf && <Download className="h-4 w-4" aria-hidden="true" />}
            {isPreparingPdf ? messages.preparing : messages.download}
          </Button>
        </footer>
      </section>
    </div>
  );
}
