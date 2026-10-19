import { useCallback, useEffect, useState } from 'react';
import { Boxes, Ruler } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { useCan } from '../../../hooks/useCan';
import { Button } from '../../../components/ui';
import { fetchMeasurementUnits, missingSettingsMigrationMessage } from '../services/settings.service';
import { MeasurementUnitsPanel } from './MeasurementUnitsPanel';
import { PriceItemsPanel } from './PriceItemsPanel';
import type { MeasurementUnit } from '../types';

type CatalogTab = 'units' | 'prices';

export function EstimatingCatalogPanel() {
  const { currentOrg, isSupabaseLive } = useApp();
  const messages = getMessages().settings;
  const [activeTab, setActiveTab] = useState<CatalogTab>('prices');
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [unitError, setUnitError] = useState('');
  const [loadingUnits, setLoadingUnits] = useState(true);
  const canEdit = useCan('rab', 'edit') && isSupabaseLive;
  const updateUnits = useCallback((nextUnits: MeasurementUnit[]) => setUnits(nextUnits), []);

  const loadUnits = useCallback(async () => {
    if (!currentOrg) return;
    setLoadingUnits(true);
    setUnitError('');
    try {
      setUnits(await fetchMeasurementUnits(currentOrg.id));
    } catch (error: unknown) {
      setUnitError(
        missingSettingsMigrationMessage(error)
          ? messages.catalogMigrationMissing
          : error instanceof Error ? error.message : messages.loadSettingsFailed,
      );
    } finally {
      setLoadingUnits(false);
    }
  }, [currentOrg?.id, messages.catalogMigrationMissing, messages.loadSettingsFailed]);

  useEffect(() => { void loadUnits(); }, [loadUnits]);

  if (!currentOrg) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">{messages.organizationMissing}</p>;
  }

  return (
    <section className="grid gap-4">
      <header className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-text">{messages.estimatingCatalog}</h2>
        <p className="mt-1 text-sm text-muted">{messages.estimatingCatalogHint}</p>
        {!canEdit && <p className="mt-3 rounded-md bg-surface-2 px-3 py-2 text-sm text-muted">{messages.permissionReadOnly}</p>}
      </header>
      <div role="tablist" aria-label={messages.estimatingCatalog} className="flex gap-1 overflow-x-auto border-b border-border">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'prices'}
          onClick={() => setActiveTab('prices')}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${
            activeTab === 'prices' ? 'border-primary-600 text-primary-700 dark:text-primary-300' : 'border-transparent text-muted hover:text-text'
          }`}
        >
          <Boxes className="h-4 w-4" aria-hidden="true" />
          {messages.priceItems}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'units'}
          onClick={() => setActiveTab('units')}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${
            activeTab === 'units' ? 'border-primary-600 text-primary-700 dark:text-primary-300' : 'border-transparent text-muted hover:text-text'
          }`}
        >
          <Ruler className="h-4 w-4" aria-hidden="true" />
          {messages.units}
        </button>
      </div>

      {activeTab === 'prices'
        ? (
          <>
            {unitError && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
                <span>{unitError}</span>
                <Button variant="outline" size="sm" onClick={() => void loadUnits()} disabled={loadingUnits}>{messages.retry}</Button>
              </div>
            )}
            <PriceItemsPanel organizationId={currentOrg.id} canEdit={canEdit} units={units} />
          </>
        )
        : <MeasurementUnitsPanel organizationId={currentOrg.id} canEdit={canEdit} onUnitsChange={updateUnits} />}
    </section>
  );
}
