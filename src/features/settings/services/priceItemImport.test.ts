import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ExcelJS from 'exceljs';
import {
  createPriceItemImportTemplate,
  parsePriceItemWorkbook,
  type PriceItemImportMessages,
} from './priceItemImport';

const unitId = '11111111-1111-4111-8111-111111111111';
const headers = [
  'Kategori',
  'Kode',
  'Nama',
  'Kode Satuan',
  'Harga Satuan',
  'Wilayah',
  'Berlaku Mulai',
  'Berlaku Sampai',
  'Sumber Harga',
];
const messages: PriceItemImportMessages = {
  emptyWorkbook: 'empty workbook',
  missingColumn: (column) => `missing column: ${column}`,
  invalidCategory: (category) => `invalid category: ${category}`,
  unknownUnit: (code) => `unknown unit: ${code}`,
  duplicateCode: (code) => `duplicate code: ${code}`,
  maximumRows: (maximum) => `maximum rows: ${maximum}`,
};

async function createWorkbook(rows: unknown[][]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Prices');
  worksheet.addRow(headers);
  for (const row of rows) worksheet.addRow(row);
  return workbook.xlsx.writeBuffer();
}

describe('price item Excel import', () => {
  it('parses a valid row and resolves its unit by code', async () => {
    const buffer = await createWorkbook([[
      'bahan',
      'mat-001',
      'Semen Portland',
      'm3',
      125000.5,
      'Jawa Barat',
      '19/10/2026',
      '',
      'Survei pemasok',
    ]]);
    const result = await parsePriceItemWorkbook(
      buffer,
      [{ id: unitId, code: 'M3', deleted_at: null }],
      [],
      messages,
    );

    assert.equal(result.issues.length, 0);
    assert.equal(result.rows.length, 1);
    assert.deepEqual(result.rows[0].item, {
      category: 'bahan',
      code: 'MAT-001',
      name: 'Semen Portland',
      unit_id: unitId,
      unit_price: 125000.5,
      region: 'Jawa Barat',
      valid_from: '2026-10-19',
      valid_until: '',
      source: 'Survei pemasok',
    });
  });

  it('rejects existing codes, in-file duplicates, and unknown units', async () => {
    const buffer = await createWorkbook([
      ['alat', 'OLD', 'Excavator', 'M3', 1000, '', '2026-10-01', '', ''],
      ['upah', 'EQ-02', 'Operator', 'UNIT-X', 500, '', '2026-10-01', '', ''],
      ['upah', 'EQ-02', 'Operator cadangan', 'M3', 600, '', '2026-10-01', '', ''],
    ]);
    const result = await parsePriceItemWorkbook(
      buffer,
      [{ id: unitId, code: 'M3', deleted_at: null }],
      ['OLD'],
      messages,
    );

    assert.equal(result.rows.length, 2);
    assert.equal(result.issues.length, 3);
    assert.match(result.issues[0].message, /duplicate code/);
    assert.match(result.issues[1].message, /unknown unit/);
    assert.match(result.issues[2].message, /duplicate code/);
  });

  it('reports missing required columns before processing rows', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Invalid').addRow(['Kode', 'Nama']);
    const buffer = await workbook.xlsx.writeBuffer();
    const result = await parsePriceItemWorkbook(buffer, [], [], messages);

    assert.equal(result.rows.length, 0);
    assert.equal(result.issues.length, 4);
  });

  it('blocks rows with invalid category, date, or price values', async () => {
    const result = await parsePriceItemWorkbook(
      await createWorkbook([['peralatan', 'BAD-01', 'Item tidak valid', 'M3', -1, '', '2026-02-30', '', '']]),
      [{ id: unitId, code: 'M3', deleted_at: null }],
      [],
      messages,
    );

    assert.equal(result.rows.length, 0);
    assert.ok(result.issues.some((issue) => issue.message.includes('invalid category')));
    assert.ok(result.issues.some((issue) => issue.message.includes('negatif')));
    assert.ok(result.issues.some((issue) => issue.message.toLocaleLowerCase().includes('tanggal')));
  });

  it('creates an empty template with the import headers', async () => {
    const buffer = await createPriceItemImportTemplate();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    headers.forEach((header, index) => {
      assert.equal(workbook.worksheets[0].getRow(1).getCell(index + 1).text, header);
    });
  });

  it('caps imports at 500 non-empty rows', async () => {
    const data = Array.from({ length: 501 }, (_, index) => [
      'bahan',
      `MAT-${String(index).padStart(3, '0')}`,
      `Material ${index}`,
      'M3',
      1000,
      '',
      '2026-10-01',
      '',
      '',
    ]);
    const result = await parsePriceItemWorkbook(
      await createWorkbook(data),
      [{ id: unitId, code: 'M3', deleted_at: null }],
      [],
      messages,
    );

    assert.equal(result.rows.length, 500);
    assert.equal(result.issues.length, 1);
    assert.match(result.issues[0].message, /maximum rows/);
  });
});
