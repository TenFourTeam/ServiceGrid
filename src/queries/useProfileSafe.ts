import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { toProfileUI } from './transform';

/**
 * Safe profile hook - returns null instead of throwing when profile doesn't exist
 */
export function useProfileSafe() {
  const { isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: ['profile', 'current'],
    queryFn: async () => {
      try {
        console.info('[useProfileSafe] fetching profile from database');
        const data = await edgeRequest(fn('profile-get'));
        return toProfileUI(data);
      } catch (error: any) {
        // Return null for 404s (profile doesn't exist yet)
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