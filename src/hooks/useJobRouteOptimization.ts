import { useMutation } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { Job } from '@/types';

interface RouteOptimizationConstraints {
  startTime?: string;
  endTime?: string;
  maxTravelTime?: number;
}

interface RouteOptimizationResult {
  optimizedJobs: Job[];
  reasoning: string;
  estimatedTimeSaved: number;
  estimatedTravelTime: number;
  suggestions: string[];
  originalOrder: number[];
}

/**
 * Hook to optimize job route order using AI
 * Analyzes job locations and suggests optimal routing to minimize travel time
 */
export function useJobRouteOptimization() {
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async ({
      businessId,
      jobs,
      startLocation,
      constraints
    }: {
      businessId: string;
      jobs: Job[];
      startLocation?: {
        address: string;
        lat?: number;
        lng?: number;
      };
      constraints?: RouteOptimizationConstraints;
    }) => {
      console.info('[useJobRouteOptimization] Optimizing route', { 
        businessId, 
        jobCount: jobs.length 
      });

      const { data, error } = await authApi.invoke('optimize-job-route', {
        method: 'POST',
        body: {
          businessId,
          jobs,
          startLocation,
          constraints
        },
        toast: {
          loading: 'Optimizing route with AI...',
          success: 'Route optimized successfully!',
          error: 'Failed to optimize route'
        }
      });

      if (error) {
        console.error('[useJobRouteOptimization] Error:', error);
        throw new Error(error.message || 'Failed to optimize route');
      }

      console.info('[useJobRouteOptimization] Optimization complete', { 
        timeSaved: data.estimatedTimeSaved 
      });

      return data as RouteOptimizationResult;
    }
  });
}
