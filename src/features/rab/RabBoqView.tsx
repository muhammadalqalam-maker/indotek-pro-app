import { useState } from 'react';
import type { ReactNode } from 'react';
import { Calculator, FileSpreadsheet, Tag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { formatRupiah } from '../../utils/format';
import { Button, EmptyState, Select } from '../../components/ui';
import { AhspPanel } from './components/AhspPanel';
import { BoqPanel } from './components/BoqPanel';

type RabSubTab = 'boq' | 'ahsp' | 'resources';

export const RabBoqView = () => {
  const messages = getMessages().rab;
  const { projects, resources, selectedProjectId, setSelectedProjectId } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<RabSubTab>('boq');
  const resourcesByCategory = {
    upah: resources.filter((resource) => resource.category === 'upah'),
    bahan: resources.filter((resource) => resource.category === 'bahan'),
    alat: resources.filter((resource) => resource.category === 'alat'),
  };

  return (
    <div className="grid gap-6">
      <header className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,22rem)] sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text">{messages.boqTitle}</h1>
          <p className="mt-1 text-sm text-muted">{messages.boqDescription}</p>
        </div>
        <Select
          name="project-selector"
          label={messages.projectLabel}
          value={selectedProjectId}
          onChange={(event) => setSelectedProjectId(event.target.value)}
        >
          <option value="all">{messages.allProjectsLabel}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.code} · {project.name}</option>
          ))}
        </Select>
      </header>

      <nav className="flex gap-2 overflow-x-auto border-b border-border" aria-label={messages.rabNavigationLabel}>
        <SubTab
          active={activeSubTab === 'boq'}
          onClick={() => setActiveSubTab('boq')}
          icon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
        >
          {messages.boqTitle}
        </SubTab>
        <SubTab
          active={activeSubTab === 'ahsp'}
          onClick={() => setActiveSubTab('ahsp')}
          icon={<Calculator className="h-4 w-4" aria-hidden="true" />}
        >
          {messages.tabAhsp}
        </SubTab>
        <SubTab
          active={activeSubTab === 'resources'}
          onClick={() => setActiveSubTab('resources')}
          icon={<Tag className="h-4 w-4" aria-hidden="true" />}
        >
          {messages.masterPrices}
        </SubTab>
      </nav>

      {activeSubTab === 'boq' && <BoqPanel />}
      {activeSubTab === 'ahsp' && <AhspPanel />}
      {activeSubTab === 'resources' && (
        <div className="grid gap-4 md:grid-cols-3">
          {([
            ['upah', messages.labor],
            ['bahan', messages.material],
            ['alat', messages.equipment],
          ] as const).map(([category, label]) => (
            <section key={category} className="grid content-start gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5">
              <h2 className="border-b border-border pb-3 font-semibold text-text">{label}</h2>
              {resourcesByCategory[category].length === 0 ? (
                <EmptyState title={messages.noCatalogItems} />
              ) : (
                <ul className="divide-y divide-border">
                  {resourcesByCategory[category].map((resource) => (
                    <li key={resource.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-text">{resource.name}</p>
                        <p className="text-xs text-muted">{resource.code}</p>
                      </div>
                      <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-text">
                        {formatRupiah(resource.unit_price)}
                        <span className="block text-xs font-normal text-muted">/{resource.unit}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

function SubTab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      className={`shrink-0 rounded-none border-b-2 ${active ? 'border-primary-700' : 'border-transparent'}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {icon}
      {children}
    </Button>
  );
}
