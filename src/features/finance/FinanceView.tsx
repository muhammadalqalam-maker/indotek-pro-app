import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatDateIndo, formatPercent } from '../../utils/format';
import { calculateEffectiveProjectContractValue } from '../../utils/projectCalculations';
import {
  Badge,
  Button,
  Card,
  CardSection,
  Input,
  KpiCard,
  PageHeader,
  PageShell,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui';
import {
  CASH_ADVANCE_STATUSES,
  CASH_TRANSACTION_STATUSES,
  CLIENT_INVOICE_STATUSES,
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
import { ProjectCashFlowForecast } from './components/ProjectCashFlowForecast';
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
  Search,
} from 'lucide-react';

const messages = getMessages('id').finance;
const financeTabIds = ['invoices', 'payables', 'cashbook', 'kasbon', 'profit_loss'] as const;
type FinanceTabId = (typeof financeTabIds)[number];
const isFinanceTabId = (value: string): value is FinanceTabId =>
  financeTabIds.some((tab) => tab === value);
const invoicePaymentAllowedStatuses: readonly ClientInvoice['status'][] = [
  CLIENT_INVOICE_STATUSES.sent,
  CLIENT_INVOICE_STATUSES.partiallyPaid,
  CLIENT_INVOICE_STATUSES.overdue,
];

const invoiceStatusPresentation: Record<
  ClientInvoice['status'],
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon?: React.ReactNode }
> = {
  [CLIENT_INVOICE_STATUSES.paid]: {
    label: messages.invoiceStatusPaid,
    variant: 'success',
    icon: <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />,
  },
  [CLIENT_INVOICE_STATUSES.overdue]: {
    label: messages.invoiceStatusOverdue,
    variant: 'danger',
    icon: <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />,
  },
  [CLIENT_INVOICE_STATUSES.partiallyPaid]: {
    label: messages.invoiceStatusPartial,
    variant: 'warning',
    icon: <Clock aria-hidden="true" className="h-3.5 w-3.5" />,
  },
  [CLIENT_INVOICE_STATUSES.draft]: {
    label: messages.invoiceStatusDraft,
    variant: 'neutral',
  },
  [CLIENT_INVOICE_STATUSES.cancelled]: {
    label: messages.invoiceStatusCancelled,
    variant: 'neutral',
  },
  [CLIENT_INVOICE_STATUSES.sent]: {
    label: messages.invoiceStatusSent,
    variant: 'info',
    icon: <Clock aria-hidden="true" className="h-3.5 w-3.5" />,
  },
};

