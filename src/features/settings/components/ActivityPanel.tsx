import { useEffect, useState } from 'react';
import { Activity, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { formatTanggal } from '../../../utils/format';
import { fetchOrganizationActivity } from '../services/settings.service';
import type { OrganizationActivity } from '../types';

export function ActivityPanel() {
  const { currentOrg, auditLogs, isSupabaseLive, handleResetDemo } = useApp();
  const messages = getMessages().settings;
  const [activities, setActivities] = useState<OrganizationActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let active = true;
    if (!currentOrg) {
      setActivities([]);
      setLoadError('');
      setIsLoading(false);
      return () => { active = false; };
    }
    if (!isSupabaseLive) {
      setActivities(auditLogs.map((log) => ({
        id: log.id,
        actor_name: log.user_name,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        details: log.details,
        project_name: log.project_name ?? null,
        created_at: log.created_at,
      })));
      setLoadError('');
      setIsLoading(false);
      return () => { active = false; };
    }

    setIsLoading(true);
    setLoadError('');
    void fetchOrganizationActivity(currentOrg.id)
      .then((result) => { if (active) setActivities(result); })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : messages.loadSettingsFailed);
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [auditLogs, currentOrg?.id, isSupabaseLive, messages.loadSettingsFailed, retryToken]);

  if (!currentOrg) {
    return <p className="rounded-md border border-border bg-surface p-4 text-sm text-muted">{messages.organizationMissing}</p>;
  }

  return (
    <section className="grid gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-text">
            <Activity className="h-5 w-5 text-primary-600" aria-hidden="true" />
            {messages.auditTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{messages.auditHint}</p>
        </div>
        {!isSupabaseLive && (
          <Button variant="outline" size="sm" onClick={handleResetDemo}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {messages.demoDataReset}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3" role="status" aria-busy="true" aria-label={messages.loadingSettings}>
          <div className="h-16 animate-pulse rounded-md bg-surface-2" />
          <div className="h-16 animate-pulse rounded-md bg-surface-2" />
        </div>
      ) : loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          <span>{messages.loadSettingsFailed} {loadError}</span>
          <Button variant="outline" size="sm" onClick={() => setRetryToken((token) => token + 1)}>{messages.retry}</Button>
        </div>
      ) : activities.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted">{messages.auditEmpty}</p>
      ) : (
        <ol className="divide-y divide-border">
          {activities.map((entry) => (
            <li key={entry.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text">{entry.actor_name || messages.actorUnavailable}</span>
                  <span className="rounded bg-surface-2 px-2 py-1 font-mono text-xs text-muted">{entry.action}</span>
                  <span className="text-xs text-muted">{entry.entity_type}</span>
                </div>
                <p className="mt-1 break-words text-sm text-text">{entry.details}</p>
                {entry.project_name && (
                  <p className="mt-1 text-xs text-muted">{messages.project}: {entry.project_name}</p>
                )}
              </div>
              <time className="text-xs text-muted sm:whitespace-nowrap" dateTime={entry.created_at}>
                {formatTanggal(entry.created_at, { withTime: true, timezone: currentOrg.timezone })}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
