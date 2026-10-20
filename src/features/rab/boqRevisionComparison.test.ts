import assert from 'node:assert/strict';
import test from 'node:test';
import { compareBoqRevisions } from './boqRevisionComparison.ts';
import type { BoqItem } from './services/boq.service.ts';

const division: BoqItem = {
  id: 'division-a',
  organization_id: 'org-a',
  project_id: 'project-a',
  boq_version_id: 'version-a',
  parent_id: null,
  created_by: null,
  item_type: 'division',
  item_code: 'DIV-1',
  description: 'Persiapan',
  unit_id: null,
  ahsp_id: null,
  volume: null,
  unit_price: null,
  line_total: 0,
  sort_order: 0,
  created_at: '',
  updated_at: '',
  deleted_at: null,
};

function workItem(overrides: Partial<BoqItem> = {}): BoqItem {
  return {
    ...division,
    id: 'work-a',
    boq_version_id: 'version-a',
    parent_id: division.id,
    item_type: 'work_item',
    item_code: '1.1',
    description: 'Pembersihan',
    unit_id: 'unit-a',
    volume: 2.5,
    unit_price: 10_000,
    line_total: 25_000,
    sort_order: 0,
    ...overrides,
  };
}

test('ignores database ids when identical revisions are compared', () => {
  const clonedDivision = { ...division, id: 'division-b', boq_version_id: 'version-b' };
  const clonedWorkItem = workItem({
    id: 'work-b',
    boq_version_id: 'version-b',
    parent_id: clonedDivision.id,
  });

  assert.deepEqual(
    compareBoqRevisions([division, workItem()], [clonedDivision, clonedWorkItem]),
    [],
  );
});

test('reports changed fields and added and removed work items', () => {
  const currentDivision = { ...division, id: 'division-b', boq_version_id: 'version-b' };
  const currentWorkItem = workItem({
    id: 'work-b',
    boq_version_id: 'version-b',
    parent_id: currentDivision.id,
    volume: 3,
    unit_price: 12_000,
  });
  const added = workItem({
    id: 'work-added',
    boq_version_id: 'version-b',
    parent_id: currentDivision.id,
    item_code: '1.2',
    description: 'Pemagaran',
  });
  const removed = workItem({ item_code: '1.3', description: 'Pekerjaan lama' });

  const changes = compareBoqRevisions(
    [division, workItem(), removed],
    [currentDivision, currentWorkItem, added],
  );

  assert.equal(changes.length, 3);
  assert.deepEqual(changes.find((change) => change.path === 'DIV-1 / 1.1')?.changedFields, [
    'volume',
    'unitPrice',
  ]);
  assert.equal(changes.find((change) => change.path === 'DIV-1 / 1.2')?.kind, 'added');
  assert.equal(changes.find((change) => change.path === 'DIV-1 / 1.3')?.kind, 'removed');
});

test('reports division description changes separately from child items', () => {
  const nextDivision = { ...division, id: 'division-b', boq_version_id: 'version-b', description: 'Persiapan lokasi' };

  const changes = compareBoqRevisions([division], [nextDivision]);

  assert.equal(changes.length, 1);
  assert.equal(changes[0].kind, 'changed');
  assert.deepEqual(changes[0].changedFields, ['description']);
});
