import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, ClipboardCheck, History, Plus, Search, Star } from 'lucide-react';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  useToast,
} from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { useCan } from '../../../hooks/useCan';
import { getMessages } from '../../../i18n';
import { formatDateIndo } from '../../../utils/format';
import { fetchVendorEvaluations, fetchVendors, recordVendorEvaluation } from '../services/vendor.service';
import type { VendorEvaluationInput } from '../schemas/vendor.schema';
import { VendorEditorDialog } from './VendorEditorDialog';
import { VendorEvaluationDialog } from './VendorEvaluationDialog';

const messages = getMessages().vendorManagement;

export function VendorWorkspace() {
  const {
    currentOrg,
    isSupabaseLive,
    handleCreateVendor,
    handleUpdateVendor,
    handleArchiveVendor,
    reloadAllData,
  } = useApp();
  const canCreate = useCan('procurement', 'create');
  const canEdit = useCan('procurement', 'edit');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organizationId = currentOrg?.id ?? null;
  const [searchTerm, setSearchTerm] = useState('');
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [evaluatingVendorId, setEvaluatingVendorId] = useState<string | null>(null);
  const [historyVendorId, setHistoryVendorId] = useState<string | null>(null);
  const [archiveVendorId, setArchiveVendorId] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const vendorsQuery = useQuery({
    queryKey: ['vendors', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error(messages.noOrganization);
      return fetchVendors(organizationId);
    },
    enabled: Boolean(organizationId && isSupabaseLive),
  });
  const evaluationsQuery = useQuery({
    queryKey: ['vendor-evaluations', organizationId, historyVendorId],
    queryFn: () => {
      if (!organizationId || !historyVendorId) throw new Error(messages.noOrganization);
      return fetchVendorEvaluations(organizationId, historyVendorId);
    },
    enabled: Boolean(organizationId && historyVendorId && isSupabaseLive),
  });
  const evaluationMutation = useMutation({
    mutationFn: (values: VendorEvaluationInput) => {
      if (!organizationId || !evaluatingVendorId) throw new Error(messages.noOrganization);
      return recordVendorEvaluation(organizationId, evaluatingVendorId, values);
    },
    onSuccess: async () => {
      setEvaluatingVendorId(null);
      toast({ title: messages.evaluationSuccess, variant: 'success' });
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['vendors', organizationId] }),
          queryClient.invalidateQueries({ queryKey: ['vendor-evaluations', organizationId] }),
          reloadAllData(),
        ]);
      } catch (error: unknown) {
        toast({
          title: messages.loadFailed,
          description: error instanceof Error ? error.message : messages.loadFailed,
          variant: 'error',
        });
      }
    },
    onError: (error: unknown) => toast({
      title: messages.evaluationFailed,
      description: error instanceof Error ? error.message : messages.evaluationFailed,
      variant: 'error',
    }),
  });

  const vendors = vendorsQuery.data ?? [];
  const filteredVendors = vendors.filter((vendor) => {
    const term = searchTerm.trim().toLocaleLowerCase();
    return !term || [vendor.name, vendor.code, vendor.category]
      .some((value) => value.toLocaleLowerCase().includes(term));
  });
  const editingVendor = vendors.find((vendor) => vendor.id === editingVendorId);
  const evaluatingVendor = vendors.find((vendor) => vendor.id === evaluatingVendorId);
  const vendorToArchive = vendors.find((vendor) => vendor.id === archiveVendorId);

  const saveVendor = async (values: Parameters<typeof handleCreateVendor>[0]) => {
    try {
      if (editingVendor) await handleUpdateVendor(editingVendor.id, values);
      else await handleCreateVendor(values);
      await queryClient.invalidateQueries({ queryKey: ['vendors', organizationId] });
      setEditingVendorId(null);
      toast({ title: messages.saveSuccess, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.saveFailed,
        description: error instanceof Error ? error.message : messages.saveFailed,
        variant: 'error',
      });
    }
  };

  const confirmArchive = async () => {
    if (!archiveVendorId || !organizationId) return;
    setIsArchiving(true);
    try {
      await handleArchiveVendor(archiveVendorId);
      await queryClient.invalidateQueries({ queryKey: ['vendors', organizationId] });
      setArchiveVendorId(null);
      toast({ title: messages.archiveSuccess, variant: 'success' });
    } catch (error: unknown) {
      toast({
        title: messages.archiveFailed,
        description: error instanceof Error ? error.message : messages.archiveFailed,
        variant: 'error',
      });
    } finally {
      setIsArchiving(false);
    }
  };

  if (!organizationId) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">{messages.noOrganization}</p>;
  }
  if (!isSupabaseLive) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">{messages.liveRequired}</p>;
  }

  return (
    <section className="grid gap-4">
      <header className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-lg font-semibold text-text">{messages.title}</h2>
          <p className="mt-1 text-sm text-muted">{messages.description}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setEditingVendorId('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />{messages.addVendor}
          </Button>
        )}
      </header>

      <Input
        label={messages.search}
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
        prefix={<Search className="h-4 w-4" aria-hidden="true" />}
      />

      {vendorsQuery.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : vendorsQuery.isError ? (
        <ErrorState
          title={messages.loadFailed}
          description={vendorsQuery.error instanceof Error ? vendorsQuery.error.message : messages.loadFailed}
          retryLabel={messages.retry}
          onRetry={() => void vendorsQuery.refetch()}
        />
      ) : vendors.length === 0 ? (
        <EmptyState
          title={messages.noVendorsTitle}
          description={messages.noVendorsDescription}
          actionLabel={canCreate ? messages.addVendor : undefined}
          onAction={canCreate ? () => setEditingVendorId('new') : undefined}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        />
      ) : filteredVendors.length === 0 ? (
        <EmptyState title={messages.noResults} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filteredVendors.map((vendor) => {
            const isHistoryOpen = historyVendorId === vendor.id;
            return (
              <li key={vendor.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs">
                <article className="grid gap-3">
                  <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted">{vendor.code} · {vendor.category}</p>
                      <h3 className="mt-1 break-words text-base font-semibold text-text">{vendor.name}</h3>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="inline-flex items-center gap-1 font-semibold text-text">
                        <Star className="h-4 w-4 fill-accent-500 text-accent-500" aria-hidden="true" />
                        {vendor.evaluation_count ? vendor.rating.toFixed(2) : '—'}
                      </p>
                      <p className="text-xs text-muted">{messages.evaluationCount(vendor.evaluation_count ?? 0)}</p>
                    </div>
                  </header>
                  <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs text-muted">{messages.contactPerson}</dt><dd className="break-words text-text">{vendor.contact_person}</dd></div>
                    <div><dt className="text-xs text-muted">{messages.phone}</dt><dd className="break-words text-text">{vendor.phone}</dd></div>
                    <div><dt className="text-xs text-muted">{messages.email}</dt><dd className="break-all text-text">{vendor.email || '—'}</dd></div>
                    <div><dt className="text-xs text-muted">{messages.paymentTerms}</dt><dd className="text-text">{vendor.payment_terms_days} hari</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    {canCreate && vendor.is_active !== false && (
                      <Button size="sm" onClick={() => setEvaluatingVendorId(vendor.id)}>
                        <ClipboardCheck className="h-4 w-4" aria-hidden="true" />{messages.evaluateVendor}
                      </Button>
                    )}
                    {canEdit && (
                      <Button size="sm" variant="outline" onClick={() => setEditingVendorId(vendor.id)}>
                        {messages.editVendor}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-expanded={isHistoryOpen}
                      onClick={() => setHistoryVendorId(isHistoryOpen ? null : vendor.id)}
                    >
                      <History className="h-4 w-4" aria-hidden="true" />{messages.evaluationHistory}
                    </Button>
                    {canEdit && (
                      <Button size="sm" variant="destructive" onClick={() => setArchiveVendorId(vendor.id)}>
                        {messages.archiveVendor}
                      </Button>
                    )}
                  </div>
                  {isHistoryOpen && (
                    <div className="grid gap-2 rounded-md bg-surface-2 p-3" aria-live="polite">
                      {evaluationsQuery.isPending ? (
                        <Skeleton className="h-14 w-full" />
                      ) : evaluationsQuery.isError ? (
                        <p className="text-sm text-danger" role="alert">
                          {evaluationsQuery.error instanceof Error ? evaluationsQuery.error.message : messages.loadFailed}
                          <Button size="sm" variant="outline" onClick={() => void evaluationsQuery.refetch()}>{messages.retry}</Button>
                        </p>
                      ) : evaluationsQuery.data?.length ? (
                        evaluationsQuery.data.map((evaluation) => (
                          <div key={evaluation.id} className="border-b border-border pb-2 last:border-0">
                            <div className="flex flex-wrap justify-between gap-2 text-sm">
                              <span className="font-medium text-text">{evaluation.transaction_reference}</span>
                              <span className="text-muted">{formatDateIndo(evaluation.created_at)}</span>
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {messages.quality}: {evaluation.quality_score} · {messages.price}: {evaluation.price_score}
                              {' · '}{messages.delivery}: {evaluation.delivery_score} · {messages.service}: {evaluation.service_score}
                              {' · '}{messages.overallScore}: {evaluation.overall_score.toFixed(2)}
                            </p>
                            {evaluation.comment && <p className="mt-1 break-words text-sm text-text">{evaluation.comment}</p>}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted">{messages.noEvaluations}</p>
                      )}
                    </div>
                  )}
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <VendorEditorDialog
        open={Boolean(editingVendorId)}
        vendor={editingVendor}
        onOpenChange={(open) => { if (!open) setEditingVendorId(null); }}
        onSave={saveVendor}
      />
      <VendorEvaluationDialog
        open={Boolean(evaluatingVendor)}
        vendorName={evaluatingVendor?.name ?? ''}
        isSaving={evaluationMutation.isPending}
        onOpenChange={(open) => { if (!open) setEvaluatingVendorId(null); }}
        onSave={(values) => {
          evaluationMutation.mutate(values);
          return Promise.resolve();
        }}
      />
      <ConfirmDialog
        open={Boolean(vendorToArchive)}
        onOpenChange={(open) => { if (!open) setArchiveVendorId(null); }}
        title={messages.archiveVendor}
        description={vendorToArchive?.name}
        confirmLabel={messages.archiveVendor}
        cancelLabel={messages.cancel}
        destructive
        loading={isArchiving}
        onConfirm={() => void confirmArchive()}
      />
    </section>
  );
}
