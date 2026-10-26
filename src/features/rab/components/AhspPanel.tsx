import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Calculator, PencilLine, Search } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { formatRupiah } from '../../../utils/format';
import { useCan } from '../../../hooks/useCan';
import { Button, ConfirmDialog, EmptyState, ErrorState, Input, Skeleton } from '../../../components/ui';
import { calculateAhspLineTotal } from '../ahspCalculations';
import { archiveAhsp, fetchAhspCatalog, saveAhsp } from '../services/ahsp.service';
import type { AhspDetail } from '../types';
import type { AhspFormValues } from '../schemas/ahsp.schema';
import { AhspEditorDialog } from './AhspEditorDialog';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
}

function getCategoryLabel(category: string, messages: ReturnType<typeof getMessages>['rab']): string {
  if (category === 'bahan') return messages.material;
  if (category === 'upah') return messages.labor;
  if (category === 'alat') return messages.equipment;
  return category;
}

export function AhspPanel() {
  const { currentOrg, currentMemberRole, isSupabaseLive } = useApp();
  const messages = getMessages().rab;
  const canEdit = useCan('rab', 'edit')
    && isSupabaseLive
    && ['owner', 'admin', 'estimator'].includes(currentMemberRole ?? '');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AhspDetail | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AhspDetail | null>(null);
  const [feedback, setFeedback] = useState('');
  const [actionError, setActionError] = useState('');
  const organizationId = currentOrg?.id ?? null;
  const queryKey = ['ahsp-catalog', organizationId];

  const catalogQuery = useQuery({
    queryKey,
    queryFn: () => {
      if (!organizationId) throw new Error(messages.organizationMissing);
      return fetchAhspCatalog(organizationId);
    },
    enabled: Boolean(organizationId && isSupabaseLive),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, values }: { id: string | null; values: AhspFormValues }) => {
      if (!organizationId) throw new Error(messages.organizationMissing);
      return saveAhsp(organizationId, id, values);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => {
      if (!organizationId) throw new Error(messages.organizationMissing);
      return archiveAhsp(organizationId, id);
    },
  });

  const analyses = catalogQuery.data?.analyses ?? [];
  const hasActiveCatalog = Boolean(
    catalogQuery.data?.units.some((unit) => unit.deleted_at === null)
    && catalogQuery.data?.priceItems.some((item) => item.deleted_at === null),
  );
  const filteredAnalyses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID');
    if (!normalizedSearch) return analyses;
    return analyses.filter((analysis) =>
      [analysis.code, analysis.title, analysis.division]
        .some((value) => value.toLocaleLowerCase('id-ID').includes(normalizedSearch)),
    );
  }, [analyses, search]);

  const handleSave = async (values: AhspFormValues) => {
    await saveMutation.mutateAsync({ id: editing?.id ?? null, values });
    await queryClient.invalidateQueries({ queryKey });
    setFeedback(editing ? messages.updateSuccess : messages.createSuccess);
    setActionError('');
    setEditorOpen(false);
    setEditing(null);
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
      await queryClient.invalidateQueries({ queryKey });
      setFeedback(messages.archiveSuccess);
      setActionError('');
      setArchiveTarget(null);
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, messages.archiveFailed));
    }
  };

  if (!organizationId) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted-foreground">{messages.organizationMissing}</p>;
  }

  if (!isSupabaseLive) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted-foreground">{messages.offline}</p>;
  }

  return (
    <section className="grid gap-4">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-text">{messages.title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{messages.description}</p>
          {!canEdit && <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-sm text-muted-foreground">{messages.readOnly}</p>}
        </div>
        {canEdit && (
          <Button
            className="w-full shrink-0 sm:w-auto"
            onClick={() => { setEditing(null); setFeedback(''); setActionError(''); setEditorOpen(true); }}
            disabled={!hasActiveCatalog}
          >
            <Calculator className="h-4 w-4" aria-hidden="true" />
            {messages.addAnalysis}
          </Button>
        )}
      </header>

      {catalogQuery.isLoading ? (
        <div className="grid gap-3" aria-label={messages.loading}>
          {[0, 1, 2].map((item) => (
            <div key={item} className="grid gap-3 rounded-xl border border-border bg-surface p-4">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : catalogQuery.isError ? (
        <ErrorState
          title={messages.loadFailed}
          description={getErrorMessage(catalogQuery.error, messages.loadFailed)}
          retryLabel={messages.retry}
          onRetry={() => void catalogQuery.refetch()}
        />
      ) : (
        <>
          {!hasActiveCatalog && (
            <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-muted-foreground">{messages.noCatalogItems}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-[minmax(16rem,24rem)_auto] sm:items-end">
            <Input
              label={messages.searchLabel}
              placeholder={messages.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              prefix={<Search className="h-4 w-4" aria-hidden="true" />}
            />
            <p className="pb-1 text-sm text-muted-foreground" aria-live="polite">{filteredAnalyses.length} / {analyses.length}</p>
          </div>

          {actionError && <p className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">{actionError}</p>}
          {feedback && <p className="rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success" role="status">{feedback}</p>}

          {analyses.length === 0 ? (
            <EmptyState
              title={messages.emptyTitle}
              description={messages.emptyDescription}
              actionLabel={canEdit && hasActiveCatalog ? messages.addAnalysis : undefined}
              onAction={canEdit && hasActiveCatalog ? () => { setEditing(null); setEditorOpen(true); } : undefined}
              icon={<Calculator className="h-5 w-5" aria-hidden="true" />}
            />
          ) : filteredAnalyses.length === 0 ? (
            <EmptyState title={messages.noMatches} />
          ) : (
            <div className="grid gap-3">
              {filteredAnalyses.map((analysis) => (
                <article key={analysis.id} className="grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
                  <header className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-primary-50 px-2 py-1 font-mono text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-500">
                          {analysis.code}
                        </span>
                        <span className="text-xs text-muted-foreground">{analysis.division}</span>
                      </div>
                      <h3 className="mt-2 break-words text-base font-semibold text-text">{analysis.title}</h3>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="sm:text-right">
                        <p className="text-xs text-muted-foreground">{messages.analysisUnitPrice} / {analysis.unitSymbol}</p>
                        <p className="font-mono text-lg font-bold text-text">{formatRupiah(analysis.unitPrice)}</p>
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="md"
                            className="h-11 w-11 p-0"
                            aria-label={`${messages.editAnalysis}: ${analysis.code}`}
                            onClick={() => { setEditing(analysis); setFeedback(''); setActionError(''); setEditorOpen(true); }}
                          >
                            <PencilLine className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="md"
                            className="h-11 w-11 p-0 text-danger"
                            aria-label={`${messages.archiveAnalysis}: ${analysis.code}`}
                            onClick={() => { setArchiveTarget(analysis); setActionError(''); }}
                          >
                            <Archive className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </header>

                  <details>
                    <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                      {messages.componentHeading} ({analysis.components.length})
                    </summary>
                    <div className="grid gap-2 pt-2">
                      {analysis.components.map((component) => (
                        <div key={component.id} className="grid gap-1 rounded-md bg-surface-2/60 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-4">
                          <div className="min-w-0">
                            <p className="break-words font-medium text-text">{component.item.name}</p>
                            <p className="text-xs text-muted-foreground">{component.item.code} · {getCategoryLabel(component.item.category, messages)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">{messages.coefficient}: <span className="font-mono text-text">{component.coefficient}</span></p>
                          <p className="text-xs text-muted-foreground">{messages.basePrice}: <span className="font-mono text-text">{formatRupiah(component.item.unit_price)} / {component.item.unitSymbol}</span></p>
                          <p className="font-mono font-semibold text-text">{formatRupiah(calculateAhspLineTotal(component.coefficient, component.item.unit_price))}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <AhspEditorDialog
        open={editorOpen}
        initial={editing}
        priceItems={catalogQuery.data?.priceItems ?? []}
        units={catalogQuery.data?.units ?? []}
        saving={saveMutation.isPending}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open) setEditing(null);
        }}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => { if (!open && !archiveMutation.isPending) setArchiveTarget(null); }}
        title={messages.archiveTitle}
        description={messages.archiveDescription}
        confirmLabel={messages.archiveConfirm}
        cancelLabel={messages.cancel}
        destructive
        loading={archiveMutation.isPending}
        onConfirm={() => void handleArchive()}
      />
    </section>
  );
}
