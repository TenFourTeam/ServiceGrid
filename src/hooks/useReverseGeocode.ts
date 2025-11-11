import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

interface ReverseGeocodeResult {
  address: string;
  lat: number;
  lng: number;
  cached: boolean;
}

/**
 * Hook to reverse geocode lat/lng coordinates to an address
 * Uses Google Maps Geocoding API with caching
 */
export function useReverseGeocode(lat: number | null, lng: number | null, enabled = true) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['reverse-geocode', lat, lng],
    queryFn: async () => {
      if (lat === null || lng === null) {
        throw new Error('Coordinates are required');
      }

      console.log('[useReverseGeocode] Reverse geocoding:', { lat, lng });

      const { data, error } = await authApi.invoke('geo-reverse', {
        method: 'GET',
        queryParams: { lat: lat.toString(), lng: lng.toString() }
      });

      if (error) {
        console.error('[useReverseGeocode] Error:', error);
        throw new Error(error.message || 'Failed to reverse geocode');
      }

      console.log('[useReverseGeocode] Result:', data);
      return data as ReverseGeocodeResult;
    },
    enabled: enabled && lat !== null && lng !== null,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: Infinity, // Keep cached forever
    retry: 2,
  });
}
