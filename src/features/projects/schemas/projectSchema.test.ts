import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { projectSchema, type ProjectFormValues } from './projectSchema';

const validProject: ProjectFormValues = {
  code: 'PRJ-IKN-2026-001',
  name: 'Pembangunan Kantor',
  client_name: 'PT Contoh',
  client_contact: '',
  contract_number: 'SPK-001',
  category: 'Gedung',
  location_address: 'Jl. Merdeka No. 1',
  location_city: 'Jakarta Selatan',
  location_province: 'DKI Jakarta',
  contract_value: 1_000_000_000,
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  maintenance_days: 180,
  retention_percent: 5,
  status: 'planning',
  project_manager_id: '',
  site_manager_id: '',
  notes: '',
};

describe('projectSchema', () => {
  it('accepts complete project details and optional team assignments', () => {
    assert.equal(projectSchema.safeParse(validProject).success, true);
  });

  it('rejects missing required details, negative values, and an inverted schedule', () => {
    const result = projectSchema.safeParse({
      ...validProject,
      code: ' ',
      contract_value: -1,
      start_date: '2026-12-31',
      end_date: '2026-01-01',
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const paths = result.error.issues.map(({ path }) => path.join('.'));
      assert.ok(paths.includes('code'));
      assert.ok(paths.includes('contract_value'));
      assert.ok(paths.includes('end_date'));
    }
  });

  it('limits retention and maintenance values to valid ranges', () => {
    assert.equal(projectSchema.safeParse({
      ...validProject,
      retention_percent: 101,
      maintenance_days: -1,
    }).success, false);
  });

  it('rejects calendar dates that do not exist', () => {
    assert.equal(projectSchema.safeParse({
      ...validProject,
      start_date: '2026-02-30',
    }).success, false);
  });
});
