import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface Waypoint {
  lat: number;
  lng: number;
  address: string;
  jobId?: string;
}

export interface DirectionStep {
  instruction: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  polyline: string;
}

export interface DirectionLeg {
  startAddress: string;
  endAddress: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  steps: DirectionStep[];
}

export interface RouteDirections {
  totalDistance: number;
  totalDuration: number;
  polyline: string;
  legs: DirectionLeg[];
}

export function useRouteDirections(
  waypoints: Waypoint[],
  options?: { optimize?: boolean; enabled?: boolean }
) {
  const authApi = useAuthApi();
  const { optimize = false, enabled = true } = options || {};

  return useQuery({
    queryKey: ['route-directions', waypoints, optimize],
    queryFn: async () => {
      console.info('[useRouteDirections] Calculating directions', { 
        waypointCount: waypoints.length 
      });

      const { data, error } = await authApi.invoke('calculate-route-directions', {
        method: 'POST',
        body: { waypoints, optimize }
      });

      if (error) {
        throw new Error(error.message || 'Failed to calculate directions');
      }

      return data.directions as RouteDirections;
    },
    enabled: enabled && waypoints.length >= 2,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 2,
  });
}
