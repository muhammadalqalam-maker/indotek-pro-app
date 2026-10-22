import type ExcelJS from 'exceljs';
import { priceItemSchema, type PriceItemFormInput } from '../schemas/settings.schema';
import type { MeasurementUnit } from '../types';

export const PRICE_ITEM_IMPORT_MAX_ROWS = 500;

const columnAliases = {
  category: ['kategori', 'category'],
  code: ['kode', 'code'],
  name: ['nama', 'name'],
  unitCode: ['kode satuan', 'unit code', 'unit_code'],
  unitPrice: ['harga satuan', 'unit price', 'unit_price'],
  region: ['wilayah', 'region'],
  validFrom: ['berlaku mulai', 'valid from', 'valid_from'],
  validUntil: ['berlaku sampai', 'valid until', 'valid_until'],
  source: ['sumber harga', 'source'],
} as const;

type ColumnKey = keyof typeof columnAliases;

export type PriceItemImportIssue = {
  row: number;
  message: string;
};

export type PriceItemImportMessages = {
  emptyWorkbook: string;
  missingColumn: (column: string) => string;
  invalidCategory: (category: string) => string;
  unknownUnit: (code: string) => string;
  duplicateCode: (code: string) => string;
  maximumRows: (maximum: number) => string;
};

export type ParsedPriceItemRow = {
  row: number;
  item: PriceItemFormInput;
};

export type ParsedPriceItemWorkbook = {
  rows: ParsedPriceItemRow[];
  issues: PriceItemImportIssue[];
};

function cellString(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return String(value).trim();
  if ('text' in value && typeof value.text === 'string') return value.text.trim();
  if ('richText' in value) return value.richText.map((part) => part.text).join('').trim();
  if ('result' in value && value.result !== null && value.result !== undefined) {
    return String(value.result).trim();
  }
  return '';
}

