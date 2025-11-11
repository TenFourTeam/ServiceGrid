import { useState, useEffect, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface UsePlacesAutocompleteReturn {
  predictions: PlacePrediction[];
  isLoading: boolean;
  error: string | null;
  fetchPredictions: (input: string) => void;
  clearPredictions: () => void;
  getPlaceDetails: (placeId: string) => Promise<{
    address: string;
    lat: number;
    lng: number;
  }>;
}

/**
 * Hook to fetch Google Places Autocomplete predictions
 * Uses the Places library from @vis.gl/react-google-maps
 */
export function usePlacesAutocomplete(): UsePlacesAutocompleteReturn {
  const places = useMapsLibrary('places');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autocompleteService, setAutocompleteService] = 
    useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = 
    useState<google.maps.places.PlacesService | null>(null);
  const [sessionToken, setSessionToken] = 
    useState<google.maps.places.AutocompleteSessionToken | null>(null);

  // Initialize services when Places library loads
  useEffect(() => {
    if (!places) return;

    console.log('[usePlacesAutocomplete] Initializing Places services');
    setAutocompleteService(new places.AutocompleteService());
    setSessionToken(new places.AutocompleteSessionToken());
    
    // Create a dummy div for PlacesService (required by Google Maps API)
    const div = document.createElement('div');
    setPlacesService(new places.PlacesService(div));
  }, [places]);

  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteService || !input.trim()) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('[usePlacesAutocomplete] Fetching predictions for:', input);

    autocompleteService.getPlacePredictions(
      {
        input: input.trim(),
        sessionToken: sessionToken || undefined,
      },
      (results, status) => {
        setIsLoading(false);

        if (status === places!.PlacesServiceStatus.OK && results) {
          console.log('[usePlacesAutocomplete] ✓ Received predictions:', results.length);
          setPredictions(results as PlacePrediction[]);
        } else if (status === places!.PlacesServiceStatus.ZERO_RESULTS) {
          console.log('[usePlacesAutocomplete] No results found');
          setPredictions([]);
        } else {
          console.error('[usePlacesAutocomplete] Error:', status);
          setError(`Failed to fetch predictions: ${status}`);
          setPredictions([]);
        }
      }
    );
  }, [autocompleteService, sessionToken, places]);

  const getPlaceDetails = useCallback((placeId: string): Promise<{
    address: string;
    lat: number;
    lng: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!placesService) {
        reject(new Error('Places service not initialized'));
        return;
      }

      placesService.getDetails(
        { placeId, fields: ['formatted_address', 'geometry'] },
        (place, status) => {
          if (status === places!.PlacesServiceStatus.OK && place) {
            resolve({
              address: place.formatted_address || '',
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0,
            });
          } else {
            reject(new Error(`Failed to get place details: ${status}`));
          }
        }
      );
    });
  }, [placesService, places]);

  const clearPredictions = useCallback(() => {
    setPredictions([]);
    setError(null);
  }, []);

  return {
    predictions,
    isLoading,
    error,
    fetchPredictions,
    clearPredictions,
    getPlaceDetails,
  };
}
