import { useQuery } from '@tanstack/react-query';

export function useGoogleMapsApiKey() {
  return useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: async () => {
      const response = await fetch(
        'https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/google-maps-api-key'
      );
      
      if (!response.ok) {
        throw new Error('Failed to load Google Maps API key');
      }
      
      const data = await response.json();
      return data.apiKey as string;
    },
    staleTime: Infinity, // Never refetch - API key doesn't change
    gcTime: Infinity, // Keep in cache forever
    retry: 3,
  });
}
