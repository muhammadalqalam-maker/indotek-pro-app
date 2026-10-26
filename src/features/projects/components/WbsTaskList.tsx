import { Archive, CornerDownRight, Pencil, Plus } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatTanggal } from '../../../utils/format';
import type { TaskDependency, WbsTask } from '../services/projectSchedule.service';
import { flattenWbsTasks, getTaskDurationDays } from '../utils/projectSchedule.helpers';

const messages = getMessages('id').projects.schedule;

type WbsTaskListProps = {
  tasks: WbsTask[];
  dependencies: TaskDependency[];
  editable: boolean;
  onAddChild: (task: WbsTask) => void;
  onEdit: (task: WbsTask) => void;
  onArchive: (task: WbsTask) => void;
};

export function WbsTaskList({
  tasks,
  dependencies,
  editable,
  onAddChild,
  onEdit,
  onArchive,
}: WbsTaskListProps) {
  const rows = flattenWbsTasks(tasks);
  const tasksById = new Map(tasks.map((task) => [task.id, task]));

  return (
    <section aria-label={messages.taskList} className="space-y-3">
      {rows.map((task) => {
        const predecessors = dependencies
          .filter((dependency) => dependency.successor_task_id === task.id)
          .map((dependency) => tasksById.get(dependency.predecessor_task_id)?.title)
          .filter((title): title is string => Boolean(title));
        const hasChildren = tasks.some((child) => child.parent_task_id === task.id);

        return (
          <Card key={task.id}>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="shrink-0 pt-0.5 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                  {task.code}
                </span>
                <div className="min-w-0 flex-1" style={{ paddingInlineStart: `${Math.min(task.depth, 6) * 12}px` }}>
                  <div className="flex flex-wrap items-center gap-2">
                    {task.depth > 0 && <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                    <h3 className="break-words text-sm font-semibold text-text">{task.title}</h3>
                    {task.is_milestone && <Badge variant="warning">{messages.milestone}</Badge>}
                  </div>
                  {task.description && (
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{task.description}</p>
                  )}
                </div>
                {editable && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11 min-w-11"
                      aria-label={`${messages.addChildTask}: ${task.title}`}
                      title={messages.addChildTask}
                      onClick={() => onAddChild(task)}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11 min-w-11"
                      aria-label={`${messages.editTask}: ${task.title}`}
                      title={messages.editTask}
                      onClick={() => onEdit(task)}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11 min-w-11"
                      aria-label={`${messages.archiveTask}: ${task.title}`}
                      title={messages.archiveTask}
                      disabled={hasChildren}
                      onClick={() => onArchive(task)}
                    >
                      <Archive className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-surface-2 p-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">{messages.startDate}</dt>
                  <dd className="mt-1 font-medium tabular-nums text-text">{formatTanggal(task.start_date)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{messages.endDate}</dt>
                  <dd className="mt-1 font-medium tabular-nums text-text">{formatTanggal(task.end_date)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{messages.duration}</dt>
                  <dd className="mt-1 font-medium tabular-nums text-text">
                    {getTaskDurationDays(task)} {messages.days}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">{messages.predecessor}</dt>
                  <dd className="mt-1 break-words font-medium text-text">
                    {predecessors.length ? predecessors.join(', ') : messages.noPredecessor}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
