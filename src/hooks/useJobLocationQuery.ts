import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export interface RadiusFilter {
  type: 'radius';
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface PolygonFilter {
  type: 'polygon';
  polygon: Array<{ lat: number; lng: number }>;
}

export type LocationFilter = RadiusFilter | PolygonFilter;

interface LocationQueryJob {
  id: string;
  customer_id: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  scheduled_start?: string;
  scheduled_end?: string;
  distance_meters?: number;
  [key: string]: any;
}

interface LocationQueryResponse {
  jobs: LocationQueryJob[];
  count: number;
}

/**
 * Hook to query jobs by geographical location (radius or polygon)
 * Returns jobs with distance metadata for display
 */
export function useJobLocationQuery(
  filter: LocationFilter | null,
  businessId: string | undefined,
  enabled = true
) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['jobs-location', filter, businessId],
    queryFn: async () => {
      if (!filter || !businessId) {
        return { jobs: [], count: 0 };
      }

      console.log('[useJobLocationQuery] Querying with filter:', filter);

      let queryParams: Record<string, string> = {
        businessId,
      };

      if (filter.type === 'radius') {
        queryParams = {
          ...queryParams,
          type: 'radius',
          lat: filter.latitude.toString(),
          lng: filter.longitude.toString(),
          radiusMeters: filter.radiusMeters.toString(),
        };
      } else if (filter.type === 'polygon') {
        queryParams = {
          ...queryParams,
          type: 'polygon',
          polygon: JSON.stringify(filter.polygon),
        };
      }

      const startTime = performance.now();
      
      const { data, error } = await authApi.invoke('jobs-location-query', {
        method: 'GET',
        queryParams,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`[useJobLocationQuery] Query completed in ${duration.toFixed(0)}ms`);

      if (error) {
        throw new Error(error.message || 'Failed to query jobs by location');
      }

      const response = data as LocationQueryResponse;
      console.log(`[useJobLocationQuery] Found ${response.count} jobs`);

      return response;
    },
    enabled: enabled && !!filter && !!businessId,
    staleTime: 2 * 60 * 1000, // 2 minutes - location data changes less frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
