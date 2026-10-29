import { useMemo, useState } from 'react';
import {
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { getMessages } from '../../i18n';
import { DataTableGrid } from './DataTableGrid';
import { DataTablePagination } from './DataTablePagination';
import { DataTableToolbar } from './DataTableToolbar';
import type { DataTableProps, DataTableSort } from './DataTable.types';
import { cn } from './utils';

export type {
  DataTableColumn,
  DataTableFacet,
  DataTableProps,
  DataTableSort,
} from './DataTable.types';

const messages = getMessages('id').common.dataTable;

function getSorting(sort?: DataTableSort): SortingState {
  return sort ? [{ id: sort.column, desc: sort.direction === 'desc' }] : [];
}

function getRowSelection(selectedRowIds: string[]): RowSelectionState {
  return Object.fromEntries(selectedRowIds.map((id) => [id, true]));
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
  searchPlaceholder = messages.searchPlaceholder,
  toolbar,
  loading = false,
  emptyTitle = messages.emptyTitle,
  emptyDescription,
  facets = [],
  filterValues = {},
  onFilterValuesChange,
  selectedRowIds = [],
  onSelectionChange,
  bulkActions,
  density = 'comfortable',
  onDensityChange,
  exportFileName = 'data',
  className,
}: DataTableProps<Row>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalRows / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const sorting = getSorting(sort);
  const rowSelection = getRowSelection(selectedRowIds);

  const tableColumns = useMemo<ColumnDef<Row, unknown>[]>(() => columns.map((column) => ({
    id: column.id,
    header: column.header,
    cell: ({ row }) => column.cell(row.original),
    enableHiding: column.hideable ?? false,
  })), [columns]);

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getRowId: rowKey,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    state: {
      columnVisibility,
      columnFilters: Object.entries(filterValues)
        .filter(([, values]) => values.length > 0)
        .map(([id, value]) => ({ id, value })),
      pagination: { pageIndex: currentPage - 1, pageSize: safePageSize },
      rowSelection,
      sorting,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: onSelectionChange
      ? (updater) => {
        const next = functionalUpdate(updater, rowSelection);
        onSelectionChange(Object.keys(next).filter((id) => next[id]));
      }
      : undefined,
  });

  const visibleColumns = table.getVisibleLeafColumns()
    .map((tableColumn) => columns.find((column) => column.id === tableColumn.id))
    .filter((column) => column !== undefined);
  const visibleSelectedRows = rows.filter((row) => selectedRowIds.includes(rowKey(row)));

  const toggleSort = (columnId: string) => {
    if (!onSortChange) return;
    const direction = sort?.column === columnId && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange({ column: columnId, direction });
  };

  const toggleFacetValue = (facetId: string, value: string) => {
    if (!onFilterValuesChange) return;
    const selected = filterValues[facetId] ?? [];
    const nextValues = selected.includes(value)
      ? selected.filter((selectedValue) => selectedValue !== value)
      : [...selected, value];
    onFilterValuesChange({ ...filterValues, [facetId]: nextValues });
  };

  const clearSelection = () => onSelectionChange?.([]);

  return (
    <section className={cn('space-y-3', className)} aria-busy={loading}>
      <DataTableToolbar
        columns={columns}
        visibleColumns={visibleColumns}
        table={table}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        toolbar={toolbar}
        facets={onFilterValuesChange ? facets : []}
        filterValues={filterValues}
        onFilterValueToggle={toggleFacetValue}
        density={density}
        onDensityChange={onDensityChange}
        exportFileName={exportFileName}
      />

      {selectedRowIds.length > 0 && bulkActions && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-2 p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-text" aria-live="polite">
            {messages.selectedCount(selectedRowIds.length)}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions(selectedRowIds, visibleSelectedRows, clearSelection)}
          </div>
        </div>
      )}

      <DataTableGrid
        columns={columns}
        visibleColumns={visibleColumns}
        rows={rows}
        rowKey={rowKey}
        table={table}
        density={density}
        loading={loading}
        pageSize={safePageSize}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onSortChange={onSortChange}
        sort={sort}
        onSelectionChange={onSelectionChange}
        onSort={toggleSort}
      />

      <DataTablePagination
        totalRows={totalRows}
        page={currentPage}
        pageSize={safePageSize}
        loading={loading}
        selectedCount={selectedRowIds.length}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  );
}
