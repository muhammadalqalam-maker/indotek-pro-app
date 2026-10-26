import { useMemo, useState } from 'react';
import { Building2, CalendarDays, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { Project, ProjectStatus } from '../../types/database';
import { Can } from '../../components/shared/Can';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  useToast,
} from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { useCan } from '../../hooks/useCan';
import { getMessages } from '../../i18n';
import { formatRupiah, formatTanggal } from '../../utils/format';
import { calculateEffectiveProjectContractValue } from '../../utils/projectCalculations';
import { projectCategories, projectStatuses } from './schemas/projectSchema';
import { projectStatusLabels, projectStatusVariants } from './projectStatus';

const messages = getMessages('id').projects;
const categoryLabels: Record<(typeof projectCategories)[number], string> = messages.categoryLabels;

export function ProjectListView({
  onOpenCreateProject,
  onEditProject,
}: {
  onOpenCreateProject: () => void;
  onEditProject: (project: Project) => void;
}) {
  const {
    projects,
    members,
    isLoading,
    organizationDataError,
    reloadAllData,
    currentOrg,
    openProjectDetail,
    handleDeleteProject,
  } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Project['category'] | 'all'>('all');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const canCreateProject = useCan('projects', 'create');

  const memberNames = useMemo(
    () => new Map(members.map((member) => [member.user_id, member.user?.full_name ?? ''])),
    [members],
  );
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID');
    return projects.filter((project) => {
      const matchesSearch = !query || [
        project.code,
        project.name,
        project.client_name,
        project.location_address,
        project.location_city,
        project.location_province,
      ].some((value) => value.toLocaleLowerCase('id-ID').includes(query));
      return matchesSearch
        && (statusFilter === 'all' || project.status === statusFilter)
        && (categoryFilter === 'all' || project.category === categoryFilter);
    });
  }, [projects, search, statusFilter, categoryFilter]);

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await handleDeleteProject(projectToDelete.id);
      toast({ title: messages.deleted, variant: 'success' });
      setProjectToDelete(null);
    } catch (error) {
      const detail = error instanceof Error ? error.message : messages.deleteFailed;
      setDeleteError(detail);
      toast({ title: messages.deleteFailed, description: detail, variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-4" aria-busy="true" aria-label={messages.title}>
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-52 w-full" />)}
        </div>
      </section>
    );
  }

  if (organizationDataError) {
    return (
      <ErrorState
        title={messages.loadErrorTitle}
        description={organizationDataError}
        retryLabel={messages.retry}
        onRetry={() => void reloadAllData()}
      />
    );
  }

  if (!currentOrg) {
    return (
      <EmptyState
        title={messages.organizationRequired}
        description={messages.organizationRequiredDescription}
        icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  const noProjectsYet = projects.length === 0;
  const noMatchingProjects = !noProjectsYet && filteredProjects.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={messages.title}
        description={messages.description}
        actions={(
          <Can module="projects" action="create">
            <Button onClick={onOpenCreateProject}>{messages.addProject}</Button>
          </Can>
        )}
      />

      <section className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_12rem_12rem]">
        <Input
          label={messages.search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          label={messages.status}
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as ProjectStatus | 'all')}
        >
          <option value="all">{messages.allStatuses}</option>
          {projectStatuses.map((status) => (
            <option key={status} value={status}>{projectStatusLabels[status]}</option>
          ))}
        </Select>
        <Select
          label={messages.category}
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as Project['category'] | 'all')}
        >
          <option value="all">{messages.allCategories}</option>
          {projectCategories.map((category) => (
            <option key={category} value={category}>{categoryLabels[category]}</option>
          ))}
        </Select>
      </section>

      <p className="text-sm text-muted-foreground">{messages.projectCount(filteredProjects.length)}</p>

      {noProjectsYet || noMatchingProjects ? (
        <EmptyState
          title={noProjectsYet ? messages.noProjectsTitle : messages.noMatchesTitle}
          description={noProjectsYet ? messages.noProjectsDescription : messages.noMatchesDescription}
          actionLabel={noProjectsYet
            ? canCreateProject ? messages.addProject : undefined
            : messages.resetFilters}
          onAction={noProjectsYet
            ? canCreateProject ? onOpenCreateProject : undefined
            : () => {
            setSearch('');
            setStatusFilter('all');
            setCategoryFilter('all');
          }}
          icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <li key={project.id}>
              <Card className="h-full">
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-xs text-muted-foreground">{project.code}</p>
                    <button
                      type="button"
                      onClick={() => openProjectDetail(project.id)}
                      aria-label={messages.openDetails(project.name)}
                      className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <CardTitle className="line-clamp-2 hover:text-primary-600">{project.name}</CardTitle>
                    </button>
                  </div>
                  <Badge variant={projectStatusVariants[project.status]}>
                    {projectStatusLabels[project.status]}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm font-medium text-text">{project.client_name}</p>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p>{project.location_address}, {project.location_city}, {project.location_province}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${project.location_address}, ${project.location_city}, ${project.location_province}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex min-h-11 items-center font-medium text-primary-600 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        {messages.openMap}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{formatTanggal(project.start_date)} – {formatTanggal(project.end_date)}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 rounded-md bg-surface-2 p-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">{messages.contractValue}</dt>
                      <dd className="mt-1 text-sm font-semibold tabular-nums text-text">{formatRupiah(calculateEffectiveProjectContractValue(project))}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{messages.retention}</dt>
                      <dd className="mt-1 text-sm font-semibold tabular-nums text-text">{project.retention_percent}%</dd>
                    </div>
                  </dl>
                  <div className="grid gap-1 text-xs text-muted-foreground">
                    <p>{messages.projectManager}: {project.project_manager_name || memberNames.get(project.project_manager_id ?? '') || messages.unassigned}</p>
                    <p>{messages.siteManager}: {project.site_manager_name || memberNames.get(project.site_manager_id ?? '') || messages.unassigned}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                    <Can module="projects" action="edit">
                      <Button
                        variant="outline"
                        aria-label={messages.editAction(project.name)}
                        onClick={() => onEditProject(project)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        {messages.editTitle}
                      </Button>
                    </Can>
                    <Can module="projects" action="delete">
                      <Button
                        variant="destructive"
                        aria-label={`${messages.deleteAction}: ${project.name}`}
                        onClick={() => { setDeleteError(''); setProjectToDelete(project); }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {messages.deleteAction}
                      </Button>
                    </Can>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => { if (!open && !isDeleting) setProjectToDelete(null); }}
        title={messages.deleteTitle}
        description={projectToDelete ? messages.deleteDescription(projectToDelete.name) : undefined}
        confirmLabel={messages.deleteAction}
        cancelLabel={messages.cancel}
        destructive
        loading={isDeleting}
        onConfirm={() => void confirmDelete()}
      >
        {deleteError && <p className="text-sm text-danger" role="alert">{deleteError}</p>}
      </ConfirmDialog>
    </div>
  );
}
