import { useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  FilePlus2,
  FileText,
  FolderOpen,
  Pencil,
  Receipt,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Project } from '../../types/database';
import { useApp } from '../../context/AppContext';
import { Can } from '../../components/shared/Can';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '../../components/ui';
import { getMessages } from '../../i18n';
import { projectStatusLabels, projectStatusVariants } from './projectStatus';
import { ProjectDocumentsTab } from './components/ProjectDocumentsTab';
import { ProjectAddendumsTab } from './components/ProjectAddendumsTab';
import { ProjectPlaceholderTab } from './components/ProjectPlaceholderTab';
import { ProjectSummaryTab } from './components/ProjectSummaryTab';
import { ProjectScheduleTab } from './components/ProjectScheduleTab';
import { ProjectBudgetActualTab } from './components/ProjectBudgetActualTab';
import { ProjectTeamTab } from './components/ProjectTeamTab';

const messages = getMessages('id').projects;

const projectDetailTabs = [
  { value: 'summary', label: messages.detailTabs.summary, icon: BriefcaseBusiness },
  { value: 'addendums', label: messages.detailTabs.addendums, icon: FilePlus2 },
  { value: 'schedule', label: messages.detailTabs.schedule, icon: CalendarDays },
  { value: 'boq', label: messages.detailTabs.boq, icon: ClipboardList },
  { value: 'progress', label: messages.detailTabs.progress, icon: ChartNoAxesCombined },
  { value: 'costs', label: messages.detailTabs.costs, icon: Receipt },
  { value: 'documents', label: messages.detailTabs.documents, icon: FolderOpen },
  { value: 'team', label: messages.detailTabs.team, icon: Users },
  { value: 'reports', label: messages.detailTabs.reports, icon: BarChart3 },
] satisfies Array<{ value: string; label: string; icon: LucideIcon }>;

type ProjectDetailTab = (typeof projectDetailTabs)[number]['value'];

export const ProjectDetailView: React.FC<{
  projectId: string;
  onEdit: (project: Project) => void;
  onBack: () => void;
}> = ({ projectId, onEdit, onBack }) => {
  const { projects, handleDeleteProject } = useApp();
  const { toast } = useToast();
  const project = projects.find(({ id }) => id === projectId);
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('summary');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!project) {
    return (
      <EmptyState
        title={messages.detail.projectNotFound}
        actionLabel={messages.detailBack}
        onAction={onBack}
        icon={<BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  const deleteProject = async () => {
    setIsDeleting(true);
    try {
      await handleDeleteProject(project.id);
      toast({ title: messages.deleted, variant: 'success' });
      setConfirmDeleteOpen(false);
      onBack();
    } catch (error) {
      const detail = error instanceof Error ? error.message : messages.deleteFailed;
      toast({ title: messages.deleteFailed, description: detail, variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={project.name}
        description={`${project.code} · ${messages.categoryLabels[project.category]}`}
        eyebrow={<Badge variant={projectStatusVariants[project.status]}>{projectStatusLabels[project.status]}</Badge>}
        actions={(
          <>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {messages.detailBack}
            </Button>
            <Can module="projects" action="edit">
              <Button variant="outline" onClick={() => onEdit(project)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                {messages.editProject}
              </Button>
            </Can>
            <Can module="projects" action="delete">
              <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
                {messages.deleteAction}
              </Button>
            </Can>
          </>
        )}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (projectDetailTabs.some((tab) => tab.value === value)) {
            setActiveTab(value as ProjectDetailTab);
          }
        }}
      >
        <TabsList aria-label={messages.detailTabs.label} className="w-full justify-start">
          {projectDetailTabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary">
          <ProjectSummaryTab project={project} />
        </TabsContent>
        <TabsContent value="addendums">
          <ProjectAddendumsTab project={project} />
        </TabsContent>
        <TabsContent value="schedule">
          <ProjectScheduleTab project={project} />
        </TabsContent>
        <TabsContent value="boq">
          <ProjectPlaceholderTab
            title={messages.detailTabs.boq}
            description={messages.detail.boqPlaceholder}
            icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
          />
        </TabsContent>
        <TabsContent value="progress">
          <ProjectPlaceholderTab
            title={messages.detailTabs.progress}
            description={messages.detail.progressPlaceholder}
            icon={<ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />}
          />
        </TabsContent>
        <TabsContent value="costs">
          <ProjectBudgetActualTab project={project} />
        </TabsContent>
        <TabsContent value="documents">
          <ProjectDocumentsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="team">
          <ProjectTeamTab
            projectManagerId={project.project_manager_id}
            siteManagerId={project.site_manager_id}
          />
        </TabsContent>
        <TabsContent value="reports">
          <ProjectPlaceholderTab
            title={messages.detailTabs.reports}
            description={messages.detail.reportsPlaceholder}
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={messages.deleteTitle}
        description={messages.deleteDescription(project.name)}
        confirmLabel={messages.deleteAction}
        cancelLabel={messages.cancel}
        destructive
        loading={isDeleting}
        onConfirm={() => void deleteProject()}
      />
    </div>
  );
};
