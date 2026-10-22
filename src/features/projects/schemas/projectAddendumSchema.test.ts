import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { projectAddendumSchema } from './projectAddendumSchema';

const validAddendum = {
  addendum_number: 'ADD-01/PRJ-001',
  title: 'Perubahan lingkup pekerjaan',
  description: '',
  amount: 250_000_000,
  time_extension_days: 14,
};

describe('projectAddendumSchema', () => {
  it('accepts value changes, including deductions', () => {
    assert.equal(projectAddendumSchema.safeParse(validAddendum).success, true);
    assert.equal(projectAddendumSchema.safeParse({
      ...validAddendum,
      amount: -50_000_000,
      time_extension_days: 0,
    }).success, true);
  });

  it('accepts time-only changes', () => {
    assert.equal(projectAddendumSchema.safeParse({
      ...validAddendum,
      amount: 0,
      time_extension_days: 7,
    }).success, true);
  });

  it('requires a number, title, and at least one change', () => {
    const result = projectAddendumSchema.safeParse({
      ...validAddendum,
      addendum_number: ' ',
      title: '',
      amount: 0,
      time_extension_days: 0,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const paths = result.error.issues.map(({ path }) => path.join('.'));
      assert.ok(paths.includes('addendum_number'));
      assert.ok(paths.includes('title'));
      assert.ok(paths.includes('amount'));
    }
  });

  it('rejects negative or fractional extension days and overlong descriptions', () => {
    assert.equal(projectAddendumSchema.safeParse({
      ...validAddendum,
      time_extension_days: -1,
    }).success, false);
    assert.equal(projectAddendumSchema.safeParse({
      ...validAddendum,
      time_extension_days: 1.5,
    }).success, false);
    assert.equal(projectAddendumSchema.safeParse({
      ...validAddendum,
      description: 'x'.repeat(2001),
    }).success, false);
  });
});
