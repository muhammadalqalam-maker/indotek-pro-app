import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useSearchParams } from 'react-router-dom';
import {
  Button,
  DataTable,
  FilterChips,
  LoadingState,
  OfflineState,
  PageHeader,
  PageShell,
  useDataTableUrlState,
} from '../../src/components/ui';
import { RouteStatusPage } from '../../src/components/shared/RouteStatusPage';

type WorkItem = {
  id: string;
  name: string;
  status: 'berjalan' | 'tertunda' | 'selesai';
  project: string;
};

function FilterChipsHarness() {
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('pending');
  const [notification, setNotification] = useState('all');
  const [period, setPeriod] = useState('weekly');

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <PageShell header={<PageHeader title="Filter chips" />}>
        <div className="grid gap-6">
          <fieldset className="grid min-w-0 gap-2">
            <legend className="text-sm font-medium text-text">Dokumen</legend>
            <FilterChips
              label="Kategori dokumen"
              value={category}
              options={[
                { value: 'all', label: 'Semua kategori' },
                { value: 'contract', label: 'Kontrak & SPK' },
                { value: 'drawing', label: 'Gambar kerja (DED)' },
                { value: 'shop', label: 'Shop drawing' },
                { value: 'as-built', label: 'As-built drawing' },
                { value: 'rfi', label: 'Klarifikasi (RFI)' },
                { value: 'minutes', label: 'Berita acara (BAST)' },
                { value: 'safety', label: 'Laporan K3 & lingkungan' },
              ]}
              onValueChange={setCategory}
            />
          </fieldset>
          <fieldset className="grid min-w-0 gap-2">
            <legend className="text-sm font-medium text-text">Approval</legend>
            <FilterChips
              label="Status approval"
              value={status}
              options={[
                { value: 'pending', label: 'Menunggu', trailing: 12 },
                { value: 'approved', label: 'Disetujui' },
                { value: 'rejected', label: 'Ditolak' },
                { value: 'all', label: 'Semua' },
              ]}
              onValueChange={setStatus}
            />
          </fieldset>
          <fieldset className="grid min-w-0 gap-2">
            <legend className="text-sm font-medium text-text">Notifikasi</legend>
            <FilterChips
              label="Filter notifikasi"
              value={notification}
              options={[
                { value: 'all', label: 'Semua' },
                { value: 'unread', label: 'Belum dibaca' },
              ]}
              onValueChange={setNotification}
            />
          </fieldset>
          <fieldset className="grid min-w-0 gap-2">
            <legend className="text-sm font-medium text-text">Periode laporan</legend>
            <FilterChips
              label="Jenis periode"
              value={period}
              options={[
                { value: 'weekly', label: 'Mingguan' },
                { value: 'monthly', label: 'Bulanan' },
              ]}
              onValueChange={setPeriod}
            />
          </fieldset>
        </div>
      </PageShell>
    </main>
  );
}

const workItems: WorkItem[] = Array.from({ length: 24 }, (_, index) => ({
  id: `task-${index + 1}`,
  name: `Pekerjaan ${String(index + 1).padStart(2, '0')}`,
  status: (['berjalan', 'tertunda', 'selesai'] as const)[index % 3],
  project: `Proyek ${String((index % 4) + 1).padStart(2, '0')}`,
}));

function TablePatternsHarness() {
  const [searchParams] = useSearchParams();
  const urlState = useDataTableUrlState({ tableId: 'tasks', defaultPageSize: 10 });
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const view = searchParams.get('view');

  const filteredItems = useMemo(() => {
    const query = urlState.searchValue.trim().toLocaleLowerCase('id-ID');
    const selectedStatuses = urlState.filterValues.status ?? [];
    const matchingItems = workItems.filter((item) => {
      const matchesQuery = !query
        || `${item.name} ${item.project}`.toLocaleLowerCase('id-ID').includes(query);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(item.status);
      return matchesQuery && matchesStatus;
    });

    if (!urlState.sort) return matchingItems;
    return matchingItems.toSorted((left, right) => {
      const comparison = left[urlState.sort?.column === 'status' ? 'status' : 'name']
        .localeCompare(right[urlState.sort?.column === 'status' ? 'status' : 'name']);
      return urlState.sort?.direction === 'desc' ? -comparison : comparison;
    });
  }, [urlState.filterValues.status, urlState.searchValue, urlState.sort]);

  if (view === 'filters') return <FilterChipsHarness />;
  if (view === 'loading') return <LoadingState label="Memuat daftar pekerjaan" />;
  if (view === 'offline') return <OfflineState />;
  if (view === 'forbidden') return <RouteStatusPage status="forbidden" />;

  const visibleItems = filteredItems.slice(
    (urlState.page - 1) * urlState.pageSize,
    urlState.page * urlState.pageSize,
  );

  return (
    <div className="min-h-screen bg-background p-4 text-foreground sm:p-6">
      <PageShell
        header={(
          <PageHeader
            title="Daftar pekerjaan"
            description="Pantau pekerjaan proyek dan kelola tindak lanjut."
            actions={<Button>Tambah pekerjaan</Button>}
          />
        )}
      >
        <DataTable
          {...urlState}
          columns={[
            {
              id: 'name',
              header: 'Pekerjaan',
              cell: (item) => item.name,
              exportValue: (item) => item.name,
              sortable: true,
            },
            {
              id: 'status',
              header: 'Status',
              cell: (item) => item.status,
              exportValue: (item) => item.status,
              sortable: true,
              hideable: true,
            },
            {
              id: 'project',
              header: 'Proyek',
              cell: (item) => item.project,
              exportValue: (item) => item.project,
              hideable: true,
            },
          ]}
          rows={visibleItems}
          totalRows={filteredItems.length}
          rowKey={(item) => item.id}
          facets={[{
            id: 'status',
            label: 'Status',
            options: [
              { label: 'Berjalan', value: 'berjalan' },
              { label: 'Tertunda', value: 'tertunda' },
              { label: 'Selesai', value: 'selesai' },
            ],
          }]}
          selectedRowIds={selectedRowIds}
          onSelectionChange={setSelectedRowIds}
          bulkActions={(ids, _selectedItems, clearSelection) => (
            <Button variant="outline" onClick={() => { clearSelection(); }}>
              Arsipkan {ids.length}
            </Button>
          )}
          toolbar={<Button variant="outline">Aksi lainnya</Button>}
          exportFileName="pekerjaan"
          emptyDescription="Coba ubah pencarian atau filter yang dipilih."
        />
      </PageShell>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TablePatternsHarness />
    </BrowserRouter>
  </StrictMode>,
);
