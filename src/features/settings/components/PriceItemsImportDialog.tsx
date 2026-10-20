import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatRupiah } from '../../../utils/format';
import type { MeasurementUnit, PriceItem } from '../types';
import { createPriceItems } from '../services/settings.service';
import {
  createPriceItemImportTemplate,
  parsePriceItemWorkbook,
  PRICE_ITEM_IMPORT_MAX_ROWS,
  type ParsedPriceItemRow,
  type PriceItemImportIssue,
} from '../services/priceItemImport';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function PriceItemsImportDialog({
  open,
  onOpenChange,
  organizationId,
  units,
  existingItems,
  onImported,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  units: MeasurementUnit[];
  existingItems: PriceItem[];
  onImported: () => Promise<void>;
}) {
  const messages = getMessages().settings;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedPriceItemRow[]>([]);
  const [issues, setIssues] = useState<PriceItemImportIssue[]>([]);
  const [fileName, setFileName] = useState('');
  const [failure, setFailure] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!open) {
      setRows([]);
      setIssues([]);
      setFileName('');
      setFailure('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  const selectFile = async (file: File | undefined) => {
    setRows([]);
    setIssues([]);
    setFailure('');
    setFileName(file?.name ?? '');
    if (!file) return;
    if (!file.name.toLocaleLowerCase().endsWith('.xlsx')) {
      setFailure(messages.priceImportUnsupportedFile);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFailure(messages.priceImportFileTooLarge);
      return;
    }

    setIsParsing(true);
    try {
      const result = await parsePriceItemWorkbook(
        await file.arrayBuffer(),
        units,
        existingItems.map((item) => item.code),
        {
          emptyWorkbook: messages.priceImportEmptyWorkbook,
          missingColumn: messages.priceImportMissingColumn,
          invalidCategory: messages.priceImportInvalidCategory,
          unknownUnit: messages.priceImportUnknownUnit,
          duplicateCode: messages.priceImportDuplicateCode,
          maximumRows: messages.priceImportMaximumRows,
        },
      );
      setRows(result.rows);
      setIssues(result.issues);
      if (result.rows.length === 0 && result.issues.length === 0) {
        setFailure(messages.priceImportNoRows);
      }
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : messages.priceImportFailed);
    } finally {
      setIsParsing(false);
    }
  };

  const downloadTemplate = async () => {
    setIsDownloading(true);
    setFailure('');
    try {
      const buffer = await createPriceItemImportTemplate();
      const blob = new Blob([buffer], { type: XLSX_MIME_TYPE });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template-master-harga.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : messages.priceImportTemplateFailed);
    } finally {
      setIsDownloading(false);
    }
  };

  const importItems = async () => {
    if (rows.length === 0 || issues.length > 0) return;
    setIsSaving(true);
    setFailure('');
    try {
      await createPriceItems(organizationId, rows.map((row) => row.item));
      await onImported();
      toast({
        title: messages.priceImportSuccess(rows.length),
        variant: 'success',
      });
      onOpenChange(false);
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : messages.priceImportFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isParsing || isSaving || isDownloading;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!isBusy) onOpenChange(nextOpen); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{messages.importPriceItemsTitle}</DialogTitle>
          <DialogDescription>{messages.importPriceItemsDescription(PRICE_ITEM_IMPORT_MAX_ROWS)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col gap-3 rounded-md bg-surface-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{messages.priceImportFormatHint}</p>
            <Button variant="outline" loading={isDownloading} disabled={isBusy} onClick={() => void downloadTemplate()}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {messages.downloadPriceTemplate}
            </Button>
          </div>

          <div className="grid gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              aria-label={messages.selectPriceFile}
              disabled={isBusy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void selectFile(file);
              }}
            />
            <Button variant="secondary" disabled={isBusy} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden="true" />
              {messages.selectPriceFile}
            </Button>
            {fileName && (
              <p className="flex items-center gap-2 break-all text-sm text-muted">
                <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
                {fileName}
              </p>
            )}
            {isParsing && <p className="text-sm text-muted" role="status">{messages.priceImportParsing}</p>}
            {failure && <p className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">{failure}</p>}
          </div>

          {issues.length > 0 && (
            <section className="grid gap-2" aria-labelledby="price-import-issues-title">
              <h4 id="price-import-issues-title" className="text-sm font-semibold text-danger">
                {messages.priceImportIssuesTitle(issues.length)}
              </h4>
              <ul className="max-h-40 list-inside list-disc overflow-y-auto rounded-md border border-danger/30 p-3 text-sm text-danger">
                {issues.slice(0, 50).map((issue, index) => (
                  <li key={`${issue.row}-${index}`}>
                    {messages.priceImportRow(issue.row)}: {issue.message}
                  </li>
                ))}
              </ul>
              {issues.length > 50 && <p className="text-xs text-muted">{messages.priceImportMoreIssues(issues.length - 50)}</p>}
              <p className="text-sm text-muted">{messages.priceImportIssuesPreventSave}</p>
            </section>
          )}

          {rows.length > 0 && (
            <section className="grid gap-2" aria-labelledby="price-import-preview-title">
              <h4 id="price-import-preview-title" className="text-sm font-semibold text-text">
                {messages.priceImportPreview(rows.length)}
              </h4>
              <div className="max-h-48 overflow-auto rounded-md border border-border">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="sticky top-0 bg-surface-2 text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2">{messages.code}</th>
                      <th className="px-3 py-2">{messages.name}</th>
                      <th className="px-3 py-2">{messages.category}</th>
                      <th className="px-3 py-2">{messages.unitPrice}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.slice(0, 10).map(({ row, item }) => (
                      <tr key={row}>
                        <td className="px-3 py-2 font-mono">{item.code}</td>
                        <td className="px-3 py-2">{item.name}</td>
                        <td className="px-3 py-2">{messages.categoryNames[item.category]}</td>
                        <td className="px-3 py-2 tabular-nums">{formatRupiah(item.unit_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 10 && <p className="text-xs text-muted">{messages.priceImportPreviewRemaining(rows.length - 10)}</p>}
            </section>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isBusy} onClick={() => onOpenChange(false)}>{messages.cancel}</Button>
          <Button
            variant="accent"
            loading={isSaving}
            disabled={isBusy || rows.length === 0 || issues.length > 0}
            onClick={() => void importItems()}
          >
            {messages.importExcel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
