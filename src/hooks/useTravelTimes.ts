import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

interface TravelTimeResult {
  origin: string;
  destination: string;
  travelTimeMinutes: number;
  distanceMiles: number;
  cached: boolean;
  error?: string;
}

/**
 * Hook to calculate travel times between multiple origins and destinations
 * Uses Google Maps API with caching to minimize costs
 */
export function useTravelTimes(origins: string[], destinations: string[], enabled = true) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['travel-times', origins, destinations],
    queryFn: async () => {
      console.info('[useTravelTimes] Calculating travel times', { origins, destinations });
      
      const { data, error } = await authApi.invoke('calculate-travel-times', {
        method: 'POST',
        body: { origins, destinations }
      });

      if (error) {
        console.error('[useTravelTimes] Error:', error);
        throw new Error(error.message || 'Failed to calculate travel times');
      }

      console.info('[useTravelTimes] Results received', { count: data.results?.length });
      return data.results as TravelTimeResult[];
    },
    enabled: enabled && origins.length > 0 && destinations.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour (travel times don't change often)
    retry: 2,
  });
}
