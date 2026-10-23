import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workerPieceworkSchema, type WorkerPieceworkFormValues } from '../schemas/wage.schema';
import {
  createWorkerPieceworkEntry,
  fetchPayrollWorkers,
  fetchWeeklyAttendance,
  fetchWeeklyPiecework,
} from '../services/wages.service';

export function useWeeklyWages(
  organizationId: string,
  projectId: string,
  userId: string,
  startDate: string,
  endDate: string,
  isOnline: boolean,
) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['hr-weekly-wages', organizationId, projectId, userId, startDate, endDate],
    enabled: Boolean(isOnline && organizationId && projectId && userId),
    queryFn: async () => {
      const payrollWorkers = await fetchPayrollWorkers(organizationId, projectId);
      const [attendance, piecework] = await Promise.all([
        fetchWeeklyAttendance(organizationId, projectId, startDate, endDate, payrollWorkers),
        fetchWeeklyPiecework(organizationId, projectId, startDate, endDate),
      ]);
      return { attendance, piecework, workers: payrollWorkers };
    },
  });

  const createPiecework = useMutation({
    mutationFn: async (values: WorkerPieceworkFormValues) => {
      const parsed = workerPieceworkSchema.parse(values);
      return createWorkerPieceworkEntry(organizationId, projectId, parsed);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['hr-weekly-wages', organizationId, projectId, userId],
      });
    },
  });

  return { query, createPiecework };
}
