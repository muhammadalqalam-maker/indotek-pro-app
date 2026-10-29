import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { formatRupiah, formatDateIndo } from '../../utils/format';
import { PurchaseOrder } from '../../types/database';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  PageHeader,
  PageShell,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui';
import { VendorWorkspace } from './components/VendorWorkspace';
import { ProcurementWorkflowWorkspace } from './components/ProcurementWorkflowWorkspace';
import { GoodsReceiptWorkspace } from './components/GoodsReceiptWorkspace';
import { MaterialRequestWorkspace } from './components/MaterialRequestWorkspace';
import { fetchWarehouseData } from '../warehouse/services/warehouse.service';
import type { WarehouseInventoryItem } from '../warehouse/types';
import { PurchaseOrderDetailsDialog } from './components/PurchaseOrderDetailsDialog';
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Truck,
  Building,
  X,
  Eye,
} from 'lucide-react';

export const ProcurementView: React.FC = () => {
  const workflowMessages = getMessages().procurementWorkflow;
  const messages = workflowMessages.purchaseOrderPdf;
  const {
    currentOrg,
    purchaseOrders,
    vendors,
    purchaseRequests,
    goodsReceipts,
    projects,
    selectedProjectId,
    currentRole,
    isSupabaseLive,
    isLoading,
    organizationDataError,
    can,
    reloadAllData,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'po' | 'pr' | 'material' | 'vendors' | 'grn'>('po');
  const [inventoryItems, setInventoryItems] = useState<WarehouseInventoryItem[]>([]);

  React.useEffect(() => {
    if (!currentOrg || !isSupabaseLive) return;
    void fetchWarehouseData(currentOrg.id, selectedProjectId)
      .then(({ inventoryItems: items }) => setInventoryItems(items))
      .catch(() => setInventoryItems([]));
  }, [currentOrg, isSupabaseLive, selectedProjectId]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPOForDetail, setSelectedPOForDetail] = useState<PurchaseOrder | null>(null);
  // Filtered POs
  const filteredPOs = purchaseOrders.filter((po) => {
    const matchSearch =
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchProject = selectedProjectId === 'all' || po.project_id === selectedProjectId;
    return matchSearch && matchStatus && matchProject;
  });

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success"><CheckCircle2 className="size-3" />Disetujui</Badge>;
      case 'pending_approval':
        return <Badge variant="warning"><Clock className="size-3" />Menunggu Approval</Badge>;
      case 'received':
        return <Badge variant="info"><Truck className="size-3" />Barang Diterima</Badge>;
      case 'rejected':
        return <Badge variant="danger"><X className="size-3" />Ditolak</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <PageShell
      className="mx-auto max-w-6xl"
      header={(
        <PageHeader
          title="Pengadaan & Procurement"
          description="Manajemen alur pengadaan: Purchase Request (PR) > Purchase Order (PO) > Surat Jalan & Penerimaan Barang (GRN)"
        />
      )}
    >

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Purchase Orders</p>
          <p className="mt-1 text-2xl font-bold text-text">{purchaseOrders.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Semua proyek aktif</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-warning">Menunggu Approval</p>
          <p className="mt-1 text-2xl font-bold text-warning">
            {purchaseOrders.filter((p) => p.status === 'pending_approval').length}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Memerlukan persetujuan Direksi/PM</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-success">PO Disetujui & Dipesan</p>
          <p className="mt-1 text-2xl font-bold text-success">
            {purchaseOrders.filter((p) => p.status === 'approved' || p.status === 'received').length}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Siap / sedang dikirim supplier</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground">Master Rekanan / Vendor</p>
          <p className="mt-1 text-2xl font-bold text-text">{vendors.length}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Supplier terverifikasi</p>
        </CardContent></Card>
      </div>

      {/* Sub-tab Navigation */}
      <Tabs value={activeSubTab} onValueChange={(value) => {
        if (value === 'po' || value === 'pr' || value === 'material' || value === 'grn' || value === 'vendors') {
          setActiveSubTab(value);
        }
      }}>
      <TabsList aria-label="Area pengadaan" className="w-full justify-start">
        <TabsTrigger value="po">
          <FileText className="w-4 h-4" />
          <span>Purchase Orders (PO)</span>
          <Badge variant="neutral" className="ml-1">
            {filteredPOs.length}
          </Badge>
        </TabsTrigger>

        <TabsTrigger value="pr">
          <ShoppingCart className="w-4 h-4" />
          <span>Purchase Requests (PR)</span>
          <Badge variant="neutral" className="ml-1">
            {purchaseRequests.length}
          </Badge>
        </TabsTrigger>

        <TabsTrigger value="material">
          <ShoppingCart className="w-4 h-4" />
          <span>Permintaan Material</span>
        </TabsTrigger>

        <TabsTrigger value="grn">
          <Truck className="w-4 h-4" />
          <span>Penerimaan Barang (GRN)</span>
          <Badge variant="neutral" className="ml-1">
            {goodsReceipts.length}
          </Badge>
        </TabsTrigger>

        <TabsTrigger value="vendors">
          <Building className="w-4 h-4" />
          <span>Master Vendor & Supplier</span>
          <Badge variant="neutral" className="ml-1">
            {vendors.length}
          </Badge>
        </TabsTrigger>
      </TabsList>

      {/* Tab: Purchase Orders */}
      <TabsContent value="po">
        <div className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Input
                label="Cari purchase order"
                placeholder="Cari nomor PO, vendor, atau proyek..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
                prefix={<Search className="size-4" aria-hidden="true" />}
              />
              <Select
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.currentTarget.value)}
              >
                <option value="all">Semua Status</option>
                <option value="pending_approval">Menunggu Approval</option>
                <option value="approved">Disetujui</option>
                <option value="received">Barang Diterima</option>
                <option value="rejected">Ditolak</option>
              </Select>
            </CardContent>
          </Card>

          {/* PO Table */}
          {filteredPOs.length === 0 ? (
            <EmptyState
              title={purchaseOrders.length === 0 ? workflowMessages.noPurchaseOrders : workflowMessages.noMatchingPurchaseOrders}
              description={purchaseOrders.length === 0 ? workflowMessages.noPurchaseOrdersHint : undefined}
              icon={<ShoppingCart aria-hidden="true" />}
            />
          ) : (
          <Card className="overflow-hidden">
            <div className="grid gap-3 p-3 lg:hidden">
              {filteredPOs.map((po) => (
                <article key={po.id} className="grid gap-3 rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-accent-500" aria-hidden="true" />
                      <span className="break-all font-semibold text-text">{po.po_number}</span>
                    </div>
                    {getStatusBadge(po.status)}
                  </div>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Proyek</dt>
                      <dd className="break-words font-medium text-text">{po.project_name}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Vendor / Supplier</dt>
                      <dd className="break-words font-medium text-text">{po.vendor_name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Tanggal pesanan</dt>
                      <dd className="text-text">{formatDateIndo(po.order_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Tenggat kirim</dt>
                      <dd className="text-text">{formatDateIndo(po.delivery_deadline)}</dd>
                    </div>
                  </dl>
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Nilai total</p>
                      <p className="break-words font-semibold tabular-nums text-text">{formatRupiah(po.grand_total)}</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setSelectedPOForDetail(po)}>
                      <Eye className="size-4" aria-hidden="true" />
                      {messages.detailTitle}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">No. PO & Tanggal</th>
                    <th className="py-3 px-4">Proyek</th>
                    <th className="py-3 px-4">Vendor / Supplier</th>
                    <th className="py-3 px-4 text-right">Nilai Total (Termasuk PPN)</th>
                    <th className="py-3 px-4">Tenggat Kirim</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPOs.map((po) => (
                    <tr
                      key={po.id}
                      className="transition-colors hover:bg-surface-2"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-text">
                          <FileText className="size-4 shrink-0 text-accent-500" />
                          <span>{po.po_number}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{formatDateIndo(po.order_date)}</div>
                      </td>
                      <td className="max-w-48 truncate px-4 py-3.5 text-xs font-medium text-text">
                        {po.project_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-text">
                          {po.vendor_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{po.vendor_contact}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="text-xs font-bold text-text">
                          {formatRupiah(po.grand_total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Subtotal: {formatRupiah(po.subtotal)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {formatDateIndo(po.delivery_deadline)}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(po.status)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPOForDetail(po)}
                            aria-label={messages.detailTitle}
                            title={messages.detailTitle}
                            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-text"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          )}
        </div>
      </TabsContent>

      {/* Tab: Purchase Requests */}
      <TabsContent value="pr">
        {currentOrg ? (
          <ProcurementWorkflowWorkspace
            organizationId={currentOrg.id}
            projects={projects}
            vendors={vendors}
            currentRole={currentRole}
            projectId={selectedProjectId}
            onOrdersChanged={reloadAllData}
          />
        ) : null}
      </TabsContent>

      {/* Tab: Permintaan Material */}
      <TabsContent value="material">
      {currentOrg && (
        <MaterialRequestWorkspace
          organizationId={currentOrg.id}
          projects={projects}
          projectId={selectedProjectId}
          currentRole={currentRole}
          inventoryItems={inventoryItems}
        />
      )}
      </TabsContent>

      {/* Tab: Penerimaan Barang (GRN) */}
      <TabsContent value="grn">
        {currentOrg ? (
          <GoodsReceiptWorkspace
            organizationId={currentOrg.id}
            projectId={selectedProjectId}
            orders={purchaseOrders}
            receipts={goodsReceipts}
            canCreate={
              ['owner', 'admin', 'procurement', 'warehouse', 'site_manager'].includes(currentRole)
              && (can('warehouse', 'create') || can('procurement', 'create'))
            }
            isSupabaseLive={isSupabaseLive}
            isLoading={isLoading}
            error={organizationDataError}
            onRetry={() => { void reloadAllData(); }}
          />
        ) : null}
      </TabsContent>

      {/* Tab: Master Vendor */}
      <TabsContent value="vendors"><VendorWorkspace /></TabsContent>
      </Tabs>

      {selectedPOForDetail && currentOrg && (
        <PurchaseOrderDetailsDialog
          organization={currentOrg}
          order={selectedPOForDetail}
          onClose={() => setSelectedPOForDetail(null)}
        />
      )}

    </PageShell>
  );
};
