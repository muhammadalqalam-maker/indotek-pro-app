import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, ErrorState, Select, Skeleton } from '../../../components/ui';
import { createBoqRevision, fetchBoqItems } from '../services/boq.service';
import type { BoqVersion } from '../services/boq.service';
import type { AhspDetail, MeasurementUnit } from '../types';
import { BoqRevisionComparison } from './BoqRevisionComparison';

type BoqMessages = ReturnType<typeof import('../../../i18n').getMessages>['rab'];

type BoqRevisionToolsProps = {
  organizationId: string;
  projectId: string;
  versions: BoqVersion[];
  selectedVersion: BoqVersion | null;
  canEdit: boolean;
  comparisonUnits: MeasurementUnit[];
  analyses: AhspDetail[];
  messages: BoqMessages;
  onRevisionCreated: (versionId: string) => void;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

export function BoqRevisionTools({
  organizationId,
  projectId,
  versions,
  selectedVersion,
  canEdit,
  comparisonUnits,
  analyses,
  messages,
  onRevisionCreated,
}: BoqRevisionToolsProps) {
  const queryClient = useQueryClient();
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [previousVersionId, setPreviousVersionId] = useState('');
  const [currentVersionId, setCurrentVersionId] = useState('');
  const [actionError, setActionError] = useState('');

  const previousVersion = versions.find((version) => version.id === previousVersionId)
    ?? versions.find((version) => version.id !== selectedVersion?.id)
    ?? selectedVersion
    ?? versions[0]
    ?? null;
  const currentVersion = versions.find((version) => version.id === currentVersionId)
    ?? selectedVersion
    ?? versions.find((version) => version.id !== previousVersion?.id)
    ?? null;
  const canCompare = Boolean(
    comparisonOpen
    && previousVersion
    && currentVersion
    && previousVersion.id !== currentVersion.id,
  );

  const comparisonQuery = useQuery({
    queryKey: [
      'boq-revision-comparison',
      organizationId,
      projectId,
      previousVersion?.id,
      currentVersion?.id,
    ],
    queryFn: async () => {
      if (!previousVersion || !currentVersion) throw new Error(messages.boqCompareNeedTwo);
      const [previousItems, currentItems] = await Promise.all([
        fetchBoqItems(organizationId, projectId, previousVersion.id),
        fetchBoqItems(organizationId, projectId, currentVersion.id),
      ]);
      return { previousItems, currentItems };
    },
    enabled: canCompare,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedVersion) throw new Error(messages.boqProjectMissing);
      return createBoqRevision(organizationId, projectId, selectedVersion.id);
    },
    onSuccess: async (versionId) => {
      await queryClient.invalidateQueries({ queryKey: ['boq-workspace', organizationId, projectId] });
      await queryClient.invalidateQueries({ queryKey: ['boq-items', organizationId, projectId, versionId] });
      setActionError('');
      setComparisonOpen(false);
      onRevisionCreated(versionId);
    },
    onError: (error: unknown) => {
      setActionError(getErrorMessage(error, messages.boqRevisionCreateFailed));
    },
  });

  return (
    <section className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:flex sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {canEdit && selectedVersion && (
          <Button
            variant="outline"
            disabled={createMutation.isPending}
            className="min-h-11"
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? messages.boqCreatingRevision : messages.boqCreateRevision}
          </Button>
        )}
        {versions.length > 1 && (
          <Button
            variant="secondary"
            aria-expanded={comparisonOpen}
            className="min-h-11"
            onClick={() => setComparisonOpen((open) => !open)}
          >
            {messages.boqCompare}
          </Button>
        )}
      </div>

      {actionError && <p className="text-sm text-danger" role="alert">{actionError}</p>}

      {comparisonOpen && versions.length > 1 && (
        <div className="grid w-full gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              name="boq-compare-previous"
              label={messages.boqCompareFrom}
              value={previousVersion?.id ?? ''}
              onChange={(event) => setPreviousVersionId(event.target.value)}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  Rev {version.revision_number} · {version.title}
                </option>
              ))}
            </Select>
            <Select
              name="boq-compare-current"
              label={messages.boqCompareTo}
              value={currentVersion?.id ?? ''}
              onChange={(event) => setCurrentVersionId(event.target.value)}
            >
              {versions.map((version) => (
                <option key={version.id} value={version.id}>
                  Rev {version.revision_number} · {version.title}
                </option>
              ))}
            </Select>
          </div>

          {!canCompare ? (
            <p className="text-sm text-muted-foreground" role="status">{messages.boqCompareNeedTwo}</p>
          ) : comparisonQuery.isLoading ? (
            <div className="grid gap-3" aria-label={messages.boqLoading}>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : comparisonQuery.isError ? (
            <ErrorState
              title={messages.boqCompareFailed}
              description={getErrorMessage(comparisonQuery.error, messages.boqCompareFailed)}
              retryLabel={messages.boqRetry}
              onRetry={() => void comparisonQuery.refetch()}
            />
          ) : comparisonQuery.data && previousVersion && currentVersion ? (
            <BoqRevisionComparison
              previousVersion={previousVersion}
              currentVersion={currentVersion}
              previousItems={comparisonQuery.data.previousItems}
              currentItems={comparisonQuery.data.currentItems}
              units={comparisonUnits}
              analyses={analyses}
              messages={messages}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
