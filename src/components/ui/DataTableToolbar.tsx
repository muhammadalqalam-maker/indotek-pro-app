import type { ReactNode } from 'react';
import type { Table as ReactTable } from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { getMessages } from '../../i18n';
import { Button } from './Button';
import { Checkbox } from './Checkbox';
import type { DataTableColumn, DataTableFacet } from './DataTable.types';
import { cn } from './utils';

const messages = getMessages('id').common.dataTable;

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

export function DataTableToolbar<Row>({
  columns,
  visibleColumns,
  table,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  toolbar,
  facets,
  filterValues,
  onFilterValueToggle,
  density,
  onDensityChange,
  exportFileName,
}: {
  columns: DataTableColumn<Row>[];
  visibleColumns: DataTableColumn<Row>[];
  table: ReactTable<Row>;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder: string;
  toolbar?: ReactNode;
  facets: DataTableFacet[];
  filterValues: Record<string, string[]>;
  onFilterValueToggle: (facetId: string, value: string) => void;
  density: 'comfortable' | 'compact';
  onDensityChange?: (density: 'comfortable' | 'compact') => void;
  exportFileName: string;
}) {
  const exportableColumns = visibleColumns.some((column) => column.exportValue);
  const hasControls = onSearchChange
    || facets.length > 0
    || toolbar
    || onDensityChange
    || columns.some((column) => column.hideable)
    || exportableColumns;

  if (!hasControls) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center">
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
        {facets.map((facet) => {
          const selectedValues = filterValues[facet.id] ?? [];
          return (
            <details key={facet.id} className="relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                {facet.label}
                {selectedValues.length > 0 && (
                  <span className="ml-2 rounded-full bg-surface-2 px-1.5 text-xs text-muted-foreground">
                    {selectedValues.length}
                  </span>
                )}
              </summary>
              <div className="absolute left-0 z-40 mt-1 max-h-64 min-w-48 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-sm">
                {facet.options.map((option) => (
                  <Checkbox
                    key={option.value}
                    label={option.label}
                    checked={selectedValues.includes(option.value)}
                    onChange={() => onFilterValueToggle(facet.id, option.value)}
                    className="size-4"
                  />
                ))}
              </div>
            </details>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {toolbar}
        {onDensityChange && (
          <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
            <span>{messages.density}</span>
            <select
              className="min-h-11 rounded-md border border-border-strong bg-surface px-2 text-sm text-text"
              value={density}
              onChange={(event) => onDensityChange(event.currentTarget.value === 'compact' ? 'compact' : 'comfortable')}
              aria-label={messages.density}
            >
              <option value="comfortable">{messages.comfortable}</option>
              <option value="compact">{messages.compact}</option>
            </select>
          </label>
        )}
        {columns.some((column) => column.hideable) && (
          <details className="relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              {messages.columns}
            </summary>
            <div className="absolute right-0 z-40 mt-1 max-h-64 min-w-44 overflow-y-auto rounded-lg border border-border bg-surface p-2 shadow-sm">
              {table.getAllLeafColumns().filter((column) => column.getCanHide()).map((column) => (
                <Checkbox
                  key={column.id}
                  label={String(column.columnDef.header ?? column.id)}
                  checked={column.getIsVisible()}
                  disabled={column.getIsVisible() && table.getVisibleLeafColumns().length <= 1}
                  onChange={column.getToggleVisibilityHandler()}
                />
              ))}
            </div>
          </details>
        )}
        {exportableColumns && (
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadCsv(visibleColumns, table.getRowModel().rows.map((row) => row.original), exportFileName)}
            aria-label={messages.exportPageAria}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{messages.exportCsv}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
