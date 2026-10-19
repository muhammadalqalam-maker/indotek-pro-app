import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { formatRupiah, formatPercent } from '../../utils/format';
import { calculateEffectiveProjectContractValue } from '../../utils/projectCalculations';
import { calculateItemTotal, calculateItemWeight, calculateBOQSummary } from '../../utils/constructionCalculations';
import { ProjectBOQItem } from '../../types/database';
import { AhspPanel } from './components/AhspPanel';
import {
  Calculator,
  Plus,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  FileText,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Tag,
  Wrench,
  Users,
  HardHat,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Printer,
  Sparkles,
} from 'lucide-react';

export const RabBoqView: React.FC = () => {
  const rabMessages = getMessages().rab;
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    resources,
    ahspTemplates,
    activeBoq,
    boqItems,
    handleAddBOQItem,
    handleUpdateBOQProgress,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'boq' | 'ahsp' | 'resources'>('boq');
  const [selectedBoqVersion, setSelectedBoqVersion] = useState<'rev0' | 'rev1'>('rev0');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedDivisions, setCollapsedDivisions] = useState<Record<string, boolean>>({});

  // New BOQ Item Form State
  const [divCode, setDivCode] = useState('DIV-3');
  const [divName, setDivName] = useState('Pekerjaan Struktur Atas (Upper-Structure)');
  const [itemCode, setItemCode] = useState('3.4');
  const [desc, setDesc] = useState('');
  const [unit, setUnit] = useState('m3');
  const [volume, setVolume] = useState('100');
  const [unitPrice, setUnitPrice] = useState('1500000');
  const [selectedTemplateCode, setSelectedTemplateCode] = useState('');

  // Project active
  const activeProject =
    projects.find((p) => p.id === (selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id)) ||
    projects[0];

  // Group BOQ items by division
  const groupedItems = boqItems.reduce((acc: Record<string, { name: string; items: ProjectBOQItem[] }>, item) => {
    if (!acc[item.division_code]) {
      acc[item.division_code] = {
        name: item.division_name,
        items: [],
      };
    }
    acc[item.division_code].items.push(item);
    return acc;
  }, {});

  // Calculate totals
  const totalDirectCost = boqItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const boqSummary = calculateBOQSummary(totalDirectCost, 10, 11);

  const toggleDivision = (code: string) => {
    setCollapsedDivisions((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleSelectTemplate = (code: string) => {
    setSelectedTemplateCode(code);
    const tmpl = ahspTemplates.find((t) => t.code === code);
    if (tmpl) {
      setDesc(tmpl.title);
      setUnit(tmpl.unit);
      setUnitPrice(String(tmpl.unit_price));
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBoq || !activeProject) return;

    const volNum = parseFloat(volume) || 0;
    const priceNum = parseFloat(unitPrice) || 0;
    const totalPrice = calculateItemTotal(volNum, priceNum);
    const totalProj = calculateEffectiveProjectContractValue(activeProject) || 48500000000;
    const weight = calculateItemWeight(totalPrice, totalProj);

    await handleAddBOQItem({
      organization_id: activeBoq.organization_id,
      boq_id: activeBoq.id,
      project_id: activeProject.id,
      division_code: divCode,
      division_name: divName,
      item_code: itemCode,
      description: desc,
      unit,
      volume: volNum,
      unit_price: priceNum,
      total_price: totalPrice,
      weight_percent: weight,
      installed_volume: 0,
      installed_percent: 0,
    });

    setIsAddItemModalOpen(false);
    setDesc('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-amber-500">{activeProject?.code}</span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500">{activeProject?.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
            Rencana Anggaran Biaya (RAB) & AHSP
          </h1>
          <p className="text-xs text-slate-500">
            Bill of Quantities hierarki divisi, koefisien analisa SNI PUPR, dan kalkulasi bobot otomatis
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Project switch */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 max-w-[200px]"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveSubTab('boq')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeSubTab === 'boq'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Bill of Quantities (BOQ Proyek)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ahsp')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeSubTab === 'ahsp'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>{rabMessages.tabAhsp}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('resources')}
          className={`flex shrink-0 items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
            activeSubTab === 'resources'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Master Harga (Bahan, Upah, Alat)</span>
        </button>
      </div>

      {/* SUB-TAB 1: BOQ HIERARCHY */}
      {activeSubTab === 'boq' && (
        <div className="space-y-6">
          {/* Top Control Bar: Versioning & Add Item */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Versi RAB:</span>
              <button
                onClick={() => setSelectedBoqVersion('rev0')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedBoqVersion === 'rev0'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Rev 0 (Kontrak Awal)
              </button>
              <button
                onClick={() => setSelectedBoqVersion('rev1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedBoqVersion === 'rev1'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                Rev 1 (Pelaksanaan + VO)
              </button>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center gap-1 ml-2">
                <CheckCircle2 className="w-3 h-3" /> Approved by Owner
              </span>
            </div>

            <button
              onClick={() => setIsAddItemModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Item Pekerjaan</span>
            </button>
          </div>

          {/* BOQ Table per Division */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 w-16">No</th>
                    <th className="px-4 py-3">Uraian Pekerjaan</th>
                    <th className="px-4 py-3 text-center">Sat</th>
                    <th className="px-4 py-3 text-right">Volume</th>
                    <th className="px-4 py-3 text-right">Harga Satuan (Rp)</th>
                    <th className="px-4 py-3 text-right">Jumlah Harga (Rp)</th>
                    <th className="px-4 py-3 text-right">Bobot (%)</th>
                    <th className="px-4 py-3 text-right">Progres Riil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(groupedItems).map(([divKey, group]) => {
                    const isCollapsed = collapsedDivisions[divKey];
                    const divSubtotal = group.items.reduce((s, i) => s + i.total_price, 0);
                    const divWeight = group.items.reduce((s, i) => s + i.weight_percent, 0);

                    return (
                      <React.Fragment key={divKey}>
                        {/* Division Header Row */}
                        <tr
                          onClick={() => toggleDivision(divKey)}
                          className="bg-slate-100/70 dark:bg-slate-800/80 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                        >
                          <td className="px-4 py-2.5 font-bold font-mono text-amber-600 dark:text-amber-400">
                            {isCollapsed ? <ChevronRight className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                          </td>
                          <td colSpan={4} className="px-4 py-2.5 font-extrabold text-slate-900 dark:text-white">
                            {divKey} - {group.name}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-right text-slate-900 dark:text-white">
                            {formatRupiah(divSubtotal)}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-right text-amber-600 dark:text-amber-400">
                            {formatPercent(divWeight)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[10px] text-slate-500">
                            {group.items.length} Item
                          </td>
                        </tr>

                        {/* Division Items */}
                        {!isCollapsed &&
                          group.items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-3 font-mono text-slate-400 pl-8">{item.item_code}</td>
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-900 dark:text-white">{item.description}</p>
                              </td>
                              <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-300 font-mono">
                                {item.unit}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                {item.volume.toLocaleString('id-ID')}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                                {formatRupiah(item.unit_price, false)}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                                {formatRupiah(item.total_price)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                                {item.weight_percent.toFixed(2).replace('.', ',')}%
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {item.installed_percent}%
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  ({item.installed_volume} {item.unit})
                                </span>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Tax Recap Box */}
            <div className="p-6 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800">
              <div className="max-w-md ml-auto space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Subtotal Biaya Langsung (Direct Cost):</span>
                  <span className="font-mono font-bold">{formatRupiah(boqSummary.directCost)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Jasa Konstruksi & Overhead (10%):</span>
                  <span className="font-mono font-bold">{formatRupiah(boqSummary.overheadProfitAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-200 font-semibold border-t border-slate-200 dark:border-slate-800 pt-1.5">
                  <span>Total Sebelum PPN:</span>
                  <span className="font-mono">{formatRupiah(boqSummary.costBeforeTax)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>PPN 11% (UU HPP):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{formatRupiah(boqSummary.ppnAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-amber-600 dark:text-amber-400 border-t-2 border-amber-500 pt-2">
                  <span>TOTAL NILAI KONTRAK (RAB):</span>
                  <span className="font-mono">{formatRupiah(boqSummary.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'ahsp' && <AhspPanel />}

      {/* SUB-TAB 3: MASTER HARGA SATUAN DASAR */}
      {activeSubTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Master Harga Satuan Bahan, Upah & Alat
              </h3>
              <p className="text-xs text-slate-500">Standar harga pasar dan jurnal upah konstruksi 2026</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Upah */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-amber-600">
                <Users className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Upah Tenaga Kerja</h4>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {resources
                  .filter((r) => r.category === 'upah')
                  .map((r) => (
                    <div key={r.id} className="py-2 flex justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{r.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">{formatRupiah(r.unit_price)}</p>
                        <span className="text-[10px] text-slate-400">/{r.unit}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Bahan */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-blue-600">
                <Tag className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Material & Bahan</h4>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {resources
                  .filter((r) => r.category === 'bahan')
                  .map((r) => (
                    <div key={r.id} className="py-2 flex justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{r.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">{formatRupiah(r.unit_price)}</p>
                        <span className="text-[10px] text-slate-400">/{r.unit}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Alat */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-purple-600">
                <Wrench className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Sewa Alat Konstruksi</h4>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {resources
                  .filter((r) => r.category === 'alat')
                  .map((r) => (
                    <div key={r.id} className="py-2 flex justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{r.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">{formatRupiah(r.unit_price)}</p>
                        <span className="text-[10px] text-slate-400">/{r.unit}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH ITEM BOQ */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Tambah Item Pekerjaan ke BOQ
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pilih dari template AHSP atau isi uraian & harga analisa baru
            </p>

            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Pilih dari Master AHSP SNI (Opsional)</label>
                <select
                  value={selectedTemplateCode}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                >
                  <option value="">-- Input Manual atau Pilih Template --</option>
                  {ahspTemplates.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} - {t.title} ({formatRupiah(t.unit_price)}/{t.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Divisi Pekerjaan</label>
                  <select
                    value={divCode}
                    onChange={(e) => {
                      setDivCode(e.target.value);
                      if (e.target.value === 'DIV-1') setDivName('Pekerjaan Persiapan & K3');
                      if (e.target.value === 'DIV-2') setDivName('Pekerjaan Struktur Bawah');
                      if (e.target.value === 'DIV-3') setDivName('Pekerjaan Struktur Atas');
                      if (e.target.value === 'DIV-4') setDivName('Pekerjaan Arsitektur & Finishing');
                      if (e.target.value === 'DIV-5') setDivName('Pekerjaan MEP');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  >
                    <option value="DIV-1">DIV-1 (Persiapan & K3)</option>
                    <option value="DIV-2">DIV-2 (Struktur Bawah)</option>
                    <option value="DIV-3">DIV-3 (Struktur Atas)</option>
                    <option value="DIV-4">DIV-4 (Arsitektur)</option>
                    <option value="DIV-5">DIV-5 (MEP)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Nomor Item / Kode</label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Uraian Pekerjaan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pengecoran Plat Lantai 14 Beton K-350"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Volume</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 font-bold text-slate-950 text-xs shadow"
                >
                  Tambahkan ke BOQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
