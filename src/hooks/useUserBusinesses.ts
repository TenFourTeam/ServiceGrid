import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useAuth, useBusinessAuth } from '@/hooks/useBusinessAuth';
import { useState, useEffect } from 'react';

export interface UserBusiness {
  id: string;
  name: string;
  logo_url?: string;
  light_logo_url?: string;
  description?: string;
  phone?: string;
  reply_to_email?: string;
  tax_rate_default?: number;
  role: 'owner' | 'worker';
  joined_at: string;
  is_current: boolean;
}

/**
 * Hook to fetch all businesses the current user is a member of
 */
export function useUserBusinesses() {
  const { isSignedIn, isLoaded } = useAuth();
  const { session } = useBusinessAuth();
  const authApi = useAuthApi();
  
  // Check if we have an actual access token (not just isSignedIn)
  const hasToken = !!session?.access_token;
  
  // Token stability guard - wait a tick after token becomes available
  // to avoid queries during token refresh transitions
  const [isTokenStable, setIsTokenStable] = useState(false);
  
  useEffect(() => {
    if (hasToken) {
      const timer = setTimeout(() => setIsTokenStable(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsTokenStable(false);
    }
  }, [hasToken]);

  return useQuery<UserBusiness[], Error>({
    queryKey: ['user-businesses'],
    queryFn: async () => {
      console.log('[useUserBusinesses] Fetching businesses...');
      const { data, error } = await authApi.invoke('user-businesses', {
        method: 'GET'
      });
      
      if (error) {
        console.error('[useUserBusinesses] API error:', error);
        
        // Check for auth-specific errors that indicate invalid session
        const authErrorPatterns = [
          'Invalid or expired session',
          'User from sub claim',
          'Missing authentication',
          'JWT',
          'Profile not found'
        ];
        const isAuthError = authErrorPatterns.some(pattern => 
          error.message?.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isAuthError) {
          console.warn('[useUserBusinesses] Auth error detected, marking as AUTH_INVALID');
          throw new Error('AUTH_INVALID');
        }
        
        throw new Error(error.message || 'Failed to fetch user businesses');
      }
      
      console.log('[useUserBusinesses] API response:', { 
        businessCount: data?.data?.length,
        businesses: data?.data?.map((b: UserBusiness) => ({ id: b.id, name: b.name, role: b.role }))
      });
      
      // The API returns standardized { data, count } format
      return data?.data || [];
    },
    // Only enable when we have auth AND a stable access token
    enabled: isLoaded && isSignedIn && isTokenStable,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: (failureCount, error) => {
      // Don't retry auth errors - they won't resolve without re-login
      if (error.message === 'AUTH_INVALID') return false;
      return failureCount < 2;
    },
  });
}