import assert from 'node:assert/strict';
import test from 'node:test';
import {
  qcInspectionSchema,
  punchListClosureSchema,
  punchListSchema,
  punchListTransitionSchema,
  qualityPhotoSchema,
} from './quality.schema';

const projectId = '0e13eac4-6a45-4ec5-8008-77bb7080d174';

test('QC inspections accept flexible checklist items and reject invalid results', () => {
  const validInspection = {
    project_id: projectId,
    inspection_date: '2026-10-23',
    title: 'Pemeriksaan instalasi',
    inspector_name: 'Rina QC',
    location: 'Lantai 2',
    items: [{ label: 'Sambungan pipa', result: 'pass', notes: '' }],
    overall_notes: '',
  };
  assert.equal(qcInspectionSchema.safeParse(validInspection).success, true);
  assert.equal(qcInspectionSchema.safeParse({
    ...validInspection,
    items: [{ ...validInspection.items[0], result: 'unknown' }],
  }).success, false);
});

test('Punch List requires a valid project, PIC, due date, and defect description', () => {
  const validPunchList = {
    project_id: projectId,
    location_zone: 'Lantai 2 sisi timur',
    category: 'MEP',
    defect_description: 'Sambungan pipa belum rapat dan mengalami kebocoran.',
    assigned_to_subcon: 'Budi Santoso - Subkon Plumbing',
    due_date: '2026-10-30',
    severity: 'major',
    reported_by: 'Rina QC',
  };
  assert.equal(punchListSchema.safeParse(validPunchList).success, true);
  assert.equal(punchListSchema.safeParse({
    ...validPunchList,
    due_date: '2026-02-30',
  }).success, false);
  assert.equal(punchListSchema.safeParse({
    ...validPunchList,
    assigned_to_subcon: ' ',
  }).success, false);
});

test('Punch List progression does not allow direct closure', () => {
  assert.equal(punchListTransitionSchema.safeParse('in_progress').success, true);
  assert.equal(punchListTransitionSchema.safeParse('ready_for_inspection').success, true);
  assert.equal(punchListTransitionSchema.safeParse('closed').success, false);
});

test('Punch List closure requires a valid after photo', () => {
  assert.equal(punchListClosureSchema.safeParse({ after_photo: null }).success, false);
  assert.equal(qualityPhotoSchema.safeParse(undefined).success, false);
  const photo = new File(['after photo'], 'after.webp', { type: 'image/webp' });
  assert.equal(punchListClosureSchema.safeParse({ after_photo: photo }).success, true);
  assert.equal(qualityPhotoSchema.safeParse(new File(['bad photo'], 'bad.gif', { type: 'image/gif' })).success, false);
});
