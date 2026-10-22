import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { approvalDecisionSchema, approvalFlowSchema } from './approval.schema';

const validFlow = {
  resourceType: 'daily_report',
  name: 'Persetujuan laporan harian',
  isActive: true,
  steps: [
    { roles: ['project_manager'] },
    { roles: ['owner', 'admin'] },
  ],
};

describe('approvalFlowSchema', () => {
  it('accepts ordered approver roles for a supported resource', () => {
    assert.equal(approvalFlowSchema.safeParse(validFlow).success, true);
  });

  it('rejects duplicate roles, empty steps, and flows beyond eight steps', () => {
    assert.equal(approvalFlowSchema.safeParse({
      ...validFlow,
      steps: [{ roles: ['owner', 'owner'] }],
    }).success, false);
    assert.equal(approvalFlowSchema.safeParse({
      ...validFlow,
      steps: [{ roles: [] }],
    }).success, false);
    assert.equal(approvalFlowSchema.safeParse({
      ...validFlow,
      steps: Array.from({ length: 9 }, () => ({ roles: ['owner'] })),
    }).success, false);
  });
});

describe('approvalDecisionSchema', () => {
  it('requires a supported decision and non-empty trimmed comment', () => {
    const parsed = approvalDecisionSchema.safeParse({
      decision: 'approved',
      comment: '  Sudah diperiksa  ',
    });
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.comment, 'Sudah diperiksa');

    assert.equal(approvalDecisionSchema.safeParse({
      decision: 'pending',
      comment: 'Menunggu',
    }).success, false);
    assert.equal(approvalDecisionSchema.safeParse({
      decision: 'rejected',
      comment: '   ',
    }).success, false);
  });

  it('rejects comments longer than 2,000 characters', () => {
    assert.equal(approvalDecisionSchema.safeParse({
      decision: 'rejected',
      comment: 'x'.repeat(2001),
    }).success, false);
  });
});
