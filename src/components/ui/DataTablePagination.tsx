import { getMessages } from '../../i18n';
import { Button } from './Button';

const messages = getMessages('id').common.dataTable;

export function DataTablePagination({
  totalRows,
  page,
  pageSize,
  loading,
  selectedCount,
  onPageChange,
  onPageSizeChange,
}: {
  totalRows: number;
  page: number;
  pageSize: number;
  loading: boolean;
  selectedCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalRows / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {totalRows === 0
          ? messages.noData
          : messages.rowRange((currentPage - 1) * safePageSize + 1, Math.min(currentPage * safePageSize, totalRows), totalRows)}
        {selectedCount > 0 ? ` · ${messages.selectedCount(selectedCount)}` : ''}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
          <span>{messages.rows}</span>
          <select
            value={safePageSize}
            onChange={(event) => onPageSizeChange(Number(event.currentTarget.value))}
            className="min-h-11 rounded-md border border-border-strong bg-surface px-2 text-sm text-text"
            aria-label={messages.rowsPerPage}
          >
            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button variant="outline" size="sm" disabled={currentPage <= 1 || loading} onClick={() => onPageChange(currentPage - 1)}>
          {messages.previous}
        </Button>
        <span className="min-w-20 text-center text-xs text-muted-foreground">
          {messages.page(currentPage, totalPages)}
        </span>
        <Button variant="outline" size="sm" disabled={currentPage >= totalPages || loading} onClick={() => onPageChange(currentPage + 1)}>
          {messages.next}
        </Button>
      </div>
    </div>
  );
}
