import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys } from './keys';
import { toBusinessUI } from './transform';
import type { BusinessUI } from '@/hooks/useBusinessContext';

/**
 * Unified business query hook with automatic token recovery
 * This replaces fragmented business state management
 */
export function useBusiness() {
  const { getToken } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: async () => {
      console.info('[useBusiness] fetching business from database');
      const response = await edgeRequest(fn('get-business'));
      const business = toBusinessUI(response.business) as BusinessUI;
      business.role = response.role;
      return business;
    },
    staleTime: 30_000,
    retry: (failureCount, error: any) => {
      // Handle token expiration with automatic recovery
      if (error?.status === 401 || error?.status === 403) {
        if (failureCount === 0) {
          // Trigger token refresh in background and retry
          getToken({ template: 'supabase' }).then(() => {
            console.info('[useBusiness] token refreshed');
          }).catch((refreshError) => {
            console.error('[useBusiness] token refresh failed:', refreshError);
          });
          return true; // Retry once after token refresh attempt
        }
        return false; // Don't retry auth errors after one attempt
      }
      // Exponential backoff for other errors: max 3 retries
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
