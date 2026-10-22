import { jsPDF } from 'jspdf';
import type { Organization, PurchaseOrder } from '../../../types/database';
import { formatDateIndo, formatRupiah, formatVolume } from '../../../utils/format';

export type PurchaseOrderPdfLabels = {
  title: string;
  continued: string;
  project: string;
  requestReference: string;
  vendor: string;
  orderDate: string;
  deliveryDeadline: string;
  deliveryAddress: string;
  status: string;
  subtotal: string;
  vat: string;
  grandTotal: string;
  item: string;
  specification: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineTotal: string;
  approvedBy: string;
  approvalDate: string;
  approvalNotes: string;
  npwp: string;
  nib: string;
  page: string;
  statuses: Record<PurchaseOrder['status'], string>;
};

export type PurchaseOrderPdfOptions = {
  organization: Organization;
  order: PurchaseOrder;
  labels: PurchaseOrderPdfLabels;
  logoDataUrl?: string;
};

const pageLeft = 16;
const pageRight = 194;
const pageBottom = 270;
const tableLineHeight = 4;

function cleanPdfText(value: string | null | undefined): string {
  return (value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim() || '-';
}

function addWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight: number,
): number {
  const lines = pdf.splitTextToSize(cleanPdfText(text), width);
  for (const line of lines) {
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function addCompanyHeader(
  pdf: jsPDF,
  organization: Organization,
  logoDataUrl: string | undefined,
  labels: PurchaseOrderPdfLabels,
): number {
  let y = 18;
  const textWidth = logoDataUrl ? 138 : pageRight - pageLeft;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  y = addWrappedText(pdf, organization.name, pageLeft, y, textWidth, 6);

  const legalDetails = [
    organization.npwp ? `${labels.npwp}: ${organization.npwp}` : '',
    organization.nib ? `${labels.nib}: ${organization.nib}` : '',
  ].filter(Boolean).join('  |  ');
  const address = [
    organization.address,
    organization.city,
    organization.province,
    organization.postal_code,
  ].filter(Boolean).join(', ');
  const contact = [organization.phone, organization.email].filter(Boolean).join('  |  ');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  if (legalDetails) y = addWrappedText(pdf, legalDetails, pageLeft, y, textWidth, 4);
  if (address) y = addWrappedText(pdf, address, pageLeft, y, textWidth, 4);
  if (contact) y = addWrappedText(pdf, contact, pageLeft, y, textWidth, 4);

  if (logoDataUrl) {
    const image = pdf.getImageProperties(logoDataUrl);
    const scale = Math.min(26 / image.width, 22 / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    pdf.addImage(logoDataUrl, 'PNG', pageRight - width, 14, width, height);
  }

  const dividerY = y + 2;
  pdf.setDrawColor(148, 163, 184);
  pdf.setLineWidth(0.35);
  pdf.line(pageLeft, dividerY, pageRight, dividerY);
  return dividerY + 8;
}

function addTableHeader(pdf: jsPDF, labels: PurchaseOrderPdfLabels, y: number): number {
  const x = [pageLeft, 25, 119, 136, 165, pageRight];
  pdf.setFillColor(241, 245, 249);
  pdf.rect(pageLeft, y - 4, pageRight - pageLeft, 9, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.setTextColor(30, 41, 59);
  pdf.text(`${labels.item} / ${labels.specification}`, x[1], y + 1);
  pdf.text(labels.quantity, x[2], y + 1, { align: 'right' });
  pdf.text(labels.unit, x[3], y + 1, { align: 'right' });
  pdf.text(labels.unitPrice, x[4], y + 1, { align: 'right' });
  pdf.text(labels.lineTotal, x[5], y + 1, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
  return y + 8;
}

function addField(
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text(cleanPdfText(label), x, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  return addWrappedText(pdf, value, x, y + 4, width, 4.5);
}

function addFooter(pdf: jsPDF, order: PurchaseOrder, labels: PurchaseOrderPdfLabels): void {
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.25);
    pdf.line(pageLeft, 282, pageRight, 282);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(71, 85, 105);
    pdf.text(order.po_number, pageLeft, 287);
    pdf.text(`${labels.page} ${page}/${pageCount}`, pageRight, 287, { align: 'right' });
  }
  pdf.setTextColor(0, 0, 0);
}

export function createPurchaseOrderPdf(options: PurchaseOrderPdfOptions): jsPDF {
  const { organization, order, labels, logoDataUrl } = options;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = addCompanyHeader(pdf, organization, logoDataUrl, labels);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  y = addWrappedText(pdf, `${labels.title} - ${order.po_number}`, pageLeft, y, pageRight - pageLeft, 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);

  const details = [
    [labels.project, order.project_name],
    [labels.requestReference, order.pr_number || '-'],
    [labels.vendor, `${order.vendor_name} - ${order.vendor_contact}`],
    [labels.orderDate, formatDateIndo(order.order_date)],
    [labels.deliveryDeadline, formatDateIndo(order.delivery_deadline)],
    [labels.deliveryAddress, order.delivery_address],
    [labels.status, labels.statuses[order.status]],
  ] as const;

  for (let index = 0; index < details.length; index += 2) {
    const rowY = y + 3;
    const leftBottom = addField(pdf, details[index][0], details[index][1], pageLeft, rowY, 82);
    const rightDetail = details[index + 1];
    const rightBottom = rightDetail
      ? addField(pdf, rightDetail[0], rightDetail[1], 108, rowY, 86)
      : rowY + 4;
    y = Math.max(leftBottom, rightBottom) + 2;
  }

  pdf.setDrawColor(203, 213, 225);
  pdf.line(pageLeft, y, pageRight, y);
  y = addTableHeader(pdf, labels, y + 5);

  const startContinuationPage = (withTableHeader = true) => {
    pdf.addPage();
    let nextY = addCompanyHeader(pdf, organization, logoDataUrl, labels);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    nextY = addWrappedText(
      pdf,
      `${labels.title} - ${order.po_number} (${labels.continued})`,
      pageLeft,
      nextY,
      pageRight - pageLeft,
      5,
    );
    return withTableHeader ? addTableHeader(pdf, labels, nextY + 3) : nextY + 3;
  };

  for (const [index, item] of order.items.entries()) {
    const nameLines = pdf.splitTextToSize(`${index + 1}. ${cleanPdfText(item.item_name)}`, 88);
    const specificationLines = item.specification.trim()
      ? pdf.splitTextToSize(cleanPdfText(item.specification), 88)
      : [];
    const textLines = [
      ...nameLines.map((text: string) => ({ text, bold: true })),
      ...specificationLines.map((text: string) => ({ text, bold: false })),
    ];
    let lineIndex = 0;
    let segmentIndex = 0;

    while (lineIndex < textLines.length) {
      if (y + tableLineHeight > pageBottom) y = startContinuationPage();
      if (segmentIndex > 0 && y + (2 * tableLineHeight) > pageBottom) {
        y = startContinuationPage();
      }
      const lineCapacity = Math.floor((pageBottom - y - 2) / tableLineHeight);
      const availableLines = Math.max(1, lineCapacity - (segmentIndex > 0 ? 1 : 0));
      const segment = textLines.slice(lineIndex, lineIndex + availableLines);
      if (segmentIndex > 0) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        pdf.text(labels.continued, pageLeft, y);
        y += tableLineHeight;
      }

      segment.forEach((line, offset) => {
        pdf.setFont('helvetica', line.bold ? 'bold' : 'normal');
        pdf.setFontSize(line.bold ? 8 : 7);
        pdf.text(line.text, 25, y + offset * tableLineHeight);
      });

      if (segmentIndex === 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(formatVolume(item.quantity), 119, y, { align: 'right' });
        pdf.text(cleanPdfText(item.unit), 136, y, { align: 'right' });
        pdf.text(formatRupiah(item.unit_price), 165, y, { align: 'right' });
        pdf.text(formatRupiah(item.total_price), pageRight, y, { align: 'right' });
      }

      y += segment.length * tableLineHeight + 2;
      lineIndex += segment.length;
      segmentIndex += 1;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(pageLeft, y - 1, pageRight, y - 1);
    }

  }

  const summaryHeight = 28;
  if (y + summaryHeight > pageBottom) y = startContinuationPage(false);
  y += 3;
  const summaryRows = [
    [labels.subtotal, formatRupiah(order.subtotal)],
    [`${labels.vat} (${formatVolume(order.ppn_percent, 2)}%)`, formatRupiah(order.ppn_amount)],
    [labels.grandTotal, formatRupiah(order.grand_total)],
  ] as const;
  summaryRows.forEach(([label, value], index) => {
    pdf.setFont('helvetica', index === summaryRows.length - 1 ? 'bold' : 'normal');
    pdf.setFontSize(index === summaryRows.length - 1 ? 10 : 8.5);
    pdf.text(label, 135, y, { align: 'right' });
    pdf.text(value, pageRight, y, { align: 'right' });
    y += index === summaryRows.length - 1 ? 6 : 5;
  });

  if (order.approved_by_name) {
    if (y + 18 > pageBottom) y = startContinuationPage(false);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const addApprovalText = (text: string) => {
      const lines = pdf.splitTextToSize(cleanPdfText(text), pageRight - pageLeft);
      for (const line of lines) {
        if (y + 4 > pageBottom) y = startContinuationPage(false);
        pdf.text(line, pageLeft, y);
        y += 4;
      }
    };
    addApprovalText(`${labels.approvedBy}: ${order.approved_by_name}`);
    if (order.approved_at) {
      addApprovalText(`${labels.approvalDate}: ${formatDateIndo(order.approved_at)}`);
    }
    if (order.approval_notes) {
      addApprovalText(`${labels.approvalNotes}: ${order.approval_notes}`);
    }
  }

  addFooter(pdf, order, labels);
  return pdf;
}

export function downloadPurchaseOrderPdf(options: PurchaseOrderPdfOptions): void {
  const fileSafeNumber = options.order.po_number.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
  createPurchaseOrderPdf(options).save(`PO-${fileSafeNumber}.pdf`);
}
