import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface AnalyticsSummaryData {
  overview: {
    totalJobs: number;
    completedJobs: number;
    onTimeCompletionRate: number;
    averageTravelTime: number;
    efficiencyScore: number;
  };
  weeklyTrends: Array<{
    week: string;
    jobCount: number;
    travelTime: number;
    efficiencyScore: number;
  }>;
  aiSuggestions: {
    totalSuggestions: number;
    accepted: number;
    rejected: number;
    acceptanceRate: number;
    topRejectionReasons: Array<{
      reason: string;
      count: number;
    }>;
  };
}

export function useAnalyticsSummary(
  startDate: Date,
  endDate: Date,
  enabled = true
) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery<AnalyticsSummaryData>({
    queryKey: ['analytics-summary', businessId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      console.info('[useAnalyticsSummary] Fetching analytics', { businessId, startDate, endDate });

      const { data, error } = await authApi.invoke('analytics-summary', {
        method: 'POST',
        body: {
          businessId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      if (error) {
        console.error('[useAnalyticsSummary] Error:', error);
        throw new Error(error.message || 'Failed to fetch analytics summary');
      }

      console.info('[useAnalyticsSummary] Data received', data);
      return data as AnalyticsSummaryData;
    },
    enabled: enabled && !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