function dateValue(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : '';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '';
  }

  const text = cellString(cell);
  const isoDate = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2].padStart(2, '0')}-${isoDate[3].padStart(2, '0')}`;
  }

  const localDate = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (localDate) {
    return `${localDate[3]}-${localDate[2].padStart(2, '0')}-${localDate[1].padStart(2, '0')}`;
  }
  return text;
}

function priceValue(cell: ExcelJS.Cell): number {
  const value = cell.value;
  if (typeof value === 'number') return value;
  const text = cellString(cell);
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return Number.NaN;
  return Number(text.replace(',', '.'));
}

function categoryValue(value: string): PriceItemFormInput['category'] | null {
  switch (value.trim().toLocaleLowerCase()) {
    case 'bahan':
    case 'material':
      return 'bahan';
    case 'upah':
    case 'labor':
      return 'upah';
    case 'alat':
    case 'equipment':
      return 'alat';
    default:
      return null;
  }
}

function findColumns(
  worksheet: ExcelJS.Worksheet,
  issues: PriceItemImportIssue[],
  messages: PriceItemImportMessages,
): Partial<Record<ColumnKey, number>> {
  const headerRow = worksheet.getRow(1);
  const columns: Partial<Record<ColumnKey, number>> = {};

  headerRow.eachCell((cell, columnNumber) => {
    const header = cellString(cell).toLocaleLowerCase();
    for (const key of Object.keys(columnAliases) as ColumnKey[]) {
      if (columnAliases[key].some((alias) => alias.toLocaleLowerCase() === header)) columns[key] = columnNumber;
    }
  });

  const requiredColumns: ColumnKey[] = ['category', 'code', 'name', 'unitCode', 'unitPrice', 'validFrom'];
  for (const column of requiredColumns) {
    if (columns[column] === undefined) {
      issues.push({ row: 1, message: messages.missingColumn(columnAliases[column][0]) });
    }
  }
  return columns;
}

export async function parsePriceItemWorkbook(
  buffer: ArrayBuffer,
  units: Pick<MeasurementUnit, 'id' | 'code' | 'deleted_at'>[],
  existingCodes: string[],
  messages: PriceItemImportMessages,
): Promise<ParsedPriceItemWorkbook> {
  const { default: ExcelJSModule } = await import('exceljs');
  const workbook = new ExcelJSModule.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], issues: [{ row: 1, message: messages.emptyWorkbook }] };
  }

  const issues: PriceItemImportIssue[] = [];
  const columns = findColumns(worksheet, issues, messages);
  if (issues.length > 0) return { rows: [], issues };

  const activeUnitsByCode = new Map(
    units.filter((unit) => !unit.deleted_at).map((unit) => [unit.code.trim().toLocaleUpperCase(), unit.id]),
  );
  const seenCodes = new Set(existingCodes.map((code) => code.trim().toLocaleUpperCase()));
  const rows: ParsedPriceItemRow[] = [];
  let nonEmptyCount = 0;

  worksheet.eachRow({ includeEmpty: false }, (worksheetRow, rowNumber) => {
    if (rowNumber === 1) return;
    let isEmpty = true;
    worksheetRow.eachCell({ includeEmpty: false }, (cell) => {
      if (cellString(cell) !== '') isEmpty = false;
    });
    if (isEmpty) return;

    nonEmptyCount += 1;
    if (nonEmptyCount > PRICE_ITEM_IMPORT_MAX_ROWS) {
      if (nonEmptyCount === PRICE_ITEM_IMPORT_MAX_ROWS + 1) {
        issues.push({ row: rowNumber, message: messages.maximumRows(PRICE_ITEM_IMPORT_MAX_ROWS) });
      }
      return;
    }

    const getCell = (key: ColumnKey) => worksheetRow.getCell(columns[key] ?? 0);
    const categoryText = cellString(getCell('category'));
    const category = categoryValue(categoryText);
    const code = cellString(getCell('code'));
    const unitCode = cellString(getCell('unitCode')).toLocaleUpperCase();
    const unitId = activeUnitsByCode.get(unitCode);
    const validFrom = dateValue(getCell('validFrom'));
    const validUntil = columns.validUntil === undefined ? '' : dateValue(getCell('validUntil'));

    const normalizedCode = code.toLocaleUpperCase();
    const isDuplicate = Boolean(normalizedCode && seenCodes.has(normalizedCode));
    if (isDuplicate) {
      issues.push({ row: rowNumber, message: messages.duplicateCode(code) });
    }
    if (normalizedCode) seenCodes.add(normalizedCode);
    if (!category) issues.push({ row: rowNumber, message: messages.invalidCategory(categoryText) });
    if (!unitId) issues.push({ row: rowNumber, message: messages.unknownUnit(unitCode) });

    const candidate = {
      category: category ?? 'bahan',
      code,
      name: cellString(getCell('name')),
      unit_id: unitId ?? '',
      unit_price: priceValue(getCell('unitPrice')),
      region: columns.region === undefined ? '' : cellString(getCell('region')),
      valid_from: validFrom,
      valid_until: validUntil,
      source: columns.source === undefined ? '' : cellString(getCell('source')),
    };
    const parsed = priceItemSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        if (!unitId && issue.path[0] === 'unit_id') continue;
        issues.push({ row: rowNumber, message: issue.message });
      }
      return;
    }
    if (category && unitId) {
      rows.push({ row: rowNumber, item: parsed.data });
    }
  });

  return { rows, issues };
}

export async function createPriceItemImportTemplate(): Promise<ArrayBuffer> {
  const { default: ExcelJSModule } = await import('exceljs');
  const workbook = new ExcelJSModule.Workbook();
  const worksheet = workbook.addWorksheet('Master Harga');
  worksheet.columns = [
    { header: 'Kategori', key: 'category', width: 16 },
    { header: 'Kode', key: 'code', width: 20 },
    { header: 'Nama', key: 'name', width: 32 },
    { header: 'Kode Satuan', key: 'unitCode', width: 18 },
    { header: 'Harga Satuan', key: 'unitPrice', width: 20 },
    { header: 'Wilayah', key: 'region', width: 22 },
    { header: 'Berlaku Mulai', key: 'validFrom', width: 18 },
    { header: 'Berlaku Sampai', key: 'validUntil', width: 18 },
    { header: 'Sumber Harga', key: 'source', width: 24 },
  ];
  worksheet.getRow(1).font = { bold: true };
  worksheet.getColumn('unitPrice').numFmt = '#,##0.00';
  worksheet.getColumn('validFrom').numFmt = 'yyyy-mm-dd';
  worksheet.getColumn('validUntil').numFmt = 'yyyy-mm-dd';
  return workbook.xlsx.writeBuffer();
}
