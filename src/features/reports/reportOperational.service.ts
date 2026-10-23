import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';
import {
  chunkIds,
  fetchAllPages,
  makeRow,
  type AttendanceRow,
  type ClientInvoiceRow,
  type FieldWorkerRow,
  type InventoryItemRow,
  type ProjectPayableRow,
  type PurchaseOrderRow,
  type ReportFilters,
  type ReportRow,
  type SafetyIncidentRow,
  type StockMovementRow,
  type VendorRow,
} from './reportData.shared';

export async function fetchFinanceReport(
  client: SupabaseClient<Database>,
  filters: ReportFilters,
): Promise<ReportRow[]> {
  const [invoices, payables] = await Promise.all([
    fetchAllPages<ClientInvoiceRow>((from, to) => {
      let query = client.from('client_invoices')
        .select('*')
        .eq('organization_id', filters.organizationId)
        .is('deleted_at', null)
        .gte('invoice_date', filters.startDate)
        .lte('invoice_date', filters.endDate)
        .order('invoice_date', { ascending: false })
        .range(from, to);
      if (filters.projectId !== 'all') query = query.eq('project_id', filters.projectId);
      return query;
    }),
    fetchAllPages<ProjectPayableRow>((from, to) => {
      let query = client.from('project_payables')
        .select('*')
        .eq('organization_id', filters.organizationId)
        .is('deleted_at', null)
        .gte('invoice_date', filters.startDate)
        .lte('invoice_date', filters.endDate)
        .order('invoice_date', { ascending: false })
        .range(from, to);
      if (filters.projectId !== 'all') query = query.eq('project_id', filters.projectId);
      return query;
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const invoiceRows = invoices.map((invoice) => {
    const amount = Number(invoice.total_amount);
    const paidAmount = Number(invoice.paid_amount);
    const invoiceStatus = (
      (invoice.status === 'sent' || invoice.status === 'partially_paid')
      && invoice.due_date < today
    ) ? 'overdue' : invoice.status;
    return makeRow(`invoice:${invoice.id}`, [invoice.project_id], invoice.invoice_date, invoiceStatus, {
      documentType: invoice.invoice_type,
      documentNumber: invoice.invoice_number,
      amount,
      paidAmount,
      outstanding: Math.max(0, amount - paidAmount),
    });
  });
  const payableRows = payables.map((payable) => {
    const amount = Number(payable.amount);
    const paidAmount = Number(payable.paid_amount);
    const payableStatus = payable.status !== 'paid'
      && payable.due_date < today
      ? 'overdue'
      : payable.status;
    return makeRow(`payable:${payable.id}`, [payable.project_id], payable.invoice_date, payableStatus, {
      documentType: 'payable',
      documentNumber: payable.payable_number,
      amount,
      paidAmount,
      outstanding: Math.max(0, amount - paidAmount),
    });
  });
  return [...invoiceRows, ...payableRows].sort((first, second) => second.date.localeCompare(first.date));
}

export async function fetchProcurementReport(
  client: SupabaseClient<Database>,
  filters: ReportFilters,
): Promise<ReportRow[]> {
  const orders = await fetchAllPages<PurchaseOrderRow>((from, to) => {
    let query = client.from('purchase_orders')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .is('deleted_at', null)
      .gte('order_date', filters.startDate)
      .lte('order_date', filters.endDate)
      .order('order_date', { ascending: false })
      .range(from, to);
    if (filters.projectId !== 'all') query = query.eq('project_id', filters.projectId);
    return query;
  });
  const vendorIds = [...new Set(orders.map((order) => order.vendor_id))];
  const vendors: VendorRow[] = [];
  for (const vendorIdBatch of chunkIds(vendorIds)) {
    vendors.push(...await fetchAllPages<VendorRow>((from, to) => client
      .from('vendors')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .in('id', vendorIdBatch)
      .range(from, to)));
  }
  const vendorNameById = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));

  return orders.map((order) => makeRow(order.id, [order.project_id], order.order_date, order.status, {
    poNumber: order.po_number,
    vendor: vendorNameById.get(order.vendor_id) ?? null,
    grandTotal: Number(order.grand_total),
    deliveryDeadline: order.delivery_deadline,
  }));
}

export async function fetchStockReport(
  client: SupabaseClient<Database>,
  filters: ReportFilters,
): Promise<ReportRow[]> {
  const fetchMovements = (projectColumn?: 'source_project_id' | 'destination_project_id') => (
    fetchAllPages<StockMovementRow>((from, to) => {
      let query = client.from('stock_movements')
        .select('*')
        .eq('organization_id', filters.organizationId)
        .is('deleted_at', null)
        .gte('movement_date', filters.startDate)
        .lte('movement_date', filters.endDate)
        .order('movement_date', { ascending: false })
        .range(from, to);
      if (filters.projectId !== 'all' && projectColumn) {
        query = query.eq(projectColumn, filters.projectId);
      }
      return query;
    })
  );

  const movements = filters.projectId === 'all'
    ? await fetchMovements()
    : (await Promise.all([
      fetchMovements('source_project_id'),
      fetchMovements('destination_project_id'),
    ])).flat();
  const movementById = new Map(movements.map((movement) => [movement.id, movement]));
  const uniqueMovements = [...movementById.values()];
  const inventoryItemIds = [...new Set(uniqueMovements.flatMap((movement) => [
    movement.source_inventory_item_id,
    movement.destination_inventory_item_id,
  ].filter((id): id is string => id !== null)))];
  const inventoryItems: InventoryItemRow[] = [];
  for (const itemIdBatch of chunkIds(inventoryItemIds)) {
    inventoryItems.push(...await fetchAllPages<InventoryItemRow>((from, to) => client
      .from('inventory_items')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .in('id', itemIdBatch)
      .range(from, to)));
  }
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));

  return uniqueMovements.map((movement) => {
    const sourceItem = movement.source_inventory_item_id
      ? inventoryById.get(movement.source_inventory_item_id)
      : undefined;
    const destinationItem = movement.destination_inventory_item_id
      ? inventoryById.get(movement.destination_inventory_item_id)
      : undefined;
    const item = destinationItem ?? sourceItem;
    return makeRow(
      movement.id,
      [movement.source_project_id, movement.destination_project_id],
      movement.movement_date,
      movement.movement_type,
      {
        itemName: item?.item_name ?? null,
        movementType: movement.movement_type,
        quantity: Number(movement.quantity),
        reference: movement.reference_doc,
        counterparty: movement.recipient_or_supplier,
      },
    );
  }).sort((first, second) => second.date.localeCompare(first.date));
}

