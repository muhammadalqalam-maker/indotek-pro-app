import { useMemo, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { getMessages } from '../../../i18n';
import type { QualityPunchListItem, PunchListStatus } from '../types';
import { PUNCH_LIST_STATUSES } from '../types';
import { PunchListCard } from './PunchListCard';

const messages = getMessages().safety;
const statusLabels: Record<PunchListStatus, string> = {
  open: messages.punchOpen,
  in_progress: messages.punchInProgress,
  ready_for_inspection: messages.punchReadyInspection,
  closed: messages.punchClosed,
};

function isPunchListStatus(value: string): value is PunchListStatus {
  return PUNCH_LIST_STATUSES.some((status) => status === value);
}

export function PunchListList({
  items,
  projectNames,
  canCreate,
  canEdit,
  canClose,
  isSaving,
  onCreate,
  onAdvance,
  onClose,
}: {
  items: QualityPunchListItem[];
  projectNames: Map<string, string>;
  canCreate: boolean;
  canEdit: boolean;
  canClose: boolean;
  isSaving: boolean;
  onCreate: () => void;
  onAdvance: (item: QualityPunchListItem, nextStatus: 'in_progress' | 'ready_for_inspection') => Promise<void>;
  onClose: (item: QualityPunchListItem, photo: File) => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PunchListStatus>('all');
  const filteredItems = useMemo(() => {
    const search = searchTerm.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesSearch = [
        item.code,
        item.defect_description,
        item.assigned_to_subcon,
        item.location_zone,
      ].some((value) => value.toLocaleLowerCase().includes(search));
      return matchesSearch && (statusFilter === 'all' || item.status === statusFilter);
    });
  }, [items, searchTerm, statusFilter]);

  return (
    <section className="grid gap-4" aria-label={messages.qualityPunchListTab}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative grid gap-1.5 text-sm font-medium text-text">
          <span className="sr-only">{messages.qualitySearch}</span>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            placeholder={messages.qualitySearch}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="min-h-11 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-base text-text"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-text">
          <span className="flex items-center gap-2 text-muted-foreground"><Filter className="size-4" aria-hidden="true" /> {messages.status}</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'all') setStatusFilter('all');
              else if (isPunchListStatus(value)) setStatusFilter(value);
            }}
            className="min-h-11 rounded-md border border-border bg-surface px-3 text-base text-text"
          >
            <option value="all">{messages.allStatuses}</option>
            {PUNCH_LIST_STATUSES.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
        </label>
      </div>
      {filteredItems.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {searchTerm || statusFilter !== 'all'
              ? messages.punchNoSearchResults
              : messages.qualityEmptyPunchList}
          </p>
          {canCreate && !searchTerm && statusFilter === 'all' && (
            <button type="button" onClick={onCreate} className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold text-text">
              {messages.addPunchList}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredItems.map((item) => (
            <PunchListCard
              key={item.id}
              item={item}
              projectName={projectNames.get(item.project_id) ?? messages.project}
              canEdit={canEdit}
              canClose={canClose}
              isSaving={isSaving}
              onAdvance={onAdvance}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </section>
  );
}
