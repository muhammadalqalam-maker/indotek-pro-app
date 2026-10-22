export type PurchaseRequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'converted_to_po';

export interface PurchaseRequestLine {
  id: string;
  item_name: string;
  specification: string;
  unit: string;
  quantity: number;
  estimated_price: number;
  subtotal: number;
}

export interface ProcurementPurchaseRequest {
  id: string;
  organization_id: string;
  project_id: string;
  project_name: string;
  pr_number: string;
  request_date: string;
  required_date: string;
  requester_id: string;
  requester_name: string;
  department: string;
  urgency: 'normal' | 'urgent' | 'critical';
  status: PurchaseRequestStatus;
  requester_comment: string;
  total_estimated_amount: number;
  items: PurchaseRequestLine[];
  created_at: string;
}

export interface VendorQuote {
  id: string;
  organization_id: string;
  purchase_request_id: string;
  vendor_id: string;
  vendor_name: string;
  quote_number: string;
  quote_date: string;
  valid_until: string | null;
  ppn_percent: number;
  subtotal: number;
  ppn_amount: number;
  grand_total: number;
  notes: string;
  created_at: string;
}

export interface VendorQuoteLine {
  purchase_request_item_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreatePurchaseRequestInput {
  organizationId: string;
  projectId: string;
  requiredDate: string;
  department: string;
  urgency: 'normal' | 'urgent' | 'critical';
  comment: string;
  items: Array<{
    item_name: string;
    specification: string;
    unit: string;
    quantity: number;
    estimated_price: number;
  }>;
}

export interface CreateVendorQuoteInput {
  organizationId: string;
  purchaseRequestId: string;
  vendorId: string;
  quoteDate: string;
  validUntil: string | null;
  ppnPercent: number;
  notes: string;
  items: VendorQuoteLine[];
}

export interface CreateGoodsReceiptInput {
  organizationId: string;
  purchaseOrderId: string;
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
}
