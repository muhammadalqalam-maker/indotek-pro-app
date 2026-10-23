import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { workerPieceworkSchema, workerWageRateSchema } from './wage.schema';

const validEntry = {
  worker_id: '00000000-0000-4000-8000-000000000001',
  work_date: '2026-10-22',
  description: 'Pemasangan tulangan',
  quantity: 12.5,
  unit: 'm²',
  unit_rate: 35000,
};

describe('worker piecework schema', () => {
  it('accepts a valid piecework entry', () => {
    assert.equal(workerPieceworkSchema.safeParse(validEntry).success, true);
  });

  it('rejects a non-positive quantity and invalid work dates', () => {
    assert.equal(workerPieceworkSchema.safeParse({ ...validEntry, quantity: 0 }).success, false);
    assert.equal(workerPieceworkSchema.safeParse({ ...validEntry, work_date: '22-10-2026' }).success, false);
  });

  it('rejects empty descriptions and rates outside the database range', () => {
    assert.equal(workerPieceworkSchema.safeParse({ ...validEntry, description: ' ' }).success, false);
    assert.equal(workerPieceworkSchema.safeParse({ ...validEntry, unit_rate: -1 }).success, false);
    assert.equal(workerPieceworkSchema.safeParse({ ...validEntry, work_date: '2026-02-30' }).success, false);
    assert.equal(workerPieceworkSchema.safeParse({ ...validEntry, quantity: 0.0005 }).success, false);
  });

  it('accepts worker wage rates with database-scale precision only', () => {
    assert.equal(workerWageRateSchema.safeParse({
      daily_wage_rate: 180000,
      overtime_hourly_rate: 25000.5,
    }).success, true);
    assert.equal(workerWageRateSchema.safeParse({
      daily_wage_rate: 180000.001,
      overtime_hourly_rate: 25000,
    }).success, false);
  });
});
