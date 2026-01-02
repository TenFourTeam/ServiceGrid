import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { useAuthApi } from './useAuthApi';

export interface GeneratedJobStats {
  totalGenerated: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  completionRate: number;
  avgDurationMinutes: number | null;
  totalRevenue: number;
  nextScheduledJob: any | null;
  recentJobs: any[];
}

export function useGeneratedJobsFromTemplate(templateId?: string) {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['generated-jobs-from-template', templateId, businessId],
    queryFn: async (): Promise<GeneratedJobStats> => {
      if (!templateId || !businessId) throw new Error('Template ID and Business ID required');

      const { data, error } = await authApi.invoke('generated-jobs-stats', {
        method: 'GET',
        queryParams: { templateId },
      });

      if (error) throw new Error(error.message || 'Failed to fetch job stats');
      return data as GeneratedJobStats;
    },
    enabled: !!templateId && !!businessId,
    staleTime: 60 * 1000,
  });
}
