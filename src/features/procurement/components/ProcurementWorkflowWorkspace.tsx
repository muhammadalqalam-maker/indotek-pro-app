import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { getMessages } from '../../../i18n';
import { getSupabase } from '../../../lib/supabase';
import type { Project, Vendor } from '../../../types/database';
import type { UserRole } from '../../../utils/permissions';
import { formatRupiah, formatTanggal } from '../../../utils/format';
import { PurchaseOrderDialog } from './PurchaseOrderDialog';
import { PurchaseRequestDialog } from './PurchaseRequestDialog';
import { VendorQuoteDialog } from './VendorQuoteDialog';
import { fetchProcurementPurchaseRequests, fetchVendorQuotes } from '../services/procurement.service';
import type { ProcurementPurchaseRequest, VendorQuote } from '../types';

const messages = getMessages().procurementWorkflow;
const quoteRoles: UserRole[] = ['owner', 'admin', 'procurement'];
const requestRoles: UserRole[] = ['owner', 'admin', 'project_manager', 'site_manager', 'procurement'];

function statusLabel(status: ProcurementPurchaseRequest['status']): string {
  if (status === 'submitted') return messages.statusSubmitted;
  if (status === 'approved') return messages.statusApproved;
  if (status === 'rejected') return messages.statusRejected;
  if (status === 'converted_to_po') return messages.statusConverted;
  return messages.statusDraft;
}

function statusClasses(status: ProcurementPurchaseRequest['status']): string {
  if (status === 'approved') return 'bg-success-bg text-success';
  if (status === 'rejected') return 'bg-danger-bg text-danger';
  if (status === 'submitted') return 'bg-warning-bg text-warning';
  return 'bg-surface-2 text-muted';
}

