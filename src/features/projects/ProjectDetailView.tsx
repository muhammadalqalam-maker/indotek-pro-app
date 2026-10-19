import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui';
import { getMessages } from '../../i18n';
import { Can } from '../../components/shared/Can';
import { Project, ProjectAddendum } from '../../types/database';
import { formatRupiah, formatPercent, formatDateIndo, parseRupiah } from '../../utils/format';
import {
  calculateProjectHealth,
  calculateBudgetMetrics,
  calculateTotalContractWithAddendums,
  calculateRetention,
} from '../../utils/projectCalculations';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Layers,
  MapPin,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  FileCheck2,
} from 'lucide-react';

const projectMessages = getMessages('id').projects;

export const ProjectDetailView: React.FC<{
  projectId: string;
  onEdit: (project: Project) => void;
  onBack: () => void;
}> = ({ projectId, onEdit, onBack }) => {
  const { projects, members, handleDeleteProject, handleAddAddendum, currentOrg } = useApp();
  const { toast } = useToast();
  const project = projects.find((p) => p.id === projectId);

  const [activeTab, setActiveTab] = useState<'summary' | 'addendums' | 'wbs' | 'team' | 'docs'>('summary');
  const [isAddendumModalOpen, setIsAddendumModalOpen] = useState(false);

  // New Addendum Form State
  const [addNum, setAddNum] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addAmountRaw, setAddAmountRaw] = useState('Rp 500.000.000');
  const [addDays, setAddDays] = useState('14');
  const [addDesc, setAddDesc] = useState('');

  if (!project) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="text-sm">Proyek tidak ditemukan atau telah dihapus.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
        >
          Kembali ke Daftar Proyek
        </button>
      </div>
    );
  }

  const addendums = project.addendums || [];
  const totalContract = calculateTotalContractWithAddendums(project.contract_value, addendums);
  const budgetMetrics = calculateBudgetMetrics(totalContract, project.realized_cost);
  const health = calculateProjectHealth(project.actual_progress, project.planned_progress);
  const retention = calculateRetention(totalContract, project.retention_percent);

  // Days remaining calculation
  const now = new Date();
  const end = new Date(project.end_date);
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24));

  const handleSaveAddendum = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseRupiah(addAmountRaw);
    await handleAddAddendum(project.id, {
      organization_id: project.organization_id,
      addendum_number: addNum || `ADD-0${addendums.length + 1}/${project.code}`,
      title: addTitle || 'Penambahan Lingkup Pekerjaan',
      description: addDesc,
      amount: amountNum,
      time_extension_days: parseInt(addDays, 10) || 0,
      approved_by_name: 'Ir. Bambang Suryono, MT',
    });
    setIsAddendumModalOpen(false);
    setAddTitle('');
    setAddDesc('');
  };

  const confirmDelete = async () => {
    if (confirm(`Apakah Anda yakin ingin menghapus proyek ${project.name} (${project.code})?`)) {
      try {
        await handleDeleteProject(project.id);
        toast({ title: projectMessages.deleted, variant: 'success' });
        onBack();
      } catch (error) {
        const detail = error instanceof Error ? error.message : projectMessages.deleteFailed;
        toast({ title: projectMessages.deleteFailed, description: detail, variant: 'error' });
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Kembali ke daftar proyek"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-amber-500">{project.code}</span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500">{project.category}</span>
              <span className="text-slate-400">•</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  project.status === 'active'
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                    : project.status === 'delayed'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {project.status.toUpperCase()}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {project.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Can module="projects" action="edit">
            <button
              onClick={() => onEdit(project)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Proyek</span>
            </button>
          </Can>
          <Can module="projects" action="delete">
            <button
              onClick={confirmDelete}
              className="p-2 rounded-xl border border-rose-200 dark:border-rose-950 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
              title="Hapus Proyek"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Can>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {[
          { id: 'summary', label: 'Ringkasan & Finansial', icon: Building2 },
          { id: 'addendums', label: `Amandemen / VO (${addendums.length})`, icon: FileText },
          { id: 'wbs', label: 'Jadwal & WBS', icon: Layers },
          { id: 'team', label: 'Tim Proyek', icon: Users },
          { id: 'docs', label: 'Dokumen & Legal', icon: FileCheck2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
                isActive
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SUMMARY & FINANCIALS */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Top 4 Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Nilai Kontrak Total</span>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {formatRupiah(totalContract)}
              </p>
              {addendums.length > 0 && (
                <p className="text-[10px] text-amber-500 font-semibold mt-1">
                  Termasuk {addendums.length} VO (+{formatRupiah(addendums.reduce((a, b) => a + b.amount, 0))})
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Realisasi Biaya (Cost)</span>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {formatRupiah(project.realized_cost)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Sisa Anggaran: <strong className="text-slate-700 dark:text-slate-200">{formatRupiah(budgetMetrics.remainingBudget)}</strong>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Deviasi Progres Fisik</span>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {formatPercent(project.actual_progress)}
              </p>
              <p className={`text-[10px] font-bold mt-1 ${health.badgeColor === 'rose' ? 'text-rose-500' : 'text-emerald-500'}`}>
                {health.label} (Rencana {formatPercent(project.planned_progress)})
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500">Sisa Waktu Kontrak</span>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {diffDays > 0 ? `${diffDays} Hari Kalender` : 'Lewat Tenggat'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Target Selesai: {formatDateIndo(project.end_date)}
              </p>
            </div>
          </div>

          {/* Progress Bar & Contract Details */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Status Bobot Progres Fisik Proyek
            </h3>

            {/* Progress Stack */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span>Pencapaian Riil di Lapangan</span>
                <span className="text-amber-500">{formatPercent(project.actual_progress)}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, project.actual_progress))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Target Kurva S Rencana: {formatPercent(project.planned_progress)}</span>
                <span>Sisa Bobot: {formatPercent(100 - project.actual_progress)}</span>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="space-y-2">
                <p>
                  <span className="text-slate-400">Pemberi Tugas (Klien): </span>
                  <strong className="text-slate-800 dark:text-slate-200">{project.client_name}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Nomor Kontrak/SPK: </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{project.contract_number}</span>
                </p>
                <p>
                  <span className="text-slate-400">Lokasi Pekerjaan: </span>
                  <span className="text-slate-800 dark:text-slate-200">{project.location_address}, {project.location_city}, {project.location_province}</span>
                </p>
              </div>

              <div className="space-y-2">
                <p>
                  <span className="text-slate-400">Jangka Waktu: </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {formatDateIndo(project.start_date)} s/d {formatDateIndo(project.end_date)}
                  </span>
                </p>
                <p>
                  <span className="text-slate-400">Masa Pemeliharaan: </span>
                  <span className="text-slate-800 dark:text-slate-200">{project.maintenance_days} Hari Kalender</span>
                </p>
                <p>
                  <span className="text-slate-400">Retensi Kontrak ({project.retention_percent}%): </span>
                  <strong className="text-amber-600 dark:text-amber-400">{formatRupiah(retention)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {project.notes && (
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
              <p className="font-bold text-amber-800 dark:text-amber-300">Catatan Khusus Lapangan:</p>
              <p className="text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{project.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADDENDUMS / VARIATION ORDERS */}
      {activeTab === 'addendums' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daftar Amandemen / Variation Order (VO)
              </h3>
              <p className="text-xs text-slate-500">
                Riwayat perubahan kontrak resmi yang mempengaruhi nilai dan masa pelaksanaan
              </p>
            </div>
            <Can module="projects" action="edit">
              <button
                onClick={() => {
                  setAddNum(`ADD-0${addendums.length + 1}/${project.code}`);
                  setIsAddendumModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Amandemen / VO</span>
              </button>
            </Can>
          </div>

          {addendums.length === 0 ? (
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Belum ada amandemen (Variation Order) untuk proyek ini.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addendums.map((add) => (
                <div
                  key={add.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-500">
                          {add.addendum_number}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatDateIndo(add.created_at)}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {add.title}
                      </h4>
                    </div>

                    <div className="text-right sm:shrink-0">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatRupiah(add.amount)}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Perpanjangan: +{add.time_extension_days} Hari Kalender
                      </p>
                    </div>
                  </div>

                  {add.description && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                      {add.description}
                    </p>
                  )}

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Disetujui oleh: {add.approved_by_name || 'Direktur'}</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Status: Terverifikasi
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WBS & SCHEDULE */}
      {activeTab === 'wbs' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Struktur Rincian Kerja (Work Breakdown Structure)
              </h3>
              <p className="text-xs text-slate-500">Bobot divisi pekerjaan dan capaian riil</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Total Bobot: 100,00%</span>
          </div>

          <div className="space-y-3">
            {[
              { div: 'DIVISI 1', name: 'Pekerjaan Persiapan, K3 & Pengukuran', bobot: 5.5, realisasi: 100 },
              { div: 'DIVISI 2', name: 'Pekerjaan Tanah, Pondasi & Struktur Bawah', bobot: 28.0, realisasi: 95 },
              { div: 'DIVISI 3', name: 'Pekerjaan Struktur Atas (Kolom, Balok, Plat Lantai)', bobot: 36.5, realisasi: 42 },
              { div: 'DIVISI 4', name: 'Pekerjaan Arsitektur, Dinding & Finishing', bobot: 18.0, realisasi: 10 },
              { div: 'DIVISI 5', name: 'Pekerjaan Mekanikal, Elektrikal & Plumbing (MEP)', bobot: 12.0, realisasi: 8 },
            ].map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div>
                    <span className="font-mono text-amber-500 font-bold mr-2">{item.div}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Bobot: {item.bobot}%</span>
                    <span className="ml-3 font-bold text-amber-600 dark:text-amber-400">{item.realisasi}% Selesai</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${item.realisasi}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TEAM */}
      {activeTab === 'team' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-sm">
              PM
            </div>
            <div>
              <p className="text-xs text-slate-400">Project Manager (PM)</p>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                {project.project_manager_name
                  || members.find((member) => member.user_id === project.project_manager_id)?.user?.full_name
                  || projectMessages.unassigned}
              </h4>
              <p className="text-[10px] text-slate-500">Penanggung jawab operasional & budget</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold text-sm">
              SM
            </div>
            <div>
              <p className="text-xs text-slate-400">Site Manager Lapangan</p>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                {project.site_manager_name
                  || members.find((member) => member.user_id === project.site_manager_id)?.user?.full_name
                  || projectMessages.unassigned}
              </h4>
              <p className="text-[10px] text-slate-500">Pelaksana harian & logistik lapangan</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DOCS */}
      {activeTab === 'docs' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Dokumen Legalitas & Kontrak Konstruksi
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Surat Perjanjian Kontrak (SPK)</p>
                <p className="text-[10px] text-slate-400 font-mono">{project.contract_number}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                Tertandatangani
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Jaminan Pelaksanaan (Bank Garansi)</p>
                <p className="text-[10px] text-slate-400">Nilai: 5% dari Kontrak</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 font-semibold">
                Aktif
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Gambar Kerja DED & Rencana Kerja Syarat (RKS)</p>
                <p className="text-[10px] text-slate-400">Revisi Final Rev.2</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                Tersimpan di Storage
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ADDENDUM MODAL */}
      {isAddendumModalOpen && (
        <Can module="projects" action="edit">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tambah Amandemen / VO Kontrak
              </h3>
              <button
                onClick={() => setIsAddendumModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAddendum} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Addendum
                </label>
                <input
                  type="text"
                  required
                  value={addNum}
                  onChange={(e) => setAddNum(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Amandemen
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pekerjaan Tambah Kurang Struktur Zona B"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nilai Perubahan (Rp)
                  </label>
                  <input
                    type="text"
                    required
                    value={addAmountRaw}
                    onChange={(e) => setAddAmountRaw(formatRupiah(parseRupiah(e.target.value)))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tambah Hari Kalender
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addDays}
                    onChange={(e) => setAddDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Justifikasi Teknis
                </label>
                <textarea
                  rows={2}
                  placeholder="Alasan perubahan spesifikasi atau penyesuaian lapangan..."
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddendumModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 font-bold text-slate-950 text-xs shadow"
                >
                  Simpan Amandemen
                </button>
              </div>
            </form>
          </div>
        </div>
        </Can>
      )}
    </div>
  );
};
