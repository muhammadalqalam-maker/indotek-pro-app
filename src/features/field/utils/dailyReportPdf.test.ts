import assert from 'node:assert/strict';
import test from 'node:test';
import { createDailyReportPdf } from './dailyReportPdf';
import type { DailyReportPdfOptions } from './dailyReportPdf';
import type { Tables } from '../../../types/database';

const labels: DailyReportPdfOptions['labels'] = {
  title: 'Laporan Harian Periodik',
  period: 'Periode',
  reportCount: 'Jumlah laporan',
  workforce: 'Tenaga kerja',
  equipmentCount: 'Alat',
  materialCount: 'Material',
  report: 'Laporan',
  siteManager: 'Site Manager',
  weather: 'Cuaca',
  workSummary: 'Pekerjaan',
  manpower: 'Tenaga kerja',
  equipment: 'Alat',
  materials: 'Material',
  obstacles: 'Kendala',
  solutions: 'Solusi',
  noDetails: 'Tidak ada rincian',
};

test('creates a multipage PDF for long approved-report summaries', () => {
  const report: Tables<'daily_reports'> = {
    approved_at: '2026-11-03T12:00:00Z',
    approved_by: 'user-1',
    approver_signature_path: null,
    created_at: '2026-11-03T08:00:00Z',
    created_by: 'user-1',
    deleted_at: null,
    id: 'report-1',
    obstacles: '',
    organization_id: 'org-1',
    photo_paths: [],
    project_id: 'project-1',
    report_date: '2026-11-03',
    site_manager_name: 'Site Manager',
    site_manager_signature_path: null,
    solutions: '',
    status: 'approved',
    submitted_at: '2026-11-03T10:00:00Z',
    submitted_by: 'user-1',
    updated_at: '2026-11-03T12:00:00Z',
    weather_conditions: 'Cerah',
    work_summary: 'Pengecoran lantai dua',
  };
  const pdf = createDailyReportPdf({
    projectCode: 'PRJ-01',
    projectName: 'Gedung Kantor',
    startDate: '2026-11-02',
    endDate: '2026-11-08',
    labels,
    reports: Array.from({ length: 8 }, (_, index) => ({
      report: {
        ...report,
        id: `report-${index + 1}`,
        report_date: `2026-11-${String(index + 1).padStart(2, '0')}`,
        work_summary: 'Pengecoran lantai dua dan pemasangan struktur baja. '.repeat(24),
      },
      manpower: [],
      equipment: [],
      materials: [],
    })),
  });

  const bytes = pdf.output('arraybuffer');
  const signature = new TextDecoder().decode(bytes.slice(0, 8));
  assert.equal(signature.startsWith('%PDF-'), true);
  assert.ok(pdf.getNumberOfPages() > 1);
});
