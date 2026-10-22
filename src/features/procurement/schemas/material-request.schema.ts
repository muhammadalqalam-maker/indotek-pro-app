import { z } from 'zod';

export const materialRequestSchema = z.object({
  projectId: z.string().uuid(),
  requiredDate: z.string().date(),
  locationName: z.string().trim().min(2).max(180),
  purpose: z.string().trim().min(2).max(1000),
  items: z.array(z.object({
    inventoryItemId: z.string().uuid(),
    quantity: z.number().positive().max(1_000_000),
    notes: z.string().trim().max(500),
  })).min(1).max(100),
}).superRefine((request, context) => {
  const ids = new Set<string>();
  request.items.forEach((item, index) => {
    if (ids.has(item.inventoryItemId)) {
      context.addIssue({
        code: 'custom',
        path: ['items', index, 'inventoryItemId'],
        message: 'Material tidak boleh dipilih lebih dari sekali.',
      });
    }
    ids.add(item.inventoryItemId);
  });
});
