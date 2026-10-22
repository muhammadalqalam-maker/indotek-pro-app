import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatDateIndo, formatPercent } from '../../utils/format';
import { calculateEffectiveProjectContractValue } from '../../utils/projectCalculations';
import {
  CASH_ADVANCE_STATUSES,
  CASH_TRANSACTION_STATUSES,
  type CashAdvanceDecision,
  type ClientInvoice,
  type KasbonReimbursement,
  type ProjectPayable,
  type ProjectCashTransaction,
} from '../../types/database';
import { getMessages } from '../../i18n';
import { ClientInvoiceDialog } from './components/ClientInvoiceDialog';
import { ClientInvoicePaymentDialog } from './components/ClientInvoicePaymentDialog';
import { CashTransactionDialog } from './components/CashTransactionDialog';
import { CashAdvanceRequestDialog } from './components/CashAdvanceRequestDialog';
import { CashAdvanceActionDialog } from './components/CashAdvanceActionDialog';
import { ProjectPayableDialog } from './components/ProjectPayableDialog';
import { ProjectPayablePaymentDialog } from './components/ProjectPayablePaymentDialog';
import { PayablesPanel } from './components/PayablesPanel';
import { AgingSummary } from './components/AgingSummary';
import type { CashAdvanceActionFormValues } from './schemas/cashbook.schema';
import type { ProjectPayablePaymentValues } from './schemas/payable.schema';
import { calculateAgingTotals } from './utils/payableAging';
import {
  TrendingUp,
  Receipt,
  Plus,
  CheckCircle2,
  Check,
  Clock,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CreditCard,
  XCircle,
} from 'lucide-react';

const messages = getMessages('id').finance;

