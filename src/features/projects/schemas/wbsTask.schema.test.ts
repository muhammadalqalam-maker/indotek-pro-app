import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { wbsTaskSchema } from './wbsTask.schema';

const validTask = {
  title: 'Pekerjaan struktur',
  description: '',
  parent_task_id: '',
  start_date: '2026-01-01',
  end_date: '2026-01-10',
  is_milestone: false,
  predecessor_task_ids: [],
};

describe('wbsTaskSchema', () => {
  it('accepts a valid task and trims its title', () => {
    const result = wbsTaskSchema.safeParse({ ...validTask, title: '  Struktur  ' });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.title, 'Struktur');
  });

  it('rejects invalid calendar dates and an end date before the start date', () => {
    assert.equal(wbsTaskSchema.safeParse({
      ...validTask,
      start_date: '2026-02-30',
    }).success, false);
    assert.equal(wbsTaskSchema.safeParse({
      ...validTask,
      start_date: '2026-01-10',
      end_date: '2026-01-09',
    }).success, false);
  });

  it('requires milestones to have the same start and end date', () => {
    assert.equal(wbsTaskSchema.safeParse({
      ...validTask,
      is_milestone: true,
    }).success, false);
    assert.equal(wbsTaskSchema.safeParse({
      ...validTask,
      is_milestone: true,
      end_date: '2026-01-01',
    }).success, true);
  });

  it('limits descriptions and predecessor selections', () => {
    assert.equal(wbsTaskSchema.safeParse({
      ...validTask,
      description: 'x'.repeat(2001),
    }).success, false);
    assert.equal(wbsTaskSchema.safeParse({
      ...validTask,
      predecessor_task_ids: Array.from({ length: 501 }, () => '00000000-0000-4000-8000-000000000000'),
    }).success, false);
  });
});
