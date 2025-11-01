import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface DailyPrediction {
  date: string;
  expectedJobs: number;
}

export interface HighRiskDay {
  date: string;
  reason: string;
}

export interface PredictiveInsightsData {
  patterns: {
    dayOfWeek: number[];
    hourOfDay: number[];
    serviceTypes: Array<{ type: string; count: number }>;
    totalJobs: number;
    averageJobsPerDay: number;
  };
  predictions: {
    dailyPredictions: DailyPrediction[];
    highRiskDays: HighRiskDay[];
    staffingRecommendations: string[];
    routeOpportunities: string[];
  };
  generated_at: string;
  insufficient_data?: boolean;
  message?: string;
}

export function usePredictiveInsights(enabled = true) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery<PredictiveInsightsData>({
    queryKey: ['predictive-insights', businessId],
    queryFn: async () => {
      console.info('[usePredictiveInsights] Fetching predictions', { businessId });

      const { data, error } = await authApi.invoke('predict-scheduling', {
        method: 'POST',
        body: { businessId },
      });

      if (error) {
        console.error('[usePredictiveInsights] Error:', error);
        throw new Error(error.message || 'Failed to fetch predictive insights');
      }

      console.info('[usePredictiveInsights] Data received', data);
      return data as PredictiveInsightsData;
    },
    enabled: enabled && !!businessId,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });
}