export const FinanceView: React.FC = () => {
  const {
    currentOrg,
    clientInvoices,
    projectPayables,
    payableSubcontractors,
    vendors,
    cashTransactions,
    kasbonList,
    projects,
    selectedProjectId,
    handleCreateInvoice,
    handleMarkInvoicePaid,
    handleCreateProjectPayable,
    handlePayProjectPayable,
    handleCreateCashTransaction,
    handleVerifyCashTransaction,
    handleCreateKasbon,
    handleDecideCashAdvance,
    handlePayCashAdvance,
    handleSettleCashAdvance,
    isLoading,
    organizationDataError,
    reloadAllData,
    currentRole,
    authSession,
  } = useApp();
  const canRecordInvoicePayment = currentRole === 'owner' || currentRole === 'admin' || currentRole === 'finance';
  const canRecordFinance = ['owner', 'admin', 'project_manager', 'finance'].includes(currentRole);
  const canProcessFinance = ['owner', 'admin', 'finance'].includes(currentRole);

  const [activeTab, setActiveTab] = useState<'invoices' | 'payables' | 'cashbook' | 'kasbon' | 'profit_loss'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<ClientInvoice | null>(null);
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false);
  const [payableForPayment, setPayableForPayment] = useState<ProjectPayable | null>(null);
  const [isCashTransactionModalOpen, setIsCashTransactionModalOpen] = useState(false);
  const [isKasbonModalOpen, setIsKasbonModalOpen] = useState(false);
  const [cashAdvanceAction, setCashAdvanceAction] = useState<{
    request: KasbonReimbursement;
    action: CashAdvanceActionFormValues['action'];
  } | null>(null);
  const [financeFeedback, setFinanceFeedback] = useState('');
  const [financeActionError, setFinanceActionError] = useState('');
  const [verifyingTransactionId, setVerifyingTransactionId] = useState<string | null>(null);

  // Filtered lists
  const filteredInvoices = clientInvoices.filter((inv) => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = selectedProjectId === 'all' || inv.project_id === selectedProjectId;
    return matchSearch && matchProject;
  });
  const filteredPayables = projectPayables.filter((payable) => {
    const search = searchTerm.toLocaleLowerCase('id-ID');
    const matchesSearch = [
      payable.payable_number,
      payable.supplier_invoice_number,
      payable.counterparty_name,
      payable.project_name,
    ].some((value) => value.toLocaleLowerCase('id-ID').includes(search));
    const matchesProject = selectedProjectId === 'all' || payable.project_id === selectedProjectId;
    return matchesSearch && matchesProject;
  });

  const filteredCashTransactions = cashTransactions.filter((ctx) => {
    const matchSearch =
      ctx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ctx.recipient_or_payer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProject = selectedProjectId === 'all' || ctx.project_id === selectedProjectId;
    return matchSearch && matchProject;
  });
  const filteredKasbonList = kasbonList.filter((request) => {
    const search = searchTerm.toLocaleLowerCase('id-ID');
    const matchesSearch = [request.ticket_number, request.employee_name, request.purpose, request.project_name]
      .some((value) => value.toLocaleLowerCase('id-ID').includes(search));
    const matchesProject = selectedProjectId === 'all' || request.project_id === selectedProjectId;
    return matchesSearch && matchesProject;
  });

  // Financial KPIs
  const totalBilled = clientInvoices.reduce((acc, i) => acc + i.net_receivable, 0);
  const totalReceived = clientInvoices
    .reduce((acc, i) => acc + (i.paid_amount ?? (i.status === 'paid' ? i.net_receivable : 0)), 0);
  const totalOutstanding = clientInvoices
    .filter((invoice) => invoice.status === 'sent' || invoice.status === 'partially_paid' || invoice.status === 'overdue')
    .reduce((total, invoice) => total + Math.max(0, invoice.net_receivable - (invoice.paid_amount ?? 0)), 0);
  const receivableAging = calculateAgingTotals(clientInvoices.map((invoice) => ({
    amount: invoice.net_receivable,
    paidAmount: invoice.paid_amount ?? 0,
    dueDate: invoice.due_date,
    status: invoice.status,
  })), new Date().toISOString().slice(0, 10));

  const verifiedTransactions = cashTransactions.filter((transaction) => transaction.status === CASH_TRANSACTION_STATUSES.verified);
  const totalInflow = verifiedTransactions
    .filter((t) => t.type === 'inflow')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalOutflow = verifiedTransactions
    .filter((t) => t.type === 'outflow')
    .reduce((acc, t) => acc + t.amount, 0);
  const cashBalance = totalInflow - totalOutflow;

  const handleCashAdvanceAction = async (values: CashAdvanceActionFormValues) => {
    if (!cashAdvanceAction) return;
    const { request } = cashAdvanceAction;
    if (values.action === 'approve' || values.action === 'reject') {
      const decision: CashAdvanceDecision = values.action;
      await handleDecideCashAdvance(request.id, decision, values.comment);
      setFinanceFeedback(decision === 'approve' ? messages.decisionSuccess : messages.decisionSuccess);
    } else if (values.action === 'payout') {
      await handlePayCashAdvance(request.id, values.paymentMethod, values.reference);
      setFinanceFeedback(messages.payoutSuccess);
    } else {
      await handleSettleCashAdvance(request.id, Number(values.settledAmount), values.notes);
      setFinanceFeedback(messages.settlementSuccess);
    }
    setFinanceActionError('');
  };

  const saveCashTransaction = async (data: Parameters<typeof handleCreateCashTransaction>[0]) => {
    await handleCreateCashTransaction(data);
    setFinanceFeedback(messages.transactionSaved);
    setFinanceActionError('');
    setActiveTab('cashbook');
  };

  const saveCashAdvance = async (data: Parameters<typeof handleCreateKasbon>[0]) => {
    await handleCreateKasbon(data);
    setFinanceFeedback(messages.requestSaved);
    setFinanceActionError('');
    setActiveTab('kasbon');
  };

  const saveProjectPayable = async (data: Parameters<typeof handleCreateProjectPayable>[0]) => {
    await handleCreateProjectPayable(data);
    setFinanceFeedback(messages.payableSaved);
    setFinanceActionError('');
    setActiveTab('payables');
  };

  const saveProjectPayablePayment = async (values: ProjectPayablePaymentValues) => {
    if (!payableForPayment) return;
    await handlePayProjectPayable(payableForPayment, values);
    setFinanceFeedback(messages.payablePaymentSaved);
    setFinanceActionError('');
  };

  const verifyTransaction = async (transactionId: string) => {
    setVerifyingTransactionId(transactionId);
    setFinanceActionError('');
    setFinanceFeedback('');
    try {
      await handleVerifyCashTransaction(transactionId);
      setFinanceFeedback(messages.verifiedSuccess);
    } catch (error) {
      setFinanceActionError(error instanceof Error ? error.message : messages.verifyError);
    } finally {
      setVerifyingTransactionId(null);
    }
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
          {canRecordFinance && (
            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-600"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span>Terbitkan Invoice Termin</span>
            </button>
          )}
          {canRecordFinance && (
            <button
              onClick={() => { setFinanceFeedback(''); setFinanceActionError(''); setIsCashTransactionModalOpen(true); }}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-700"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span>Catat Kas Keluar/Masuk</span>
            </button>
          )}
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
      <div className="flex gap-6 overflow-x-auto whitespace-nowrap border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
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
          className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
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
          onClick={() => setActiveTab('payables')}
          className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
            activeTab === 'payables'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard aria-hidden="true" className="w-4 h-4" />
          <span>{messages.payablesTab}</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {filteredPayables.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('kasbon')}
          className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
            activeTab === 'kasbon'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Kasbon & Reimbursement</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
            {filteredKasbonList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('profit_loss')}
          className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
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
        <div className="space-y-4">
          <AgingSummary title={messages.agingTitleReceivable} totals={receivableAging} />
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
                {isLoading ? (
                  <tr><td className="p-6 text-center text-sm text-muted" colSpan={8}>Memuat invoice termin…</td></tr>
                ) : organizationDataError ? (
                  <tr>
                    <td className="p-6 text-center" colSpan={8}>
                      <p className="text-sm text-danger" role="alert">{organizationDataError}</p>
                      <button className="mt-3 min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={() => void reloadAllData()} type="button">Coba muat ulang</button>
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr><td className="p-6 text-center text-sm text-muted" colSpan={8}>Belum ada invoice untuk filter ini. Terbitkan invoice dari termin proyek.</td></tr>
                ) : filteredInvoices.map((inv) => (
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
                      {(inv.paid_amount ?? 0) > 0 && inv.status !== 'paid' && (
                        <span className="block text-[11px] font-normal text-slate-500">Diterima {formatRupiah(inv.paid_amount ?? 0)}</span>
                      )}
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
                      ) : inv.status === 'partially_paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                          <Clock className="w-3 h-3" /> Dibayar Sebagian
                        </span>
                      ) : inv.status === 'draft' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Draf
                        </span>
                      ) : inv.status === 'cancelled' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Dibatalkan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
                          <Clock className="w-3 h-3" /> Terkirim
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {canRecordInvoicePayment && (inv.status === 'sent' || inv.status === 'partially_paid' || inv.status === 'overdue') && (
                        <button
                          onClick={() => setInvoiceForPayment(inv)}
                          className="min-h-11 rounded-md px-2.5 text-xs font-semibold text-primary-700 hover:bg-surface-2 dark:text-primary-500"
                        >
                          Catat pembayaran
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {activeTab === 'payables' && (
        <PayablesPanel
          canPay={canProcessFinance}
          error={organizationDataError}
          isLoading={isLoading}
          onAdd={() => { setFinanceFeedback(''); setFinanceActionError(''); setIsPayableModalOpen(true); }}
          onPay={setPayableForPayment}
          onReload={() => void reloadAllData()}
          agingPayables={projectPayables}
          payables={filteredPayables}
        />
      )}

      {/* Tab: Cashbook */}
      {activeTab === 'cashbook' && (
        <div className="space-y-3">
          {financeFeedback && <p className="rounded-md border border-success/30 bg-success-bg p-3 text-sm text-success" role="status">{financeFeedback}</p>}
          {financeActionError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{financeActionError}</p>}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">No. Bukti & Tanggal</th>
                    <th className="px-4 py-3">Arus & Kategori</th>
                    <th className="px-4 py-3">Deskripsi / Penerima</th>
                    <th className="px-4 py-3 text-right">Jumlah (Rp)</th>
                    <th className="px-4 py-3">Metode / Status</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    Array.from({ length: 3 }, (_, index) => (
                      <tr key={`cash-skeleton-${index}`} aria-hidden="true">
                        {Array.from({ length: 6 }, (_, cell) => <td className="px-4 py-5" key={cell}><div className="h-4 animate-pulse rounded bg-surface-2" /></td>)}
                      </tr>
                    ))
                  ) : organizationDataError ? (
                    <tr><td className="p-6 text-center" colSpan={6}>
                      <p className="text-sm text-danger" role="alert">{organizationDataError}</p>
                      <button className="mt-3 min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={() => void reloadAllData()} type="button">{messages.retry}</button>
                    </td></tr>
                  ) : filteredCashTransactions.length === 0 ? (
                    <tr><td className="p-6 text-center text-sm text-muted" colSpan={6}>{messages.cashTransactionsEmpty}</td></tr>
                  ) : filteredCashTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{transaction.transaction_number}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-400">{formatDateIndo(transaction.transaction_date)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {transaction.type === 'inflow' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                              <ArrowDownLeft aria-hidden="true" className="h-3 w-3" /> Kas masuk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-400">
                              <ArrowUpRight aria-hidden="true" className="h-3 w-3" /> Kas keluar
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-500">{transaction.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{transaction.description}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">{transaction.recipient_or_payer}</span>
                      </td>
                      <td className={`px-4 py-3.5 text-right text-xs font-bold tabular-nums ${transaction.type === 'inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                        {transaction.type === 'inflow' ? '+' : '−'} {formatRupiah(transaction.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block text-xs text-slate-600 dark:text-slate-400">{transaction.payment_method}</span>
                        <span className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${transaction.status === CASH_TRANSACTION_STATUSES.verified ? 'text-success' : 'text-warning'}`}>
                          {transaction.status === CASH_TRANSACTION_STATUSES.verified
                            ? <><CheckCircle2 aria-hidden="true" className="h-3 w-3" /> {messages.verified}</>
                            : <><Clock aria-hidden="true" className="h-3 w-3" /> {messages.pending}</>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {transaction.status === CASH_TRANSACTION_STATUSES.pending && canProcessFinance && (
                          <button className="min-h-11 rounded-md px-3 text-xs font-semibold text-primary-700 hover:bg-surface-2 disabled:opacity-60 dark:text-primary-500" disabled={verifyingTransactionId === transaction.id} onClick={() => void verifyTransaction(transaction.id)} type="button">
                            {verifyingTransactionId === transaction.id ? messages.verifyingTransaction : messages.verifyTransaction}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {isLoading ? (
                Array.from({ length: 2 }, (_, index) => <div aria-hidden="true" className="h-32 animate-pulse rounded-xl bg-surface-2" key={`cash-card-skeleton-${index}`} />)
              ) : organizationDataError ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-danger" role="alert">{organizationDataError}</p>
                  <button className="mt-3 min-h-11 rounded-md border border-border px-4 text-sm text-text" onClick={() => void reloadAllData()} type="button">{messages.retry}</button>
                </div>
              ) : filteredCashTransactions.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">{messages.cashTransactionsEmpty}</p>
              ) : filteredCashTransactions.map((transaction) => (
                <article className="space-y-3 rounded-xl border border-border p-4" key={transaction.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{transaction.transaction_number}</p>
                      <p className="mt-1 text-xs text-muted">{formatDateIndo(transaction.transaction_date)} · {transaction.category}</p>
                    </div>
                    <span className={`shrink-0 text-sm font-bold tabular-nums ${transaction.type === 'inflow' ? 'text-success' : 'text-text'}`}>
                      {transaction.type === 'inflow' ? '+' : '−'} {formatRupiah(transaction.amount)}
                    </span>
                  </div>
                  <p className="text-sm text-text">{transaction.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted">
                    <span>{transaction.recipient_or_payer} · {transaction.payment_method}</span>
                    <span className="font-semibold">{transaction.status === CASH_TRANSACTION_STATUSES.verified ? messages.verified : messages.pending}</span>
                  </div>
                  {transaction.status === CASH_TRANSACTION_STATUSES.pending && canProcessFinance && (
                    <button className="min-h-11 w-full rounded-md border border-border text-sm font-semibold text-primary-700 hover:bg-surface-2 disabled:opacity-60 dark:text-primary-500" disabled={verifyingTransactionId === transaction.id} onClick={() => void verifyTransaction(transaction.id)} type="button">
                      {verifyingTransactionId === transaction.id ? messages.verifyingTransaction : messages.verifyTransaction}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Kasbon */}
      {activeTab === 'kasbon' && (
        <div className="space-y-4">
          {financeFeedback && <p className="rounded-md border border-success/30 bg-success-bg p-3 text-sm text-success" role="status">{financeFeedback}</p>}
          {financeActionError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{financeActionError}</p>}
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Daftar Kasbon Operasional & Reimbursement Lapangan
            </h3>
            {canRecordFinance && (
              <button
                onClick={() => { setFinanceFeedback(''); setFinanceActionError(''); setIsKasbonModalOpen(true); }}
                className="flex min-h-11 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-amber-600"
              >
                <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                <span>Pengajuan Kasbon / Reimbursement</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div aria-label={messages.loadingCashAdvances} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }, (_, index) => <div aria-hidden="true" className="h-48 animate-pulse rounded-2xl border border-border bg-surface-2" key={`advance-skeleton-${index}`} />)}
            </div>
          ) : organizationDataError ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <p className="text-sm text-danger" role="alert">{organizationDataError}</p>
              <button className="mt-3 min-h-11 rounded-md border border-border px-4 text-sm text-text hover:bg-surface-2" onClick={() => void reloadAllData()} type="button">{messages.retry}</button>
            </div>
          ) : filteredKasbonList.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <p className="text-sm text-muted">{messages.cashAdvanceEmpty}</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredKasbonList.map((k) => {
              const isRequester = k.created_by === authSession?.user.id;
              const statusLabels = {
                [CASH_ADVANCE_STATUSES.pendingApproval]: messages.pendingApproval,
                [CASH_ADVANCE_STATUSES.approvedReadyPayout]: messages.approvedReadyPayout,
                [CASH_ADVANCE_STATUSES.activeUnsettled]: messages.activeUnsettled,
                [CASH_ADVANCE_STATUSES.settled]: messages.settled,
                [CASH_ADVANCE_STATUSES.rejected]: messages.rejected,
              };
              const openAction = (action: CashAdvanceActionFormValues['action']) => {
                setFinanceFeedback('');
                setFinanceActionError('');
                setCashAdvanceAction({ request: k, action });
              };
              return (
              <div
                key={k.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
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
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    {k.settlement_status === CASH_ADVANCE_STATUSES.settled
                      ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-success" />
                      : k.settlement_status === CASH_ADVANCE_STATUSES.rejected
                        ? <XCircle aria-hidden="true" className="h-3.5 w-3.5 text-danger" />
                        : <Clock aria-hidden="true" className="h-3.5 w-3.5 text-warning" />}
                    {statusLabels[k.settlement_status]}
                  </span>
                </div>
                {k.decision_comment && <p className="rounded-md bg-surface-2 p-2 text-xs text-muted">{k.decision_comment}</p>}
                {(k.paid_amount ?? 0) > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-muted">Dibayar: <span className="font-semibold text-text">{formatRupiah(k.paid_amount ?? 0)}</span></p>
                    {k.settlement_status === CASH_ADVANCE_STATUSES.settled && (
                      <p className="text-muted">Realisasi: <span className="font-semibold text-text">{formatRupiah(k.settled_amount ?? 0)}</span></p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {canProcessFinance && k.settlement_status === CASH_ADVANCE_STATUSES.pendingApproval && !isRequester && (
                    <>
                      <button className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary-700 px-3 text-xs font-semibold text-white hover:bg-primary-600" onClick={() => openAction('approve')} type="button">
                        <Check aria-hidden="true" className="h-4 w-4" /> {messages.approve}
                      </button>
                      <button className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-danger/30 px-3 text-xs font-semibold text-danger hover:bg-danger-bg" onClick={() => openAction('reject')} type="button">
                        <XCircle aria-hidden="true" className="h-4 w-4" /> {messages.reject}
                      </button>
                    </>
                  )}
                  {canProcessFinance && k.settlement_status === CASH_ADVANCE_STATUSES.approvedReadyPayout && (
                    <button className="min-h-11 rounded-md bg-primary-700 px-3 text-xs font-semibold text-white hover:bg-primary-600" onClick={() => openAction('payout')} type="button">
                      {messages.recordPayout}
                    </button>
                  )}
                  {(isRequester || canProcessFinance) && k.type === 'kasbon' && k.settlement_status === CASH_ADVANCE_STATUSES.activeUnsettled && (
                    <button className="min-h-11 rounded-md border border-border px-3 text-xs font-semibold text-text hover:bg-surface-2" onClick={() => openAction('settle')} type="button">
                      {messages.settle}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
          )}
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
      {isInvoiceModalOpen && currentOrg && (
        <ClientInvoiceDialog
          onClose={() => setIsInvoiceModalOpen(false)}
          onSubmit={handleCreateInvoice}
          organizationId={currentOrg.id}
          projects={projects}
        />
      )}
      {invoiceForPayment && (
        <ClientInvoicePaymentDialog
          invoice={invoiceForPayment}
          onClose={() => setInvoiceForPayment(null)}
          onSubmit={async (amount, reference, paymentMethod) => {
            await handleMarkInvoicePaid(invoiceForPayment.id, reference, amount, paymentMethod);
          }}
        />
      )}

      {isPayableModalOpen && currentOrg && (
        <ProjectPayableDialog
          onClose={() => setIsPayableModalOpen(false)}
          onSubmit={saveProjectPayable}
          organizationId={currentOrg.id}
          projects={projects}
          selectedProjectId={selectedProjectId}
          subcontractors={payableSubcontractors}
          vendors={vendors}
        />
      )}
      {payableForPayment && (
        <ProjectPayablePaymentDialog
          onClose={() => setPayableForPayment(null)}
          onSubmit={saveProjectPayablePayment}
          payable={payableForPayment}
        />
      )}

      {isCashTransactionModalOpen && currentOrg && (
        <CashTransactionDialog
          onClose={() => setIsCashTransactionModalOpen(false)}
          onSubmit={saveCashTransaction}
          organizationId={currentOrg.id}
          projects={projects}
          selectedProjectId={selectedProjectId}
        />
      )}
      {isKasbonModalOpen && currentOrg && (
        <CashAdvanceRequestDialog
          onClose={() => setIsKasbonModalOpen(false)}
          onSubmit={saveCashAdvance}
          organizationId={currentOrg.id}
          projects={projects}
          selectedProjectId={selectedProjectId}
        />
      )}
      {cashAdvanceAction && (
        <CashAdvanceActionDialog
          action={cashAdvanceAction.action}
          onClose={() => setCashAdvanceAction(null)}
          onSubmit={handleCashAdvanceAction}
          request={cashAdvanceAction.request}
        />
      )}
    </div>
  );
};
