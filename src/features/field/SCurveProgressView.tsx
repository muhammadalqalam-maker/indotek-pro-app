import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatPercent, formatRupiah, formatDateIndo } from '../../utils/format';
import { calculateEffectiveProjectContractValue } from '../../utils/projectCalculations';
import { calculateEarnedValue } from '../../utils/constructionCalculations';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Edit,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Area,
  ComposedChart,
  Bar,
} from 'recharts';

export const SCurveProgressView: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { scurvePoints, handleUpdateSCurve, projects, isDark } = useApp();
  const project = projects.find((p) => p.id === projectId) || projects[0];

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);
  const [inputWeeklyActual, setInputWeeklyActual] = useState('');
  const [inputCumulativeActual, setInputCumulativeActual] = useState('');

  const contractVal = project
    ? calculateEffectiveProjectContractValue(project) || 48500000000
    : 48500000000;
  const currentActual = project?.actual_progress || 48.0;
  const currentPlanned = project?.planned_progress || 46.5;
  const earnedValue = calculateEarnedValue(contractVal, currentActual);

  const openUpdateModal = (week: any) => {
    setSelectedWeek(week);
    setInputWeeklyActual(String(week.actual_weekly_percent ?? week.planned_weekly_percent));
    setInputCumulativeActual(String(week.actual_cumulative_percent ?? week.planned_cumulative_percent));
    setIsUpdateModalOpen(true);
  };

  const handleSaveOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWeek) return;
    const weeklyNum = parseFloat(inputWeeklyActual) || 0;
    const cumNum = parseFloat(inputCumulativeActual) || 0;
    await handleUpdateSCurve(selectedWeek.id, weeklyNum, cumNum);
    setIsUpdateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards: Earned Value & Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500">Nilai Prestasi Pekerjaan (Earned Value)</span>
          <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatRupiah(earnedValue)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Berdasarkan progres fisik terpasang {formatPercent(currentActual)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500">Kumulatif Progres Fisik</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg sm:text-xl font-black text-amber-500">
              {formatPercent(currentActual)}
            </span>
            <span className="text-xs text-slate-400">
              (Rencana {formatPercent(currentPlanned)})
            </span>
          </div>
          <p className="text-[10px] font-bold text-emerald-500 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> Deviasi +{(currentActual - currentPlanned).toFixed(1)}% (Lebih Cepat)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500">Siklus Periode Opname</span>
          <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            Minggu ke-14
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Dari total 48 minggu durasi kontrak
          </p>
        </div>
      </div>

      {/* S-Curve Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Grafik Kurva S Kumulatif (Rencana vs Realisasi %)
            </h3>
            <p className="text-xs text-slate-500">Monitoring deviasi bobot waktu dan jadwal kritis</p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={scurvePoints} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={isDark ? 0.1 : 0.4} />
              <XAxis dataKey="week_label" tick={{ fontSize: 10 }} />
              <YAxis unit="%" tick={{ fontSize: 10 }} domain={[0, 60]} />
              <Tooltip
                formatter={(val: any) => [val !== null ? `${val}%` : 'Belum opname', '']}
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  fontSize: '12px',
                  borderRadius: '8px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="planned_cumulative_percent"
                name="Rencana Kumulatif (%)"
                stroke="#64748b"
                fill="#94a3b8"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="actual_cumulative_percent"
                name="Realisasi Aktual Kumulatif (%)"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f59e0b' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* S-Curve Weekly Breakdown Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Tabel Evaluasi Opname Mingguan
          </span>
          <span className="text-[10px] text-slate-400">Klik "Input Opname" untuk mencatat progres</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Minggu</th>
                <th className="px-4 py-2.5">Periode Tanggal</th>
                <th className="px-4 py-2.5 text-right">Rencana Mgg</th>
                <th className="px-4 py-2.5 text-right">Rencana Kum</th>
                <th className="px-4 py-2.5 text-right">Aktual Mgg</th>
                <th className="px-4 py-2.5 text-right">Aktual Kum</th>
                <th className="px-4 py-2.5 text-right">Deviasi</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
              {scurvePoints.map((w) => {
                const hasActual = w.actual_cumulative_percent !== null && w.actual_cumulative_percent !== undefined;
                const dev = hasActual ? w.deviation_percent : null;

                return (
                  <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-bold font-mono text-slate-900 dark:text-white">
                      Mgg {w.week_number}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {formatDateIndo(w.start_date)} - {formatDateIndo(w.end_date)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                      {w.planned_weekly_percent}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {w.planned_cumulative_percent}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {hasActual ? `${w.actual_weekly_percent}%` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400 font-black">
                      {hasActual ? `${w.actual_cumulative_percent}%` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold">
                      {hasActual ? (
                        <span className={dev! >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {dev! >= 0 ? `+${dev}%` : `${dev}%`}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {hasActual ? (
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            dev! >= 0
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {dev! >= 0 ? 'Lebih Cepat' : 'Terlambat'}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400">Belum Terjadi</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openUpdateModal(w)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold"
                      >
                        Input Opname
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INPUT OPNAME */}
      {isUpdateModalOpen && selectedWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Input Opname Progres Fisik
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Minggu {selectedWeek.week_number} ({selectedWeek.week_label})
            </p>

            <form onSubmit={handleSaveOpname} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Capaian Minggu Ini (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={inputWeeklyActual}
                  onChange={(e) => setInputWeeklyActual(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Capaian Kumulatif (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={inputCumulativeActual}
                  onChange={(e) => setInputCumulativeActual(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-black text-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Rencana Kumulatif: {selectedWeek.planned_cumulative_percent}%
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 font-bold text-slate-950 text-xs shadow"
                >
                  Simpan Opname
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
