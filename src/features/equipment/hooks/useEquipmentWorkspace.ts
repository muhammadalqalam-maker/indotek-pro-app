import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { equipmentAssetSchema, equipmentMaintenanceSchema, equipmentUsageSchema } from '../schemas/equipment.schema';
import {
  createEquipmentAsset,
  fetchEquipmentWorkspace,
  recordEquipmentMaintenance,
  recordEquipmentUsage,
  updateEquipmentAsset,
} from '../services/equipment.service';

export function useEquipmentWorkspace(
  organizationId: string,
  projectId: string,
  startDate: string,
  endDate: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const queryKey = ['equipment-workspace', organizationId, projectId, startDate, endDate];
  const query = useQuery({
    queryKey,
    enabled: Boolean(enabled && organizationId),
    queryFn: () => fetchEquipmentWorkspace(organizationId, projectId, startDate, endDate),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['equipment-workspace', organizationId] });
  };

  const createAsset = useMutation({
    mutationFn: async (values: Parameters<typeof createEquipmentAsset>[1]) => (
      createEquipmentAsset(organizationId, equipmentAssetSchema.parse(values))
    ),
    onSuccess: refresh,
  });
  const updateAsset = useMutation({
    mutationFn: async (input: { equipmentId: string; values: Parameters<typeof createEquipmentAsset>[1] }) => (
      updateEquipmentAsset(organizationId, input.equipmentId, equipmentAssetSchema.parse(input.values))
    ),
    onSuccess: refresh,
  });
  const createUsage = useMutation({
    mutationFn: async (values: Parameters<typeof recordEquipmentUsage>[1]) => (
      recordEquipmentUsage(organizationId, equipmentUsageSchema.parse(values))
    ),
    onSuccess: refresh,
  });
  const createMaintenance = useMutation({
    mutationFn: async (values: Parameters<typeof recordEquipmentMaintenance>[1]) => (
      recordEquipmentMaintenance(organizationId, equipmentMaintenanceSchema.parse(values))
    ),
    onSuccess: refresh,
  });

  return { query, createAsset, updateAsset, createUsage, createMaintenance };
}
