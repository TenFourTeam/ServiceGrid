import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface TeamMemberUtilization {
  userId: string;
  name: string;
  hoursWorked: number;
  hoursAvailable: number;
  utilizationRate: number;
  jobsCompleted: number;
  averageJobDuration: number;
}

export interface TeamUtilizationData {
  members: TeamMemberUtilization[];
}

export function useTeamUtilization(
  startDate: Date,
  endDate: Date,
  enabled = true
) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery<TeamUtilizationData>({
    queryKey: ['team-utilization', businessId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      console.info('[useTeamUtilization] Fetching team utilization', { businessId, startDate, endDate });

      const { data, error } = await authApi.invoke('team-utilization', {
        method: 'POST',
        body: {
          businessId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      if (error) {
        console.error('[useTeamUtilization] Error:', error);
        throw new Error(error.message || 'Failed to fetch team utilization');
      }

      console.info('[useTeamUtilization] Data received', data);
      return data as TeamUtilizationData;
    },
    enabled: enabled && !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
