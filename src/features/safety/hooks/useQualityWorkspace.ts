import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  punchListSchema,
  punchListTransitionSchema,
  qcInspectionSchema,
} from '../schemas/quality.schema';
import {
  advancePunchListItem,
  closePunchListItem,
  createPunchListItem,
  createQcInspection,
  fetchQualityWorkspace,
} from '../services/quality.service';

export function useQualityWorkspace(
  organizationId: string,
  projectId: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const queryKey = ['quality-workspace', organizationId, projectId];
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['quality-workspace', organizationId] });
  };
  const query = useQuery({
    queryKey,
    enabled: Boolean(enabled && organizationId),
    queryFn: () => fetchQualityWorkspace(organizationId, projectId),
    gcTime: 0,
  });
  const createInspection = useMutation({
    gcTime: 0,
    mutationFn: async (input: Parameters<typeof createQcInspection>[1]) => (
      createQcInspection(organizationId, qcInspectionSchema.parse(input))
    ),
    onSuccess: refresh,
  });
  const createPunchList = useMutation({
    gcTime: 0,
    mutationFn: async (input: {
      values: Parameters<typeof createPunchListItem>[1];
      beforePhoto: File;
    }) => createPunchListItem(
      organizationId,
      punchListSchema.parse(input.values),
      input.beforePhoto,
    ),
    onSuccess: refresh,
  });
  const advancePunchList = useMutation({
    gcTime: 0,
    mutationFn: (input: {
      itemId: string;
      currentStatus: 'open' | 'in_progress';
      nextStatus: string;
    }) => advancePunchListItem(
      organizationId,
      input.itemId,
      input.currentStatus,
      punchListTransitionSchema.parse(input.nextStatus),
    ),
    onSuccess: refresh,
  });
  const closePunchList = useMutation({
    gcTime: 0,
    mutationFn: (input: { itemId: string; projectId: string; afterPhoto: File }) => (
      closePunchListItem(organizationId, input.itemId, input.projectId, input.afterPhoto)
    ),
    onSuccess: refresh,
  });

  return { query, createInspection, createPunchList, advancePunchList, closePunchList };
}
