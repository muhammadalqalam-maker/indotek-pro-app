import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  safetyIncidentActionSchema,
  safetyIncidentSchema,
  safetyInspectionSchema,
  toolboxMeetingSchema,
} from '../schemas/safety.schema';
import {
  createSafetyIncident,
  createSafetyInspection,
  createToolboxMeeting,
  fetchSafetyWorkspace,
  updateSafetyIncidentStatus,
} from '../services/safety.service';

export function useSafetyWorkspace(
  organizationId: string,
  projectId: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const queryKey = ['safety-workspace', organizationId, projectId];
  const query = useQuery({
    queryKey,
    enabled: Boolean(enabled && organizationId),
    queryFn: () => fetchSafetyWorkspace(organizationId, projectId),
    gcTime: 0,
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['safety-workspace', organizationId] });
  };

  const createInspection = useMutation({
    gcTime: 0,
    mutationFn: async (input: Parameters<typeof createSafetyInspection>[1]) => (
      createSafetyInspection(organizationId, safetyInspectionSchema.parse(input))
    ),
    onSuccess: refresh,
  });
  const createIncident = useMutation({
    gcTime: 0,
    mutationFn: async (input: Parameters<typeof createSafetyIncident>[1]) => (
      createSafetyIncident(organizationId, safetyIncidentSchema.parse(input))
    ),
    onSuccess: refresh,
  });
  const updateIncidentStatus = useMutation({
    gcTime: 0,
    mutationFn: (input:
      | { incidentId: string; status: 'action_taken'; corrective_action: string }
      | { incidentId: string; status: 'closed' }) => {
      if (input.status === 'action_taken') {
        const values = safetyIncidentActionSchema.parse({ corrective_action: input.corrective_action });
        return updateSafetyIncidentStatus(
          organizationId,
          input.incidentId,
          { status: input.status, corrective_action: values.corrective_action },
        );
      }
      return updateSafetyIncidentStatus(organizationId, input.incidentId, { status: input.status });
    },
    onSuccess: refresh,
  });
  const createToolbox = useMutation({
    gcTime: 0,
    mutationFn: async (input: Parameters<typeof createToolboxMeeting>[1]) => (
      createToolboxMeeting(organizationId, toolboxMeetingSchema.parse(input))
    ),
    onSuccess: refresh,
  });

  return { query, createInspection, createIncident, updateIncidentStatus, createToolbox };
}