function renderClientInvoiceStatus(status: ClientInvoice['status']) {
  const { label, variant, icon } = invoiceStatusPresentation[status];
  return <Badge className="min-h-7" variant={variant}>{icon}{label}</Badge>;
}

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

  const [activeTab, setActiveTab] = useState<FinanceTabId>('invoices');
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
  const financeReportProjects = selectedProjectId === 'all'
    ? projects
    : projects.filter((project) => project.id === selectedProjectId);
  const financeReportProjectIds = new Set(financeReportProjects.map((project) => project.id));
  const reportCashTransactions = cashTransactions.filter((transaction) => financeReportProjectIds.has(transaction.project_id));
  const reportInvoices = clientInvoices.filter((invoice) => financeReportProjectIds.has(invoice.project_id));
  const reportPayables = projectPayables.filter((payable) => financeReportProjectIds.has(payable.project_id));

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
    <PageShell
      header={(
        <PageHeader
          actions={canRecordFinance ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button className="w-full justify-start sm:w-auto" onClick={() => setIsInvoiceModalOpen(true)}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                {messages.createInvoiceAction}
              </Button>
              <Button
                className="w-full justify-start sm:w-auto"
                onClick={() => { setFinanceFeedback(''); setFinanceActionError(''); setIsCashTransactionModalOpen(true); }}
                variant="outline"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {messages.createCashTransactionAction}
              </Button>
            </div>
          ) : undefined}
          description={messages.pageDescription}
          eyebrow={messages.moduleLabel}
          title={messages.pageTitle}
        />
      )}
      filters={activeTab === 'profit_loss' ? undefined : (
        <Card className="max-w-xl">
          <CardSection>
            <Input
              label={messages.searchLabel}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={messages.searchPlaceholder}
              prefix={<Search aria-hidden="true" className="h-4 w-4" />}
              type="search"
              value={searchTerm}
            />
          </CardSection>
        </Card>
      )}
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard
          description={messages.totalBilledDescription}
          icon={<Receipt aria-hidden="true" className="h-4 w-4" />}
          label={messages.totalBilledLabel}
          value={<span className="whitespace-nowrap text-sm sm:text-lg">{formatRupiah(totalBilled)}</span>}
        />
        <KpiCard
          description={messages.receivedCashDescription}
          icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
          label={messages.receivedCashLabel}
          value={<span className="whitespace-nowrap text-sm text-success sm:text-lg">{formatRupiah(totalReceived)}</span>}
        />
        <KpiCard
          description={messages.outstandingReceivableDescription}
          icon={<Clock aria-hidden="true" className="h-4 w-4" />}
          label={messages.outstandingReceivableLabel}
          value={<span className="whitespace-nowrap text-sm text-warning sm:text-lg">{formatRupiah(totalOutstanding)}</span>}
        />
        <KpiCard
          description={messages.cashBalanceDescription}
          icon={<Wallet aria-hidden="true" className="h-4 w-4" />}
          label={messages.operationalCashBalanceLabel}
          value={<span className="whitespace-nowrap text-sm text-info sm:text-lg">{formatRupiah(Math.max(0, cashBalance))}</span>}
        />
      </div>

      <Tabs
        className="min-w-0"
        onValueChange={(value) => {
          if (isFinanceTabId(value)) setActiveTab(value);
        }}
        value={activeTab}
      >
        <TabsList aria-label={messages.tabsLabel} className="max-w-full justify-start gap-1 overflow-x-auto whitespace-nowrap">
          <TabsTrigger className="min-h-11 gap-2" value="invoices">
            <Receipt aria-hidden="true" className="h-4 w-4" />
            {messages.invoicesTab}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums">{filteredInvoices.length}</span>
          </TabsTrigger>
          <TabsTrigger className="min-h-11 gap-2" value="cashbook">
            <Wallet aria-hidden="true" className="h-4 w-4" />
            {messages.cashbookTab}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums">{filteredCashTransactions.length}</span>
          </TabsTrigger>
          <TabsTrigger className="min-h-11 gap-2" value="payables">
            <CreditCard aria-hidden="true" className="h-4 w-4" />
            {messages.payablesSectionTab}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums">{filteredPayables.length}</span>
          </TabsTrigger>
          <TabsTrigger className="min-h-11 gap-2" value="kasbon">
            <CreditCard aria-hidden="true" className="h-4 w-4" />
            {messages.cashAdvancesTab}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs tabular-nums">{filteredKasbonList.length}</span>
          </TabsTrigger>
          <TabsTrigger className="min-h-11 gap-2" value="profit_loss">
            <TrendingUp aria-hidden="true" className="h-4 w-4" />
            {messages.profitLossTab}
          </TabsTrigger>
        </TabsList>

      {/* Tab: Invoices */}
      <TabsContent className="mt-0" value="invoices">
        <div className="space-y-4">
          <AgingSummary title={messages.agingTitleReceivable} totals={receivableAging} />
          <Card className="overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-max text-left text-sm">
                <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{messages.invoiceNumberAndDate}</th>
                    <th className="px-4 py-3">{messages.projectAndClient}</th>
                    <th className="px-4 py-3">{messages.invoiceTerm}</th>
                    <th className="px-4 py-3 text-right">{messages.grossAmount}</th>
                    <th className="px-4 py-3 text-right">{messages.netReceivable}</th>
                    <th className="px-4 py-3">{messages.dueDate}</th>
                    <th className="px-4 py-3">{messages.status}</th>
                    <th className="px-4 py-3 text-center">{messages.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    Array.from({ length: 3 }, (_, index) => (
                      <tr aria-hidden="true" key={`invoice-skeleton-${index}`}>
                        {Array.from({ length: 8 }, (_, cell) => (
                          <td className="px-4 py-5" key={cell}>
                            <div className="h-4 rounded bg-surface-2" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : organizationDataError ? (
                    <tr>
                      <td className="p-6 text-center" colSpan={8}>
                        <p className="text-sm text-danger" role="alert">{organizationDataError}</p>
                        <Button className="mt-3" onClick={() => void reloadAllData()} variant="outline">{messages.retry}</Button>
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr><td className="p-6 text-center text-sm text-muted-foreground" colSpan={8}>{messages.invoiceEmpty}</td></tr>
                  ) : filteredInvoices.map((inv) => (
                    <tr className="transition-colors hover:bg-surface-2/60" key={inv.id}>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-text">{inv.invoice_number}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{formatDateIndo(inv.invoice_date)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-text">{inv.client_name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{inv.project_name}</span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{inv.term_label}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">{formatRupiah(inv.gross_amount)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-text">
                        {formatRupiah(inv.net_receivable)}
                        {(inv.paid_amount ?? 0) > 0 && inv.status !== CLIENT_INVOICE_STATUSES.paid && (
                          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                            {messages.invoiceReceived} {formatRupiah(inv.paid_amount ?? 0)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{formatDateIndo(inv.due_date)}</td>
                      <td className="px-4 py-3.5">{renderClientInvoiceStatus(inv.status)}</td>
                      <td className="px-4 py-3.5 text-center">
                        {canRecordInvoicePayment && invoicePaymentAllowedStatuses.includes(inv.status) && (
                          <Button className="min-h-11" onClick={() => setInvoiceForPayment(inv)} variant="ghost">
                            {messages.recordPayment}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 p-3 md:hidden">
              {isLoading ? (
                Array.from({ length: 2 }, (_, index) => (
                  <div aria-hidden="true" className="h-44 animate-pulse rounded-lg border border-border bg-surface-2" key={`invoice-card-skeleton-${index}`} />
                ))
              ) : organizationDataError ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-danger" role="alert">{organizationDataError}</p>
                  <Button className="mt-3" onClick={() => void reloadAllData()} variant="outline">{messages.retry}</Button>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">{messages.invoiceEmpty}</p>
              ) : filteredInvoices.map((inv) => (
                <article className="space-y-3 rounded-lg border border-border p-4" key={inv.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-text">{inv.invoice_number}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateIndo(inv.invoice_date)}</p>
                    </div>
                    {renderClientInvoiceStatus(inv.status)}
                  </div>
                  <div>
                    <h3 className="break-words text-sm font-medium text-text">{inv.client_name}</h3>
                    <p className="break-words text-xs text-muted-foreground">{inv.project_name}</p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">{inv.term_label}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">{messages.grossAmount}</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-text">{formatRupiah(inv.gross_amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{messages.netReceivable}</dt>
                      <dd className="mt-0.5 font-semibold tabular-nums text-text">{formatRupiah(inv.net_receivable)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{messages.dueDate}</dt>
                      <dd className="mt-0.5 font-medium text-text">{formatDateIndo(inv.due_date)}</dd>
                    </div>
                    {(inv.paid_amount ?? 0) > 0 && (
                      <div>
                        <dt className="text-muted-foreground">{messages.invoiceReceived}</dt>
                        <dd className="mt-0.5 font-medium tabular-nums text-text">{formatRupiah(inv.paid_amount ?? 0)}</dd>
                      </div>
                    )}
                  </dl>
                  {canRecordInvoicePayment && invoicePaymentAllowedStatuses.includes(inv.status) && (
                    <Button className="w-full" onClick={() => setInvoiceForPayment(inv)} variant="outline">
                      {messages.recordPayment}
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </Card>
        </div>
      </TabsContent>

      <TabsContent className="mt-0" value="payables">
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
      </TabsContent>

      {/* Tab: Cashbook */}
      <TabsContent className="mt-0" value="cashbook">
        <div className="space-y-3">
          {financeFeedback && <p className="rounded-md border border-success/30 bg-success-bg p-3 text-sm text-success" role="status">{financeFeedback}</p>}
          {financeActionError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{financeActionError}</p>}
          <Card className="overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">{messages.transactionNumber} / {messages.date}</th>
                    <th className="px-4 py-3">{messages.flow} / {messages.category}</th>
                    <th className="px-4 py-3">{messages.description} / {messages.counterparty}</th>
                    <th className="px-4 py-3 text-right">{messages.amount}</th>
                    <th className="px-4 py-3">{messages.paymentMethod} / {messages.status}</th>
                    <th className="px-4 py-3 text-center">{messages.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    Array.from({ length: 3 }, (_, index) => (
                      <tr key={`cash-skeleton-${index}`} aria-hidden="true">
                        {Array.from({ length: 6 }, (_, cell) => <td className="px-4 py-5" key={cell}><div className="h-4 animate-pulse rounded bg-surface-2" /></td>)}
                      </tr>
                    ))
                  ) : organizationDataError ? (
                    <tr><td className="p-6 text-center" colSpan={6}>
                      <p className="text-sm text-danger" role="alert">{organizationDataError}</p>
                      <Button className="mt-3" onClick={() => void reloadAllData()} variant="outline">{messages.retry}</Button>
                    </td></tr>
                  ) : filteredCashTransactions.length === 0 ? (
                    <tr><td className="p-6 text-center text-sm text-muted-foreground" colSpan={6}>{messages.cashTransactionsEmpty}</td></tr>
                  ) : filteredCashTransactions.map((transaction) => (
                    <tr key={transaction.id} className="transition-colors hover:bg-surface-2/60">
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-text">{transaction.transaction_number}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{formatDateIndo(transaction.transaction_date)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {transaction.type === 'inflow' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
                              <ArrowDownLeft aria-hidden="true" className="h-3 w-3" /> {messages.inflow}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">
                              <ArrowUpRight aria-hidden="true" className="h-3 w-3" /> {messages.outflow}
                            </span>
                          )}
                          <span className="text-xs font-medium text-muted-foreground">{transaction.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-medium text-text">{transaction.description}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{transaction.recipient_or_payer}</span>
                      </td>
                      <td className={`px-4 py-3.5 text-right text-sm font-semibold tabular-nums ${transaction.type === 'inflow' ? 'text-success' : 'text-text'}`}>
                        {transaction.type === 'inflow' ? '+' : '−'} {formatRupiah(transaction.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block text-sm text-muted-foreground">{transaction.payment_method}</span>
                        <span className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${transaction.status === CASH_TRANSACTION_STATUSES.verified ? 'text-success' : 'text-warning'}`}>
                          {transaction.status === CASH_TRANSACTION_STATUSES.verified
                            ? <><CheckCircle2 aria-hidden="true" className="h-3 w-3" /> {messages.verified}</>
                            : <><Clock aria-hidden="true" className="h-3 w-3" /> {messages.pending}</>}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {transaction.status === CASH_TRANSACTION_STATUSES.pending && canProcessFinance && (
                          <Button disabled={verifyingTransactionId === transaction.id} onClick={() => void verifyTransaction(transaction.id)} size="sm" variant="ghost">
                            {verifyingTransactionId === transaction.id ? messages.verifyingTransaction : messages.verifyTransaction}
                          </Button>
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
                  <Button className="mt-3" onClick={() => void reloadAllData()} variant="outline">{messages.retry}</Button>
                </div>
              ) : filteredCashTransactions.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">{messages.cashTransactionsEmpty}</p>
              ) : filteredCashTransactions.map((transaction) => (
                <article className="space-y-3 rounded-xl border border-border p-4" key={transaction.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{transaction.transaction_number}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateIndo(transaction.transaction_date)} · {transaction.category}</p>
                    </div>
                    <span className={`shrink-0 text-sm font-bold tabular-nums ${transaction.type === 'inflow' ? 'text-success' : 'text-text'}`}>
                      {transaction.type === 'inflow' ? '+' : '−'} {formatRupiah(transaction.amount)}
                    </span>
                  </div>
                  <p className="text-sm text-text">{transaction.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <span>{transaction.recipient_or_payer} · {transaction.payment_method}</span>
                    <span className="font-semibold">{transaction.status === CASH_TRANSACTION_STATUSES.verified ? messages.verified : messages.pending}</span>
                  </div>
                  {transaction.status === CASH_TRANSACTION_STATUSES.pending && canProcessFinance && (
                    <Button className="w-full" disabled={verifyingTransactionId === transaction.id} onClick={() => void verifyTransaction(transaction.id)} variant="outline">
                      {verifyingTransactionId === transaction.id ? messages.verifyingTransaction : messages.verifyTransaction}
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </Card>
        </div>
      </TabsContent>

      {/* Tab: Kasbon */}
      <TabsContent className="mt-0" value="kasbon">
        <div className="space-y-4">
          {financeFeedback && <p className="rounded-md border border-success/30 bg-success-bg p-3 text-sm text-success" role="status">{financeFeedback}</p>}
          {financeActionError && <p className="rounded-md border border-danger/30 bg-danger-bg p-3 text-sm text-danger" role="alert">{financeActionError}</p>}
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h2 className="text-base font-semibold text-text">{messages.cashAdvanceTitle}</h2>
            {canRecordFinance && (
              <Button
                className="w-full justify-start sm:w-auto"
                onClick={() => { setFinanceFeedback(''); setFinanceActionError(''); setIsKasbonModalOpen(true); }}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {messages.addCashAdvance}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div aria-label={messages.loadingCashAdvances} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 2 }, (_, index) => <div aria-hidden="true" className="h-48 animate-pulse rounded-2xl border border-border bg-surface-2" key={`advance-skeleton-${index}`} />)}
            </div>
          ) : organizationDataError ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <p className="text-sm text-danger" role="alert">{organizationDataError}</p>
              <Button className="mt-3" onClick={() => void reloadAllData()} variant="outline">{messages.retry}</Button>
            </div>
          ) : filteredKasbonList.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-6 text-center">
              <p className="text-sm text-muted-foreground">{messages.cashAdvanceEmpty}</p>
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
                className="space-y-3 rounded-lg border border-border bg-surface p-4 shadow-xs dark:shadow-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge className="min-h-6" variant="outline">
                      {k.ticket_number} • {k.type.toUpperCase()}
                    </Badge>
                    <h3 className="mt-1.5 text-sm font-semibold text-text">{k.employee_name}</h3>
                    <p className="text-xs text-muted-foreground">{k.role} • {k.project_name}</p>
                  </div>
                  <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-text">
                    {formatRupiah(k.amount)}
                  </span>
                </div>

                <p className="break-words rounded-md border border-border bg-surface-2 p-2.5 text-sm text-muted-foreground">
                  {k.purpose}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
                  <span>{messages.date}: {formatDateIndo(k.date)}</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-text">
                    {k.settlement_status === CASH_ADVANCE_STATUSES.settled
                      ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-success" />
                      : k.settlement_status === CASH_ADVANCE_STATUSES.rejected
                        ? <XCircle aria-hidden="true" className="h-3.5 w-3.5 text-danger" />
                        : <Clock aria-hidden="true" className="h-3.5 w-3.5 text-warning" />}
                    {statusLabels[k.settlement_status]}
                  </span>
                </div>
                {k.decision_comment && <p className="rounded-md bg-surface-2 p-2 text-xs text-muted-foreground">{k.decision_comment}</p>}
                {(k.paid_amount ?? 0) > 0 && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-muted-foreground">{messages.paidPayable}: <span className="font-semibold text-text">{formatRupiah(k.paid_amount ?? 0)}</span></p>
                    {k.settlement_status === CASH_ADVANCE_STATUSES.settled && (
                      <p className="text-muted-foreground">{messages.settlementAmount}: <span className="font-semibold text-text">{formatRupiah(k.settled_amount ?? 0)}</span></p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {canProcessFinance && k.settlement_status === CASH_ADVANCE_STATUSES.pendingApproval && !isRequester && (
                    <>
                      <Button onClick={() => openAction('approve')}>
                        <Check aria-hidden="true" className="h-4 w-4" /> {messages.approve}
                      </Button>
                      <Button onClick={() => openAction('reject')} variant="destructive">
                        <XCircle aria-hidden="true" className="h-4 w-4" /> {messages.reject}
                      </Button>
                    </>
                  )}
                  {canProcessFinance && k.settlement_status === CASH_ADVANCE_STATUSES.approvedReadyPayout && (
                    <Button onClick={() => openAction('payout')}>
                      {messages.recordPayout}
                    </Button>
                  )}
                  {(isRequester || canProcessFinance) && k.type === 'kasbon' && k.settlement_status === CASH_ADVANCE_STATUSES.activeUnsettled && (
                    <Button onClick={() => openAction('settle')} variant="outline">
                      {messages.settle}
                    </Button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
          )}
        </div>
      </TabsContent>

      {/* Tab: Laba Rugi Proyek */}
      <TabsContent className="mt-0" value="profit_loss">
        <div className="space-y-6">
          <ProjectCashFlowForecast
            transactions={reportCashTransactions}
            invoices={reportInvoices}
            payables={reportPayables}
            hasProjects={financeReportProjects.length > 0}
            isLoading={isLoading}
            error={organizationDataError}
            onRetry={() => void reloadAllData()}
          />
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-text">{messages.grossProfitEstimate}</h2>
              <p className="text-sm text-muted-foreground">{messages.profitLossBasisNote}</p>
            </div>
            {financeReportProjects.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
                {messages.noProjectsForProfitLoss}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {financeReportProjects.map((p) => {
                  const contractVal = calculateEffectiveProjectContractValue(p);
                  const realizedCost = p.realized_cost;
                  const grossProfit = contractVal - realizedCost;
                  const grossMargin = contractVal > 0 ? (grossProfit / contractVal) * 100 : 0;

                  return (
                    <div
                      key={p.id}
                      className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-xs sm:p-5"
                    >
                      <div>
                        <span className="rounded-md bg-accent-500/10 px-2 py-0.5 text-xs font-semibold text-accent-600">
                          {p.code}
                        </span>
                        <h3 className="mt-1.5 text-base font-semibold text-text">{p.name}</h3>
                        <p className="text-sm text-muted-foreground">{p.client_name}</p>
                      </div>

                      <dl className="space-y-2.5 text-sm">
                        <div className="flex justify-between gap-3 border-b border-border py-1.5">
                          <dt className="text-muted-foreground">{messages.effectiveContractValue}</dt>
                          <dd className="font-semibold tabular-nums text-text">{formatRupiah(contractVal)}</dd>
                        </div>
                        <div className="flex justify-between gap-3 border-b border-border py-1.5">
                          <dt className="text-muted-foreground">{messages.recordedRealizedCost}</dt>
                          <dd className="font-semibold tabular-nums text-danger">{formatRupiah(realizedCost)}</dd>
                        </div>
                        <div className="flex justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 font-semibold">
                          <dt className="text-text">{messages.grossProfitEstimate}</dt>
                          <dd className={`text-right tabular-nums ${grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                            {formatRupiah(grossProfit)} ({formatPercent(grossMargin)})
                          </dd>
                        </div>
                      </dl>

                      <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                        <span>{messages.profitProgress}: {formatPercent(p.actual_progress)}</span>
                        <span>{messages.contractPeriod}: {formatDateIndo(p.end_date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </TabsContent>

      </Tabs>
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
    </PageShell>
  );
};
