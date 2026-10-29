import { useState } from 'react';
import { ClipboardList, FileText, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
import { EmptyState, PageHeader, PageShell, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { DailyReportPeriodPdfView } from './DailyReportPeriodPdfView';
import { DailyReportsWorkspace } from './DailyReportsWorkspace';
import { SCurveProgressView } from './SCurveProgressView';

const messages = getMessages().fieldReports;

type FieldTab = 'reports' | 'periodPdf' | 'scurve';

export function DailyReportsView() {
  const { projects, currentOrg, selectedProjectId } = useApp();
  const [activeTab, setActiveTab] = useState<FieldTab>('reports');
  const organizationProjects = projects.filter((project) => project.organization_id === currentOrg?.id);
  const activeProject = organizationProjects.find((project) => project.id === selectedProjectId)
    ?? organizationProjects[0];

  return (
    <PageShell
      className="mx-auto max-w-6xl"
      header={(
        <PageHeader
          title={messages.title}
          description={messages.description}
          eyebrow={activeProject ? `${activeProject.code} · ${activeProject.name}` : undefined}
        />
      )}
    >
      <Tabs value={activeTab} onValueChange={(value) => {
        if (value === 'reports' || value === 'periodPdf' || value === 'scurve') setActiveTab(value);
      }}>
        <TabsList aria-label={messages.title} className="w-full justify-start">
          <TabsTrigger value="reports" className="min-h-11">
            <ClipboardList className="size-4" aria-hidden="true" />
            {messages.reportsTab}
          </TabsTrigger>
          <TabsTrigger value="periodPdf" className="min-h-11">
            <FileText className="size-4" aria-hidden="true" />
            {messages.periodPdfTab}
          </TabsTrigger>
          <TabsTrigger value="scurve" className="min-h-11">
            <TrendingUp className="size-4" aria-hidden="true" />
            {messages.scurveTab}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reports">
          <DailyReportsWorkspace />
        </TabsContent>
        <TabsContent value="periodPdf">
          {activeProject
            ? <DailyReportPeriodPdfView project={activeProject} />
            : <EmptyState title={messages.noReportsProject} />}
        </TabsContent>
        <TabsContent value="scurve">
          {activeProject
            ? <SCurveProgressView projectId={activeProject.id} />
            : <EmptyState title={messages.noProject} />}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
