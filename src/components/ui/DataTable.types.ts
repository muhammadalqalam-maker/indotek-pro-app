import type { ReactNode } from 'react';

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

export type DataTableFacet = {
  id: string;
  label: string;
  options: { label: string; value: string }[];
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
  facets?: DataTableFacet[];
  filterValues?: Record<string, string[]>;
  onFilterValuesChange?: (values: Record<string, string[]>) => void;
  selectedRowIds?: string[];
  onSelectionChange?: (selectedRowIds: string[]) => void;
  bulkActions?: (
    selectedRowIds: string[],
    visibleSelectedRows: Row[],
    clearSelection: () => void,
  ) => ReactNode;
  density?: 'comfortable' | 'compact';
  onDensityChange?: (density: 'comfortable' | 'compact') => void;
  exportFileName?: string;
  className?: string;
};
