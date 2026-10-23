import assert from 'node:assert/strict';
import test from 'node:test';
import {
  safetyIncidentActionSchema,
  safetyIncidentSchema,
  safetyInspectionSchema,
  toolboxMeetingSchema,
} from './safety.schema';

const validInspection = {
  project_id: '0e13eac4-6a45-4ec5-8008-77bb7080d174',
  inspection_date: '2026-10-23',
  title: 'Inspeksi area kerja',
  inspector_name: 'Petugas K3',
  location: 'Lantai 2',
  items: [{
    label: 'APD digunakan',
    result: 'compliant' as const,
    notes: '',
    follow_up: '',
  }],
  overall_notes: '',
};

test('safety inspection accepts a flexible checklist and requires follow-up for findings', () => {
  assert.equal(safetyInspectionSchema.safeParse(validInspection).success, true);
  const invalidFinding = {
    ...validInspection,
    items: [{ ...validInspection.items[0], result: 'non_compliant' as const }],
  };
  const result = safetyInspectionSchema.safeParse(invalidFinding);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path.join('.') === 'items.0.follow_up'));
  }
});

test('incident reports require an immediate action and valid project data', () => {
  const result = safetyIncidentSchema.safeParse({
    project_id: validInspection.project_id,
    incident_date: validInspection.inspection_date,
    category: 'Near Miss (Hampir Celaka)',
    severity: 'Tinggi',
    location: 'Lantai 2',
    description: 'Pekerja hampir terjatuh dari area kerja.',
    immediate_action: '',
    corrective_action: '',
    reporter_name: 'Petugas K3',
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(result.error.issues.some((issue) => issue.path[0] === 'immediate_action'));
  }
});

test('incident action cannot advance without a corrective action', () => {
  assert.equal(safetyIncidentActionSchema.safeParse({ corrective_action: '' }).success, false);
  assert.equal(safetyIncidentActionSchema.safeParse({ corrective_action: 'Pasang pagar pengaman' }).success, true);
});

test('toolbox meeting converts non-empty lines into discussion points', () => {
  const result = toolboxMeetingSchema.safeParse({
    project_id: validInspection.project_id,
    meeting_date: validInspection.inspection_date,
    topic: 'Penggunaan APD',
    presenter_name: 'Petugas K3',
    attendees_count: 12,
    key_points: 'Periksa helm sebelum bekerja\n\nGunakan sepatu keselamatan',
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data.key_points, ['Periksa helm sebelum bekerja', 'Gunakan sepatu keselamatan']);
  }
});
