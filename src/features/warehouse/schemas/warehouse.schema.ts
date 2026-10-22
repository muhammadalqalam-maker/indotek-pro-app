import { z } from 'zod';
import { getMessages } from '../../../i18n';

const messages = getMessages().warehouse;
const quantitySchema = z.number({ message: messages.quantityInvalid })
  .min(0, messages.quantityInvalid)
  .max(1_000_000, messages.quantityInvalid)
  .refine((value) => Number.isFinite(value) && Number(value.toFixed(3)) === value, {
    message: messages.quantityDecimal,
  });

export const inventoryItemSchema = z.object({
  projectId: z.string().uuid(messages.invalidProject),
  itemCode: z.string().trim().min(1, messages.itemCodeRequired).max(64, messages.fieldTooLong),
  itemName: z.string().trim().min(2, messages.itemNameRequired).max(180, messages.fieldTooLong),
  category: z.string().trim().min(1, messages.categoryRequired).max(80, messages.fieldTooLong),
  unit: z.string().trim().min(1, messages.unitRequired).max(24, messages.fieldTooLong),
  locationName: z.string().trim().min(1, messages.locationRequired).max(180, messages.fieldTooLong),
  minimumStock: quantitySchema,
});

export const minimumStockSchema = z.object({
  minimumStock: quantitySchema,
});

export const warehouseMovementSchema = z.object({
  movementType: z.enum(['in', 'out', 'transfer', 'adjustment']),
  quantity: quantitySchema.refine((value) => value > 0, { message: messages.quantityInvalid }),
  movementDate: z.string().date(),
  sourceInventoryItemId: z.string().uuid().or(z.literal('')),
  destinationInventoryItemId: z.string().uuid().or(z.literal('')),
  adjustmentDirection: z.enum(['increase', 'decrease']),
  referenceDoc: z.string().trim().max(120),
  recipientOrSupplier: z.string().trim().max(120),
  notes: z.string().trim().max(1000),
}).superRefine((movement, context) => {
  const hasSource = Boolean(movement.sourceInventoryItemId);
  const hasDestination = Boolean(movement.destinationInventoryItemId);

  if (movement.movementType === 'in' && (!hasDestination || hasSource)) {
    context.addIssue({
      code: 'custom',
      path: ['destinationInventoryItemId'],
      message: 'Pilih item tujuan untuk stok masuk.',
    });
  }
  if (movement.movementType === 'out' && (!hasSource || hasDestination)) {
    context.addIssue({
      code: 'custom',
      path: ['sourceInventoryItemId'],
      message: 'Pilih item sumber untuk stok keluar.',
    });
  }
  if (movement.movementType === 'transfer' && (!hasSource || !hasDestination)) {
    context.addIssue({
      code: 'custom',
      path: ['destinationInventoryItemId'],
      message: 'Pilih item sumber dan tujuan transfer.',
    });
  }
  if (movement.movementType === 'transfer'
    && movement.sourceInventoryItemId === movement.destinationInventoryItemId) {
    context.addIssue({
      code: 'custom',
      path: ['destinationInventoryItemId'],
      message: 'Item sumber dan tujuan harus berbeda.',
    });
  }
  if (movement.movementType === 'adjustment') {
    const hasOneItemOnly = hasSource !== hasDestination;
    const directionMatches = movement.adjustmentDirection === 'increase'
      ? hasDestination && !hasSource
      : hasSource && !hasDestination;
    if (!hasOneItemOnly || !directionMatches) {
      context.addIssue({
        code: 'custom',
        path: movement.adjustmentDirection === 'increase'
          ? ['destinationInventoryItemId']
          : ['sourceInventoryItemId'],
        message: 'Pilih satu item untuk penyesuaian stok.',
      });
    }
    if (!movement.notes) {
      context.addIssue({
        code: 'custom',
        path: ['notes'],
        message: 'Alasan penyesuaian wajib diisi.',
      });
    }
  }
});

export type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;
export type MinimumStockFormValues = z.infer<typeof minimumStockSchema>;
export type WarehouseMovementFormValues = z.infer<typeof warehouseMovementSchema>;
