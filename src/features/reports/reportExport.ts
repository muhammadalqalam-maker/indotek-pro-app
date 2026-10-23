import type { ReportValue, ReportValueFormat } from './reportData.service';

export type ReportExportColumn = {
  label: string;
  format: ReportValueFormat;
};

export type ReportExportCell = ReportValue | Date;

export type ReportExportOptions = {
  title: string;
  organizationName: string;
  projectLabel: string;
  periodLabel: string;
  columns: ReportExportColumn[];
  rows: ReportExportCell[][];
  fileName: string;
};

function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function cleanPdfText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim() || '-';
}

export async function downloadReportPdf(options: ReportExportOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const left = 14;
  const contentWidth = pdf.internal.pageSize.getWidth() - left * 2;
  const bottom = pdf.internal.pageSize.getHeight() - 14;
  let y = 16;

  const writeText = (text: string, bold = false, size = 9) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(cleanPdfText(text), contentWidth);
    for (const line of lines) {
      if (y > bottom) {
        pdf.addPage();
        y = 16;
      }
      pdf.text(line, left, y);
      y += size * 0.45;
    }
  };

  writeText(options.organizationName, true, 12);
  writeText(options.title, true, 16);
  writeText(options.periodLabel);
  writeText(options.projectLabel);
  y += 4;

  for (const [rowIndex, row] of options.rows.entries()) {
    if (y > bottom - 12) {
      pdf.addPage();
      y = 16;
    }
    writeText(`Catatan ${rowIndex + 1}`, true, 10);
    for (const [columnIndex, column] of options.columns.entries()) {
      writeText(`${column.label}: ${String(row[columnIndex] ?? '-')}`);
    }
    y += 3;
  }

  pdf.save(options.fileName.replace(/\.xlsx$/i, '.pdf'));
}

export async function downloadReportExcel(options: ReportExportOptions): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = options.organizationName;
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Laporan', {
    views: [{ state: 'frozen', ySplit: 5 }],
  });

  worksheet.addRow([options.organizationName]);
  worksheet.addRow([options.title]);
  worksheet.addRow([options.periodLabel]);
  worksheet.addRow([options.projectLabel]);
  worksheet.addRow(options.columns.map(({ label }) => label));
  worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(5).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF163A6A' },
  };

  for (const row of options.rows) worksheet.addRow(row);
  worksheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: Math.max(5, worksheet.rowCount), column: options.columns.length },
  };
  options.columns.forEach((column, index) => {
    const worksheetColumn = worksheet.getColumn(index + 1);
    worksheetColumn.width = Math.min(
      40,
      Math.max(column.label.length + 2, ...options.rows.map((row) => String(row[index] ?? '').length + 2), 12),
    );
    if (column.format === 'currency') worksheetColumn.numFmt = '"Rp" #,##0.00';
    if (column.format === 'number') worksheetColumn.numFmt = '#,##0.####';
    if (column.format === 'date') worksheetColumn.numFmt = 'dd mmm yyyy';
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveBlob(
    new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    options.fileName.replace(/\.pdf$/i, '.xlsx'),
  );
}
