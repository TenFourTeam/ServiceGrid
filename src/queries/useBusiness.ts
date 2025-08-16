import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { edgeRequest, ApiError } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys } from './keys';
import { toBusinessUI } from './transform';
import type { BusinessUI } from '@/hooks/useBusinessContext';

/**
 * Helper function to bootstrap new users
 */
async function bootstrapNewUser(): Promise<void> {
  console.info('[useBusiness] bootstrapping new user');
  try {
    await edgeRequest(fn('clerk-bootstrap'), { method: 'POST' });
    console.info('[useBusiness] user bootstrap successful');
  } catch (error) {
    console.error('[useBusiness] bootstrap failed:', error);
    throw error;
  }
}

/**
 * Check if error indicates a new user that needs bootstrapping
 */
function isNewUserError(error: unknown): boolean {
  if (error instanceof ApiError) {
    // Check for 404 status or specific error message indicating profile not found
    return error.status === 404 || 
           error.message?.includes('Profile not found') ||
           error.message?.includes('Bootstrap required');
  }
  return false;
}

/**
 * Unified business query hook with automatic new user bootstrap
 * This replaces fragmented business state management
 */
export function useBusiness(enabled: boolean = true) {
  const { getToken } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: async () => {
      console.info('[useBusiness] fetching business from database');
      
      try {
        const response = await edgeRequest(fn('get-business'));
        const business = toBusinessUI(response.business) as BusinessUI;
        business.role = response.role;
        return business;
      } catch (error) {
        // If this is a new user error, bootstrap and retry
        if (isNewUserError(error)) {
          console.info('[useBusiness] detected new user, bootstrapping...');
          await bootstrapNewUser();
          
          // Retry the original request after bootstrap
          console.info('[useBusiness] retrying get-business after bootstrap');
          const response = await edgeRequest(fn('get-business'));
          const business = toBusinessUI(response.business) as BusinessUI;
          business.role = response.role;
          return business;
        }
        
        // Re-throw other errors
        throw error;
      }
    },
    enabled,
    staleTime: 30_000,
    retry: (failureCount, error: any) => {
      // Don't retry new user errors - they should be handled by bootstrap
      if (isNewUserError(error)) {
        return false;
      }
      
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
