import { useState, useCallback } from 'react';

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface UseGPSLocationReturn {
  location: GPSLocation | null;
  isLoading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<GPSLocation>;
}

/**
 * Hook to get current GPS location using navigator.geolocation
 * Includes loading states and error handling
 */
export function useGPSLocation(): UseGPSLocationReturn {
  const [location, setLocation] = useState<GPSLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = useCallback((): Promise<GPSLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by your browser';
        setError(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      setIsLoading(true);
      setError(null);

      console.log('[useGPSLocation] Requesting location...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: GPSLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          console.log('[useGPSLocation] ✓ Location acquired:', loc);
          setLocation(loc);
          setIsLoading(false);
          resolve(loc);
        },
        (error) => {
          let errorMsg = 'Failed to get location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMsg = 'Location request timed out.';
              break;
          }

          console.error('[useGPSLocation] Error:', errorMsg, error);
          setError(errorMsg);
          setIsLoading(false);
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  return { location, isLoading, error, getCurrentLocation };
}
