import { Calculator, FileSpreadsheet, Tag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { formatRupiah } from '../../utils/format';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  PageShell,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui';
import { AhspPanel } from './components/AhspPanel';
import { BoqPanel } from './components/BoqPanel';

export const RabBoqView = () => {
  const messages = getMessages().rab;
  const { projects, resources, selectedProjectId, setSelectedProjectId } = useApp();
  const resourcesByCategory = {
    upah: resources.filter((resource) => resource.category === 'upah'),
    bahan: resources.filter((resource) => resource.category === 'bahan'),
    alat: resources.filter((resource) => resource.category === 'alat'),
  };

  return (
    <PageShell
      header={(
        <PageHeader
          title={messages.boqTitle}
          description={messages.boqDescription}
          actions={(
            <div className="w-full sm:w-72">
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
            </div>
          )}
        />
      )}
    >
      <Tabs defaultValue="boq">
        <TabsList aria-label={messages.rabNavigationLabel} className="w-full max-w-full sm:w-fit">
          <TabsTrigger value="boq" aria-label={messages.boqTitle}>
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden" aria-hidden="true">{messages.tabBoqShort}</span>
            <span className="hidden sm:inline">{messages.boqTitle}</span>
          </TabsTrigger>
          <TabsTrigger value="ahsp" aria-label={messages.tabAhsp}>
            <Calculator className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden" aria-hidden="true">{messages.tabAhspShort}</span>
            <span className="hidden sm:inline">{messages.tabAhsp}</span>
          </TabsTrigger>
          <TabsTrigger value="resources" aria-label={messages.masterPrices}>
            <Tag className="h-4 w-4" aria-hidden="true" />
            <span className="sm:hidden" aria-hidden="true">{messages.tabPriceCatalogShort}</span>
            <span className="hidden sm:inline">{messages.masterPrices}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="boq" className="min-w-0">
          <BoqPanel />
        </TabsContent>
        <TabsContent value="ahsp" className="min-w-0">
          <AhspPanel />
        </TabsContent>
        <TabsContent value="resources" className="min-w-0">
          <div className="grid gap-4 md:grid-cols-3">
            {([
              ['upah', messages.labor],
              ['bahan', messages.material],
              ['alat', messages.equipment],
            ] as const).map(([category, label]) => (
              <Card key={category} className="h-full">
                <CardHeader className="border-b border-border">
                  <CardTitle>{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {resourcesByCategory[category].length === 0 ? (
                    <EmptyState title={messages.noCatalogItems} />
                  ) : (
                    <ul className="divide-y divide-border">
                      {resourcesByCategory[category].map((resource) => (
                        <li key={resource.id} className="flex items-start justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="font-medium text-text">{resource.name}</p>
                            <p className="text-xs text-muted-foreground">{resource.code}</p>
                          </div>
                          <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-text">
                            {formatRupiah(resource.unit_price)}
                            <span className="block text-xs font-normal text-muted-foreground">/{resource.unit}</span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
};
