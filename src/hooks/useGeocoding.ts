import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

interface GeocodeCoordinates {
  lat: number;
  lng: number;
}

interface GeocodeResponse {
  coordinates: Record<string, GeocodeCoordinates | null>;
}

/**
 * Hook to batch geocode addresses using cached results
 * Returns a map of address -> coordinates
 */
export function useGeocoding(addresses: string[]) {
  const authApi = useAuthApi();
  
  // Filter out empty addresses
  const validAddresses = addresses.filter(addr => addr && addr.trim().length > 0);

  return useQuery({
    queryKey: ['geocoding', validAddresses],
    queryFn: async () => {
      if (validAddresses.length === 0) {
        return new Map<string, GeocodeCoordinates>();
      }

      console.log('[useGeocoding] Geocoding addresses:', validAddresses.length);

      const { data, error } = await authApi.invoke('batch-geocode', {
        method: 'POST',
        body: { addresses: validAddresses }
      });

      if (error) {
        throw new Error(error.message || 'Failed to geocode addresses');
      }

      const response = data as GeocodeResponse;
      const coordinatesMap = new Map<string, GeocodeCoordinates>();
      
      Object.entries(response.coordinates).forEach(([address, coords]) => {
        if (coords) {
          coordinatesMap.set(address, coords);
        }
      });

      console.log('[useGeocoding] Geocoded:', coordinatesMap.size, 'addresses');
      return coordinatesMap;
    },
    enabled: validAddresses.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - geocoding results don't change
    gcTime: Infinity, // Keep geocoding results cached forever
  });
}
