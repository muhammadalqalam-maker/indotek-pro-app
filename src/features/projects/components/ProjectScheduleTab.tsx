import { useMemo, useState } from 'react';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Can } from '../../../components/shared/Can';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  useToast,
} from '../../../components/ui';
import { useApp } from '../../../context/AppContext';
import { getMessages } from '../../../i18n';
import { useCan } from '../../../hooks/useCan';
import type { Project } from '../../../types/database';
import { WbsTaskDialog } from './WbsTaskDialog';
import { ProjectGanttChart } from './ProjectGanttChart';
import { WbsTaskList } from './WbsTaskList';
import { useProjectNetworkStatus } from '../hooks/useProjectNetworkStatus';
import {
  archiveWbsTask,
  fetchProjectSchedule,
  saveWbsTask,
  type SaveWbsTaskValues,
  type WbsTask,
} from '../services/projectSchedule.service';
import type { WbsTaskFormValues } from '../schemas/wbsTask.schema';
import { wbsTaskSchema } from '../schemas/wbsTask.schema';
import { getScheduleErrorDetail } from '../utils/projectSchedule.errors';

const messages = getMessages('id').projects.schedule;

type ProjectScheduleTabProps = {
  project: Project;
};

export function ProjectScheduleTab({ project }: ProjectScheduleTabProps) {
  const queryClient = useQueryClient();
  const { currentOrg, currentMemberRole, isSupabaseLive } = useApp();
  const { toast } = useToast();
  const hasEditPermission = useCan('projects', 'edit');
  const isOnline = useProjectNetworkStatus();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WbsTask | null>(null);
  const [initialParentId, setInitialParentId] = useState<string | null>(null);
  const [taskToArchive, setTaskToArchive] = useState<WbsTask | null>(null);
  const [saveError, setSaveError] = useState('');
  const [archiveError, setArchiveError] = useState('');
  const organizationId = currentOrg?.id ?? '';
  const queryKey = useMemo(
    () => ['project-schedule', organizationId, project.id],
    [organizationId, project.id],
  );
  const query = useQuery({
    queryKey,
    queryFn: () => fetchProjectSchedule(organizationId, project.id),
    enabled: Boolean(isSupabaseLive && organizationId && isOnline),
  });
  const tasks = query.data?.tasks ?? [];
  const dependencies = query.data?.dependencies ?? [];
  const hasScheduleEditRole = ['owner', 'admin', 'project_manager'].includes(currentMemberRole ?? '');
  const editable = isSupabaseLive && isOnline && hasEditPermission && hasScheduleEditRole;

  const saveMutation = useMutation({
    mutationFn: async (values: WbsTaskFormValues) => {
      const validated = wbsTaskSchema.parse(values);
      const currentTask = editingTask;
      const parentTaskId = validated.parent_task_id || null;
      const siblingTasks = tasks.filter((task) => task.parent_task_id === parentTaskId && task.id !== currentTask?.id);
      const taskValues: SaveWbsTaskValues = {
        title: validated.title,
        description: validated.description.trim(),
        parent_task_id: parentTaskId,
        start_date: validated.start_date,
        end_date: validated.end_date,
        is_milestone: validated.is_milestone,
        sort_order: currentTask?.sort_order ?? (siblingTasks.length ? Math.max(...siblingTasks.map((task) => task.sort_order)) + 1 : 0),
      };
      return saveWbsTask(
        organizationId,
        project.id,
        currentTask?.id ?? null,
        taskValues,
        validated.predecessor_task_ids,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: editingTask ? messages.taskUpdated : messages.taskCreated, variant: 'success' });
      setDialogOpen(false);
      setEditingTask(null);
      setInitialParentId(null);
      setSaveError('');
    },
    onError: (error: unknown) => {
      const detail = getScheduleErrorDetail(error);
      setSaveError(detail);
      toast({ title: messages.saveFailed, description: detail, variant: 'error' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (task: WbsTask) => archiveWbsTask(organizationId, project.id, task.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast({ title: messages.taskArchived, variant: 'success' });
      setTaskToArchive(null);
      setArchiveError('');
    },
    onError: (error: unknown) => {
      const detail = getScheduleErrorDetail(error);
      setArchiveError(detail);
      toast({ title: messages.archiveFailed, description: detail, variant: 'error' });
    },
  });

  const openCreate = (parentId: string | null = null) => {
    setEditingTask(null);
    setInitialParentId(parentId);
    setSaveError('');
    setDialogOpen(true);
  };
  const openEdit = (task: WbsTask) => {
    setEditingTask(task);
    setInitialParentId(null);
    setSaveError('');
    setDialogOpen(true);
  };

  if (!organizationId) {
    return <EmptyState title={messages.noOrganization} icon={<CalendarPlus className="h-5 w-5" aria-hidden="true" />} />;
  }

  if (!isSupabaseLive) {
    return (
      <EmptyState
        title={messages.demoUnavailable}
        icon={<CalendarPlus className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  if (!isOnline && !query.data) {
    return (
      <EmptyState
        title={messages.offlineReadOnly}
        description={messages.offlineNoCache}
        icon={<CalendarPlus className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  if (query.isPending && !query.data) {
    return (
      <section className="space-y-4" aria-label={messages.title}>
        <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
        <div className="h-48 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-48 animate-pulse rounded-lg bg-surface-2" />
      </section>
    );
  }

  if (query.isError && !query.data) {
    return (
      <section className="space-y-3 rounded-lg border border-danger bg-surface p-4" role="alert">
        <p className="text-sm text-danger">{messages.loadFailed}</p>
        <p className="break-words text-xs text-muted">{query.error.message}</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />{messages.retry}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {!isOnline && (
        <p className="rounded-md bg-warning-bg p-3 text-sm text-warning" role="status">
          {messages.offlineReadOnly}
        </p>
      )}
      {query.isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger bg-surface p-3" role="alert">
          <div className="min-w-0">
            <p className="text-sm text-danger">{messages.loadFailed}</p>
            <p className="mt-1 break-words text-xs text-muted">{query.error.message}</p>
          </div>
          <Button variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />{messages.retry}
          </Button>
        </div>
      )}
      {isOnline && !editable && (
        <p className="rounded-md bg-surface-2 p-3 text-sm text-muted" role="status">
          {messages.noEditAccess}
        </p>
      )}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text">{messages.title}</h2>
          <p className="mt-1 text-sm text-muted">{messages.description}</p>
        </div>
        {editable && (
          <Can module="projects" action="edit">
            <Button onClick={() => openCreate()}>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              {messages.addTask}
            </Button>
          </Can>
        )}
      </header>

      {tasks.length === 0 ? (
        <EmptyState
          title={messages.noTasks}
          description={editable ? messages.noTasksDescription : messages.noTasksReadOnly}
          icon={<CalendarPlus className="h-5 w-5" aria-hidden="true" />}
          actionLabel={editable ? messages.addTask : undefined}
          onAction={editable ? () => openCreate() : undefined}
        />
      ) : (
        <>
          <ProjectGanttChart
            tasks={tasks}
            projectStartDate={project.start_date}
            projectEndDate={project.end_date}
          />
          <WbsTaskList
            tasks={tasks}
            dependencies={dependencies}
            editable={editable}
            onAddChild={(task) => openCreate(task.id)}
            onEdit={openEdit}
            onArchive={(task) => {
              setArchiveError('');
              setTaskToArchive(task);
            }}
          />
        </>
      )}

      <WbsTaskDialog
        open={dialogOpen}
        task={editingTask}
        initialParentId={initialParentId}
        tasks={tasks}
        dependencies={dependencies}
        saving={saveMutation.isPending}
        saveError={saveError}
        onClose={() => {
          setDialogOpen(false);
          setEditingTask(null);
          setInitialParentId(null);
          setSaveError('');
        }}
        onSave={(values) => saveMutation.mutate(values)}
      />
      <ConfirmDialog
        open={Boolean(taskToArchive)}
        onOpenChange={(open) => {
          if (!open && !archiveMutation.isPending) {
            setTaskToArchive(null);
            setArchiveError('');
          }
        }}
        title={messages.confirmArchiveTitle}
        description={taskToArchive ? messages.confirmArchiveDescription(taskToArchive.title) : ''}
        confirmLabel={messages.archiveTask}
        cancelLabel={messages.cancel}
        loading={archiveMutation.isPending}
        onConfirm={() => {
          if (taskToArchive) archiveMutation.mutate(taskToArchive);
        }}
      >
        {archiveError && <p className="text-sm text-danger" role="alert">{archiveError}</p>}
      </ConfirmDialog>
    </section>
  );
}
