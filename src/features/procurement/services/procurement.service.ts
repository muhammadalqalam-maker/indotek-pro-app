import { getSupabase } from '../../../lib/supabase';
import type { GoodsReceiptNote, PurchaseOrder, PurchaseRequest } from '../../../types/database';
import type { Tables } from '../../../types/database.types';
import type {
  CreatePurchaseRequestInput,
  CreateGoodsReceiptInput,
  CreateVendorQuoteInput,
  ProcurementPurchaseRequest,
  VendorQuote,
} from '../types';

function getClient() {
  const client = getSupabase();
  if (!client) throw new Error('Koneksi Supabase belum tersedia.');
  return client;
}

export async function fetchOrganizationLogoDataUrl(logoPath: string | undefined): Promise<string | undefined> {
  if (!logoPath) return undefined;

  let imageUrl: string;
  if (/^https?:\/\//i.test(logoPath)) {
    const parsedUrl = new URL(logoPath);
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('URL logo perusahaan harus menggunakan HTTPS.');
    }
    imageUrl = parsedUrl.toString();
  } else {
    const { data, error } = await getClient().storage.from('org-logos').createSignedUrl(logoPath, 120);
    if (error) throw error;
    imageUrl = data.signedUrl;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Logo perusahaan gagal dimuat (HTTP ${response.status}).`);
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!contentType || !['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) {
    throw new Error('Format logo perusahaan tidak didukung. Gunakan PNG, JPEG, atau WebP.');
  }

  const imageBlob = await response.blob();
  if (imageBlob.size > 2 * 1024 * 1024) {
    throw new Error('Ukuran logo perusahaan melebihi batas 2 MiB.');
  }
  const bitmap = await createImageBitmap(imageBlob);
  try {
    const scale = Math.min(1, 512 / bitmap.width, 256 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Logo perusahaan tidak dapat diproses untuk PDF.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    bitmap.close();
  }
}

function toNumber(value: number | string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('Nilai pengadaan dari server tidak valid.');
  return parsed;
}

export async function fetchProcurementPurchaseRequests(
  organizationId: string,
  projectId?: string,
): Promise<ProcurementPurchaseRequest[]> {
  const client = getClient();
  let requestQuery = client.from('purchase_requests')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (projectId && projectId !== 'all') requestQuery = requestQuery.eq('project_id', projectId);
  const { data: requests, error } = await requestQuery;
  if (error) throw error;
  if (requests.length === 0) return [];

  const requestIds = requests.map(({ id }) => id);
  const userIds = [...new Set(requests.map(({ requester_id }) => requester_id))];
  const projectIds = [...new Set(requests.map(({ project_id }) => project_id))];
  const [itemsResult, profilesResult, projectsResult] = await Promise.all([
    client.from('purchase_request_items')
      .select('*')
      .eq('organization_id', organizationId)
      .in('purchase_request_id', requestIds)
      .is('deleted_at', null),
    client.from('profiles').select('id, full_name').in('id', userIds),
    client.from('projects').select('id, name').in('id', projectIds),
  ]);
  if (itemsResult.error) throw itemsResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (projectsResult.error) throw projectsResult.error;

  const profiles = new Map(profilesResult.data.map((profile) => [profile.id, profile.full_name]));
  const projects = new Map(projectsResult.data.map((project) => [project.id, project.name]));
  const itemsByRequest = new Map<string, ProcurementPurchaseRequest['items']>();
  for (const item of itemsResult.data) {
    const items = itemsByRequest.get(item.purchase_request_id) ?? [];
    items.push({
      id: item.id,
      item_name: item.item_name,
      specification: item.specification,
      unit: item.unit,
      quantity: toNumber(item.quantity),
      estimated_price: toNumber(item.estimated_price),
      subtotal: toNumber(item.subtotal),
    });
    itemsByRequest.set(item.purchase_request_id, items);
  }

  return requests.map((request) => ({
    id: request.id,
    organization_id: request.organization_id,
    project_id: request.project_id,
    project_name: projects.get(request.project_id) ?? 'Proyek tidak ditemukan',
    pr_number: request.pr_number,
    request_date: request.request_date,
    required_date: request.required_date,
    requester_id: request.requester_id,
    requester_name: profiles.get(request.requester_id) ?? request.requester_id,
    department: request.department,
    urgency: request.urgency as ProcurementPurchaseRequest['urgency'],
    status: request.status as ProcurementPurchaseRequest['status'],
    requester_comment: request.requester_comment,
    total_estimated_amount: toNumber(request.total_estimated_amount),
    items: itemsByRequest.get(request.id) ?? [],
    created_at: request.created_at,
  }));
}

export async function fetchVendorQuotes(
  organizationId: string,
  purchaseRequestIds: string[],
): Promise<VendorQuote[]> {
  if (purchaseRequestIds.length === 0) return [];
  const client = getClient();
  const { data: quotes, error } = await client.from('vendor_quotes')
    .select('*')
    .eq('organization_id', organizationId)
    .in('purchase_request_id', purchaseRequestIds)
    .is('deleted_at', null)
    .order('grand_total');
  if (error) throw error;
  if (quotes.length === 0) return [];

  const vendorIds = [...new Set(quotes.map(({ vendor_id }) => vendor_id))];
  const { data: vendors, error: vendorsError } = await client.from('vendors')
    .select('id, name')
    .eq('organization_id', organizationId)
    .in('id', vendorIds);
  if (vendorsError) throw vendorsError;
  const vendorNames = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));
  return quotes.map((quote) => ({
    id: quote.id,
    organization_id: quote.organization_id,
    purchase_request_id: quote.purchase_request_id,
    vendor_id: quote.vendor_id,
    vendor_name: vendorNames.get(quote.vendor_id) ?? quote.vendor_id,
    quote_number: quote.quote_number,
    quote_date: quote.quote_date,
    valid_until: quote.valid_until,
    ppn_percent: toNumber(quote.ppn_percent),
    subtotal: toNumber(quote.subtotal),
    ppn_amount: toNumber(quote.ppn_amount),
    grand_total: toNumber(quote.grand_total),
    notes: quote.notes,
    created_at: quote.created_at,
  }));
}

export async function createPurchaseRequest(input: CreatePurchaseRequestInput): Promise<string> {
  const { data, error } = await getClient().rpc('create_purchase_request', {
    p_organization_id: input.organizationId,
    p_project_id: input.projectId,
    p_required_date: input.requiredDate,
    p_department: input.department,
    p_urgency: input.urgency,
    p_comment: input.comment,
    p_items: input.items,
  });
  if (error) throw error;
  return data;
}

export async function createVendorQuote(input: CreateVendorQuoteInput): Promise<string> {
  const { data, error } = await getClient().rpc('create_vendor_quote', {
    p_organization_id: input.organizationId,
    p_purchase_request_id: input.purchaseRequestId,
    p_vendor_id: input.vendorId,
    p_quote_date: input.quoteDate,
    p_valid_until: input.validUntil,
    p_ppn_percent: input.ppnPercent,
    p_items: input.items.map((item) => ({
      purchase_request_item_id: item.purchase_request_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    p_notes: input.notes,
  });
  if (error) throw error;
  return data;
}

export async function createPurchaseOrderFromQuote(
  organizationId: string,
  purchaseRequestId: string,
  quoteId: string,
  deliveryDeadline: string,
  deliveryAddress: string,
): Promise<string> {
  const { data, error } = await getClient().rpc('create_purchase_order_from_quote', {
    p_organization_id: organizationId,
    p_purchase_request_id: purchaseRequestId,
    p_vendor_quote_id: quoteId,
    p_delivery_deadline: deliveryDeadline,
    p_delivery_address: deliveryAddress,
  });
  if (error) throw error;
  return data;
}

type PurchaseOrderRecord = Tables<'purchase_orders'>;

export async function fetchProcurementPurchaseOrders(
  organizationId: string,
  projectId?: string,
): Promise<PurchaseOrder[]> {
  const client = getClient();
  let orderQuery = client.from('purchase_orders')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (projectId && projectId !== 'all') orderQuery = orderQuery.eq('project_id', projectId);
  const { data: orders, error } = await orderQuery;
  if (error) throw error;
  if (orders.length === 0) return [];

  const projectIds = [...new Set(orders.map(({ project_id }) => project_id))];
  const vendorIds = [...new Set(orders.map(({ vendor_id }) => vendor_id))];
  const requestIds = [...new Set(orders.map(({ purchase_request_id }) => purchase_request_id))];
  const approverIds = [...new Set(orders.flatMap(({ approved_by }) => approved_by ? [approved_by] : []))];
  const orderIds = orders.map(({ id }) => id);
  const [projectsResult, vendorsResult, requestsResult, itemsResult, approversResult] = await Promise.all([
    client.from('projects').select('id, name, location_city').in('id', projectIds),
    client.from('vendors').select('id, name, contact_person, phone').in('id', vendorIds),
    client.from('purchase_requests').select('id, pr_number').in('id', requestIds),
    client.from('purchase_order_items')
      .select('*')
      .eq('organization_id', organizationId)
      .in('purchase_order_id', orderIds)
      .is('deleted_at', null),
    approverIds.length > 0
      ? client.from('profiles').select('id, full_name').in('id', approverIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (projectsResult.error) throw projectsResult.error;
  if (vendorsResult.error) throw vendorsResult.error;
  if (requestsResult.error) throw requestsResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (approversResult.error) throw approversResult.error;

  const projects = new Map(projectsResult.data.map((project) => [project.id, project]));
  const vendors = new Map(vendorsResult.data.map((vendor) => [vendor.id, vendor]));
  const requests = new Map(requestsResult.data.map((request) => [request.id, request.pr_number]));
  const approvers = new Map(approversResult.data.map((profile) => [profile.id, profile.full_name]));
  const items = new Map<string, PurchaseOrder['items']>();
  for (const item of itemsResult.data) {
    const values = items.get(item.purchase_order_id) ?? [];
    values.push({
      id: item.id,
      item_code: item.item_code,
      item_name: item.item_name,
      specification: item.specification,
      unit: item.unit,
      quantity: toNumber(item.quantity),
      unit_price: toNumber(item.unit_price),
      total_price: toNumber(item.total_price),
      received_quantity: toNumber(item.received_quantity),
    });
    items.set(item.purchase_order_id, values);
  }

  return orders.map((order: PurchaseOrderRecord) => {
    const project = projects.get(order.project_id);
    const vendor = vendors.get(order.vendor_id);
    if (!project || !vendor) throw new Error('Data proyek atau vendor pada PO tidak lengkap.');
    return {
      id: order.id,
      organization_id: order.organization_id,
      project_id: order.project_id,
      project_name: project.name,
      po_number: order.po_number,
      pr_number: requests.get(order.purchase_request_id),
      vendor_id: order.vendor_id,
      vendor_name: vendor.name,
      vendor_contact: `${vendor.contact_person} (${vendor.phone})`,
      order_date: order.order_date,
      delivery_deadline: order.delivery_deadline,
      delivery_address: order.delivery_address,
      subtotal: toNumber(order.subtotal),
      ppn_percent: toNumber(order.ppn_percent),
      ppn_amount: toNumber(order.ppn_amount),
      grand_total: toNumber(order.grand_total),
      status: order.status as PurchaseOrder['status'],
      approved_by_name: order.approved_by ? approvers.get(order.approved_by) : undefined,
      approved_at: order.approved_at ?? undefined,
      approval_notes: order.approval_notes,
      items: items.get(order.id) ?? [],
      created_at: order.created_at,
    };
  });
}

export async function fetchProcurementGoodsReceipts(
  organizationId: string,
  projectId?: string,
): Promise<GoodsReceiptNote[]> {
  const client = getClient();
  let receiptQuery = client.from('goods_receipts')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('received_date', { ascending: false });
  if (projectId && projectId !== 'all') receiptQuery = receiptQuery.eq('project_id', projectId);
  const { data: receipts, error } = await receiptQuery;
  if (error) throw error;
  if (receipts.length === 0) return [];

  const receiptIds = receipts.map(({ id }) => id);
  const orderIds = [...new Set(receipts.map(({ purchase_order_id }) => purchase_order_id))];
  const projectIds = [...new Set(receipts.map(({ project_id }) => project_id))];
  const vendorIds = [...new Set(receipts.map(({ vendor_id }) => vendor_id))];
  const [ordersResult, projectsResult, vendorsResult, itemsResult] = await Promise.all([
    client.from('purchase_orders').select('id, po_number')
      .eq('organization_id', organizationId)
      .in('id', orderIds),
    client.from('projects').select('id, name')
      .eq('organization_id', organizationId)
      .in('id', projectIds),
    client.from('vendors').select('id, name').eq('organization_id', organizationId).in('id', vendorIds),
    client.from('goods_receipt_items')
      .select('*')
      .eq('organization_id', organizationId)
      .in('goods_receipt_id', receiptIds)
      .is('deleted_at', null),
  ]);
  if (ordersResult.error) throw ordersResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (vendorsResult.error) throw vendorsResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const orders = new Map(ordersResult.data.map((order) => [order.id, order.po_number]));
  const projects = new Map(projectsResult.data.map((project) => [project.id, project.name]));
  const vendors = new Map(vendorsResult.data.map((vendor) => [vendor.id, vendor.name]));
  const itemsByReceipt = new Map<string, GoodsReceiptNote['items']>();
  for (const item of itemsResult.data) {
    const items = itemsByReceipt.get(item.goods_receipt_id) ?? [];
    items.push({
      purchase_order_item_id: item.purchase_order_item_id,
      item_name: item.item_name,
      unit: item.unit,
      po_quantity: toNumber(item.po_quantity),
      received_quantity: toNumber(item.received_quantity),
      accepted_quantity: toNumber(item.accepted_quantity),
      rejected_quantity: toNumber(item.rejected_quantity),
      condition_notes: item.condition_notes,
    });
    itemsByReceipt.set(item.goods_receipt_id, items);
  }

  return receipts.map((receipt) => {
    const poNumber = orders.get(receipt.purchase_order_id);
    const projectName = projects.get(receipt.project_id);
    const vendorName = vendors.get(receipt.vendor_id);
    if (!poNumber || !projectName || !vendorName) {
      throw new Error('Relasi PO, proyek, atau vendor pada GRN tidak lengkap.');
    }
    return {
      id: receipt.id,
      organization_id: receipt.organization_id,
      project_id: receipt.project_id,
      project_name: projectName,
      purchase_order_id: receipt.purchase_order_id,
      grn_number: receipt.grn_number,
      po_number: poNumber,
      vendor_name: vendorName,
      delivery_note_number: receipt.delivery_note_number,
      receiving_location: receipt.receiving_location,
      received_date: receipt.received_date,
      receiver_name: receipt.receiver_name,
      driver_name: receipt.driver_name,
      vehicle_number: receipt.vehicle_number,
      status: receipt.status as GoodsReceiptNote['status'],
      notes: receipt.notes,
      items: itemsByReceipt.get(receipt.id) ?? [],
      created_at: receipt.created_at,
    };
  });
}

export async function createProcurementGoodsReceipt(input: CreateGoodsReceiptInput): Promise<string> {
  const { data, error } = await getClient().rpc('create_goods_receipt_at_location', {
    p_organization_id: input.organizationId,
    p_purchase_order_id: input.purchaseOrderId,
    p_delivery_note_number: input.deliveryNoteNumber,
    p_receiving_location: input.receivingLocation,
    p_received_date: input.receivedDate,
    p_receiver_name: input.receiverName,
    p_driver_name: input.driverName,
    p_vehicle_number: input.vehicleNumber,
    p_notes: input.notes,
    p_items: input.items.map((item) => ({
      purchase_order_item_id: item.purchaseOrderItemId,
      received_quantity: item.receivedQuantity,
      accepted_quantity: item.acceptedQuantity,
      condition_notes: item.conditionNotes,
    })),
  });
  if (error) throw error;
  return data;
}

export function toLegacyPurchaseRequest(request: ProcurementPurchaseRequest): PurchaseRequest {
  return {
    id: request.id,
    organization_id: request.organization_id,
    project_id: request.project_id,
    project_name: request.project_name,
    pr_number: request.pr_number,
    request_date: request.request_date,
    required_date: request.required_date,
    requester_name: request.requester_name,
    department: request.department,
    urgency: request.urgency,
    status: request.status,
    total_estimated_amount: request.total_estimated_amount,
    items: request.items,
    created_at: request.created_at,
  };
}
