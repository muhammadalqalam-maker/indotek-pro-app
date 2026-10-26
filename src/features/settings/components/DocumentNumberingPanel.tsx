import { useEffect, useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { Button, Input, useToast } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { useCan } from '../../../hooks/useCan';
import { documentPrefixSchema } from '../schemas/settings.schema';
import {
  fetchDocumentSequences,
  saveDocumentSequencePrefix,
} from '../services/settings.service';
import type { DocumentSequence } from '../types';

const documentTypes = [
  { entity: 'project' },
  { entity: 'purchase_order' },
  { entity: 'daily_report' },
  { entity: 'addendum' },
] as const;

export function DocumentNumberingPanel() {
  const { currentOrg, isSupabaseLive } = useApp();
  const { toast } = useToast();
  const messages = getMessages().settings;
  const canEdit = useCan('settings', 'edit') && isSupabaseLive;
  const year = new Date().getUTCFullYear();
  const [sequences, setSequences] = useState<DocumentSequence[]>([]);
  const [prefixes, setPrefixes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [savingEntity, setSavingEntity] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');

  const loadSequences = async () => {
    if (!currentOrg || !isSupabaseLive) {
      setSequences([]);
      setPrefixes({});
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await fetchDocumentSequences(currentOrg.id, year);
      setSequences(data);
      setPrefixes(Object.fromEntries(data.map((sequence) => [sequence.entity_type, sequence.prefix])));
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : messages.loadSettingsFailed);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSequences();
  }, [currentOrg?.id, isSupabaseLive, year]);

  const savePrefix = async (entityType: string) => {
    if (!currentOrg || !canEdit) return;
    const parsed = documentPrefixSchema.safeParse({ prefix: prefixes[entityType] ?? '' });
    if (!parsed.success) {
      setSaveError(parsed.error.issues[0]?.message ?? messages.prefixSaveFailed);
      return;
    }
    setSavingEntity(entityType);
    setSaveError('');
    try {
      const updated = await saveDocumentSequencePrefix(
        currentOrg.id,
        entityType,
        year,
        parsed.data.prefix,
      );
      setSequences((previous) => [
        ...previous.filter((sequence) => sequence.entity_type !== entityType),
        updated,
      ]);
      setPrefixes((previous) => ({ ...previous, [entityType]: updated.prefix }));
      toast({ title: messages.prefixSaved, variant: 'success' });
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : messages.prefixSaveFailed);
      toast({ title: messages.prefixSaveFailed, variant: 'error' });
    } finally {
      setSavingEntity(null);
    }
  };

  if (!currentOrg) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted-foreground">{messages.organizationMissing}</p>;
  }

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-text">
          <FileText className="h-5 w-5 text-primary-600" aria-hidden="true" />
          {messages.documentNumbering}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{messages.documentNumberingHint}</p>
      </div>
      <p className="w-fit rounded-md bg-surface-2 px-3 py-2 text-sm font-medium text-text">
        {messages.year}: {year}
      </p>
      {!canEdit && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm text-muted-foreground">{messages.permissionReadOnly}</p>}

      {isLoading ? (
        <div className="grid gap-3" role="status" aria-busy="true" aria-label={messages.loadingSettings}>
          {documentTypes.map(({ entity }) => <div key={entity} className="h-24 animate-pulse rounded-md bg-surface-2" />)}
        </div>
      ) : loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          <span>{messages.loadSettingsFailed} {loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void loadSequences()}>{messages.retry}</Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {documentTypes.map(({ entity }) => {
            const sequence = sequences.find((item) => item.entity_type === entity);
            const lastNumber = sequence?.last_value ?? 0;
            const preview = messages.numberingPreview(
              prefixes[entity] ?? '',
              year,
              entity,
              lastNumber + 1,
            );
            return (
              <div key={entity} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <p className="text-sm font-semibold text-text">{messages.documentTypeNames[entity]}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{messages.lastNumber}: {lastNumber}</p>
                </div>
                <Input
                  label={messages.prefix}
                  value={prefixes[entity] ?? ''}
                  maxLength={20}
                  disabled={!canEdit || savingEntity !== null}
                  onChange={(event) => setPrefixes((previous) => ({ ...previous, [entity]: event.target.value }))}
                  className="text-sm uppercase"
                />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{messages.preview}</p>
                  <p className="mt-1 break-all font-mono text-sm text-text">{preview}</p>
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  disabled={!canEdit || savingEntity !== null}
                  loading={savingEntity === entity}
                  onClick={() => void savePrefix(entity)}
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {messages.savePrefix}
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {saveError && <p className="text-sm text-danger" role="alert">{saveError}</p>}
    </section>
  );
}