export function ProcurementWorkflowWorkspace({
  organizationId,
  projects,
  vendors,
  currentRole,
  projectId,
  onOrdersChanged,
}: {
  organizationId: string;
  projects: Project[];
  vendors: Vendor[];
  currentRole: UserRole | null;
  projectId: string;
  onOrdersChanged: () => Promise<void>;
}) {
  const [requests, setRequests] = useState<ProcurementPurchaseRequest[]>([]);
  const [quotes, setQuotes] = useState<VendorQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [requestDialog, setRequestDialog] = useState(false);
  const [quoteRequest, setQuoteRequest] = useState<ProcurementPurchaseRequest | null>(null);
  const [orderRequest, setOrderRequest] = useState<ProcurementPurchaseRequest | null>(null);
  const liveAvailable = Boolean(getSupabase());
  const canRequest = currentRole !== null && requestRoles.includes(currentRole);
  const canProcure = currentRole !== null && quoteRoles.includes(currentRole);

  const refresh = useCallback(async () => {
    if (!liveAvailable) {
      setLoading(false);
      setLoadError(messages.liveUnavailable);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const loadedRequests = await fetchProcurementPurchaseRequests(organizationId, projectId);
      const loadedQuotes = await fetchVendorQuotes(
        organizationId,
        loadedRequests.map(({ id }) => id),
      );
      setRequests(loadedRequests);
      setQuotes(loadedQuotes);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : messages.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [liveAvailable, organizationId, projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const quotesByRequest = useMemo(() => {
    const grouped = new Map<string, VendorQuote[]>();
    for (const quote of quotes) {
      const group = grouped.get(quote.purchase_request_id) ?? [];
      group.push(quote);
      grouped.set(quote.purchase_request_id, group);
    }
    return grouped;
  }, [quotes]);
  const activeVendors = vendors.filter((vendor) => vendor.is_active !== false && !vendor.deleted_at);

  const refreshAfterMutation = async () => {
    await refresh();
    await onOrdersChanged();
  };

  return (
    <section className="grid gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">{messages.title}</h2>
          <p className="mt-1 text-sm text-muted">{messages.approvalFlow}</p>
        </div>
        {canRequest && (
          <button
            type="button"
            onClick={() => setRequestDialog(true)}
            disabled={!liveAvailable || projects.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />{messages.createRequest}
          </button>
        )}
      </header>

      {loading ? (
        <div className="grid gap-3" aria-label={messages.loading}>
          {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border border-border bg-surface-2" />)}
        </div>
      ) : loadError ? (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger-bg p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          {liveAvailable && (
            <button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-danger/30 px-3">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />{messages.retry}
            </button>
          )}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <h3 className="font-semibold text-text">{messages.noRequests}</h3>
          <p className="mt-1 text-sm text-muted">{messages.noRequestsHint}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {requests.map((request) => {
            const requestQuotes = quotesByRequest.get(request.id) ?? [];
            const mayCreateOrder = request.status === 'approved' && requestQuotes.length >= 2;
            return (
              <article key={request.id} className="grid gap-4 rounded-xl border border-border bg-surface p-4">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-text">{request.pr_number}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(request.status)}`}>{statusLabel(request.status)}</span>
                      <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">{messages[request.urgency]}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{request.project_name} · {request.requester_name} · {request.department}</p>
                    <p className="mt-1 text-xs text-muted">{messages.required}: {formatTanggal(request.required_date)}</p>
                  </div>
                  <p className="font-semibold tabular-nums text-text">{formatRupiah(request.total_estimated_amount)}</p>
                </header>

                <ul className="grid gap-2 rounded-lg bg-surface-2 p-3 sm:grid-cols-2">
                  {request.items.map((item) => (
                    <li key={item.id} className="text-sm text-text">
                      <span className="font-medium">{item.item_name}</span>
                      <span className="text-muted"> · {item.quantity} {item.unit}</span>
                    </li>
                  ))}
                </ul>

                {request.status === 'approved' && (
                  <section className="grid gap-3 border-t border-border pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-text">{messages.comparison}</h4>
                      {canProcure && (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setQuoteRequest(request)} disabled={activeVendors.length === 0} className="min-h-11 rounded-md border border-border px-3 text-sm font-medium text-text disabled:opacity-50">
                            {messages.addQuote}
                          </button>
                          <button type="button" onClick={() => setOrderRequest(request)} disabled={!mayCreateOrder} className="min-h-11 rounded-md bg-primary-700 px-3 text-sm font-semibold text-white disabled:opacity-50">
                            {messages.createOrder}
                          </button>
                        </div>
                      )}
                    </div>
                    {requestQuotes.length === 0 ? (
                      <p className="text-sm text-muted">{messages.noQuotes}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[32rem] text-left text-sm">
                          <thead className="text-xs text-muted">
                            <tr>
                              <th className="py-2 pr-3">{messages.vendor}</th>
                              <th className="py-2 pr-3">{messages.quoteDate}</th>
                              <th className="py-2 pr-3 text-right">Subtotal</th>
                              <th className="py-2 pr-3 text-right">PPN</th>
                              <th className="py-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {requestQuotes.map((quote) => (
                              <tr key={quote.id}>
                                <td className="py-2 pr-3 font-medium text-text">{quote.vendor_name}<span className="block text-xs font-normal text-muted">{quote.quote_number}</span></td>
                                <td className="py-2 pr-3 text-muted">{formatTanggal(quote.quote_date)}</td>
                                <td className="py-2 pr-3 text-right tabular-nums text-muted">{formatRupiah(quote.subtotal)}</td>
                                <td className="py-2 pr-3 text-right tabular-nums text-muted">{formatRupiah(quote.ppn_amount)}</td>
                                <td className="py-2 text-right font-semibold tabular-nums text-text">{formatRupiah(quote.grand_total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {requestQuotes.length < 2 && <p className="text-xs text-warning">{messages.twoQuotesRequired}</p>}
                  </section>
                )}
              </article>
            );
          })}
        </div>
      )}

      {requestDialog && (
        <PurchaseRequestDialog
          organizationId={organizationId}
          projects={projects}
          onClose={() => setRequestDialog(false)}
          onCreated={refreshAfterMutation}
        />
      )}
      {quoteRequest && (
        <VendorQuoteDialog
          organizationId={organizationId}
          request={quoteRequest}
          vendors={activeVendors.filter((vendor) => !(quotesByRequest.get(quoteRequest.id) ?? []).some((quote) => quote.vendor_id === vendor.id))}
          onClose={() => setQuoteRequest(null)}
          onCreated={refreshAfterMutation}
        />
      )}
      {orderRequest && (
        <PurchaseOrderDialog
          organizationId={organizationId}
          request={orderRequest}
          quotes={quotesByRequest.get(orderRequest.id) ?? []}
          onClose={() => setOrderRequest(null)}
          onCreated={refreshAfterMutation}
        />
      )}
    </section>
  );
}
