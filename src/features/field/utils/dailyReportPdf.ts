import { jsPDF } from 'jspdf';
import { formatTanggal, formatVolume } from '../../../utils/format';
import type { DailyReportPeriodEntry } from '../services/dailyReport.service';

export type DailyReportPdfOptions = {
  projectCode: string;
  projectName: string;
  startDate: string;
  endDate: string;
  reports: DailyReportPeriodEntry[];
  labels: {
    title: string;
    period: string;
    reportCount: string;
    workforce: string;
    equipmentCount: string;
    materialCount: string;
    report: string;
    siteManager: string;
    weather: string;
    workSummary: string;
    manpower: string;
    equipment: string;
    materials: string;
    obstacles: string;
    solutions: string;
    noDetails: string;
  };
};

function cleanPdfText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim() || '-';
}

function addWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5,
): number {
  const lines = pdf.splitTextToSize(cleanPdfText(text), maxWidth);
  for (const line of lines) {
    if (y > 275) {
      pdf.addPage();
      y = 18;
    }
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function createDailyReportPdf(options: DailyReportPdfOptions): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 16;
  const width = 178;
  const totalWorkforce = options.reports.reduce(
    (total, { manpower }) => total + manpower.reduce((dailyTotal, entry) => dailyTotal + entry.headcount, 0),
    0,
  );
  const totalEquipment = options.reports.reduce((total, { equipment }) => total + equipment.length, 0);
  const totalMaterials = options.reports.reduce((total, { materials }) => total + materials.length, 0);
  let y = 20;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  y = addWrappedText(pdf, options.labels.title, left, y, width, 8);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  y = addWrappedText(
    pdf,
    `${options.projectCode} · ${options.projectName}`,
    left,
    y + 2,
    width,
  );
  y = addWrappedText(
    pdf,
    `${options.labels.period}: ${formatTanggal(options.startDate)} - ${formatTanggal(options.endDate)}`,
    left,
    y,
    width,
  );
  y += 4;

  pdf.setFont('helvetica', 'bold');
  y = addWrappedText(
    pdf,
    `${options.labels.reportCount}: ${formatVolume(options.reports.length, 0)}  |  `
      + `${options.labels.workforce}: ${formatVolume(totalWorkforce, 0)}  |  `
      + `${options.labels.equipmentCount}: ${formatVolume(totalEquipment, 0)}  |  `
      + `${options.labels.materialCount}: ${formatVolume(totalMaterials, 0)}`,
    left,
    y,
    width,
  );
  y += 4;
  pdf.setFont('helvetica', 'normal');

  for (const [index, entry] of options.reports.entries()) {
    if (y > 260) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    y = addWrappedText(
      pdf,
      `${options.labels.report} ${index + 1} - ${formatTanggal(entry.report.report_date)}`,
      left,
      y + 2,
      width,
      6,
    );
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const sections = [
      `${options.labels.siteManager}: ${entry.report.site_manager_name}`,
      `${options.labels.weather}: ${entry.report.weather_conditions}`,
      `${options.labels.workSummary}: ${entry.report.work_summary}`,
      `${options.labels.manpower}: ${entry.manpower.map((item) => (
        `${item.trade_type} (${formatVolume(item.headcount, 0)} orang, ${formatVolume(item.work_hours)} jam)`
      )).join('; ') || options.labels.noDetails}`,
      `${options.labels.equipment}: ${entry.equipment.map((item) => (
        `${item.equipment_name} (${formatVolume(item.quantity)}; ${formatVolume(item.active_hours)} jam operasi)`
      )).join('; ') || options.labels.noDetails}`,
      `${options.labels.materials}: ${entry.materials.map((item) => (
        `${item.material_name} (${formatVolume(item.quantity)} ${item.unit})`
      )).join('; ') || options.labels.noDetails}`,
      `${options.labels.obstacles}: ${entry.report.obstacles}`,
      `${options.labels.solutions}: ${entry.report.solutions}`,
    ];
    for (const section of sections) {
      y = addWrappedText(pdf, section, left, y, width, 4.5);
    }
    y += 3;
  }

  return pdf;
}

export function downloadDailyReportPdf(options: DailyReportPdfOptions): void {
  const pdf = createDailyReportPdf(options);
  const safeProjectCode = options.projectCode.replace(/[^a-zA-Z0-9_-]/g, '-');
  pdf.save(`laporan-${safeProjectCode}-${options.startDate}-${options.endDate}.pdf`);
}
