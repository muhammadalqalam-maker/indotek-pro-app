import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button, Input, Select } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatRupiah, formatTanggal } from '../../../utils/format';
import type { MeasurementUnit, PriceItem } from '../types';

const categories = ['bahan', 'upah', 'alat'] as const;

export function PriceItemsList({
  items,
  units,
  canEdit,
  onEdit,
  onArchive,
}: {
  items: PriceItem[];
  units: MeasurementUnit[];
  canEdit: boolean;
  onEdit: (item: PriceItem) => void;
  onArchive: (item: PriceItem) => void;
}) {
  const messages = getMessages().settings;
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PriceItem['category']>('all');
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesSearch = !normalizedSearch
        || [item.code, item.name, item.region ?? ''].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, items, search]);

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <Input
          label={messages.searchPriceItems}
          placeholder={messages.searchPriceItemsPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          label={messages.filterPriceCategory}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}
        >
          <option value="all">{messages.allPriceCategories}</option>
          {categories.map((category) => <option key={category} value={category}>{messages.categoryNames[category]}</option>)}
        </Select>
      </div>
      {filteredItems.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted">{messages.priceItemsNoMatches}</p>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {filteredItems.map((item) => {
              const unit = unitById.get(item.unit_id);
              return (
                <li key={item.id} className="rounded-md border border-border bg-surface p-3">
                  <article className="grid gap-3">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted">{messages.categoryNames[item.category]}</p>
                        <h4 className="mt-1 break-words text-sm font-semibold text-text">{item.name}</h4>
                        <p className="mt-1 break-all font-mono text-xs text-muted">{item.code}</p>
                      </div>
                      <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-text">
                        {formatRupiah(item.unit_price)}
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3 text-xs">
                      <div className="min-w-0">
                        <dt className="text-muted">{messages.unit}</dt>
                        <dd className="mt-0.5 break-words text-text">
                          {unit ? `${unit.symbol} — ${unit.name}` : item.unit_id}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-muted">{messages.region}</dt>
                        <dd className="mt-0.5 break-words text-text">{item.region || '—'}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-muted">{messages.validFrom}</dt>
                        <dd className="mt-0.5 text-text">{formatTanggal(item.valid_from)}</dd>
                      </div>
                      {item.valid_until && (
                        <div className="min-w-0">
                          <dt className="text-muted">{messages.validUntil}</dt>
                          <dd className="mt-0.5 text-text">{formatTanggal(item.valid_until)}</dd>
                        </div>
                      )}
                      {item.source && (
                        <div className="col-span-2 min-w-0">
                          <dt className="text-muted">{messages.source}</dt>
                          <dd className="mt-0.5 break-words text-text">{item.source}</dd>
                        </div>
                      )}
                    </dl>
                    {canEdit && (
                      <div className="flex flex-wrap gap-2 border-t border-border pt-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit(item)}>{messages.edit}</Button>
                        <Button variant="ghost" size="sm" onClick={() => onArchive(item)}>{messages.archive}</Button>
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto rounded-md border border-border md:block">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-surface-2 text-xs uppercase text-muted">
                <tr>
                  <th scope="col" className="px-3 py-3">{messages.category}</th>
                  <th scope="col" className="px-3 py-3">{messages.code}</th>
                  <th scope="col" className="px-3 py-3">{messages.name}</th>
                  <th scope="col" className="px-3 py-3">{messages.unit}</th>
                  <th scope="col" className="px-3 py-3">{messages.unitPrice}</th>
                  <th scope="col" className="px-3 py-3">{messages.region}</th>
                  <th scope="col" className="px-3 py-3">{messages.validFrom}</th>
                  <th scope="col" className="px-3 py-3">{messages.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
              {filteredItems.map((item) => {
                const unit = unitById.get(item.unit_id);
                return (
                  <tr key={item.id} className="text-text">
                    <td className="px-3 py-3">{messages.categoryNames[item.category]}</td>
                    <td className="px-3 py-3 font-mono">{item.code}</td>
                    <td className="px-3 py-3">{item.name}</td>
                    <td className="px-3 py-3">{unit ? `${unit.symbol} — ${unit.name}` : item.unit_id}</td>
                    <td className="px-3 py-3 whitespace-nowrap tabular-nums">{formatRupiah(item.unit_price)}</td>
                    <td className="px-3 py-3">{item.region || '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatTanggal(item.valid_from)}</td>
                    <td className="px-3 py-3">
                      {canEdit && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            {messages.edit}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => onArchive(item)}>{messages.archive}</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
