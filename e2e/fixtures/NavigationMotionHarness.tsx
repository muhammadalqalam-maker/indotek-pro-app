import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button,
  DataTable,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type DataTableColumn,
} from '../../src/components/ui';

type TestRow = { id: string; name: string };

const rows: TestRow[] = [{ id: 'row-1', name: 'Baris uji' }];
const columns: DataTableColumn<TestRow>[] = [
  { id: 'name', header: 'Nama', cell: (row) => row.name },
];

function NavigationMotionHarness() {
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  return (
    <div className="fixed inset-0 z-[100] space-y-6 overflow-auto bg-bg p-6">
      <Button variant="outline">Simpan</Button>
      <Button variant="primary" size="md">Tombol utama</Button>
      <Button variant="accent">Tombol aksen</Button>
      <Button loading>Memproses</Button>
      <Tabs defaultValue="summary">
        <TabsList aria-label="Bagian uji">
          <TabsTrigger value="summary">Ringkasan</TabsTrigger>
          <TabsTrigger value="activity">Aktivitas</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">Konten ringkasan</TabsContent>
        <TabsContent value="activity">Konten aktivitas</TabsContent>
      </Tabs>
      <DataTable
        columns={columns}
        onPageChange={() => undefined}
        onPageSizeChange={() => undefined}
        onSelectionChange={setSelectedRowIds}
        page={1}
        pageSize={10}
        rowKey={(row) => row.id}
        rows={rows}
        selectedRowIds={selectedRowIds}
        totalRows={rows.length}
      />
    </div>
  );
}

export function mountNavigationMotionHarness() {
  const container = document.createElement('div');
  document.body.append(container);
  createRoot(container).render(<NavigationMotionHarness />);
}
