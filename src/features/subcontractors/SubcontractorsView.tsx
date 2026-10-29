import { SubcontractorsWorkspace } from './SubcontractorsWorkspace';
import { PageHeader, PageShell } from '../../components/ui';
import { useApp } from '../../context/AppContext';

export function SubcontractorsView() {
  const { currentOrg, isSupabaseLive } = useApp();
  const showFallbackHeader = !currentOrg || !isSupabaseLive;
  return (
    <PageShell
      className="mx-auto max-w-6xl"
      header={showFallbackHeader ? (
        <PageHeader
          title="Subkontraktor & SPK"
          description="Kelola rekanan, SPK, opname periodik, retensi, dan potongan."
        />
      ) : undefined}
    >
      <SubcontractorsWorkspace />
    </PageShell>
  );
}
