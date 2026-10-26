import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui';
import { getMessages } from '../../../i18n';
import { formatTanggal } from '../../../utils/format';
import type { WbsTask } from '../services/projectSchedule.service';
import {
  createScheduleTimeline,
  flattenWbsTasks,
  getTimelinePosition,
} from '../utils/projectSchedule.helpers';

const messages = getMessages('id').projects.schedule;

export function ProjectGanttChart({
  tasks,
  projectStartDate,
  projectEndDate,
}: {
  tasks: WbsTask[];
  projectStartDate: string;
  projectEndDate: string;
}) {
  const rows = flattenWbsTasks(tasks);
  const startDate = tasks.reduce(
    (earliest, task) => (task.start_date < earliest ? task.start_date : earliest),
    projectStartDate,
  );
  const endDate = tasks.reduce(
    (latest, task) => (task.end_date > latest ? task.end_date : latest),
    projectEndDate,
  );
  const timeline = createScheduleTimeline(startDate, endDate);
  const timelineWidth = Math.max(640, timeline.months.length * 112);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{messages.ganttChart}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {messages.timeline}: {formatTanggal(timeline.startDate)} – {formatTanggal(timeline.endDate)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-border" role="region" aria-label={messages.ganttChart} tabIndex={0}>
          <div role="table" className="min-w-max">
            <div role="row" className="flex border-b border-border bg-surface-2">
              <div role="columnheader" className="sticky left-0 z-10 flex w-56 shrink-0 items-center border-r border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
                {messages.taskColumn}
              </div>
              <div
                role="columnheader"
                className="relative h-10 shrink-0"
                style={{ width: `${timelineWidth}px` }}
                aria-label={messages.timeline}
              >
                {timeline.months.map((month) => (
                  <span
                    key={`${month.label}-${month.leftPercent}`}
                    className="absolute inset-y-0 flex items-center border-l border-border px-2 text-xs font-medium text-muted-foreground"
                    style={{
                      left: `${month.leftPercent}%`,
                      width: `${month.widthPercent}%`,
                    }}
                  >
                    {month.label}
                  </span>
                ))}
              </div>
            </div>
            {rows.map((task) => {
              const position = getTimelinePosition(timeline, task);
              return (
                <div key={task.id} role="row" className="flex border-b border-border last:border-b-0">
                  <div
                    role="rowheader"
                    className="sticky left-0 z-10 flex min-h-12 w-56 shrink-0 items-center gap-2 border-r border-border bg-surface px-3 py-2"
                    aria-label={task.is_milestone ? `${task.title}, ${messages.milestone}` : task.title}
                  >
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{task.code}</span>
                    <span className="min-w-0 truncate text-sm text-text" title={task.title}>{task.title}</span>
                  </div>
                  <div
                    role="cell"
                    className="relative min-h-12 shrink-0"
                    style={{ width: `${timelineWidth}px` }}
                    aria-label={`${task.title}: ${formatTanggal(task.start_date)} – ${formatTanggal(task.end_date)}`}
                  >
                    {timeline.months.map((month) => (
                      <span
                        key={`${month.label}-${month.leftPercent}`}
                        className="absolute inset-y-0 border-l border-border"
                        style={{ left: `${month.leftPercent}%` }}
                        aria-hidden="true"
                      />
                    ))}
                    {task.is_milestone ? (
                      <span
                        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-warning"
                        style={{ left: `${position.leftPercent + position.widthPercent / 2}%` }}
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className="absolute top-1/2 h-5 min-w-2 -translate-y-1/2 rounded-sm bg-primary-600"
                        style={{
                          left: `${position.leftPercent}%`,
                          width: `${position.widthPercent}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
