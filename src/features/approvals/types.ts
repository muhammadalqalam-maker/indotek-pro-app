import type { Tables } from '../../types/database';

export const APPROVAL_RESOURCE_TYPES = [
  'boq_revision',
  'project_addendum',
  'daily_report',
  'purchase_request',
  'purchase_order',
] as const;

export const APPROVAL_STATUSES = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
} as const;

export const APPROVAL_STEP_STATUSES = {
  waiting: 'waiting',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  skipped: 'skipped',
} as const;

export const APPROVAL_DECISIONS = [
  APPROVAL_STATUSES.approved,
  APPROVAL_STATUSES.rejected,
] as const;

export type ApprovalResourceType = (typeof APPROVAL_RESOURCE_TYPES)[number];
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[keyof typeof APPROVAL_STATUSES];

export type ApprovalRequest = Tables<'approval_requests'> & {
  requester_name: string;
  project_name: string;
  steps: Tables<'approval_steps'>[];
  delegations: Tables<'approval_delegations'>[];
};

export type ApprovalFlow = Tables<'approval_flows'> & {
  steps: Tables<'approval_flow_steps'>[];
};
