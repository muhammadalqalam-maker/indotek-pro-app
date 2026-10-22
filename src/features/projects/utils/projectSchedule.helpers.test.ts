import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TaskDependency, WbsTask } from '../services/projectSchedule.service';
import {
  createScheduleTimeline,
  flattenWbsTasks,
  getScheduleConflict,
  getTaskDurationDays,
  getTimelinePosition,
  getWbsDescendantIds,
} from './projectSchedule.helpers';

const tasks: WbsTask[] = [
  {
    id: 'task-a',
    parent_task_id: null,
    title: 'Persiapan',
    description: '',
    start_date: '2026-01-01',
    end_date: '2026-01-03',
    is_milestone: false,
    sort_order: 0,
  },
  {
    id: 'task-b',
    parent_task_id: 'task-a',
    title: 'Mobilisasi',
    description: '',
    start_date: '2026-01-04',
    end_date: '2026-01-04',
    is_milestone: true,
    sort_order: 0,
  },
  {
    id: 'task-c',
    parent_task_id: null,
    title: 'Pekerjaan utama',
    description: '',
    start_date: '2026-01-05',
    end_date: '2026-01-10',
    is_milestone: false,
    sort_order: 1,
  },
];

const dependency: TaskDependency = {
  id: 'dependency-a-b',
  predecessor_task_id: 'task-a',
  successor_task_id: 'task-b',
  dependency_type: 'finish_to_start',
};

describe('project schedule helpers', () => {
  it('flattens WBS hierarchy in stable order and assigns codes', () => {
    assert.deepEqual(
      flattenWbsTasks(tasks).map(({ id, code, depth }) => ({ id, code, depth })),
      [
        { id: 'task-a', code: '1', depth: 0 },
        { id: 'task-b', code: '1.1', depth: 1 },
        { id: 'task-c', code: '2', depth: 0 },
      ],
    );
  });

  it('finds all descendants of a WBS task', () => {
    assert.deepEqual([...getWbsDescendantIds(tasks, 'task-a')], ['task-b']);
  });

  it('calculates inclusive durations and validates Finish-to-Start boundaries', () => {
    assert.equal(getTaskDurationDays(tasks[1]), 1);
    assert.deepEqual(
      getScheduleConflict(
        { start_date: '2026-01-03', end_date: '2026-01-04' },
        ['task-a'],
        tasks,
        [dependency],
        null,
        {
          predecessor: (title) => `After ${title}`,
          successor: (title) => `Before ${title}`,
        },
      ),
      { field: 'start_date', message: 'After Persiapan' },
    );
    assert.equal(
      getScheduleConflict(
        { start_date: '2026-01-04', end_date: '2026-01-04' },
        ['task-a'],
        tasks,
        [dependency],
        null,
        {
          predecessor: (title) => `After ${title}`,
          successor: (title) => `Before ${title}`,
        },
      ),
      null,
    );
  });

  it('rejects finish dates that overlap an existing successor', () => {
    assert.deepEqual(
      getScheduleConflict(
        { start_date: '2026-01-01', end_date: '2026-01-04' },
        [],
        tasks,
        [dependency],
        'task-a',
        {
          predecessor: (title) => `After ${title}`,
          successor: (title) => `Before ${title}`,
        },
      ),
      { field: 'end_date', message: 'Before Mobilisasi' },
    );
  });

  it('positions tasks within a calendar-month timeline', () => {
    const timeline = createScheduleTimeline('2026-01-15', '2026-02-14');
    const position = getTimelinePosition(timeline, {
      start_date: '2026-01-15',
      end_date: '2026-01-15',
    });
    assert.equal(timeline.totalDays, 31);
    assert.equal(timeline.months.length, 2);
    assert.equal(position.leftPercent, 0);
    assert.ok(Math.abs(position.widthPercent - (100 / 31)) < 0.0001);
  });
});
