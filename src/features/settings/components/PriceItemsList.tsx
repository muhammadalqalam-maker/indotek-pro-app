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
        <div className="overflow-x-auto rounded-md border border-border">
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
      )}
    </div>
  );
}
