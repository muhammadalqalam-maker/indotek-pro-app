import { z } from 'zod';
import { APPROVAL_DECISIONS, APPROVAL_RESOURCE_TYPES } from '../types';

const roleSchema = z.enum([
  'owner',
  'admin',
  'project_manager',
  'site_manager',
  'estimator',
  'procurement',
  'finance',
  'warehouse',
  'safety_officer',
  'subcontractor',
  'client_viewer',
]);

export const approvalFlowSchema = z.object({
  resourceType: z.enum(APPROVAL_RESOURCE_TYPES),
  name: z.string().trim().min(2).max(120),
  isActive: z.boolean(),
  steps: z.array(z.object({
    roles: z.array(roleSchema).min(1).max(11),
  })).min(1).max(8).superRefine((steps, context) => {
    steps.forEach((step, index) => {
      if (new Set(step.roles).size !== step.roles.length) {
        context.addIssue({
          code: 'custom',
          message: 'Setiap peran hanya boleh dipilih sekali dalam satu langkah.',
          path: [index, 'roles'],
        });
      }
    });
  }),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(APPROVAL_DECISIONS),
  comment: z.string().trim().min(1).max(2000),
});
