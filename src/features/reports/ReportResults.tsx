import { Download, FileSpreadsheet } from 'lucide-react';
import { Button, Card, CardContent } from '../../components/ui';
import type { ReportColumn, ReportRow } from './reportData.service';

type ReportResultsProps = {
  title: string;
  rows: ReportRow[];
  columns: ReportColumn[];
  periodLabel: string;
  projectLabel: string;
  recordCountLabel: string;
  exportExcelLabel: string;
  exportPdfLabel: string;
  exportingLabel: string;
  exporting: 'pdf' | 'excel' | null;
  columnLabel: (key: ReportColumn['key']) => string;
  cellValue: (row: ReportRow, column: ReportColumn) => string;
  onExport: (format: 'pdf' | 'excel') => void;
};

export function ReportResults({
  title,
  rows,
  columns,
  periodLabel,
  projectLabel,
  recordCountLabel,
  exportExcelLabel,
  exportPdfLabel,
  exportingLabel,
  exporting,
  columnLabel,
  cellValue,
  onExport,
}: ReportResultsProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted">{recordCountLabel}</p>
            <p className="text-2xl font-bold tabular-nums text-text">{rows.length}</p>
            <p className="text-sm text-muted">{periodLabel} · {projectLabel}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => onExport('excel')}
              loading={exporting === 'excel'}
              disabled={exporting !== null}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              {exporting === 'excel' ? exportingLabel : exportExcelLabel}
            </Button>
            <Button
              onClick={() => onExport('pdf')}
              loading={exporting === 'pdf'}
              disabled={exporting !== null}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {exporting === 'pdf' ? exportingLabel : exportPdfLabel}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent className="space-y-3 pt-4">
              <div className="min-w-0">
                <p className="break-words font-semibold text-text">{cellValue(row, columns[0])}</p>
                <p className="text-sm text-muted">
                  {cellValue(row, columns[1])} · {cellValue(row, columns[2])}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                {columns.slice(3).map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-xs text-muted">{columnLabel(column.key)}</dt>
                    <dd className="break-words font-medium text-text">{cellValue(row, column)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full table-auto border-collapse text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead className="bg-surface-2 text-xs font-semibold text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-3 py-3">{columnLabel(column.key)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                {columns.map((column) => (
                  <td key={column.key} className="max-w-md break-words px-3 py-3 text-text">
                    {cellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