export async function fetchAttendanceReport(
  client: SupabaseClient<Database>,
  filters: ReportFilters,
): Promise<ReportRow[]> {
  const attendance = await fetchAllPages<AttendanceRow>((from, to) => {
    let query = client.from('daily_attendance')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .is('deleted_at', null)
      .gte('attendance_date', filters.startDate)
      .lte('attendance_date', filters.endDate)
      .order('attendance_date', { ascending: false })
      .range(from, to);
    if (filters.projectId !== 'all') query = query.eq('project_id', filters.projectId);
    return query;
  });
  const workerIds = [...new Set(attendance.map((item) => item.worker_id))];
  const workers: FieldWorkerRow[] = [];
  for (const workerIdBatch of chunkIds(workerIds)) {
    workers.push(...await fetchAllPages<FieldWorkerRow>((from, to) => client
      .from('field_workers')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .in('id', workerIdBatch)
      .range(from, to)));
  }
  const workerById = new Map(workers.map((worker) => [worker.id, worker]));

  return attendance.map((item) => {
    const worker = workerById.get(item.worker_id);
    return makeRow(item.id, [item.project_id], item.attendance_date, item.status, {
      workerName: worker?.full_name ?? null,
      role: worker?.role_trade ?? null,
      workHours: Number(item.work_hours),
      overtimeHours: Number(item.overtime_hours),
    });
  });
}

export async function fetchSafetyReport(
  client: SupabaseClient<Database>,
  filters: ReportFilters,
): Promise<ReportRow[]> {
  const incidents = await fetchAllPages<SafetyIncidentRow>((from, to) => {
    let query = client.from('safety_incidents')
      .select('*')
      .eq('organization_id', filters.organizationId)
      .is('deleted_at', null)
      .gte('incident_date', filters.startDate)
      .lte('incident_date', filters.endDate)
      .order('incident_date', { ascending: false })
      .range(from, to);
    if (filters.projectId !== 'all') query = query.eq('project_id', filters.projectId);
    return query;
  });

  return incidents.map((incident) => makeRow(
    incident.id,
    [incident.project_id],
    incident.incident_date,
    incident.status,
    {
      incidentNumber: incident.incident_number,
      category: incident.category,
      severity: incident.severity,
      location: incident.location,
      description: incident.description,
    },
  ));
}
