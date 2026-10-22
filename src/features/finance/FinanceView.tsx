import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatDateIndo, formatPercent } from '../../utils/format';
import { calculateEffectiveProjectContractValue } from '../../utils/projectCalculations';
import { ClientInvoice, ProjectCashTransaction, KasbonReimbursement } from '../../types/database';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileCheck2,
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Building2,
  Search,
  Filter,
  X,
  CreditCard,
} from 'lucide-react';

export const FinanceView: React.FC = () => {
  const {
    currentOrg,
    clientInvoices,
    cashTransactions,
    kasbonList,
    projects,
    selectedProjectId,
    handleCreateInvoice,
    handleMarkInvoicePaid,
    handleCreateCashTransaction,
    handleCreateKasbon,
    currentRole,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'invoices' | 'cashbook' | 'kasbon' | 'profit_loss'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isCashTransactionModalOpen, setIsCashTransactionModalOpen] = useState(false);
  const [isKasbonModalOpen, setIsKasbonModalOpen] = useState(false);

  // New Invoice Form
  const [newInvProjectId, setNewInvProjectId] = useState(projects[0]?.id || '');
  const [newInvTermLabel, setNewInvTermLabel] = useState('Termin Penagihan Progres');
  const [newInvGrossAmount, setNewInvGrossAmount] = useState(5000000000);
  const [newInvDueDate, setNewInvDueDate] = useState('2026-11-15');

  // New Cash Transaction Form
  const [newCtxProjectId, setNewCtxProjectId] = useState(projects[0]?.id || '');
  const [newCtxType, setNewCtxType] = useState<'inflow' | 'outflow'>('outflow');
  const [newCtxCategory, setNewCtxCategory] = useState<ProjectCashTransaction['category']>('Material');
  const [newCtxAmount, setNewCtxAmount] = useState(50000000);
  const [newCtxRecipient, setNewCtxRecipient] = useState('');
  const [newCtxDesc, setNewCtxDesc] = useState('');

  // New Kasbon Form
  const [newKsbProjectId, setNewKsbProjectId] = useState(projects[0]?.id || '');
  const [newKsbName, setNewKsbName] = useState('');
  const [newKsbAmount, setNewKsbAmount] = useState(5000000);
  const [newKsbPurpose, setNewKsbPurpose] = useState('');

  // Filtered lists
  const filteredInvoices = clientInvoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = selectedProjectId === 'all' || inv.project_id === selectedProjectId;
    return matchSearch && matchProject;
  });

  const filteredCashTransactions = cashTransactions.filter((ctx) => {
    const matchSearch =
      ctx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ctx.recipient_or_payer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = selectedProjectId === 'all' || ctx.project_id === selectedProjectId;
    return matchSearch && matchProject;
  });

  // Financial KPIs
  const totalBilled = clientInvoices.reduce((acc, i) => acc + i.net_receivable, 0);
  const totalReceived = clientInvoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + i.net_receivable, 0);
  const totalOutstanding = totalBilled - totalReceived;

  const totalInflow = cashTransactions
    .filter((t) => t.type === 'inflow')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalOutflow = cashTransactions
    .filter((t) => t.type === 'outflow')
    .reduce((acc, t) => acc + t.amount, 0);
  const cashBalance = totalInflow - totalOutflow;

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    const proj = projects.find((p) => p.id === newInvProjectId) || projects[0];

    const gross = Number(newInvGrossAmount);
    const retention = gross * 0.05;
    const taxable = gross - retention;
    const ppn = taxable * 0.11;
    const pph = taxable * 0.0265;
    const net = taxable + ppn - pph;

    await handleCreateInvoice({
      organization_id: currentOrg.id,
      project_id: proj.id,
      project_name: proj.name,
      client_name: proj.client_name,
      invoice_number: `INV/${currentOrg.company_code}/2026/10/${Math.floor(100 + Math.random() * 900)}`,
      term_label: newInvTermLabel,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: newInvDueDate,
      progress_basis_percent: 45,
      gross_amount: gross,
      retention_deduction: retention,
      dp_deduction: 0,
      subtotal_taxable: taxable,
      ppn_amount: ppn,
      pph_amount: pph,
      net_receivable: net,
      status: 'sent',
    });

    setIsInvoiceModalOpen(false);
  };

  const handleSaveCashTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    const proj = projects.find((p) => p.id === newCtxProjectId) || projects[0];

    await handleCreateCashTransaction({
      organization_id: currentOrg.id,
      project_id: proj.id,
      project_name: proj.name,
      transaction_number: `BKK-${currentOrg.company_code}-2026-${Math.floor(100 + Math.random() * 900)}`,
      transaction_date: new Date().toISOString().split('T')[0],
      type: newCtxType,
      category: newCtxCategory,
      amount: Number(newCtxAmount),
      recipient_or_payer: newCtxRecipient || 'Pihak Terkait',
      description: newCtxDesc || 'Operasional Proyek',
      payment_method: 'Transfer Bank',
      status: 'verified',
    });

    setIsCashTransactionModalOpen(false);
  };

  const handleSaveKasbon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    const proj = projects.find((p) => p.id === newKsbProjectId) || projects[0];

    await handleCreateKasbon({
      organization_id: currentOrg.id,
      project_id: proj.id,
      project_name: proj.name,
      ticket_number: `KSB-2026-10-${Math.floor(100 + Math.random() * 900)}`,
      employee_name: newKsbName || 'Staf Proyek',
      role: 'Site Team',
      date: new Date().toISOString().split('T')[0],
      type: 'kasbon',
      amount: Number(newKsbAmount),
      purpose: newKsbPurpose || 'Operasional Lapangan',
      settlement_status: 'active_unsettled',
    });

    setIsKasbonModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Keuangan & Arus Kas Proyek
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Modul H
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Penagihan termin klien, PPN 11%, retensi, buku kas proyek, kasbon & laba rugi konstruksi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Invoice Termin</span>
          </button>
          <button
            onClick={() => setIsCashTransactionModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Kas Keluar/Masuk</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Tagihan Termin (Net)</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatRupiah(totalBilled)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sudah termasuk PPN 11%</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Penerimaan Kas Klien</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatRupiah(totalReceived)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Sudah masuk rekening</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Piutang Klien (Aging)</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatRupiah(totalOutstanding)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Menunggu jatuh tempo / verifikasi</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Saldo Kas Operasional Site</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {formatRupiah(Math.max(0, cashBalance))}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Inflow - Outflow riil</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Penagihan Termin Klien (Invoices)</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {filteredInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cashbook')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'cashbook'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Buku Kas & Pengeluaran Proyek</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {filteredCashTransactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('kasbon')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'kasbon'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Kasbon & Reimbursement</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {kasbonList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profit_loss')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'profit_loss'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Estimasi Laba / Rugi Proyek</span>
        </button>
      </div>

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">No. Invoice & Tanggal</th>
                  <th className="py-3 px-4">Proyek & Klien</th>
                  <th className="py-3 px-4">Keterangan Termin</th>
                  <th className="py-3 px-4 text-right">Nilai Bruto</th>
                  <th className="py-3 px-4 text-right">Nilai Tagihan Bersih</th>
                  <th className="py-3 px-4">Jatuh Tempo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{inv.invoice_number}</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">{formatDateIndo(inv.invoice_date)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">{inv.client_name}</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">{inv.project_name}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {inv.term_label}
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-slate-600 dark:text-slate-400">
                      {formatRupiah(inv.gross_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-xs text-slate-900 dark:text-white">
                      {formatRupiah(inv.net_receivable)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {formatDateIndo(inv.due_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> Lunas
                        </span>
                      ) : inv.status === 'overdue' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                          <AlertTriangle className="w-3 h-3" /> Jatuh Tempo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
                          <Clock className="w-3 h-3" /> Terkirim
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkInvoicePaid(inv.id, `TRF-${Date.now().toString().slice(-6)}`)}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition"
                        >
                          Catat Lunas
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Cashbook */}
      {activeTab === 'cashbook' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">No. Bukti & Tanggal</th>
                  <th className="py-3 px-4">Arus & Kategori</th>
                  <th className="py-3 px-4">Deskripsi Transaksi</th>
                  <th className="py-3 px-4">Penerima / Pembayar</th>
                  <th className="py-3 px-4 text-right">Jumlah (Rp)</th>
                  <th className="py-3 px-4">Metode Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCashTransactions.map((ctx) => (
                  <tr key={ctx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{ctx.transaction_number}</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">{formatDateIndo(ctx.transaction_date)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {ctx.type === 'inflow' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                            <ArrowDownLeft className="w-3 h-3" /> Masuk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                            <ArrowUpRight className="w-3 h-3" /> Keluar
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-medium">{ctx.category}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {ctx.description}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {ctx.recipient_or_payer}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-bold text-xs ${
                        ctx.type === 'inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {ctx.type === 'inflow' ? '+' : '-'} {formatRupiah(ctx.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{ctx.payment_method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Kasbon */}
      {activeTab === 'kasbon' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Daftar Kasbon Operasional & Reimbursement Lapangan
            </h3>
            <button
              onClick={() => setIsKasbonModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Pengajuan Kasbon / Reimbursement</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kasbonList.map((k) => (
              <div
                key={k.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {k.ticket_number} • {k.type.toUpperCase()}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">{k.employee_name}</h4>
                    <p className="text-xs text-slate-400">{k.role} • {k.project_name}</p>
                  </div>
                  <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                    {formatRupiah(k.amount)}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {k.purpose}
                </p>

                <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Tanggal: {formatDateIndo(k.date)}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Status: {k.settlement_status === 'settled' ? 'Selesai' : 'Belum Selesai'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Laba Rugi Proyek */}
      {activeTab === 'profit_loss' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p) => {
            const contractVal = calculateEffectiveProjectContractValue(p);
            const realizedCost = p.realized_cost;
            const grossProfit = contractVal - realizedCost;
            const grossMargin = contractVal > 0 ? (grossProfit / contractVal) * 100 : 0;

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {p.code}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1.5">{p.name}</h3>
                  <p className="text-xs text-slate-400">Klien: {p.client_name}</p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Nilai Kontrak (Revenue):</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(contractVal)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Realisasi Biaya Aktual (HPP):</span>
                    <span className="font-bold text-rose-500">{formatRupiah(realizedCost)}</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-sm bg-slate-50 dark:bg-slate-950 px-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-700 dark:text-slate-300">Estimasi Laba Kotor:</span>
                    <span className={grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                      {formatRupiah(grossProfit)} ({formatPercent(grossMargin)})
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Progres Fisik: {p.actual_progress}%</span>
                  <span>Masa Kontrak: {formatDateIndo(p.end_date)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Buat Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Terbitkan Invoice Penagihan Klien</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Pilih Proyek</label>
                <select
                  value={newInvProjectId}
                  onChange={(e) => setNewInvProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.client_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan Termin
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Termin 4 (Sertifikat Opname 50%)"
                  value={newInvTermLabel}
                  onChange={(e) => setNewInvTermLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nilai Bruto Termin (Rp)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newInvGrossAmount}
                  onChange={(e) => setNewInvGrossAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal Jatuh Tempo</label>
                <input
                  type="date"
                  required
                  value={newInvDueDate}
                  onChange={(e) => setNewInvDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Potongan Retensi 5%:</span>
                  <span>- {formatRupiah(newInvGrossAmount * 0.05)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PPN 11%:</span>
                  <span>+ {formatRupiah((newInvGrossAmount * 0.95) * 0.11)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Perkiraan Bersih Tagihan:</span>
                  <span>{formatRupiah(((newInvGrossAmount * 0.95) * 1.11) - ((newInvGrossAmount * 0.95) * 0.0265))}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition"
                >
                  Terbitkan Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kas Masuk/Keluar Modal */}
      {isCashTransactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Catat Transaksi Kas Proyek</h3>
              <button onClick={() => setIsCashTransactionModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveCashTransaction} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Jenis Arus</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCtxType('outflow')}
                    className={`py-2 rounded-xl font-bold transition text-center ${
                      newCtxType === 'outflow' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    Pengeluaran (Kas Keluar)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCtxType('inflow')}
                    className={`py-2 rounded-xl font-bold transition text-center ${
                      newCtxType === 'inflow' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    Penerimaan (Kas Masuk)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Proyek Terkait</label>
                <select
                  value={newCtxProjectId}
                  onChange={(e) => setNewCtxProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori Biaya</label>
                <select
                  value={newCtxCategory}
                  onChange={(e) => setNewCtxCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  <option value="Material">Material</option>
                  <option value="Upah Pekerja">Upah Pekerja</option>
                  <option value="Subkon">Subkontraktor</option>
                  <option value="Sewa Alat">Sewa Alat</option>
                  <option value="Operasional Site">Operasional Site & Petty Cash</option>
                  <option value="Termin Klien">Termin Klien</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Jumlah Nominal (Rp)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newCtxAmount}
                  onChange={(e) => setNewCtxAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Penerima / Pembayar</label>
                <input
                  type="text"
                  required
                  placeholder="Nama supplier, mandor, atau pihak penerima"
                  value={newCtxRecipient}
                  onChange={(e) => setNewCtxRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi Transaksi</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Uraian pembayaran atau penerimaan dana"
                  value={newCtxDesc}
                  onChange={(e) => setNewCtxDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashTransactionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition"
                >
                  Simpan Transaksi Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kasbon Modal */}
      {isKasbonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Pengajuan Kasbon / Petty Cash</h3>
              <button onClick={() => setIsKasbonModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveKasbon} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Proyek Terkait</label>
                <select
                  value={newKsbProjectId}
                  onChange={(e) => setNewKsbProjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Pemohon</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Rian Pratama (Site Manager)"
                  value={newKsbName}
                  onChange={(e) => setNewKsbName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Nominal Kasbon (Rp)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newKsbAmount}
                  onChange={(e) => setNewKsbAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Tujuan / Keperluan</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan kebutuhan dana operasional darurat"
                  value={newKsbPurpose}
                  onChange={(e) => setNewKsbPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsKasbonModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition"
                >
                  Ajukan Kasbon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
