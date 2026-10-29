import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Search } from 'lucide-react';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { CardList } from './CardList';
import { cn } from './utils';

export type DataTableColumn<Row> = {
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  exportValue?: (row: Row) => string | number | null | undefined;
  sortable?: boolean;
  className?: string;
  hideable?: boolean;
};

export type DataTableSort = {
  column: string;
  direction: 'asc' | 'desc';
};

export type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  totalRows: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange?: (sort: DataTableSort) => void;
  sort?: DataTableSort;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  selectedRowIds?: string[];
  onSelectionChange?: (selectedRowIds: string[]) => void;
  density?: 'comfortable' | 'compact';
  onDensityChange?: (density: 'comfortable' | 'compact') => void;
  className?: string;
};

function csvEscape(value: string | number | null | undefined): string {
  const text = String(value ?? '');
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function downloadCsv<Row>(columns: DataTableColumn<Row>[], rows: Row[], fileName: string) {
  const exportableColumns = columns.filter((column) => column.exportValue);
  if (exportableColumns.length === 0) return;

  const csv = [
    exportableColumns.map((column) => csvEscape(column.header)).join(','),
    ...rows.map((row) => exportableColumns
      .map((column) => csvEscape(column.exportValue?.(row)))
      .join(',')),
  ].join('\r\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  totalRows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  sort,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Cari data...',
  toolbar,
  loading = false,
  emptyTitle = 'Belum ada data',
  emptyDescription,
  selectedRowIds = [],
  onSelectionChange,
  density = 'comfortable',
  onDensityChange,
  className,
}: DataTableProps<Row>) {
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const visibleColumns = useMemo(
    () => columns.filter((column) => columnVisibility[column.id] !== false),
    [columns, columnVisibility],
  );
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalRows / safePageSize));
  const pageIds = rows.map(rowKey);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedRowIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedRowIds.includes(id));

  const togglePageSelection = () => {
    if (!onSelectionChange) return;
    if (allPageSelected) {
      onSelectionChange(selectedRowIds.filter((id) => !pageIds.includes(id)));
      return;
    }
    onSelectionChange([...new Set([...selectedRowIds, ...pageIds])]);
  };

  const toggleRowSelection = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedRowIds.includes(id)
        ? selectedRowIds.filter((selectedId) => selectedId !== id)
        : [...selectedRowIds, id],
    );
  };

  const toggleSort = (columnId: string) => {
    if (!onSortChange) return;
    const direction = sort?.column === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column: columnId, direction });
  };

  const exportableColumns = visibleColumns.some((column) => column.exportValue);

  return (
    <section className={cn('space-y-3', className)}>
      {(onSearchChange || toolbar || onDensityChange || columns.some((column) => column.hideable) || exportableColumns) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {onSearchChange && (
            <label className="relative block min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
              <input
                type="search"
                value={searchValue ?? ''}
                onChange={(event) => onSearchChange(event.currentTarget.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="min-h-11 w-full rounded-md border border-border-strong bg-surface py-2 pl-9 pr-3 text-base text-text outline-none placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-primary-500"
              />
            </label>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {onDensityChange && (
              <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
                <span>Kepadatan</span>
                <select
                  className="min-h-11 rounded-md border border-border-strong bg-surface px-2 text-sm text-text"
                  value={density}
                  onChange={(event) => onDensityChange(event.currentTarget.value as 'comfortable' | 'compact')}
                  aria-label="Kepadatan tabel"
                >
                  <option value="comfortable">Nyaman</option>
                  <option value="compact">Ringkas</option>
                </select>
              </label>
            )}
            {columns.some((column) => column.hideable) && (
              <details className="relative">
                <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  Kolom
                </summary>
                <div className="absolute right-0 z-40 mt-1 max-h-64 min-w-44 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-sm">
                  {columns.filter((column) => column.hideable).map((column) => (
                    <label key={column.id} className="flex min-h-10 cursor-pointer items-center gap-2 px-2 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={columnVisibility[column.id] !== false}
                        onChange={(event) => setColumnVisibility((previous) => ({
                          ...previous,
                          [column.id]: event.currentTarget.checked,
                        }))}
                        className="h-4 w-4 accent-primary-700"
                      />
                      {column.header}
                    </label>
                  ))}
                </div>
              </details>
            )}
            {exportableColumns && (
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadCsv(visibleColumns, rows, 'data')}
                aria-label="Ekspor halaman ini ke CSV"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Ekspor CSV</span>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="sm:hidden">
        <CardList
          rows={rows}
          rowKey={rowKey}
          title={(row) => visibleColumns[0]?.cell(row) ?? 'Data'}
          fields={visibleColumns.slice(1).map((column) => ({
            label: column.header,
            value: column.cell,
          }))}
          actions={onSelectionChange
            ? (row) => (
              <Checkbox
                aria-label={`Pilih baris ${rowKey(row)}`}
                checked={selectedRowIds.includes(rowKey(row))}
                onChange={() => toggleRowSelection(rowKey(row))}
              />
            )
            : undefined}
          loading={loading}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-surface-2 text-xs text-muted-foreground">
              <tr>
                {onSelectionChange && (
                  <th scope="col" className="w-11 px-3 py-3">
                    <Checkbox
                      aria-label="Pilih semua baris di halaman ini"
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={togglePageSelection}
                    />
                  </th>
                )}
                {visibleColumns.map((column) => (
                  <th key={column.id} scope="col" className={cn('whitespace-nowrap px-3 py-3 font-semibold', column.className)}>
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className="inline-flex min-h-8 items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        aria-label={`Urutkan berdasarkan ${column.header}`}
                      >
                        {column.header}
                        {sort?.column === column.id
                          ? sort.direction === 'asc'
                            ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                            : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                          : <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />}
                      </button>
                    ) : column.header}
                  </th>
                ))}
              </tr>
            </thead>
            {!loading && rows.length > 0 && (
              <tbody className="divide-y divide-border">
                {rows.map((row) => {
                  const id = rowKey(row);
                  return (
                    <tr key={id} className="transition-colors duration-150 hover:bg-surface-2/70 focus-within:bg-surface-2/70">
                      {onSelectionChange && (
                        <td className="px-3 py-3">
                          <Checkbox
                            aria-label={`Pilih baris ${id}`}
                            checked={selectedRowIds.includes(id)}
                            onChange={() => toggleRowSelection(id)}
                          />
                        </td>
                      )}
                      {visibleColumns.map((column) => (
                        <td key={column.id} className={cn('text-text', density === 'compact' ? 'px-3 py-2' : 'px-3 py-4', column.className)}>
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
          {loading ? (
            <div className="space-y-3 p-4" role="status" aria-label="Memuat data">
              {Array.from({ length: Math.min(pageSize, 5) }, (_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} className="m-4 border-0" />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {totalRows === 0 ? 'Tidak ada data' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalRows)} dari ${totalRows}`}
          {selectedRowIds.length > 0 ? ` · ${selectedRowIds.length} dipilih` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
            <span>Baris</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.currentTarget.value))}
              className="min-h-11 rounded-md border border-border-strong bg-surface px-2 text-sm text-text"
              aria-label="Jumlah baris per halaman"
            >
              {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)}>
            Sebelumnya
          </Button>
          <span className="min-w-20 text-center text-xs text-muted-foreground">Halaman {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)}>
            Berikutnya
          </Button>
        </div>
      </div>
    </section>
  );
}
