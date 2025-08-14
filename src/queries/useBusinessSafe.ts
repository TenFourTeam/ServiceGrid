import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { toBusinessUI } from './transform';

export type BusinessUI = {
  id: string;
  name: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
  [key: string]: any;
};

/**
 * Safe business hook - returns null instead of throwing when business doesn't exist
 */
export function useBusinessSafe() {
  const { isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: ['business', 'current'],
    queryFn: async () => {
      try {
        console.info('[useBusinessSafe] fetching business from database');
        const response = await edgeRequest(fn('get-business'));
        return toBusinessUI(response.business) as BusinessUI;
      } catch (error: any) {
        // Return null for 404s (business doesn't exist yet)
        if (error?.status === 404 || error?.message?.includes('404')) {
          return null;
        }
        throw error;
      }
    },
    enabled: isSignedIn,
    staleTime: 30_000,
    retry: (failureCount, error: any) => {
      // Don't retry 404s
      if (error?.status === 404) return false;
      return failureCount < 2;
    },
  });
}