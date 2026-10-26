import { useState } from 'react';
import { ClipboardList, FileText, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getMessages } from '../../i18n';
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
    <main className="space-y-5">
      <header className="space-y-1">
        {activeProject && (
          <p className="text-xs font-medium text-muted-foreground">
            {activeProject.code} · {activeProject.name}
          </p>
        )}
        <h1 className="text-2xl font-bold text-text">{messages.title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{messages.description}</p>
      </header>

      <div role="tablist" aria-label={messages.title} className="flex gap-2 overflow-x-auto border-b border-border">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reports'}
          onClick={() => setActiveTab('reports')}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${activeTab === 'reports' ? 'border-primary-500 text-primary-700 dark:text-primary-500' : 'border-transparent text-muted-foreground hover:text-text'}`}
        >
          <ClipboardList className="h-4 w-4" aria-hidden="true" />
          {messages.reportsTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'periodPdf'}
          onClick={() => setActiveTab('periodPdf')}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${activeTab === 'periodPdf' ? 'border-primary-500 text-primary-700 dark:text-primary-500' : 'border-transparent text-muted-foreground hover:text-text'}`}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {messages.periodPdfTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'scurve'}
          onClick={() => setActiveTab('scurve')}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${activeTab === 'scurve' ? 'border-primary-500 text-primary-700 dark:text-primary-500' : 'border-transparent text-muted-foreground hover:text-text'}`}
        >
          <TrendingUp className="h-4 w-4" aria-hidden="true" />
          {messages.scurveTab}
        </button>
      </div>

      {activeTab === 'reports' ? (
        <DailyReportsWorkspace />
      ) : activeTab === 'periodPdf' ? (
        activeProject ? (
          <DailyReportPeriodPdfView project={activeProject} />
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
            {messages.noReportsProject}
          </div>
        )
      ) : activeProject ? (
        <SCurveProgressView projectId={activeProject.id} />
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
          {messages.noProject}
        </div>
      )}
    </main>
  );
}
