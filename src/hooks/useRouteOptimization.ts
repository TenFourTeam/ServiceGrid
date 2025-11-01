import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { RecurringJobTemplate } from '@/hooks/useRecurringJobs';

interface OptimizationConstraints {
  maxDailyHours?: number;
  teamSize?: number;
  startTime?: string;
  endTime?: string;
}

interface OptimizationResult {
  optimizedTemplates: RecurringJobTemplate[];
  reasoning: string;
  estimatedTimeSaved: number;
  suggestions: string[];
}

/**
 * Hook to optimize recurring job route order using AI
 * Analyzes job locations and suggests optimal ordering to minimize travel time
 */
export function useRouteOptimization() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      businessId,
      templates,
      constraints
    }: {
      businessId: string;
      templates: RecurringJobTemplate[];
      constraints?: OptimizationConstraints;
    }) => {
      console.info('[useRouteOptimization] Optimizing route', { 
        businessId, 
        templateCount: templates.length 
      });

      const { data, error } = await authApi.invoke('optimize-recurring-route', {
        method: 'POST',
        body: {
          businessId,
          templates,
          constraints
        },
        toast: {
          loading: 'Optimizing route with AI...',
          success: 'Route optimized successfully!',
          error: 'Failed to optimize route'
        }
      });

      if (error) {
        console.error('[useRouteOptimization] Error:', error);
        throw new Error(error.message || 'Failed to optimize route');
      }

      console.info('[useRouteOptimization] Optimization complete', { 
        timeSaved: data.estimatedTimeSaved 
      });

      return data as OptimizationResult;
    },
    onSuccess: () => {
      // Optionally invalidate recurring jobs query if we want to persist the order
      queryClient.invalidateQueries({ queryKey: ['recurring-jobs'] });
    }
  });
}
