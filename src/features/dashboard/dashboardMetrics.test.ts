import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Project } from '../../types/database.ts';
import {
  calculateDashboardMetrics,
  filterProjectsByPeriod,
  getDashboardDateRange,
  getProjectsNeedingAttention,
} from './dashboardMetrics.ts';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    organization_id: 'org-1',
    code: 'P-001',
    name: 'Proyek contoh',
    client_name: 'Klien contoh',
    contract_number: 'SPK-001',
    category: 'Gedung',
    location_address: 'Jl. Contoh',
    location_city: 'Jakarta',
    location_province: 'DKI Jakarta',
    contract_value: 1_000_000,
    realized_cost: 250_000,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    maintenance_days: 180,
    retention_percent: 5,
    planned_progress: 50,
    actual_progress: 45,
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getDashboardDateRange', () => {
  it('builds current year and previous year bounds', () => {
    const now = new Date(2026, 9, 19);
    assert.deepEqual(getDashboardDateRange('this_year', '', '', now), {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      isValid: true,
    });
    assert.deepEqual(getDashboardDateRange('last_year', '', '', now), {
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      isValid: true,
    });
  });

  it('requires a valid, ordered custom range', () => {
    assert.equal(getDashboardDateRange('custom', '', '', new Date()).isValid, false);
    assert.equal(getDashboardDateRange('custom', '2026-02-30', '2026-03-01').isValid, false);
    assert.equal(getDashboardDateRange('custom', '2026-03-02', '2026-03-01').isValid, false);
    assert.equal(getDashboardDateRange('custom', '2026-03-01', '2026-03-02').isValid, true);
  });
});

describe('filterProjectsByPeriod', () => {
  it('includes projects whose dates overlap the selected period', () => {
    const projects = [
      makeProject({ id: 'overlap', start_date: '2025-12-01', end_date: '2026-02-01' }),
      makeProject({ id: 'outside', start_date: '2025-01-01', end_date: '2025-12-31' }),
    ];
    const range = getDashboardDateRange('this_year', '', '', new Date(2026, 5, 1));

    assert.deepEqual(
      filterProjectsByPeriod(projects, range, 'all').map(({ id }) => id),
      ['overlap'],
    );
  });

  it('applies the selected project and returns no records for an invalid range', () => {
    const projects = [makeProject(), makeProject({ id: 'project-2' })];
    const allPeriod = getDashboardDateRange('all', '', '');
    const invalidRange = getDashboardDateRange('custom', '', '');

    assert.deepEqual(
      filterProjectsByPeriod(projects, allPeriod, 'project-2').map(({ id }) => id),
      ['project-2'],
    );
    assert.deepEqual(filterProjectsByPeriod(projects, invalidRange, 'all'), []);
  });
});

describe('calculateDashboardMetrics', () => {
  it('aggregates project values and computes progress only for ongoing projects', () => {
    const projects = [
      makeProject({ actual_progress: 48 }),
      makeProject({
        id: 'project-2',
        status: 'delayed',
        contract_value: 3_000_000,
        realized_cost: 1_000_000,
        actual_progress: 30,
        planned_progress: 50,
      }),
      makeProject({
        id: 'project-3',
        status: 'completed',
        contract_value: 2_000_000,
        realized_cost: 0,
        actual_progress: 50,
        planned_progress: 100,
      }),
    ];

    assert.deepEqual(calculateDashboardMetrics(projects), {
      projectCount: 3,
      activeProjectCount: 2,
      delayedProjectCount: 1,
      contractValue: 6_000_000,
      realizedCost: 1_250_000,
      budgetUsagePercent: 1_250_000 / 6_000_000 * 100,
      averageActualProgress: 39,
      averagePlannedProgress: 50,
    });
    assert.deepEqual(getProjectsNeedingAttention(projects).map(({ id }) => id), ['project-2']);
  });

  it('avoids division by zero when no projects are selected', () => {
    const metrics = calculateDashboardMetrics([]);
    assert.equal(metrics.budgetUsagePercent, 0);
    assert.equal(metrics.averageActualProgress, 0);
  });

  it('includes only approved addendum values in contract totals', () => {
    const projects = [
      makeProject({
        addendums: [
          {
            id: 'add-approved',
            organization_id: 'org-1',
            project_id: 'project-1',
            addendum_number: 'ADD-01',
            title: 'Perubahan disetujui',
            amount: 250_000,
            time_extension_days: 0,
            approved_at: '2026-10-18T09:00:00Z',
            created_at: '2026-10-18T08:00:00Z',
          },
          {
            id: 'add-pending',
            organization_id: 'org-1',
            project_id: 'project-1',
            addendum_number: 'ADD-02',
            title: 'Perubahan menunggu',
            amount: 900_000,
            time_extension_days: 0,
            approved_at: null,
            created_at: '2026-10-18T10:00:00Z',
          },
        ],
      }),
    ];

    assert.equal(calculateDashboardMetrics(projects).contractValue, 1_250_000);
  });
});
