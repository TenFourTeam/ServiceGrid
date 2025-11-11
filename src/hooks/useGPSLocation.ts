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

  const checkPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
    if (!navigator.permissions) {
      // Permissions API not supported, proceed with request
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      console.log('[useGPSLocation] Permission status:', result.state);
      return result.state as 'granted' | 'denied' | 'prompt';
    } catch (error) {
      console.warn('[useGPSLocation] Could not query permission:', error);
      return 'prompt';
    }
  };

  const getCurrentLocation = useCallback((): Promise<GPSLocation> => {
    return new Promise(async (resolve, reject) => {
      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by your browser';
        setError(errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      setIsLoading(true);
      setError(null);

      // Check permission status first
      const permissionStatus = await checkPermission();
      
      if (permissionStatus === 'denied') {
        const errorMsg = 'Location access was previously denied.\n\nTo enable:\n• iPhone: Settings > Safari > Location > Allow\n• Android: Site Settings > Permissions > Location';
        console.error('[useGPSLocation] Permission denied');
        setError(errorMsg);
        setIsLoading(false);
        reject(new Error(errorMsg));
        return;
      }

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
          let userGuidance = '';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Location permission denied';
              userGuidance = '\n\nTo enable:\n• iPhone: Settings > Safari > Location > Allow\n• Android: Site Settings > Permissions > Location';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information is unavailable';
              userGuidance = '\n\nCheck that Location Services are enabled in your device settings.';
              break;
            case error.TIMEOUT:
              errorMsg = 'Location request timed out';
              userGuidance = '\n\nThis may happen if location permissions are blocked. Try enabling location access in browser settings.';
              break;
          }

          const fullError = errorMsg + userGuidance;
          console.error('[useGPSLocation] Error:', fullError, error);
          setError(fullError);
          setIsLoading(false);
          reject(new Error(fullError));
        },
        {
          enableHighAccuracy: false, // Faster but less accurate - better for mobile
          timeout: 15000, // 15 seconds - more generous for mobile
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  return { location, isLoading, error, getCurrentLocation };
}
