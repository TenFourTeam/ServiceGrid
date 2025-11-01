import { useMutation } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { Job } from '@/types';

interface RouteRecalculationResult {
  totalTravelTime: number;
  totalDistance: number;
  travelTimeSavings: number; // negative = worse, positive = better
  routeSegments: Array<{
    from: string;
    to: string;
    travelTimeMinutes: number;
    distanceMiles: number;
  }>;
}

interface RecalculateRouteParams {
  jobs: Job[];
  newOrder: string[]; // Array of job IDs in new order
  originalOrder: string[]; // Array of job IDs in original order
}

/**
 * Hook to recalculate route efficiency when jobs are reordered
 * Compares new route to original and returns time savings
 */
export function useRouteRecalculation() {
  const authApi = useAuthApi();

  // Helper function to calculate travel time between two addresses
  const calculateTravelTime = async (origin: string, destination: string) => {
    const { data, error } = await authApi.invoke('calculate-travel-times', {
      method: 'POST',
      body: { origins: [origin], destinations: [destination] }
    });

    if (error) {
      throw new Error(error.message || 'Failed to calculate travel time');
    }

    const results = data.results || [];
    return results[0] || { travelTimeMinutes: 0, distanceMiles: 0 };
  };

  return useMutation({
    mutationFn: async ({ jobs, newOrder, originalOrder }: RecalculateRouteParams): Promise<RouteRecalculationResult> => {
      console.log('[useRouteRecalculation] Calculating new route...');

      // Create job lookup map
      const jobMap = new Map(jobs.map(j => [j.id, j]));

      // Calculate original route metrics
      let originalTotalTime = 0;
      for (let i = 0; i < originalOrder.length - 1; i++) {
        const fromJob = jobMap.get(originalOrder[i]);
        const toJob = jobMap.get(originalOrder[i + 1]);
        
        if (fromJob?.address && toJob?.address) {
          const result = await calculateTravelTime(fromJob.address, toJob.address);
          originalTotalTime += result.travelTimeMinutes;
        }
      }

      // Calculate new route metrics
      let newTotalTime = 0;
      let newTotalDistance = 0;
      const routeSegments: RouteRecalculationResult['routeSegments'] = [];

      for (let i = 0; i < newOrder.length - 1; i++) {
        const fromJob = jobMap.get(newOrder[i]);
        const toJob = jobMap.get(newOrder[i + 1]);
        
        if (fromJob?.address && toJob?.address) {
          const result = await calculateTravelTime(fromJob.address, toJob.address);
          newTotalTime += result.travelTimeMinutes;
          newTotalDistance += result.distanceMiles;

          routeSegments.push({
            from: fromJob.address,
            to: toJob.address,
            travelTimeMinutes: result.travelTimeMinutes,
            distanceMiles: result.distanceMiles,
          });
        }
      }

      const travelTimeSavings = originalTotalTime - newTotalTime;

      console.log('[useRouteRecalculation] Results:', {
        originalTime: originalTotalTime,
        newTime: newTotalTime,
        savings: travelTimeSavings,
      });

      return {
        totalTravelTime: newTotalTime,
        totalDistance: newTotalDistance,
        travelTimeSavings,
        routeSegments,
      };
    },
  });
}
