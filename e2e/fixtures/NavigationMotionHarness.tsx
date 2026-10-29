import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  Input,
  Select,
  Switch,
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
  const [selectedValue, setSelectedValue] = useState('alpha');
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const [isSwitchChecked, setIsSwitchChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] space-y-6 overflow-auto bg-bg p-6">
      <Button variant="outline">Simpan</Button>
      <Button variant="primary" size="md">Tombol utama</Button>
      <Button variant="accent">Tombol aksen</Button>
      <Button loading>Memproses</Button>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Judul card uji</CardTitle>
          <CardDescription>Deskripsi card uji</CardDescription>
        </CardHeader>
      </Card>
      <Badge variant="success">Status berhasil</Badge>
      <Input label="Kode uji" hint="Petunjuk input" prefix="Rp" name="test-code" />
      <form id="checkbox-form">
        <Checkbox
          label="Akses uji"
          name="test-checkbox"
          value="enabled"
          checked={isCheckboxChecked}
          onChange={(event) => setIsCheckboxChecked(event.currentTarget.checked)}
        />
      </form>
      <Checkbox label="Pilihan sebagian" indeterminate />
      <Switch
        label="Notifikasi uji"
        checked={isSwitchChecked}
        onCheckedChange={setIsSwitchChecked}
      />
      <form id="select-form">
        <Select
          label="Pilihan uji"
          hint="Pilih satu opsi"
          name="test-select"
          value={selectedValue}
          onChange={(event) => setSelectedValue(event.currentTarget.value)}
        >
          <option value="">Pilih opsi</option>
          <option value="alpha">Alpha</option>
          <option value="beta">Beta</option>
        </Select>
        <output data-testid="selected-value">{selectedValue}</output>
      </form>
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
