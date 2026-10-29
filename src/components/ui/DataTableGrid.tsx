import {
  flexRender,
  type Table as ReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { getMessages } from '../../i18n';
import { CardList } from './CardList';
import { Checkbox } from './Checkbox';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import type { DataTableColumn, DataTableSort } from './DataTable.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../shadcn/table';
import { cn } from './utils';

const messages = getMessages('id').common.dataTable;

export function DataTableGrid<Row>({
  columns,
  visibleColumns,
  rows,
  rowKey,
  table,
  density,
  loading,
  pageSize,
  emptyTitle,
  emptyDescription,
  onSortChange,
  sort,
  onSelectionChange,
  onSort,
}: {
  columns: DataTableColumn<Row>[];
  visibleColumns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  table: ReactTable<Row>;
  density: 'comfortable' | 'compact';
  loading: boolean;
  pageSize: number;
  emptyTitle: string;
  emptyDescription?: string;
  onSortChange?: (sort: DataTableSort) => void;
  sort?: DataTableSort;
  onSelectionChange?: (selectedRowIds: string[]) => void;
  onSort: (columnId: string) => void;
}) {
  const pageRows = table.getRowModel().rows;
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => row.getIsSelected());
  const somePageSelected = pageRows.some((row) => row.getIsSelected());
  const columnCount = Math.max(1, visibleColumns.length + (onSelectionChange ? 1 : 0));

  return (
    <>
      <div className="sm:hidden">
        <CardList
          rows={rows}
          rowKey={rowKey}
          title={(row) => visibleColumns[0]?.cell(row) ?? messages.dataLabel}
          fields={visibleColumns.slice(1).map((column) => ({
            label: column.header,
            value: column.cell,
          }))}
          actions={onSelectionChange
            ? (row) => (
              <Checkbox
                aria-label={messages.selectRow(rowKey(row))}
                checked={table.getRow(rowKey(row)).getIsSelected()}
                onChange={table.getRow(rowKey(row)).getToggleSelectedHandler()}
              />
            )
            : undefined}
          loading={loading}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-border bg-surface sm:block">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-surface-2 text-xs text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {onSelectionChange && (
                  <TableHead className="w-11 px-3 py-3">
                    <Checkbox
                      aria-label={messages.selectPage}
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => {
                  const column = columns.find((item) => item.id === header.column.id);
                  const isSorted = sort?.column === header.column.id;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn('whitespace-nowrap px-3 py-3 font-semibold', column?.className)}
                    >
                      {header.isPlaceholder ? null : onSortChange && column && column.sortable !== false ? (
                        <button
                          type="button"
                          onClick={() => onSort(header.column.id)}
                          className="inline-flex min-h-8 items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          aria-label={messages.sortBy(column.header)}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {isSorted
                            ? sort.direction === 'asc'
                              ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                              : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                            : <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-4">
                  <div className="space-y-3" role="status" aria-label={messages.loadingRows}>
                    {Array.from({ length: Math.min(pageSize, 5) }, (_, index) => (
                      <Skeleton key={index} className="h-10 w-full" />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ) : pageRows.length > 0 ? (
              pageRows.map((row) => (
                <TableRow key={row.id} className="transition-colors duration-150 hover:bg-surface-2/70 focus-within:bg-surface-2/70">
                  {onSelectionChange && (
                    <TableCell className="px-3 py-3">
                      <Checkbox
                        aria-label={messages.selectRow(row.id)}
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                      />
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => {
                    const column = columns.find((item) => item.id === cell.column.id);
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn('text-text', density === 'compact' ? 'px-3 py-2' : 'px-3 py-4', column?.className)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount}>
                  <EmptyState title={emptyTitle} description={emptyDescription} className="m-4 border-0" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
