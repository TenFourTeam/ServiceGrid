import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';

type ReportType = 'summary' | 'time-by-job' | 'time-by-task' | 'user-productivity';

interface TimeTrackingAnalytics {
  summary?: {
    totalJobTime: number;
    totalTaskTime: number;
    totalJobs: number;
    totalTasksCompleted: number;
    activeWorkers: number;
  };
  report?: any[];
}

export function useTimeTrackingAnalytics(reportType: ReportType = 'summary', userId?: string) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery<TimeTrackingAnalytics>({
    queryKey: ['time-tracking-analytics', businessId, reportType, userId],
    queryFn: async () => {
      if (!businessId) return { summary: undefined, report: [] };

      const params = new URLSearchParams({ type: reportType });
      if (userId) params.append('userId', userId);

      const { data, error } = await authApi.invoke('time-tracking-analytics', {
        method: 'GET',
        queryParams: Object.fromEntries(params),
        headers: {
          'x-business-id': businessId
        }
      });

      if (error) throw new Error(error.message || 'Failed to fetch analytics');
      return data;
    },
    enabled: !!businessId,
  });
}
