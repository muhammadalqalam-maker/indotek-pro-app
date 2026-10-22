import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import type { Project } from '../../../types/database';
import type { UserRole } from '../../../utils/permissions';
import type { WarehouseInventoryItem } from '../../warehouse/types';
import { fetchMaterialRequests } from '../services/procurement.service';
import type { MaterialRequest } from '../types';
import { MaterialRequestDialog } from './MaterialRequestDialog';

const requesterRoles: UserRole[] = ['owner', 'admin', 'project_manager', 'site_manager'];

function statusLabel(status: MaterialRequest['status']): string {
  if (status === 'approved') return 'Disetujui';
  if (status === 'rejected') return 'Ditolak';
  if (status === 'fulfilled') return 'Dipenuhi';
  if (status === 'cancelled') return 'Dibatalkan';
  return 'Menunggu PM';
}

function statusClass(status: MaterialRequest['status']): string {
  if (status === 'approved' || status === 'fulfilled') return 'bg-success-bg text-success';
  if (status === 'rejected' || status === 'cancelled') return 'bg-danger-bg text-danger';
  return 'bg-warning-bg text-warning';
}

export function MaterialRequestWorkspace({ organizationId, projects, projectId, currentRole, inventoryItems }: { organizationId: string; projects: Project[]; projectId: string; currentRole: UserRole | null; inventoryItems: WarehouseInventoryItem[] }) {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setRequests(await fetchMaterialRequests(organizationId, projectId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Permintaan material gagal dimuat.'); }
    finally { setLoading(false); }
  }, [organizationId, projectId]);
  useEffect(() => { void refresh(); }, [refresh]);
  const canRequest = currentRole !== null && requesterRoles.includes(currentRole);

  return <section className="grid gap-4">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-text">Permintaan material lapangan</h2><p className="mt-1 text-sm text-muted">Site manager mengajukan material stok. PM menyetujui sebelum gudang menindaklanjuti.</p></div>{canRequest && <button type="button" onClick={() => setDialogOpen(true)} disabled={projects.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary-700 px-4 text-sm font-semibold text-white disabled:opacity-50"><Plus className="h-4 w-4" />Buat permintaan</button>}</header>
    {loading ? <div className="grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border border-border bg-surface-2" />)}</div> : error ? <div role="alert" className="flex flex-col gap-3 rounded-lg border border-danger/30 bg-danger-bg p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-danger/30 px-3"><RefreshCw className="h-4 w-4" />Coba lagi</button></div> : requests.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center"><h3 className="font-semibold text-text">Belum ada permintaan material</h3><p className="mt-1 text-sm text-muted">Buat permintaan untuk mengirim kebutuhan lapangan ke PM.</p></div> : <div className="grid gap-3">{requests.map((request) => <article key={request.id} className="grid gap-3 rounded-xl border border-border bg-surface p-4"><header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-text">{request.request_number}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(request.status)}`}>{statusLabel(request.status)}</span></div><p className="mt-1 text-sm text-muted">{request.project_name} · {request.location_name} · {request.requester_name}</p><p className="mt-1 text-xs text-muted">Dibutuhkan: {request.required_date}</p></div><p className="text-sm text-muted">{request.purpose}</p></header><ul className="grid gap-2 rounded-lg bg-surface-2 p-3 sm:grid-cols-2">{request.items.map((item) => <li key={item.id} className="text-sm text-text"><span className="font-medium">{item.item_name}</span><span className="text-muted"> · {item.quantity} {item.unit}{item.notes ? ` · ${item.notes}` : ''}</span></li>)}</ul></article>)}</div>}
    {dialogOpen && <MaterialRequestDialog organizationId={organizationId} projects={projects} inventoryItems={inventoryItems} onClose={() => setDialogOpen(false)} onCreated={async () => { await refresh(); }} />}
  </section>;
}
