import { z } from 'zod';

const procurementItemSchema = z.object({
  item_name: z.string().trim().min(2).max(180),
  specification: z.string().trim().max(1000),
  unit: z.string().trim().min(1).max(24),
  quantity: z.number().positive().max(1_000_000),
  estimated_price: z.number().nonnegative().max(999_999_999_999_999.99),
});

export const purchaseRequestSchema = z.object({
  projectId: z.string().uuid(),
  requiredDate: z.string().date(),
  department: z.string().trim().min(2).max(120),
  urgency: z.enum(['normal', 'urgent', 'critical']),
  comment: z.string().trim().max(2000),
  items: z.array(procurementItemSchema).min(1).max(100),
});

export const vendorQuoteSchema = z.object({
  vendorId: z.string().uuid(),
  quoteDate: z.string().date(),
  validUntil: z.string().date().nullable(),
  ppnPercent: z.number().min(0).max(100),
  notes: z.string().trim().max(2000),
  items: z.array(z.object({
    purchaseRequestItemId: z.string().uuid(),
    unitPrice: z.number().nonnegative().max(999_999_999_999_999.99),
  })).min(1).max(100),
}).superRefine((quote, context) => {
  if (quote.validUntil && quote.validUntil < quote.quoteDate) {
    context.addIssue({
      code: 'custom',
      path: ['validUntil'],
      message: 'Masa berlaku tidak boleh sebelum tanggal penawaran.',
    });
  }
});

export const purchaseOrderFromQuoteSchema = z.object({
  quoteId: z.string().uuid(),
  deliveryDeadline: z.string().date(),
  deliveryAddress: z.string().trim().min(3).max(500),
});

export const goodsReceiptSchema = z.object({
  deliveryNoteNumber: z.string().trim().min(1).max(100),
  receivedDate: z.string().date(),
  receiverName: z.string().trim().min(2).max(120),
  driverName: z.string().trim().max(120),
  vehicleNumber: z.string().trim().max(80),
  notes: z.string().trim().max(2000),
  items: z.array(z.object({
    purchaseOrderItemId: z.string().uuid(),
    receivedQuantity: z.number().min(0).max(1_000_000),
    acceptedQuantity: z.number().min(0).max(1_000_000),
    conditionNotes: z.string().trim().max(500),
  })).min(1).max(100),
}).superRefine((receipt, context) => {
  const itemIds = new Set<string>();
  let hasReceivedItems = false;
  receipt.items.forEach((item, index) => {
    if (itemIds.has(item.purchaseOrderItemId)) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'purchaseOrderItemId'],
        message: 'Item PO tidak boleh dicatat lebih dari sekali.',
      });
    }
    itemIds.add(item.purchaseOrderItemId);
    hasReceivedItems ||= item.receivedQuantity > 0;
    if (item.acceptedQuantity > item.receivedQuantity) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'acceptedQuantity'],
        message: 'Kuantitas diterima tidak boleh melebihi kuantitas dari surat jalan.',
      });
    }
  });
  if (!hasReceivedItems) {
    context.addIssue({
      code: 'custom',
      path: ['items'],
      message: 'Masukkan kuantitas untuk setidaknya satu item.',
    });
  }
});
