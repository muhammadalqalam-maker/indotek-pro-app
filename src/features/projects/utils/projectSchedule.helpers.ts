import type { TaskDependency, WbsTask } from '../services/projectSchedule.service';

export type WbsRow = WbsTask & {
  code: string;
  depth: number;
};

export type TimelineMonth = {
  label: string;
  leftPercent: number;
  widthPercent: number;
};

export type ScheduleTimeline = {
  startDate: string;
  endDate: string;
  totalDays: number;
  months: TimelineMonth[];
};

export type ScheduleConflict = {
  field: 'start_date' | 'end_date';
  message: string;
};

const dayMilliseconds = 24 * 60 * 60 * 1000;

function utcDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function compareTasks(left: WbsTask, right: WbsTask): number {
  return left.sort_order - right.sort_order
    || left.start_date.localeCompare(right.start_date)
    || left.id.localeCompare(right.id);
}

export function flattenWbsTasks(tasks: WbsTask[]): WbsRow[] {
  const children = new Map<string | null, WbsTask[]>();
  for (const task of tasks) {
    const siblings = children.get(task.parent_task_id) ?? [];
    siblings.push(task);
    children.set(task.parent_task_id, siblings);
  }
  for (const siblings of children.values()) siblings.sort(compareTasks);

  const rows: WbsRow[] = [];
  const visited = new Set<string>();
  const appendChildren = (parentId: string | null, prefix: string, depth: number) => {
    const siblings = children.get(parentId) ?? [];
    siblings.forEach((task, index) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);
      const code = prefix ? `${prefix}.${index + 1}` : String(index + 1);
      rows.push({ ...task, code, depth });
      appendChildren(task.id, code, depth + 1);
    });
  };

  appendChildren(null, '', 0);
  for (const task of [...tasks].sort(compareTasks)) {
    if (visited.has(task.id)) continue;
    visited.add(task.id);
    rows.push({ ...task, code: '—', depth: 0 });
    appendChildren(task.id, '—', 1);
  }
  return rows;
}

export function getWbsDescendantIds(tasks: WbsTask[], taskId: string): Set<string> {
  const descendants = new Set<string>();
  const pending = [taskId];
  while (pending.length) {
    const parentId = pending.pop();
    if (!parentId) continue;
    for (const child of tasks) {
      if (child.parent_task_id !== parentId || descendants.has(child.id)) continue;
      descendants.add(child.id);
      pending.push(child.id);
    }
  }
  return descendants;
}

export function getTaskDurationDays(task: Pick<WbsTask, 'start_date' | 'end_date'>): number {
  return Math.floor((utcDate(task.end_date).getTime() - utcDate(task.start_date).getTime()) / dayMilliseconds) + 1;
}

export function getScheduleConflict(
  values: Pick<WbsTask, 'start_date' | 'end_date'>,
  predecessorIds: string[],
  tasks: WbsTask[],
  dependencies: TaskDependency[],
  taskId: string | null,
  conflictMessages: { predecessor: (title: string) => string; successor: (title: string) => string },
): ScheduleConflict | null {
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  for (const predecessorId of predecessorIds) {
    const predecessor = tasksById.get(predecessorId);
    if (predecessor && predecessor.end_date >= values.start_date) {
      return {
        field: 'start_date',
        message: conflictMessages.predecessor(predecessor.title),
      };
    }
  }

  if (taskId) {
    for (const dependency of dependencies) {
      if (dependency.predecessor_task_id !== taskId) continue;
      const successor = tasksById.get(dependency.successor_task_id);
      if (successor && values.end_date >= successor.start_date) {
        return {
          field: 'end_date',
          message: conflictMessages.successor(successor.title),
        };
      }
    }
  }
  return null;
}

export function createScheduleTimeline(startDate: string, endDate: string): ScheduleTimeline {
  const start = utcDate(startDate);
  const end = utcDate(endDate);
  const totalDays = Math.max(1, Math.floor((end.getTime() - start.getTime()) / dayMilliseconds) + 1);
  const firstMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const lastMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1));
  const monthFormatter = new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
  const months: TimelineMonth[] = [];

  for (let cursor = firstMonth; cursor < lastMonth; cursor = new Date(Date.UTC(
    cursor.getUTCFullYear(),
    cursor.getUTCMonth() + 1,
    1,
  ))) {
    const monthStart = Math.max(start.getTime(), cursor.getTime());
    const nextMonth = Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1);
    const monthEndExclusive = Math.min(end.getTime() + dayMilliseconds, nextMonth);
    const offsetDays = (monthStart - start.getTime()) / dayMilliseconds;
    const widthDays = (monthEndExclusive - monthStart) / dayMilliseconds;
    months.push({
      label: monthFormatter.format(cursor),
      leftPercent: (offsetDays / totalDays) * 100,
      widthPercent: (widthDays / totalDays) * 100,
    });
  }

  return { startDate, endDate, totalDays, months };
}

export function getTimelinePosition(
  timeline: ScheduleTimeline,
  task: Pick<WbsTask, 'start_date' | 'end_date'>,
): { leftPercent: number; widthPercent: number } {
  const start = utcDate(timeline.startDate).getTime();
  const taskStart = Math.max(start, utcDate(task.start_date).getTime());
  const taskEndExclusive = Math.min(
    utcDate(timeline.endDate).getTime() + dayMilliseconds,
    utcDate(task.end_date).getTime() + dayMilliseconds,
  );
  const leftPercent = ((taskStart - start) / dayMilliseconds / timeline.totalDays) * 100;
  const widthPercent = Math.max(
    (1 / timeline.totalDays) * 100,
    ((taskEndExclusive - taskStart) / dayMilliseconds / timeline.totalDays) * 100,
  );
  return { leftPercent, widthPercent };
}
