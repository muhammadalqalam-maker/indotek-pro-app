import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatDateIndo, formatPercent } from '../../utils/format';
import { calculateEffectiveProjectContractValue } from '../../utils/projectCalculations';
import {
  FileText,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  Calendar,
  Building2,
  TrendingUp,
  ShieldCheck,
  Package,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const ReportsAnalyticsView: React.FC = () => {
  const {
    currentOrg,
    projects,
    purchaseOrders,
    materialStocks,
    clientInvoices,
    safetyIncidents,
    fieldWorkers,
    selectedProjectId,
  } = useApp();

  const [reportPeriod, setReportPeriod] = useState('Bulan Ini (Oktober 2026)');

  const targetProjects =
    selectedProjectId === 'all'
      ? projects
      : projects.filter((p) => p.id === selectedProjectId);

  const totalContract = targetProjects.reduce(
    (acc, project) => acc + calculateEffectiveProjectContractValue(project),
    0,
  );
  const totalCost = targetProjects.reduce((acc, p) => acc + p.realized_cost, 0);

  const exportCSV = () => {
    const headers = 'Kode Proyek,Nama Proyek,Klien,Nilai Kontrak,Realisasi Biaya,Rencana %,Realisasi %,Status\n';
    const rows = targetProjects
      .map(
        (p) =>
          `"${p.code}","${p.name}","${p.client_name}",${calculateEffectiveProjectContractValue(p)},${p.realized_cost},${p.planned_progress},${p.actual_progress},"${p.status}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_IndotekPro_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Laporan & Analitik Eksekutif
            </h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Modul N
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Laporan konsolidasi progres proyek, keuangan, pengadaan, logistik & K3 siap cetak resmi & ekspor data
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl text-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV / Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Paper / Dashboard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Letterhead */}
        <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xl">
              IKN
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {currentOrg?.name || 'PT. INDOTEK KARYA NUSANTARA'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Laporan Manajemen Konstruksi & Progres Bulanan
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500">
            <p className="font-bold text-slate-900 dark:text-white">{reportPeriod}</p>
            <p>Dicetak pada: {formatDateIndo(new Date().toISOString().split('T')[0])}</p>
          </div>
        </div>

        {/* Section 1: Ringkasan Portofolio */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>1. Ringkasan Kinerja Portofolio Proyek</span>
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Total Nilai Kontrak</span>
              <p className="font-bold text-base text-slate-900 dark:text-white mt-1">
                {formatRupiah(totalContract)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Total Realisasi Biaya</span>
              <p className="font-bold text-base text-rose-500 mt-1">{formatRupiah(totalCost)}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Estimasi Laba Kotor</span>
              <p className="font-bold text-base text-emerald-600 dark:text-emerald-400 mt-1">
                {formatRupiah(totalContract - totalCost)}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">Jam Kerja Selamat (K3)</span>
              <p className="font-bold text-base text-emerald-600 dark:text-emerald-400 mt-1">
                184.200 Jam
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Tabel Progres Proyek Detail */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span>2. Progres Fisik Riil vs Rencana & Deviasi Kurva S</span>
          </h3>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 font-bold text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="p-3">Kode & Proyek</th>
                  <th className="p-3">Klien</th>
                  <th className="p-3 text-right">Nilai SPK</th>
                  <th className="p-3 text-center">Rencana</th>
                  <th className="p-3 text-center">Realisasi</th>
                  <th className="p-3 text-center">Deviasi</th>
                  <th className="p-3">Status Evaluasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {targetProjects.map((p) => {
                  const dev = Math.round((p.actual_progress - p.planned_progress) * 10) / 10;
                  return (
                    <tr key={p.id}>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                        <span className="block text-slate-400 text-[10px]">{p.code}</span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{p.client_name}</td>
                      <td className="p-3 text-right font-medium">{formatRupiah(calculateEffectiveProjectContractValue(p))}</td>
                      <td className="p-3 text-center font-medium">{formatPercent(p.planned_progress)}</td>
                      <td className="p-3 text-center font-bold text-slate-900 dark:text-white">
                        {formatPercent(p.actual_progress)}
                      </td>
                      <td
                        className={`p-3 text-center font-bold ${
                          dev >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                        }`}
                      >
                        {dev >= 0 ? `+${dev}%` : `${dev}%`}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dev >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {dev >= 0 ? 'ON TRACK / AHEAD' : 'CRITICAL DELAY'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Ringkasan Pengadaan & Material */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-amber-500" />
              <span>Pengadaan & Purchase Order (PO)</span>
            </h4>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Total PO Diterbitkan:</span>
                <span className="font-bold text-slate-900 dark:text-white">{purchaseOrders.length} Pesanan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Komitmen Pengadaan:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatRupiah(purchaseOrders.reduce((acc, p) => acc + p.grand_total, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Material Siap / Sedang Dikirim:</span>
                <span className="text-emerald-600 font-bold">100% On Schedule</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Keselamatan Kerja & Mutu (K3 & QC)</span>
            </h4>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Insiden Berat (LTI):</span>
                <span className="font-bold text-emerald-600">0 Kasus (NIL)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Near-Miss Ditangani:</span>
                <span className="font-bold text-slate-900 dark:text-white">{safetyIncidents.length} Laporan (100% Closed)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pekerja Lapangan Aktif:</span>
                <span className="font-bold text-slate-900 dark:text-white">{fieldWorkers.length} Orang Terdaftar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-600 dark:text-slate-400">
          <div>
            <p className="text-[11px] text-slate-400">Dibuat Oleh:</p>
            <div className="h-16 flex items-center justify-center font-serif italic text-slate-400 text-sm">
              Rian Pratama, ST
            </div>
            <p className="font-bold text-slate-900 dark:text-white">Site Manager</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Diperiksa Oleh:</p>
            <div className="h-16 flex items-center justify-center font-serif italic text-slate-400 text-sm">
              Hendra Gunawan, ST
            </div>
            <p className="font-bold text-slate-900 dark:text-white">Project Manager</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Disetujui Oleh:</p>
            <div className="h-16 flex items-center justify-center font-serif italic text-slate-400 text-sm">
              Ir. Bambang Suryono, MT
            </div>
            <p className="font-bold text-slate-900 dark:text-white">Direktur Utama</p>
          </div>
        </div>
      </div>
    </div>
  );
};
