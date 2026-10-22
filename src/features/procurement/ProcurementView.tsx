import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { formatRupiah, formatDateIndo } from '../../utils/format';
import { PurchaseOrder } from '../../types/database';
import { VendorWorkspace } from './components/VendorWorkspace';
import { ProcurementWorkflowWorkspace } from './components/ProcurementWorkflowWorkspace';
import { GoodsReceiptWorkspace } from './components/GoodsReceiptWorkspace';
import { PurchaseOrderDetailsDialog } from './components/PurchaseOrderDetailsDialog';
import {
  ShoppingCart,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  FileText,
  Truck,
  Building,
  X,
  Eye,
} from 'lucide-react';

export const ProcurementView: React.FC = () => {
  const messages = getMessages().procurementWorkflow.purchaseOrderPdf;
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

  const [activeSubTab, setActiveSubTab] = useState<'po' | 'pr' | 'vendors' | 'grn'>('po');
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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Disetujui
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
            <Clock className="w-3 h-3" /> Menunggu Approval
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
            <Truck className="w-3 h-3" /> Barang Diterima
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
            <X className="w-3 h-3" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Pengadaan & Procurement
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Modul E
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manajemen alur pengadaan: Purchase Request (PR) &gt; Purchase Order (PO) &gt; Surat Jalan & Penerimaan Barang (GRN)
          </p>
        </div>

      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Purchase Orders</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{purchaseOrders.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Semua proyek aktif</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Menunggu Approval</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {purchaseOrders.filter((p) => p.status === 'pending_approval').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Memerlukan persetujuan Direksi/PM</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">PO Disetujui & Dipesan</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {purchaseOrders.filter((p) => p.status === 'approved' || p.status === 'received').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Siap / sedang dikirim supplier</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Master Rekanan / Vendor</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{vendors.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Supplier terverifikasi</p>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex gap-6 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('po')}
          className={`shrink-0 whitespace-nowrap pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'po'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Purchase Orders (PO)</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {filteredPOs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('pr')}
          className={`shrink-0 whitespace-nowrap pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'pr'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Purchase Requests (PR)</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {purchaseRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('grn')}
          className={`shrink-0 whitespace-nowrap pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'grn'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Penerimaan Barang (GRN)</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {goodsReceipts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('vendors')}
          className={`shrink-0 whitespace-nowrap pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeSubTab === 'vendors'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Master Vendor & Supplier</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {vendors.length}
          </span>
        </button>
      </div>

      {/* Tab: Purchase Orders */}
      {activeSubTab === 'po' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nomor PO, vendor, atau proyek..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
              >
                <option value="all">Semua Status</option>
                <option value="pending_approval">Menunggu Approval</option>
                <option value="approved">Disetujui</option>
                <option value="received">Barang Diterima</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </div>

          {/* PO Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPOs.map((po) => (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>{po.po_number}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{formatDateIndo(po.order_date)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                        {po.project_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">
                          {po.vendor_name}
                        </div>
                        <div className="text-[11px] text-slate-400">{po.vendor_contact}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {formatRupiah(po.grand_total)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Subtotal: {formatRupiah(po.subtotal)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
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
                            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
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
          </div>
        </div>
      )}

      {/* Tab: Purchase Requests */}
      {activeSubTab === 'pr' && (
        currentOrg ? (
          <ProcurementWorkflowWorkspace
            organizationId={currentOrg.id}
            projects={projects}
            vendors={vendors}
            currentRole={currentRole}
            projectId={selectedProjectId}
            onOrdersChanged={reloadAllData}
          />
        ) : null
      )}

      {/* Tab: Penerimaan Barang (GRN) */}
      {activeSubTab === 'grn' && (
        currentOrg ? (
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
        ) : null
      )}

      {/* Tab: Master Vendor */}
      {activeSubTab === 'vendors' && (
        <VendorWorkspace />
      )}

      {selectedPOForDetail && currentOrg && (
        <PurchaseOrderDetailsDialog
          organization={currentOrg}
          order={selectedPOForDetail}
          onClose={() => setSelectedPOForDetail(null)}
        />
      )}

    </div>
  );
};
